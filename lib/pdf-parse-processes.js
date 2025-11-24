const { fork } = require('child_process');
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

	// Validate pagerender option
	if (typeof options.pagerender != 'function') {
		options.pagerender = DEFAULT_OPTIONS.pagerender;
	}

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

	// Write buffer to temp file to avoid passing huge strings via IPC
	// This fixes OOM issues with large PDFs and many processes
	const tempDir = os.tmpdir();
	const tempFile = path.join(tempDir, `pdf-parse-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);

	try {
		require('fs').writeFileSync(tempFile, dataBuffer);
	} catch (err) {
		// Fallback to memory if file write fails (unlikely)
		console.warn('[pdf-parse] Failed to write temp file, falling back to memory:', err.message);
	}

	// Helper to cleanup temp file
	const cleanup = () => {
		if (require('fs').existsSync(tempFile)) {
			try {
				require('fs').unlinkSync(tempFile);
			} catch (e) { /* ignore */ }
		}
	};

	return new Promise((resolve, reject) => {
		function startChildProcess() {
			if (chunkIndex >= chunks.length) {
				if (activeProcesses === 0) {
					cleanup();
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
					// Don't reject immediately, just fail this chunk?
					// For now, consistent behavior with previous version: reject
					cleanup();
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
					cleanup();
					reject(new Error(errorMsg));
				}
			});

			// Handle errors
			child.on('error', (error) => {
				clearTimeout(timeout);
				if (!messageReceived && !timedOut) {
					child.kill();
					const errorMsg = `Child process runtime error (chunk ${currentIndex + 1}/${chunks.length}): ${error.message}`;
					cleanup();
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
						cleanup();
						resolve(results);
					}
				} else if (code !== 0 && !messageReceived && !timedOut) {
					// Error exit without message (and not timeout)
					const errorMsg = `Child process exited with code ${code} (chunk ${currentIndex + 1}/${chunks.length})`;
					cleanup();
					reject(new Error(errorMsg));
				} else if (activeProcesses === 0 && chunkIndex >= chunks.length) {
					// All chunks assigned and all processes done
					cleanup();
					resolve(results);
				}
			});

			// Send work to child
			// Pass file path if available, otherwise fallback to base64 (legacy/fallback)
			const payload = {
				startPage: chunk.start,
				endPage: chunk.end,
				batchSize: options.batchSize,
				verbosityLevel: options.verbosityLevel,
				pagerenderString: options.pagerender.toString() // Serialize function
			};

			if (require('fs').existsSync(tempFile)) {
				payload.pdfFilePath = tempFile;
			} else {
				// Fallback to base64 if temp file creation failed
				payload.dataBuffer = dataBuffer.toString('base64');
			}

			child.send(payload);
		}

		// Start initial batch of child processes
		for (let i = 0; i < maxConcurrent; i++) {
			startChildProcess();
		}
	});
}
module.exports = PDFProcesses;
module.exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;

