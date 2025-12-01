#!/usr/bin/env node

/**
 * Example: SmartPDFParser
 * Automatic method selection based on PDF characteristics
 */

const fs = require('fs');
const SmartParser = require('../../lib/SmartPDFParser');

async function smartParse() {
	console.log('=== SmartPDFParser Example ===\n');

	const testFiles = [
		'../data/01-valid.pdf',
		'../data/02-valid.pdf',
		'../data/04-valid.pdf'
	];

	const parser = new SmartParser({
		oversaturationFactor: 1.5,
		enableFastPath: true,
		enableCache: true
	});

	console.log('Testing SmartPDFParser on multiple files:\n');

	for (const testFile of testFiles) {
		if (!fs.existsSync(testFile)) {
			console.log(`⏭️  Skipping ${testFile} (not found)\n`);
			continue;
		}

		const dataBuffer = fs.readFileSync(testFile);
		const sizeMB = (dataBuffer.length / 1024 / 1024).toFixed(2);

		console.log(`File: ${testFile}`);
		console.log(`Size: ${sizeMB} MB`);

		try {
			const start = Date.now();
			const result = await parser.parse(dataBuffer);
			const duration = Date.now() - start;

			console.log(`✅ Success!`);
			console.log(`   Method: ${result._meta.method}`);
			console.log(`   Duration: ${duration}ms`);
			console.log(`   Pages: ${result.numpages}`);
			console.log(`   Fast-path: ${result._meta.fastPath ? 'YES ⚡' : 'NO'}`);
			console.log(`   Cached: ${result._meta.cached ? 'YES 💾' : 'NO'}`);
			console.log(`   Common scenario: ${result._meta.commonScenario ? 'YES 📋' : 'NO'}`);
			console.log();

		} catch (error) {
			console.log(`❌ Error: ${error.message}\n`);
		}
	}

	// Show statistics
	console.log('📊 Parser Statistics:');
	const stats = parser.getStats();
	console.log(`   Total parses: ${stats.totalParses}`);
	console.log(`   Fast-path hits: ${stats.fastPathHits}`);
	console.log(`   Cache hits: ${stats.cacheHits}`);
	console.log(`   Tree navigations: ${stats.treeNavigations}`);
	console.log(`   Optimization rate: ${stats.optimizationRate}`);
	console.log(`   Average overhead: ${stats.averageOverhead}`);
	console.log();

	console.log('💡 SmartPDFParser automatically selects the best method!\n');
}

smartParse();

