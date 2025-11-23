const { fork } = require('child_process');
const os = require('os');
const path = require('path');
const PDFJS = require(`./pdf.js/v4.5.136/build/pdf.js`);

const DEFAULT_OPTIONS = {
	max: 0,
	verbosityLevel: 0,
	chunkSize: 500,
	batchSize: 10,
	maxProcesses: Math.max(1, os.cpus().length - 1),
	processTimeout: 120000, // 2 minutes per process
	onProgress: null
}

/**
 * Parse PDF using child processes for true parallel processing
 * Best for very large PDFs (1000+ pages)
 * Each child process handles a chunk of pages independently
 * More robust than worker threads - no PDF.js compatibility issues
 */
async function PDFProcesses(dataBuffer, options) {
	let ret = {
		numpages: 0,
		numrender: 0,
		info: null,
		metadata: null,
		text: "",
		version: null
	};

	options = { ...DEFAULT_OPTIONS, ...options };

	ret.version = PDFJS.version;

	// Get document info from main process
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

	doc.destroy();

	// Divide work into chunks
	const chunks = [];
	for (let i = 1; i <= counter; i += options.chunkSize) {
		chunks.push({
			start: i,
			end: Math.min(i + options.chunkSize - 1, counter),
			index: chunks.length
		});
	}

	// Process chunks using child process pool
	const results = await processChunksWithChildren(
		dataBuffer,
		chunks,
		options
	);

	ret.text = results.join('\n\n');
	ret.numrender = counter;

	return ret;
}

/**
 * Process chunks using a pool of child processes
 */
async function processChunksWithChildren(dataBuffer, chunks, options) {
	const results = new Array(chunks.length);
	const maxConcurrent = Math.min(options.maxProcesses, chunks.length);
	let completedChunks = 0;
	let activeProcesses = 0;
	let chunkIndex = 0;

	// Convert buffer to base64 once (more efficient than per-process)
	const base64Buffer = dataBuffer.toString('base64');

	return new Promise((resolve, reject) => {
		function startChildProcess() {
			if (chunkIndex >= chunks.length) {
				if (activeProcesses === 0) {
					resolve(results);
				}
				return;
			}

			const chunk = chunks[chunkIndex];
			const currentIndex = chunkIndex;
			chunkIndex++;
			activeProcesses++;

			// Fork child process with absolute path (npm-safe)
			const childPath = path.join(__dirname, 'pdf-child.js');
			const child = fork(childPath, [], {
				stdio: ['inherit', 'inherit', 'inherit', 'ipc']
			});

			let messageReceived = false;
			let timedOut = false;

			// Set timeout for this process
			const timeout = setTimeout(() => {
				if (!messageReceived) {
					timedOut = true;
					child.kill('SIGKILL');
					const errorMsg = `Child process timeout (chunk ${currentIndex + 1}/${chunks.length}) - exceeded ${options.processTimeout}ms`;
					reject(new Error(errorMsg));
				}
			}, options.processTimeout);

			// Listen for response
			child.on('message', (message) => {
				clearTimeout(timeout);
				messageReceived = true;

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

					// Give time for message to be fully processed before killing
					setImmediate(() => {
						if (child.connected) {
							child.disconnect();
							child.kill();
						}
					});
				} else {
					// Error case
					child.disconnect();
					child.kill();
					const errorMsg = `Child process error (chunk ${currentIndex + 1}/${chunks.length}): ${message.error}`;
					reject(new Error(errorMsg));
				}
			});

			// Handle errors
			child.on('error', (error) => {
				clearTimeout(timeout);
				if (!messageReceived && !timedOut) {
					child.kill();
					const errorMsg = `Child process runtime error (chunk ${currentIndex + 1}/${chunks.length}): ${error.message}`;
					reject(new Error(errorMsg));
				}
			});

			// Handle exit - this is where we decrement activeProcesses
			child.on('exit', (code, signal) => {
				clearTimeout(timeout);

				// Always decrement when process exits
				const wasActive = activeProcesses > 0;
				if (wasActive) {
					activeProcesses--;
				}

				// Handle different exit scenarios
				if (messageReceived && (code === 0 || code === null)) {
					// Success - start next if available, otherwise check if done
					if (chunkIndex < chunks.length) {
						startChildProcess();
					} else if (activeProcesses === 0) {
						// All done!
						resolve(results);
					}
				} else if (code !== 0 && !messageReceived && !timedOut) {
					// Error exit without message (and not timeout)
					const errorMsg = `Child process exited with code ${code} (chunk ${currentIndex + 1}/${chunks.length})`;
					reject(new Error(errorMsg));
				} else if (activeProcesses === 0 && chunkIndex >= chunks.length) {
					// All chunks assigned and all processes done
					resolve(results);
				}
			});

			// Send work to child
			child.send({
				dataBuffer: base64Buffer,
				startPage: chunk.start,
				endPage: chunk.end,
				batchSize: options.batchSize,
				verbosityLevel: options.verbosityLevel
			});
		}

		// Start initial batch of child processes
		for (let i = 0; i < maxConcurrent; i++) {
			startChildProcess();
		}
	});
}

module.exports = PDFProcesses;
module.exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;

