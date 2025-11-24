const PDFJS = require('./pdf.js/v4.5.136/build/pdf.js');

/**
 * Child process for parsing PDF pages
 * Communicates via IPC with parent process
 */

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

// Listen for messages from parent
process.on('message', async (message) => {
	try {
		const { dataBuffer, pdfFilePath, startPage, endPage, batchSize, verbosityLevel, pagerenderString } = message;

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

		let uint8Array;

		if (pdfFilePath) {
			// Read from temp file (memory efficient)
			const buffer = require('fs').readFileSync(pdfFilePath);
			uint8Array = new Uint8Array(buffer);
		} else if (dataBuffer) {
			// Legacy/Fallback: Convert base64 back to buffer
			const buffer = Buffer.from(dataBuffer, 'base64');
			uint8Array = new Uint8Array(buffer);
		} else {
			throw new Error('No PDF data provided (missing dataBuffer or pdfFilePath)');
		}

		// Disable workers
		PDFJS.disableWorker = true;

		// Load PDF
		const doc = await PDFJS.getDocument({
			verbosity: verbosityLevel || 0,
			data: uint8Array,
			disableAutoFetch: true,
			disableStream: true,
			disableRange: true
		}).promise;

		const pageTexts = [];

		// Process pages in batches
		for (let i = startPage; i <= endPage; i += batchSize) {
			const batchEnd = Math.min(i + batchSize - 1, endPage);
			const batchPromises = [];

			for (let j = i; j <= batchEnd; j++) {
				batchPromises.push(
					doc.getPage(j)
						.then(pageData => customRenderPage(pageData))
						.catch(() => "")
				);
			}

			const batchResults = await Promise.all(batchPromises);
			pageTexts.push(...batchResults);
		}

		doc.destroy();

		// Send result back to parent
		process.send({
			success: true,
			text: pageTexts.join('\n\n'),
			pagesProcessed: pageTexts.length
		});

		// Let parent kill this process - don't exit manually
		// This prevents race conditions with message delivery

	} catch (error) {
		// Send error back to parent
		if (process.connected) {
			process.send({
				success: false,
				error: error.message,
				stack: error.stack
			});
		}

		// Exit with error code
		process.exit(1);
	}
});

// Handle unexpected errors
process.on('uncaughtException', (error) => {
	process.send({
		success: false,
		error: `Uncaught exception: ${error.message}`,
		stack: error.stack
	});
	process.exit(1);
});

process.on('unhandledRejection', (error) => {
	process.send({
		success: false,
		error: `Unhandled rejection: ${error.message}`,
		stack: error.stack
	});
	process.exit(1);
});

