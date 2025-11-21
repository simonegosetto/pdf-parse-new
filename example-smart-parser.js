// Import SmartPDFParser - try via index, fallback to direct
let SmartPDFParser;
try {
	const pdf = require('./');
	SmartPDFParser = pdf.SmartPDFParser;
	if (!SmartPDFParser) {
		throw new Error('SmartPDFParser not found in index exports');
	}
} catch (error) {
	console.log('⚠️  Falling back to direct import from lib/');
	SmartPDFParser = require('./lib/SmartPDFParser');
}

const fs = require('fs');

console.log('=== Smart PDF Parser Example ===\n');

/**
 * Example 1: Basic usage - automatic method selection
 */
async function example1() {
	console.log('Example 1: Basic automatic parsing\n');
	console.log('-'.repeat(80));

	const parser = new SmartPDFParser({
		enableLearning: true
	});

	const file = './test/data/test_373.pdf';
	const buffer = fs.readFileSync(file);

	const result = await parser.parse(buffer);

	console.log(`\n✅ Parsed successfully!`);
	console.log(`   Method: ${result._meta.method}`);
	console.log(`   Pages: ${result.numpages}`);
	console.log(`   Characters: ${result.text.length.toLocaleString()}`);
	console.log(`   Time: ${result._meta.duration.toFixed(2)}ms\n`);
}

/**
 * Example 2: With custom thresholds
 */
async function example2() {
	console.log('\nExample 2: Custom thresholds\n');
	console.log('-'.repeat(80));

	const parser = new SmartPDFParser({
		enableLearning: true,
		smallPDFPages: 100,    // Consider PDFs < 100 pages as "small"
		mediumPDFPages: 750,   // Adjust medium threshold
		largePDFPages: 1500    // Adjust large threshold
	});

	const file = './test/data/test_373.pdf';
	const buffer = fs.readFileSync(file);

	const result = await parser.parse(buffer);

	console.log(`\n✅ With custom thresholds:`);
	console.log(`   Method: ${result._meta.method}`);
	console.log(`   Time: ${result._meta.duration.toFixed(2)}ms\n`);
}

/**
 * Example 3: Force specific method
 */
async function example3() {
	console.log('\nExample 3: Force specific method\n');
	console.log('-'.repeat(80));

	const parser = new SmartPDFParser({
		enableLearning: false,
		forceMethod: 'aggressive'  // Always use aggressive
	});

	const file = './test/data/test_373.pdf';
	const buffer = fs.readFileSync(file);

	const result = await parser.parse(buffer);

	console.log(`\n✅ Forced aggressive method:`);
	console.log(`   Method: ${result._meta.method}`);
	console.log(`   Time: ${result._meta.duration.toFixed(2)}ms\n`);
}

/**
 * Example 4: Multiple PDFs with learning
 */
async function example4() {
	console.log('\nExample 4: Learning from multiple PDFs\n');
	console.log('-'.repeat(80));

	const parser = new SmartPDFParser({
		enableLearning: true,
		benchmarkFile: './example-benchmarks.json'
	});

	const files = [
		'./test/data/01-valid.pdf',
		'./test/data/02-valid.pdf',
		'./test/data/test_373.pdf'
	];

	for (const file of files) {
		if (!fs.existsSync(file)) continue;

		console.log(`\nParsing: ${file}`);
		const buffer = fs.readFileSync(file);
		const result = await parser.parse(buffer);

		console.log(`  ✓ ${result._meta.method} - ${result._meta.duration.toFixed(2)}ms - ${result.numpages} pages`);
	}

	// Show statistics
	console.log('\n📊 Statistics after learning:');
	const stats = parser.getStats();
	console.log(`   Total parses: ${stats.totalParses}`);
	console.log(`   Benchmarks: ${stats.benchmarksCollected}`);
	console.log(`\n   Method usage:`);
	for (const [method, count] of Object.entries(stats.methodUsage)) {
		if (count > 0) {
			console.log(`     ${method}: ${count}x`);
		}
	}

	// Analyze learned data
	console.log('\n🔍 Learned recommendations:');
	const analysis = parser.analyzeBenchmarks();
	for (const [range, data] of Object.entries(analysis)) {
		if (data.recommended) {
			console.log(`   ${range}: ${data.recommended} (${data.samples} samples)`);
		}
	}
	console.log();
}

/**
 * Example 5: Production usage pattern
 */
async function example5() {
	console.log('\nExample 5: Production usage pattern\n');
	console.log('-'.repeat(80));

	// Singleton instance for entire application
	const parser = new SmartPDFParser({
		enableLearning: true,
		benchmarkFile: './production-benchmarks.json',
		maxMemoryUsage: require('os').totalmem() * 0.6  // Use 60% of RAM max
	});

	// Parse function that can be called from anywhere
	async function parsePDF(filePath) {
		try {
			const buffer = fs.readFileSync(filePath);
			const result = await parser.parse(buffer);

			return {
				success: true,
				text: result.text,
				pages: result.numpages,
				method: result._meta.method,
				duration: result._meta.duration
			};
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	// Example usage
	const file = './test/data/test_373.pdf';
	if (fs.existsSync(file)) {
		const result = await parsePDF(file);
		console.log(`\n✅ Production parse:`);
		console.log(`   Success: ${result.success}`);
		console.log(`   Method: ${result.method}`);
		console.log(`   Pages: ${result.pages}`);
		console.log(`   Time: ${result.duration.toFixed(2)}ms`);
	}

	// Periodically export benchmarks for analysis
	parser.exportBenchmarks('./production-report.json');
	console.log(`\n📊 Benchmark report exported\n`);
}

// Run examples
async function runExamples() {
	try {
		await example1();
		await example2();
		await example3();
		await example4();
		await example5();

		console.log('='.repeat(80));
		console.log('✅ All examples completed!\n');

	} catch (error) {
		console.error('❌ Example failed:', error);
		process.exit(1);
	}
}

runExamples();

