#!/usr/bin/env node

/**
 * Example: Basic PDF parsing
 * Uses the standard parse function with default options
 */

const fs = require('fs');
const PDF = require('../../index');

async function basicParse() {
	console.log('=== Basic PDF Parsing ===\n');

	const testFile = './test/data/01-valid.pdf';

	if (!fs.existsSync(testFile)) {
		console.error('Test file not found:', testFile);
		process.exit(1);
	}

	const dataBuffer = fs.readFileSync(testFile);
	console.log(`File: ${testFile}`);
	console.log(`Size: ${(dataBuffer.length / 1024).toFixed(2)} KB\n`);

	try {
		const start = Date.now();
		const result = await PDF(dataBuffer);
		const duration = Date.now() - start;

		console.log('✅ Success!');
		console.log(`Duration: ${duration}ms`);
		console.log(`Pages: ${result.numpages}`);
		console.log(`Characters: ${result.text.length}`);
		console.log(`PDF Version: ${result.version}`);
		console.log(`\nFirst 200 characters:\n${result.text.substring(0, 200)}...\n`);

	} catch (error) {
		console.error('❌ Error:', error.message);
		process.exit(1);
	}
}

basicParse();

