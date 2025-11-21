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

// Monkey-patch Object.defineProperty to intercept workerSrc setter validation
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj, prop, descriptor) {
	// If PDF.js is trying to define workerSrc with a setter that validates
	if (prop === 'workerSrc' && descriptor.set) {
		// Replace the setter with one that doesn't validate
		const originalSetter = descriptor.set;
		descriptor.set = function(value) {
			// Just store the value without type checking
			try {
				originalSetter.call(this, value);
			} catch (e) {
				// Ignore validation errors - just don't set it
			}
		};
	}
	return originalDefineProperty.call(this, obj, prop, descriptor);
};

// Load PDF.js - now it won't throw errors on workerSrc
const PDFJS = require(`./pdf.js/v4.5.136/build/pdf.js`);

// Restore original defineProperty
Object.defineProperty = originalDefineProperty;

function render_page(pageData) {
	let render_options = {
		normalizeWhitespace: false,
		disableCombineTextItems: false
	}

	return pageData.getTextContent(render_options)
		.then(function (textContent) {
			let lastY, text = '';
			for (let item of textContent.items) {
				if (lastY === item.transform[5] || !lastY) {
					text += item.str;
				} else {
					text += '\n' + item.str;
				}
				lastY = item.transform[5];
			}
			return text;
		});
}

/**
 * Worker thread for processing a chunk of PDF pages
 */
(async () => {
	try {
		const { dataBuffer, startPage, endPage, batchSize, verbosityLevel } = workerData;

		// Convert buffer to Uint8Array (handle both Buffer and ArrayBuffer)
		let uint8Array;
		if (dataBuffer instanceof Uint8Array) {
			uint8Array = dataBuffer;
		} else if (dataBuffer instanceof ArrayBuffer) {
			uint8Array = new Uint8Array(dataBuffer);
		} else if (Buffer.isBuffer(dataBuffer)) {
			uint8Array = new Uint8Array(dataBuffer);
		} else if (Array.isArray(dataBuffer)) {
			uint8Array = new Uint8Array(dataBuffer);
		} else {
			throw new Error(`Unsupported dataBuffer type: ${typeof dataBuffer}`);
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
						.then(pageData => render_page(pageData))
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
		console.error('Worker error:', error);

		parentPort.postMessage({
			success: false,
			error: error.message,
			stack: error.stack
		});

		// Exit cleanly
		process.exit(0);
	}
})();

