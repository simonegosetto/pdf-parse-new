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
	chunkSize: 500,       // Pages per chunk
	batchSize: 10,        // Pages per batch within chunk
	onChunkComplete: null // Callback for progress
}

/**
 * Parse PDF with streaming/chunking approach
 * Reduces memory pressure for large PDFs by processing in chunks
 * and forcing garbage collection between chunks
 */
async function PDFStream(dataBuffer, options) {
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

	let metaData = await doc.getMetadata().catch(function (err) {
		return null;
	});

	ret.info = metaData ? metaData.info : null;
	ret.metadata = metaData ? metaData.metadata : null;

	let counter = options.max <= 0 ? doc.numPages : options.max;
	counter = counter > doc.numPages ? doc.numPages : counter;

	const textChunks = [];
	let processedPages = 0;

	// Process in chunks to reduce memory pressure
	for (let chunkStart = 1; chunkStart <= counter; chunkStart += options.chunkSize) {
		const chunkEnd = Math.min(chunkStart + options.chunkSize - 1, counter);
		const chunkTexts = [];

		// Process chunk in batches
		for (let batchStart = chunkStart; batchStart <= chunkEnd; batchStart += options.batchSize) {
			const batchEnd = Math.min(batchStart + options.batchSize - 1, chunkEnd);
			const batchPromises = [];

			for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
				batchPromises.push(
					doc.getPage(pageNum)
						.then(pageData => options.pagerender(pageData))
						.catch((err) => {
							return "";
						})
				);
			}

			const batchResults = await Promise.all(batchPromises);
			chunkTexts.push(...batchResults);
		}

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

module.exports = PDFStream;
module.exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;

