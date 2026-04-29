const PDFJS = require('./pdf.js/v4.5.136/build/pdf.js');
const PDF = require('./pdf-parse.js');

const Y_TOLERANCE = 1.0;
const DEFAULT_SAMPLE_SIZE = 5;
const TEXT_CONTENT_OPTS = { normalizeWhitespace: true, disableCombineTextItems: false };

const BOLD_RE = /Bold|Black|Heavy|Semibold|Demibold/i;
const ITALIC_RE = /Italic|Oblique/i;
const MONO_RE = /Mono|Courier|Consolas|Menlo/i;
const BULLET_RE = /^\s*([•·▪◦\-\*])\s+(.+)$/;
const NUMBERED_RE = /^\s*(\d+)[\.\)]\s+(.+)$/;

async function markdown(dataBuffer, options = {}) {
	const stats = await collectFontStats(dataBuffer, options);
	const renderer = createMarkdownRenderer(stats, options);
	return PDF(dataBuffer, { ...options, pagerender: renderer });
}

async function collectFontStats(dataBuffer, options = {}) {
	const sampleSize = Number.isFinite(options.sampleSize) ? options.sampleSize : DEFAULT_SAMPLE_SIZE;
	PDFJS.disableWorker = true;
	const doc = await PDFJS.getDocument({
		verbosity: options.verbosityLevel ?? 0,
		data: new Uint8Array(dataBuffer),
		password: options.password
	}).promise;

	const histogram = new Map();
	const lineDeltas = [];
	const sampleIndices = pickSampleIndices(doc.numPages, sampleSize);

	for (const idx of sampleIndices) {
		try {
			const page = await doc.getPage(idx);
			const tc = await page.getTextContent(TEXT_CONTENT_OPTS);
			let lastY;
			for (const item of tc.items) {
				if (!item.str) continue;
				const size = roundSize(Math.abs(item.transform[3]));
				histogram.set(size, (histogram.get(size) || 0) + item.str.length);
				const y = item.transform[5];
				if (lastY !== undefined) {
					const delta = Math.abs(y - lastY);
					if (delta > Y_TOLERANCE) lineDeltas.push(delta);
				}
				lastY = y;
			}
		} catch (_) {
			// skip pages that fail to render
		}
	}

	doc.destroy();
	return computeFontStats(histogram, lineDeltas);
}

function createMarkdownRenderer(stats, options = {}) {
	const renderOpts = {
		detectEmphasis: options.detectEmphasis !== false,
		detectLists: options.detectLists !== false,
		detectCodeBlocks: options.detectCodeBlocks !== false
	};
	return async function renderPage(pageData) {
		const tc = await pageData.getTextContent(TEXT_CONTENT_OPTS);
		return renderItemsToMarkdown(tc.items, tc.styles || {}, stats, renderOpts);
	};
}

async function markdownRender(pageData) {
	const tc = await pageData.getTextContent(TEXT_CONTENT_OPTS);
	const stats = computeStatsFromItems(tc.items);
	return renderItemsToMarkdown(tc.items, tc.styles || {}, stats, {
		detectEmphasis: true,
		detectLists: true,
		detectCodeBlocks: true
	});
}

function renderItemsToMarkdown(items, styles, stats, opts) {
	const lines = groupItemsIntoLines(items);
	const blocks = [];
	let codeBuffer = null;

	const flushCode = () => {
		if (codeBuffer && codeBuffer.length) {
			blocks.push('```\n' + codeBuffer.join('\n') + '\n```');
		}
		codeBuffer = null;
	};

	for (const line of lines) {
		const rendered = renderLine(line, styles, stats, opts);
		if (!rendered) continue;

		if (opts.detectCodeBlocks && rendered.kind === 'code') {
			if (!codeBuffer) codeBuffer = [];
			codeBuffer.push(rendered.text);
			continue;
		}

		flushCode();
		blocks.push(rendered.text);
	}
	flushCode();

	return blocks.join('\n\n');
}

function groupItemsIntoLines(items) {
	const lines = [];
	let current = null;
	let lastY;
	for (const item of items) {
		if (typeof item.str !== 'string') continue;
		const y = item.transform[5];
		const isNewLine = lastY === undefined || Math.abs(y - lastY) > Y_TOLERANCE;
		if (isNewLine) {
			if (current) lines.push(current);
			current = { y, items: [] };
		}
		current.items.push(item);
		lastY = y;
	}
	if (current) lines.push(current);
	return lines;
}

