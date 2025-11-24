const { parentPort, workerData } = require('worker_threads');

// Set up minimal environment BEFORE loading PDF.js
if (!globalThis.DOMParser) {
	globalThis.DOMParser = class DOMParser {
		parseFromString() { return { documentElement: { textContent: '' } }; }
	};
}
if (!globalThis.navigator) {
	globalThis.navigator = { userAgent: 'Node.js' };
}

// Load PDF.js
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

/**
 * Worker thread for processing a chunk of PDF pages
 */
(async () => {
	try {
		// Validate worker data
		if (!workerData) {
			throw new Error('No workerData received');
		}

		const { dataBuffer, startPage, endPage, batchSize, verbosityLevel, pagerenderString } = workerData;

		if (!dataBuffer) {
			throw new Error('No dataBuffer in workerData');
		}

		// Reconstruct custom render_page function if provided
		let customRenderPage = render_page; // Default
		if (pagerenderString) {
			try {
				// Reconstruct the function from string
				// Use indirect eval to avoid 'use strict' issues
				customRenderPage = (0, eval)(`(${pagerenderString})`);
			} catch (err) {
				console.error('Failed to reconstruct custom pagerender function:', err.message);
				// Fall back to default render_page
			}
		}

		// Convert buffer to Uint8Array (handle both Buffer and ArrayBuffer)
		let uint8Array;
		if (dataBuffer instanceof Uint8Array) {
			uint8Array = dataBuffer;
		} else if (dataBuffer instanceof ArrayBuffer) {
			uint8Array = new Uint8Array(dataBuffer);
		} else if (Buffer.isBuffer(dataBuffer)) {
			uint8Array = new Uint8Array(dataBuffer);
		} else if (Array.isArray(dataBuffer)) {
			// Plain array from main thread - convert to Uint8Array
			uint8Array = new Uint8Array(dataBuffer);
		} else {
			throw new Error(`Unsupported dataBuffer type: ${typeof dataBuffer}`);
		}

		if (!uint8Array || uint8Array.length === 0) {
			throw new Error('Empty or invalid buffer data');
		}

		// Disable internal workers - CRITICAL for worker threads
		PDFJS.disableWorker = true;

		// Create document with explicit worker disabled
		const doc = await PDFJS.getDocument({
			verbosity: verbosityLevel || 0,
			data: uint8Array,
			disableAutoFetch: true,
			disableStream: true,
			disableRange: true,
			// Don't use workers inside workers
			worker: null
		}).promise;

		const pageTexts = [];

		// Process pages in batches within this worker
		for (let i = startPage; i <= endPage; i += batchSize) {
			const batchEnd = Math.min(i + batchSize - 1, endPage);
			const batchPromises = [];

			for (let j = i; j <= batchEnd; j++) {
				batchPromises.push(
					doc.getPage(j)
						.then(pageData => customRenderPage(pageData))
						.catch((err) => {
							console.error(`Error rendering page ${j}:`, err.message);
							return "";
						})
				);
			}

			const batchResults = await Promise.all(batchPromises);
			pageTexts.push(...batchResults);
		}

		doc.destroy();

		// Send result back to main thread
		parentPort.postMessage({
			success: true,
			text: pageTexts.join('\n\n'),
			pagesProcessed: pageTexts.length
		});

	} catch (error) {
		// Log error to console for debugging
		console.error('Worker error:', error.message);
		console.error('Stack:', error.stack);

		try {
			// Try to send error message
			parentPort.postMessage({
				success: false,
				error: error.message,
				stack: error.stack
			});
		} catch (postError) {
			console.error('Failed to post error message:', postError.message);
		}

		// Exit cleanly - important: use 0 not 1
		process.exit(0);
	}
})().catch(error => {
	// Catch any unhandled promise rejections
	console.error('Unhandled worker error:', error.message);
	console.error('Stack:', error.stack);

	try {
		parentPort.postMessage({
			success: false,
			error: error.message,
			stack: error.stack
		});
	} catch (e) {
		console.error('Failed to post error:', e.message);
	}

	process.exit(0);
});

