#!/usr/bin/env node

/**
 * Example: Child Processes
 * Multi-processing for maximum performance on huge PDFs
 */

const fs = require('fs');
const os = require('os');
const PDFProcesses = require('../../lib/pdf-parse-processes');

async function processesParse() {
	console.log('=== Child Processes Example ===\n');

	const testFile = '../data/test_9000.pdf';

	if (!fs.existsSync(testFile)) {
		console.log('⚠️  Large test file not found:', testFile);
		console.log('   This example needs a large PDF (1000+ pages)');
		console.log('   Using smaller test file instead...\n');
		return alternativeTest();
	}

	const dataBuffer = fs.readFileSync(testFile);
	const cpuCores = os.cpus().length;

	console.log(`File: ${testFile}`);
	console.log(`Size: ${(dataBuffer.length / 1024 / 1024).toFixed(2)} MB`);
	console.log(`CPU Cores: ${cpuCores}\n`);

	try {
		console.log('Starting processes parse...');
		console.log('Progress:\n');

		const start = Date.now();

		const result = await PDFProcesses(dataBuffer, {
			chunkSize: 500,
			batchSize: 10,
			maxProcesses: Math.floor(cpuCores * 1.5), // Oversaturation!
			onProgress: ({ completedChunks, totalChunks, progress }) => {
				process.stdout.write(`\r${'█'.repeat(Math.floor(progress/2))}${'░'.repeat(50-Math.floor(progress/2))} ${progress}% (${completedChunks}/${totalChunks} chunks)`);
			}
		});

		const duration = Date.now() - start;

		console.log('\n\n✅ Success!');
		console.log(`Duration: ${duration}ms`);
		console.log(`Pages: ${result.numpages}`);
		console.log(`Characters: ${result.text.length.toLocaleString()}`);
		console.log(`\n💡 Processes are often faster than workers for huge PDFs!\n`);

	} catch (error) {
		console.error('\n❌ Error:', error.message);
		process.exit(1);
	}
}

async function alternativeTest() {
	const testFile = './test/data/01-valid.pdf';
	const dataBuffer = fs.readFileSync(testFile);
	const cpuCores = os.cpus().length;

	console.log(`File: ${testFile} (small test)`);
	console.log(`CPU Cores: ${cpuCores}\n`);

	const start = Date.now();
	const result = await PDFProcesses(dataBuffer, { maxProcesses: 2 });
	const duration = Date.now() - start;

	console.log(`✅ Completed in ${duration}ms`);
	console.log(`Pages: ${result.numpages}`);
	console.log(`\n💡 Processes work best on PDFs with 1000+ pages!\n`);
}

processesParse();