function renderLine(line, styles, stats, opts) {
	const rawText = line.items.map(i => i.str).join('').replace(/\s+/g, ' ').trim();
	if (!rawText) return null;

	const maxSize = Math.max(...line.items.map(i => Math.abs(i.transform[3])));
	const text = opts.detectEmphasis ? combineLineWithEmphasis(line.items, styles) : rawText;

	if (maxSize >= stats.h1Size) return { kind: 'heading', text: `# ${stripEmphasis(text)}` };
	if (maxSize >= stats.h2Size) return { kind: 'heading', text: `## ${stripEmphasis(text)}` };
	if (maxSize >= stats.h3Size) return { kind: 'heading', text: `### ${stripEmphasis(text)}` };

	if (opts.detectLists) {
		const bullet = rawText.match(BULLET_RE);
		if (bullet) {
			const inline = opts.detectEmphasis
				? combineLineWithEmphasis(line.items, styles).replace(BULLET_RE, '$2')
				: bullet[2];
			return { kind: 'list', text: `- ${inline}` };
		}
		const numbered = rawText.match(NUMBERED_RE);
		if (numbered) {
			const inline = opts.detectEmphasis
				? combineLineWithEmphasis(line.items, styles).replace(NUMBERED_RE, '$2')
				: numbered[2];
			return { kind: 'list', text: `${numbered[1]}. ${inline}` };
		}
	}

	if (opts.detectCodeBlocks && isMonospaceLine(line.items, styles)) {
		return { kind: 'code', text: rawText };
	}

	return { kind: 'paragraph', text };
}

function combineLineWithEmphasis(items, styles) {
	let result = '';
	let buffer = '';
	let state = { bold: false, italic: false };

	const flush = () => {
		if (!buffer) return;
		const match = buffer.match(/^(\s*)([\s\S]*?)(\s*)$/);
		const lead = match[1];
		const core = match[2];
		const trail = match[3];
		if (!core) {
			result += buffer;
			buffer = '';
			return;
		}
		let wrapped = core;
		if (state.bold && state.italic) wrapped = `***${wrapped}***`;
		else if (state.bold) wrapped = `**${wrapped}**`;
		else if (state.italic) wrapped = `*${wrapped}*`;
		result += lead + wrapped + trail;
		buffer = '';
	};

	for (const item of items) {
		const fam = (styles[item.fontName] && styles[item.fontName].fontFamily) || item.fontName || '';
		const bold = BOLD_RE.test(fam);
		const italic = ITALIC_RE.test(fam);
		if (bold === state.bold && italic === state.italic) {
			buffer += item.str;
		} else {
			flush();
			state = { bold, italic };
			buffer = item.str;
		}
	}
	flush();
	return result.replace(/\s+/g, ' ').trim();
}

function isMonospaceLine(items, styles) {
	if (!items.length) return false;
	let monoChars = 0;
	let totalChars = 0;
	for (const item of items) {
		const fam = (styles[item.fontName] && styles[item.fontName].fontFamily) || item.fontName || '';
		const len = item.str.length;
		totalChars += len;
		if (MONO_RE.test(fam)) monoChars += len;
	}
	return totalChars > 0 && monoChars / totalChars >= 0.7;
}

function stripEmphasis(text) {
	return text.replace(/\*\*\*|\*\*|\*/g, '').replace(/\s+/g, ' ').trim();
}

function pickSampleIndices(total, sampleSize) {
	if (total <= sampleSize) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}
	const step = total / sampleSize;
	const indices = new Set();
	for (let i = 0; i < sampleSize; i++) {
		const idx = Math.max(1, Math.min(total, Math.round(step * i + step / 2)));
		indices.add(idx);
	}
	return [...indices];
}

function roundSize(size) {
	return Math.round(size * 2) / 2;
}

function computeFontStats(histogram, lineDeltas) {
	if (histogram.size === 0) {
		return { bodySize: 12, h1Size: 18, h2Size: 15, h3Size: 13.5, lineHeight: 14.4 };
	}
	const entries = [...histogram.entries()];
	const totalChars = entries.reduce((s, [, c]) => s + c, 0);

	const byCount = [...entries].sort((a, b) => b[1] - a[1]);
	const bodySize = byCount[0][0];

	const bySize = [...entries].sort((a, b) => b[0] - a[0]);
	let cumulative = 0;
	let h1Size = bodySize * 1.6;
	let h2Size = bodySize * 1.3;
	let h3Size = bodySize * 1.15;
	for (const [size, count] of bySize) {
		if (size <= bodySize * 1.05) break;
		cumulative += count;
		const pct = cumulative / totalChars;
		if (pct <= 0.02) h1Size = Math.min(h1Size, size);
		if (pct <= 0.06) h2Size = Math.min(h2Size, size);
		if (pct <= 0.12) h3Size = Math.min(h3Size, size);
	}

	if (h3Size <= bodySize) h3Size = bodySize * 1.15;
	if (h2Size <= h3Size) h2Size = h3Size * 1.1;
	if (h1Size <= h2Size) h1Size = h2Size * 1.1;

	const sortedDeltas = [...lineDeltas].sort((a, b) => a - b);
	const lineHeight = sortedDeltas.length
		? sortedDeltas[Math.floor(sortedDeltas.length / 2)]
		: bodySize * 1.2;

	return { bodySize, h1Size, h2Size, h3Size, lineHeight };
}

function computeStatsFromItems(items) {
	const histogram = new Map();
	for (const it of items) {
		if (typeof it.str !== 'string' || !it.str) continue;
		const size = roundSize(Math.abs(it.transform[3]));
		histogram.set(size, (histogram.get(size) || 0) + it.str.length);
	}
	return computeFontStats(histogram, []);
}

module.exports = {
	markdown,
	markdownRender,
	createMarkdownRenderer,
	collectFontStats
};
