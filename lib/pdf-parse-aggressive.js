const PDFJS = require(`./pdf.js/v4.5.136/build/pdf.js`);

function render_page(pageData) {
	let render_options = {
		// Changed to true to fix issue #10 (ligature handling)
		normalizeWhitespace: true,
		disableCombineTextItems: false
	}

	return pageData.getTextContent(render_options)
		.then(function (textContent) {
			let lastY, text = '';
			// Y-coordinate tolerance for detecting line breaks (fixes issue #10)
			const Y_TOLERANCE = 1.0;

			for (let item of textContent.items) {
				const currentY = item.transform[5];
				const isNewLine = lastY !== undefined && Math.abs(currentY - lastY) > Y_TOLERANCE;

				if (isNewLine) {
					text += '\n';
				}

				text += item.str;
				lastY = currentY;
			}
			return text;
		});
}

const DEFAULT_OPTIONS = {
	pagerender: render_page,
	max: 0,
	verbosityLevel: 0,
	chunkSize: 500,
	batchSize: 10,
	concurrentChunks: 1, // Process chunks one at a time but with aggressive batching
	onChunkComplete: null
}

/**
 * Parse PDF with aggressive parallelization for huge files
 * Uses larger batches and more aggressive concurrency
 * Best for 1000+ page PDFs
 */
async function PDFAggressive(dataBuffer, options) {
	let ret = {
		numpages: 0,
		numrender: 0,
		info: null,
		metadata: null,
		text: "",
		version: null
	};

	// Merge options with defaults
	options = { ...DEFAULT_OPTIONS, ...options };
	if (typeof options.pagerender != 'function') options.pagerender = DEFAULT_OPTIONS.pagerender;

	ret.version = PDFJS.version;

	PDFJS.disableWorker = true;
	let doc = await PDFJS.getDocument({
		verbosity: options.verbosityLevel,
		data: new Uint8Array(dataBuffer),
	}).promise;

	ret.numpages = doc.numPages;

	let metaData = await doc.getMetadata().catch(function () {
		return null;
	});

	ret.info = metaData ? metaData.info : null;
	ret.metadata = metaData ? metaData.metadata : null;

	let counter = options.max <= 0 ? doc.numPages : options.max;
	counter = counter > doc.numPages ? doc.numPages : counter;

	const textChunks = [];
	let processedPages = 0;

	// Process in large chunks with aggressive batching
	for (let chunkStart = 1; chunkStart <= counter; chunkStart += options.chunkSize) {
		const chunkEnd = Math.min(chunkStart + options.chunkSize - 1, counter);

		// Process entire chunk in parallel (more aggressive than stream)
		const chunkPromises = [];

		for (let pageNum = chunkStart; pageNum <= chunkEnd; pageNum += options.batchSize) {
			const batchEnd = Math.min(pageNum + options.batchSize - 1, chunkEnd);

			// Create a batch
			const batchPromises = [];
			for (let i = pageNum; i <= batchEnd; i++) {
				batchPromises.push(
					doc.getPage(i)
						.then(pageData => options.pagerender(pageData))
						.catch(() => "")
				);
			}

			// Add batch to chunk (all batches in chunk run in parallel)
			chunkPromises.push(Promise.all(batchPromises));
		}

		// Wait for all batches in this chunk
		const chunkBatchResults = await Promise.all(chunkPromises);
		const chunkTexts = chunkBatchResults.flat();

		textChunks.push(chunkTexts.join('\n\n'));
		processedPages += chunkTexts.length;

		// Progress callback
		if (options.onChunkComplete) {
			options.onChunkComplete({
				processedPages,
				totalPages: counter,
				progress: (processedPages / counter * 100).toFixed(2),
				currentChunk: Math.ceil(chunkStart / options.chunkSize),
				totalChunks: Math.ceil(counter / options.chunkSize)
			});
		}

		// Force garbage collection between chunks if available
		if (global.gc && chunkStart + options.chunkSize <= counter) {
			global.gc();
		}
	}

	ret.text = textChunks.join('\n\n');
	ret.numrender = processedPages;
	doc.destroy();

	return ret;
}

module.exports = PDFAggressive;
module.exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;

