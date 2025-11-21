const SmartPDFParser = require('./lib/SmartPDFParser');
const PDF = require('./lib/pdf-parse');
const PDFStream = require('./lib/pdf-parse-stream');
const PDFAggressive = require('./lib/pdf-parse-aggressive');
const PDFProcesses = require('./lib/pdf-parse-processes');
const fs = require('fs');

console.log('=== Intensive Benchmark Collection ===\n');

/**
 * Test all methods on a PDF to collect comprehensive data
 */
async function benchmarkAllMethods(file) {
	const dataBuffer = fs.readFileSync(file);
	const results = [];

	console.log(`\n${'='.repeat(80)}`);
	console.log(`📄 Benchmarking: ${file}`);
	console.log(`   Size: ${(dataBuffer.length / 1024 / 1024).toFixed(2)} MB`);

	// Get page count
	let pages = 0;
	try {
		const quick = await PDF(dataBuffer, { max: 1, verbosityLevel: 0 });
		pages = quick.numpages;
		console.log(`   Pages: ${pages}`);
	} catch (error) {
		console.log(`   ⚠️  Could not determine page count`);
		return results;
	}

	console.log('='.repeat(80));

	// Test methods based on PDF size
	const methods = [];

	// Always test sequential and batch
	methods.push(
		{ name: 'sequential', fn: PDF, config: { parallelizePages: false } },
		{ name: 'batch-5', fn: PDF, config: { parallelizePages: true, batchSize: 5 } },
		{ name: 'batch-10', fn: PDF, config: { parallelizePages: true, batchSize: 10 } }
	);

	if (pages > 50) {
		methods.push(
			{ name: 'batch-20', fn: PDF, config: { parallelizePages: true, batchSize: 20 } }
		);
	}

	if (pages > 100) {
		methods.push(
			{ name: 'stream', fn: PDFStream, config: { chunkSize: 500, batchSize: 10 } },
			{ name: 'aggressive', fn: PDFAggressive, config: { chunkSize: 500, batchSize: 20 } }
		);
	}

	if (pages > 500) {
		methods.push(
			{ name: 'processes', fn: PDFProcesses, config: { chunkSize: 500, batchSize: 10, maxProcesses: require('os').cpus().length - 1 } }
		);
	}

	// Test each method
	for (const method of methods) {
		try {
			console.log(`\n⚡ Testing ${method.name}...`);
			const start = performance.now();

			const result = await method.fn(dataBuffer, {
				verbosityLevel: 0,
				...method.config
			});

			const duration = performance.now() - start;

			console.log(`✓ ${method.name}: ${duration.toFixed(2)}ms (${result.text.length.toLocaleString()} chars)`);

			results.push({
				file: file.split('/').pop(),
				pages,
				size: dataBuffer.length,
				method: method.name,
				config: method.config,
				duration,
				characters: result.text.length,
				success: true,
				timestamp: Date.now()
			});

		} catch (error) {
			console.error(`✗ ${method.name}: ${error.message}`);
			results.push({
				file: file.split('/').pop(),
				pages,
				size: dataBuffer.length,
				method: method.name,
				config: method.config,
				duration: 0,
				success: false,
				error: error.message,
				timestamp: Date.now()
			});
		}
	}

	return results;
}

/**
 * Run comprehensive benchmarks
 */
async function runBenchmarks() {
	const testFiles = [
		'./test/data/01-valid.pdf',
		'./test/data/02-valid.pdf',
		'./test/data/04-valid.pdf',
		'./test/data/05-versions-space.pdf',
		'./test/data/test_373.pdf',
		'./test/data/test_9000.pdf'
	];

	const allResults = [];

	for (const file of testFiles) {
		if (!fs.existsSync(file)) {
			console.log(`\n⏭️  Skipping ${file} (not found)`);
			continue;
		}

		const results = await benchmarkAllMethods(file);
		allResults.push(...results);

		// Small delay between files
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	// Save results
	const outputFile = './intensive-benchmarks.json';
	fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));
	console.log(`\n\n✅ Collected ${allResults.length} benchmarks`);
	console.log(`📊 Results saved to: ${outputFile}`);

	// Analyze results
	analyzeResults(allResults);

	// Convert to smart parser format and save
	convertToSmartParserFormat(allResults);
}

