#!/usr/bin/env node

/**
 * Example: Batch Processing
 * Tests different batch sizes for optimal performance
 */

const fs = require('fs');
const PDF = require('../../index');

async function batchParse() {
	console.log('=== Batch Processing Example ===\n');

	const testFile = './test/data/01-valid.pdf';

	if (!fs.existsSync(testFile)) {
		console.error('Test file not found:', testFile);
		process.exit(1);
	}

	const dataBuffer = fs.readFileSync(testFile);
	console.log(`File: ${testFile}`);
	console.log(`Size: ${(dataBuffer.length / 1024).toFixed(2)} KB\n`);

	// Get page count first
	const quickCheck = await PDF(dataBuffer, { max: 1 });
	const totalPages = quickCheck.numpages;
	console.log(`Total pages: ${totalPages}\n`);

	// Test different batch sizes
	const batchSizes = [5, 10, 20, 50];

	console.log('Testing different batch sizes:\n');

	for (const batchSize of batchSizes) {
		try {
			const start = Date.now();
			const result = await PDF(dataBuffer, {
				parallelizePages: true,
				batchSize: batchSize
			});
			const duration = Date.now() - start;

			console.log(`Batch ${batchSize.toString().padStart(2)}:  ${duration.toString().padStart(4)}ms  ✅`);

		} catch (error) {
			console.log(`Batch ${batchSize.toString().padStart(2)}:  ERROR ❌ ${error.message}`);
		}
	}

	console.log('\n💡 Recommendation:');
	console.log(`   For ${totalPages} pages: Use batch 5-10 for best results\n`);
}

batchParse();

