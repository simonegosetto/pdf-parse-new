const SmartPDFParser = require('./lib/SmartPDFParser');
const PDF = require('./lib/pdf-parse');
const PDFStream = require('./lib/pdf-parse-stream');
const PDFAggressive = require('./lib/pdf-parse-aggressive');
const PDFProcesses = require('./lib/pdf-parse-processes');
const PDFWorkers = require('./lib/pdf-parse-workers');
const fs = require('fs');
const { URL } = require('url');
const axios = require("axios");

console.log('=== Intensive Benchmark Collection ===\n');

/**
 * Download PDF from remote URL
 */
async function downloadPDF(url) {
	try {
		console.log(`📥 Downloading PDF from: ${url}`);

		const response = await axios.get(url, {
			responseType: 'arraybuffer',
			timeout: 30000, // 30 second timeout
			maxRedirects: 5
		});

		const buffer = Buffer.from(response.data);
		console.log(`✓ Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
		return buffer;
	} catch (error) {
		if (error.code === 'ECONNABORTED') {
			throw new Error('Download timeout (30s)');
		} else if (error.response) {
			throw new Error(`Failed to download: HTTP ${error.response.status}`);
		} else {
			throw new Error(`Download failed: ${error.message}`);
		}
	}
}

/**
 * Check if string is a URL
 */
function isURL(str) {
	try {
		const url = new URL(str);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Load PDF from file or URL
 */
async function loadPDF(source) {
	if (isURL(source)) {
		return await downloadPDF(source);
	} else {
		return fs.readFileSync(source);
	}
}

/**
 * Test all methods on a PDF to collect comprehensive data
 */
async function benchmarkAllMethods(file) {
	const dataBuffer = await loadPDF(file);

	const results = [];
	const fileName = isURL(file) ? Math.random().toString() /*new URL(file).pathname.split('/').pop()*/ : file.split(/[/\\]/).pop();
	console.log(`Starting benchmarks for: ${fileName}`);

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
		{ name: 'batch-10', fn: PDF, config: { parallelizePages: true, batchSize: 10 } },
	);

	if (pages > 50) {
		methods.push(
			{ name: 'batch-20', fn: PDF, config: { parallelizePages: true, batchSize: 20 } },
/*		);
	}

	if (pages > 100) {
		methods.push(*/
			{ name: 'stream', fn: PDFStream, config: { chunkSize: 500, batchSize: 10 } },
			{ name: 'aggressive', fn: PDFAggressive, config: { chunkSize: 500, batchSize: 20 } },
			{ name: 'workers', fn: PDFWorkers, config: { chunkSize: 500, batchSize: 10, maxProcesses: require('os').cpus().length - 1 } },
			{ name: 'processes', fn: PDFProcesses, config: { chunkSize: 500, batchSize: 10, maxProcesses: require('os').cpus().length - 1 } }
		);
	}

	/*if (pages > 500) {
		methods.push(
			{ name: 'workers', fn: PDFWorkers, config: { chunkSize: 500, batchSize: 10, maxProcesses: require('os').cpus().length - 1 } },
			{ name: 'processes', fn: PDFProcesses, config: { chunkSize: 500, batchSize: 10, maxProcesses: require('os').cpus().length - 1 } }
		);
	}*/

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
				file: fileName,
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
				file: fileName,
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
	// Load test files from external JSON
	const testFilesData = JSON.parse(fs.readFileSync('./test-pdfs.json', 'utf8'));
	const testFiles = testFilesData.urls || [];

	const allResults = [];
	const outputFile = './intensive-benchmarks.json';

	for (const file of testFiles) {
		if (!isURL(file) && !fs.existsSync(file)) {
			console.log(`\n⏭️  Skipping ${file} (not found)`);
			continue;
		}

		try {
			const results = await benchmarkAllMethods(file);
			allResults.push(...results);

			// Save results after each file (incremental save)
			fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));

			// Also save smart parser format incrementally
			const smartFile = './smart-parser-benchmarks.json';
			const converted = convertToSmartParserFormatData(allResults);
			fs.writeFileSync(smartFile, JSON.stringify(converted, null, 2));

			console.log(`💾 Progress saved (${allResults.length} results so far)`);
		} catch (error) {
			console.error(`\n❌ Fatal error processing ${file}:`);
			console.error(`   ${error.message}`);
			console.log(`   Continuing with next file...\n`);

			// Log the failed file
			allResults.push({
				file: isURL(file) ? new URL(file).pathname.split('/').pop() : file.split(/[/\\]/).pop(),
				pages: 0,
				size: 0,
				method: 'N/A',
				config: {},
				duration: 0,
				success: false,
				error: `Fatal error: ${error.message}`,
				timestamp: Date.now()
			});

			// Save even failed attempts
			fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));

			// Also save smart parser format incrementally
			const smartFile = './smart-parser-benchmarks.json';
			const converted = convertToSmartParserFormatData(allResults);
			fs.writeFileSync(smartFile, JSON.stringify(converted, null, 2));

			console.log(`💾 Progress saved (${allResults.length} results so far)`);
		}

		// Small delay between files
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	// Final save (redundant but ensures everything is saved)
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
 * Convert results to SmartPDFParser benchmark format (data only)
 */
function convertToSmartParserFormatData(results) {
	return results
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
}

/**
 * Convert results to SmartPDFParser benchmark format
 */
function convertToSmartParserFormat(results) {
	const converted = convertToSmartParserFormatData(results);

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

