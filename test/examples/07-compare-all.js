#!/usr/bin/env node

/**
 * Example: Compare All Methods
 * Benchmark all parsing methods on the same PDF
 */

const fs = require('fs');
const PDF = require('../../index');
const PDFStream = require('../../lib/pdf-parse-stream');
const PDFWorkers = require('../../lib/pdf-parse-workers');
const PDFProcesses = require('../../lib/pdf-parse-processes');
const SmartParser = require('../../lib/SmartPDFParser');

async function compareAll() {
	console.log('=== Compare All Parsing Methods ===\n');

	const testFile = './test/data/test_9000.pdf';

	if (!fs.existsSync(testFile)) {
		console.log('⚠️  Large test file not found:', testFile);
		console.log('   Using smaller file for demonstration...\n');
		return compareSmall();
	}

	const dataBuffer = fs.readFileSync(testFile);
	console.log(`File: ${testFile}`);
	console.log(`Size: ${(dataBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);

	const results = [];

	// Test Workers
	try {
		console.log('Testing Workers...');
		const start = Date.now();
		const result = await PDFWorkers(dataBuffer, { maxWorkers: 4 });
		const duration = Date.now() - start;
		results.push({ method: 'Workers', duration, pages: result.numpages });
		console.log(`✅ Workers: ${duration}ms\n`);
	} catch (error) {
		console.log(`❌ Workers failed: ${error.message}\n`);
	}

	// Test Processes
	try {
		console.log('Testing Processes...');
		const start = Date.now();
		const result = await PDFProcesses(dataBuffer, { maxProcesses: 4 });
		const duration = Date.now() - start;
		results.push({ method: 'Processes', duration, pages: result.numpages });
		console.log(`✅ Processes: ${duration}ms\n`);
	} catch (error) {
		console.log(`❌ Processes failed: ${error.message}\n`);
	}

	// Test SmartParser
	try {
		console.log('Testing SmartParser...');
		const parser = new SmartParser();
		const start = Date.now();
		const result = await parser.parse(dataBuffer);
		const duration = Date.now() - start;
		results.push({
			method: `SmartParser (${result._meta.method})`,
			duration,
			pages: result.numpages
		});
		console.log(`✅ SmartParser: ${duration}ms\n`);
	} catch (error) {
		console.log(`❌ SmartParser failed: ${error.message}\n`);
	}

	// Show comparison
	if (results.length > 0) {
		console.log('📊 Comparison Results:');
		console.log('─'.repeat(60));
		results.sort((a, b) => a.duration - b.duration);

		const fastest = results[0].duration;
		results.forEach((r, i) => {
			const speedup = i === 0 ? 'FASTEST' : `${((fastest / r.duration) * 100).toFixed(1)}% of fastest`;
			console.log(`${(i + 1)}. ${r.method.padEnd(25)} ${r.duration.toString().padStart(6)}ms  (${speedup})`);
		});
		console.log();
	}
}

async function compareSmall() {
	const testFile = './test/data/01-valid.pdf';
	const dataBuffer = fs.readFileSync(testFile);

	console.log(`File: ${testFile}`);
	console.log(`Size: ${(dataBuffer.length / 1024).toFixed(2)} KB\n`);

	const results = [];

	// Test basic
	const start1 = Date.now();
	const result1 = await PDF(dataBuffer);
	results.push({ method: 'Basic', duration: Date.now() - start1 });

	// Test batch
	const start2 = Date.now();
	const result2 = await PDF(dataBuffer, { parallelizePages: true, batchSize: 5 });
	results.push({ method: 'Batch-5', duration: Date.now() - start2 });

	// Test SmartParser
	const parser = new SmartParser();
	const start3 = Date.now();
	const result3 = await parser.parse(dataBuffer);
	results.push({ method: `SmartParser (${result3._meta.method})`, duration: Date.now() - start3 });

	console.log('📊 Comparison Results:');
	console.log('─'.repeat(60));
	results.sort((a, b) => a.duration - b.duration);
	results.forEach((r, i) => {
		console.log(`${(i + 1)}. ${r.method.padEnd(30)} ${r.duration.toString().padStart(5)}ms`);
	});
	console.log();
}

compareAll();

