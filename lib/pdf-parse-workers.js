const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');
const PDFJS = require(`./pdf.js/v4.5.136/build/pdf.js`);

const DEFAULT_OPTIONS = {
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
	const maxConcurrent = Math.min(options.maxWorkers, chunks.length);
	let completedChunks = 0;
	let activeWorkers = 0;
	let chunkIndex = 0;

	return new Promise((resolve, reject) => {
		function startWorker() {
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

			// Create a new Uint8Array copy for this worker
			// Each worker needs its own copy since we can't transfer the same buffer multiple times
			const uint8Array = Buffer.isBuffer(dataBuffer)
				? new Uint8Array(dataBuffer)
				: new Uint8Array(dataBuffer);

			const worker = new Worker(path.join(__dirname, 'pdf-worker.js'), {
				workerData: {
					dataBuffer: uint8Array,
					startPage: chunk.start,
					endPage: chunk.end,
					batchSize: options.batchSize,
					verbosityLevel: options.verbosityLevel
				}
			});

			worker.on('message', (message) => {
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
					activeWorkers--;
					worker.terminate();
					const errorMsg = `Worker error (chunk ${currentIndex + 1}/${chunks.length}): ${message.error}`;
					reject(new Error(errorMsg));
				}
			});

			worker.on('error', (error) => {
				activeWorkers--;
				worker.terminate();
				const errorMsg = `Worker runtime error (chunk ${currentIndex + 1}/${chunks.length}): ${error.message}`;
				reject(new Error(errorMsg));
			});

			worker.on('exit', (code) => {
				if (code !== 0 && activeWorkers > 0) {
					activeWorkers--;
					const errorMsg = `Worker exited with code ${code} (chunk ${currentIndex + 1}/${chunks.length}). Check console for details.`;
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

