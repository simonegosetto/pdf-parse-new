const assert = require('assert');
const fs = require('fs');
const pdf = require('../');
const { collectFontStats, createMarkdownRenderer, markdownRender } = require('../lib/markdown-render.js');

const PDF_FILE = './test/data/01-valid.pdf';

describe('Markdown rendering', function () {
	this.timeout(30000);
	const dataBuffer = fs.readFileSync(PDF_FILE);

	it('pdf.markdown() returns a Result with non-empty Markdown text', async function () {
		const result = await pdf.markdown(dataBuffer);
		assert.ok(result.text.length > 0, 'expected non-empty text');
		assert.ok(result.numpages > 0, 'expected numpages > 0');
		assert.equal(result.numrender, result.numpages);
	});

	it('plain pdf() output still parses successfully (no regression)', async function () {
		const plain = await pdf(dataBuffer);
		assert.ok(plain.text.length > 0);
		assert.equal(plain.numrender, plain.numpages);
	});

	it('collectFontStats produces ordered thresholds', async function () {
		const stats = await collectFontStats(dataBuffer, { sampleSize: 3 });
		assert.ok(stats.bodySize > 0, 'bodySize must be > 0');
		assert.ok(stats.h3Size > stats.bodySize, 'h3 must exceed body');
		assert.ok(stats.h2Size >= stats.h3Size, 'h2 must be >= h3');
		assert.ok(stats.h1Size >= stats.h2Size, 'h1 must be >= h2');
		assert.ok(stats.lineHeight > 0, 'lineHeight must be > 0');
	});

	it('createMarkdownRenderer integrates with pdf() via pagerender option', async function () {
		const stats = await collectFontStats(dataBuffer, { sampleSize: 3 });
		const renderer = createMarkdownRenderer(stats);
		const result = await pdf(dataBuffer, { pagerender: renderer });
		assert.ok(result.text.length > 0);
	});

	it('markdownRender works as a single-page drop-in pagerender', async function () {
		const result = await pdf(dataBuffer, { pagerender: markdownRender });
		assert.ok(result.text.length > 0);
	});

	it('markdownRenderModule is a resolvable absolute path', function () {
		assert.equal(typeof pdf.markdownRenderModule, 'string');
		assert.ok(pdf.markdownRenderModule.endsWith('markdown-render-page.js'));
		const loaded = require(pdf.markdownRenderModule);
		assert.equal(typeof loaded, 'function');
	});
});
