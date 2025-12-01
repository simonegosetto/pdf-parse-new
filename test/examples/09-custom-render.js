/**
 * Example 09: Custom render_page function
 *
 * Demonstrates how to use a custom render_page function
 * with different parsing strategies (default, workers, processes)
 */

const fs = require('fs');
const path = require('path');

// Import parsers
const pdfParse = require('../../lib/pdf-parse.js');
const pdfParseWorkers = require('../../lib/pdf-parse-workers.js');
const pdfParseProcesses = require('../../lib/pdf-parse-processes.js');

// Custom render function that adds page numbers and formats output differently
function customRenderPage(pageData) {
	let render_options = {
		normalizeWhitespace: true,
		disableCombineTextItems: false
	}

	return pageData.getTextContent(render_options)
		.then(function (textContent) {
			let lastY, text = '';
			const Y_TOLERANCE = 1.0;

			// Add page marker at the start
			text = `\n[Page ${pageData.pageNumber}]\n`;

			for (let item of textContent.items) {
				const currentY = item.transform[5];
				const isNewLine = lastY !== undefined && Math.abs(currentY - lastY) > Y_TOLERANCE;

				if (isNewLine) {
					text += '\n';
				}

				// Add text with custom formatting (uppercase)
				text += item.str.toUpperCase();
				lastY = currentY;
			}

			return text;
		});
}

async function testCustomRender() {
	console.log('Testing custom render_page function...\n');

	// Read test PDF
	const dataBuffer = fs.readFileSync(path.join(__dirname, '../data/01-valid.pdf'));

	try {
		// Test 1: Default parser with custom render
		console.log('1. Testing default parser with custom render...');
		const result1 = await pdfParse(dataBuffer, {
			pagerender: customRenderPage,
			max: 2 // Only parse first 2 pages for faster testing
		});
		console.log('✓ Default parser completed');
		console.log('First 200 chars:', result1.text.substring(0, 200));
		console.log('');

		// Test 2: Workers parser with custom render
		console.log('2. Testing workers parser with custom render...');
		const result2 = await pdfParseWorkers(dataBuffer, {
			pagerender: customRenderPage,
			max: 2,
			maxWorkers: 2,
			chunkSize: 1
		});
		console.log('✓ Workers parser completed');
		console.log('First 200 chars:', result2.text.substring(0, 200));
		console.log('');

		// Test 3: Processes parser with custom render
		console.log('3. Testing processes parser with custom render...');
		const result3 = await pdfParseProcesses(dataBuffer, {
			pagerender: customRenderPage,
			max: 2,
			maxProcesses: 2,
			chunkSize: 1
		});
		console.log('✓ Processes parser completed');
		console.log('First 200 chars:', result3.text.substring(0, 200));
		console.log('');

		// Compare results
		console.log('Comparing results...');
		if (result1.text === result2.text && result2.text === result3.text) {
			console.log('✓ All parsers produced identical output!');
		} else {
			console.log('⚠ Results differ between parsers');
			console.log('Default length:', result1.text.length);
			console.log('Workers length:', result2.text.length);
			console.log('Processes length:', result3.text.length);
		}

		console.log('\n✓ All tests completed successfully!');

	} catch (error) {
		console.error('✗ Test failed:', error.message);
		console.error(error.stack);
		process.exit(1);
	}
}

// Run the test
testCustomRender().catch(err => {
	console.error('Unhandled error:', err);
	process.exit(1);
});