/**
 * Analyze collected results
 */
function analyzeResults(results) {
	console.log(`\n${'='.repeat(80)}`);
	console.log('📊 Benchmark Analysis');
	console.log('='.repeat(80));

	// Group by file
	const byFile = {};
	for (const r of results) {
		if (!r.success) continue;
		if (!byFile[r.file]) {
			byFile[r.file] = [];
		}
		byFile[r.file].push(r);
	}

	// Show best method for each file
	console.log('\n🏆 Best Method Per File:');
	console.log('-'.repeat(80));

	for (const [file, fileResults] of Object.entries(byFile)) {
		const best = fileResults.reduce((a, b) => a.duration < b.duration ? a : b);
		const baseline = fileResults.find(r => r.method === 'sequential');

		if (baseline) {
			const improvement = ((baseline.duration - best.duration) / baseline.duration * 100).toFixed(2);
			const speedup = (baseline.duration / best.duration).toFixed(2);

			console.log(`\n${file}:`);
			console.log(`  Pages: ${best.pages}`);
			console.log(`  Best: ${best.method} - ${best.duration.toFixed(2)}ms`);
			console.log(`  Improvement: ${improvement}% faster (${speedup}x speedup)`);
			console.log(`  Baseline: sequential - ${baseline.duration.toFixed(2)}ms`);
		}
	}

	// Method comparison
	console.log(`\n\n📈 Method Performance Comparison:`);
	console.log('-'.repeat(80));

	const byMethod = {};
	for (const r of results) {
		if (!r.success) continue;
		if (!byMethod[r.method]) {
			byMethod[r.method] = [];
		}
		byMethod[r.method].push(r.duration);
	}

	const methodStats = [];
	for (const [method, durations] of Object.entries(byMethod)) {
		const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
		const min = Math.min(...durations);
		const max = Math.max(...durations);
		methodStats.push({ method, avg, min, max, count: durations.length });
	}

	methodStats.sort((a, b) => a.avg - b.avg);

	for (const stat of methodStats) {
		console.log(`\n${stat.method}:`);
		console.log(`  Average: ${stat.avg.toFixed(2)}ms`);
		console.log(`  Range: ${stat.min.toFixed(2)}ms - ${stat.max.toFixed(2)}ms`);
		console.log(`  Samples: ${stat.count}`);
	}
}

/**
 * Convert results to SmartPDFParser benchmark format
 */
function convertToSmartParserFormat(results) {
	const converted = results
		.filter(r => r.success)
		.map(r => ({
			timestamp: r.timestamp,
			pages: r.pages,
			size: r.size,
			complexity: estimateComplexity(r),
			method: r.method,
			config: r.config,
			duration: r.duration,
			success: true,
			cpuCores: require('os').cpus().length,
			availableMemory: require('os').freemem()
		}));

	const smartFile = './smart-parser-benchmarks.json';
	fs.writeFileSync(smartFile, JSON.stringify(converted, null, 2));
	console.log(`\n✅ Converted benchmarks saved to: ${smartFile}`);
	console.log(`   Ready for SmartPDFParser learning!`);
}

/**
 * Estimate complexity from benchmark result
 */
function estimateComplexity(result) {
	const bytesPerPage = result.size / result.pages;
	if (bytesPerPage < 10000) return 'simple';
	if (bytesPerPage > 100000) return 'complex';
	return 'medium';
}

// Run benchmarks
runBenchmarks().catch(error => {
	console.error('\n💥 Benchmark failed:', error);
	process.exit(1);
});

