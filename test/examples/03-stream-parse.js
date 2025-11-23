#!/usr/bin/env node

/**
 * Example: Streaming Parse
 * Memory-efficient parsing with progress tracking
 */

const fs = require('fs');
const PDFStream = require('../../lib/pdf-parse-stream');

async function streamParse() {
	console.log('=== Streaming Parse Example ===\n');

	const testFile = './test/data/01-valid.pdf';

	if (!fs.existsSync(testFile)) {
		console.error('Test file not found:', testFile);
		process.exit(1);
	}

	const dataBuffer = fs.readFileSync(testFile);
	console.log(`File: ${testFile}`);
	console.log(`Size: ${(dataBuffer.length / 1024).toFixed(2)} KB\n`);

	try {
		console.log('Starting streaming parse...');
		console.log('Progress:\n');

		let lastProgress = 0;
		const start = Date.now();

		const result = await PDFStream(dataBuffer, {
			chunkSize: 100,
			onChunkComplete: (progress) => {
				const percent = Math.floor(progress.progress);
				if (percent > lastProgress) {
					lastProgress = percent;
					process.stdout.write(`\r${'█'.repeat(Math.floor(percent/2))}${'░'.repeat(50-Math.floor(percent/2))} ${percent}%`);
				}
			}
		});

		const duration = Date.now() - start;

		console.log('\n\n✅ Success!');
		console.log(`Duration: ${duration}ms`);
		console.log(`Pages: ${result.numpages}`);
		console.log(`Characters: ${result.text.length}`);
		console.log(`\n💡 Streaming is memory-efficient for large PDFs!\n`);

	} catch (error) {
		console.error('\n❌ Error:', error.message);
		process.exit(1);
	}
}

streamParse();

