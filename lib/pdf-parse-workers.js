const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');
const PDFJS = require(`./pdf.js/v4.5.136/build/pdf.js`);

// Default render_page function
function render_page(pageData) {
	let render_options = {
		normalizeWhitespace: true,
		disableCombineTextItems: false
	}

	return pageData.getTextContent(render_options)
		.then(function (textContent) {
			let lastY, text = '';
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
	pagerenderModule: null, // Path to custom render module for workers
	max: 0,
	verbosityLevel: 0,
	chunkSize: 500,       // Pages per worker
	batchSize: 10,        // Pages per batch within worker
	maxWorkers: Math.max(1, os.cpus().length - 1), // Leave 1 CPU free
	onProgress: null      // Progress callback
}

/**
 * Parse PDF using worker threads for true parallel processing
 * Best for very large PDFs (1000+ pages)
 * Each worker processes a chunk of pages independently
 */
async function PDFWorkers(dataBuffer, options) {
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

	// Validate pagerender option
	if (typeof options.pagerender != 'function') {
		options.pagerender = DEFAULT_OPTIONS.pagerender;
	}

	ret.version = PDFJS.version;

	// Get document info from main thread
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

	// Don't need doc anymore in main thread
	doc.destroy();

	// Divide work into chunks for workers
	const chunks = [];
	for (let i = 1; i <= counter; i += options.chunkSize) {
		chunks.push({
			start: i,
			end: Math.min(i + options.chunkSize - 1, counter),
			index: chunks.length
		});
	}

	// Process chunks using worker pool
	const results = await processChunksWithWorkers(
		dataBuffer,
		chunks,
		options
	);

	ret.text = results.join('\n\n');
	ret.numrender = counter;

	return ret;
}

/**
 * Process chunks using a pool of workers
 */
async function processChunksWithWorkers(dataBuffer, chunks, options) {
	const results = new Array(chunks.length);

	// Limit concurrent workers to avoid memory issues
	// For large PDFs, we duplicate data for each worker
	const maxConcurrent = Math.min(
		options.maxWorkers,
		chunks.length
	);

	let completedChunks = 0;
	let activeWorkers = 0;
	let chunkIndex = 0;
	let hasError = false;

	// Convert buffer once outside the loop
	const dataArray = Buffer.isBuffer(dataBuffer)
		? Array.from(dataBuffer)
		: Array.from(new Uint8Array(dataBuffer));

	return new Promise((resolve, reject) => {
		function startWorker() {
			if (hasError) {
				return; // Stop creating new workers if we've had an error
			}

			if (chunkIndex >= chunks.length) {
				// No more chunks to process
				if (activeWorkers === 0) {
					resolve(results);
				}
				return;
			}

			const chunk = chunks[chunkIndex];
			const currentIndex = chunkIndex;
			chunkIndex++;
			activeWorkers++;

			const worker = new Worker(path.join(__dirname, 'pdf-worker.js'), {
				workerData: {
					dataBuffer: dataArray, // Reuse the same array
					startPage: chunk.start,
					endPage: chunk.end,
					batchSize: options.batchSize,
					verbosityLevel: options.verbosityLevel,
					pagerenderModule: options.pagerenderModule // Path to custom render module
				},
				// Resource limits to prevent memory issues
				resourceLimits: {
					maxOldGenerationSizeMb: 4096, // 4GB limit per worker
					maxYoungGenerationSizeMb: 2048
				}
			});

			let workerCompleted = false;

			worker.on('message', (message) => {
				if (workerCompleted) return;
				workerCompleted = true;

				if (message.success) {
					results[currentIndex] = message.text;
					completedChunks++;

					// Progress callback
					if (options.onProgress) {
						options.onProgress({
							completedChunks,
							totalChunks: chunks.length,
							progress: (completedChunks / chunks.length * 100).toFixed(2)
						});
					}

					activeWorkers--;
					worker.terminate();
					startWorker();
				} else {
					hasError = true;
					activeWorkers--;
					worker.terminate();
					const errorMsg = `Worker error (chunk ${currentIndex + 1}/${chunks.length}): ${message.error}`;
					reject(new Error(errorMsg));
				}
			});

			worker.on('error', (error) => {
				if (workerCompleted) return;
				workerCompleted = true;
				hasError = true;
				activeWorkers--;
				worker.terminate();
				const errorMsg = `Worker runtime error (chunk ${currentIndex + 1}/${chunks.length}): ${error.message}`;
				reject(new Error(errorMsg));
			});

			worker.on('exit', (code) => {
				if (workerCompleted) return;
				if (code !== 0) {
					workerCompleted = true;
					hasError = true;
					activeWorkers--;
					const errorMsg = `Worker exited with code ${code} (chunk ${currentIndex + 1}/${chunks.length}). Possible memory issue - try reducing maxWorkers.`;
					reject(new Error(errorMsg));
				}
			});
		}

		// Start initial batch of workers
		for (let i = 0; i < maxConcurrent; i++) {
			startWorker();
		}
	});
}

module.exports = PDFWorkers;
module.exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;

