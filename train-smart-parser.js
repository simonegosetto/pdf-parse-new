const SmartPDFParser = require('./lib/SmartPDFParser');
const fs = require('fs');

console.log('=== Smart PDF Parser Training ===\n');

// Initialize smart parser
const smartParser = new SmartPDFParser({
	enableLearning: true,
	benchmarkFile: './smart-parser-benchmarks.json'
});

async function trainParser() {
	const testFiles = [
		'./test/data/01-valid.pdf',
		'./test/data/02-valid.pdf',
		'./test/data/test_373.pdf',
		'./test/data/test_9000.pdf'
	];

	console.log('📚 Training Smart Parser with available PDFs...\n');

	for (const file of testFiles) {
		if (!fs.existsSync(file)) {
			console.log(`⏭️  Skipping ${file} (not found)\n`);
			continue;
		}

		console.log(`\n${'='.repeat(80)}`);
		console.log(`📄 Processing: ${file}`);
		console.log('='.repeat(80));

		try {
			const dataBuffer = fs.readFileSync(file);
			const result = await smartParser.parse(dataBuffer);

			console.log(`✅ Success!`);
			console.log(`   Pages: ${result.numpages}`);
			console.log(`   Characters: ${result.text.length.toLocaleString()}`);
			console.log(`   Method used: ${result._meta.method}`);
			console.log(`   Time: ${result._meta.duration.toFixed(2)}ms`);

		} catch (error) {
			console.error(`❌ Failed: ${error.message}`);
		}
	}

	// Show statistics
	console.log(`\n${'='.repeat(80)}`);
	console.log('📊 Training Statistics');
	console.log('='.repeat(80));

	const stats = smartParser.getStats();
	console.log(`\nTotal parses: ${stats.totalParses}`);
	console.log(`Failed parses: ${stats.failedParses}`);
	console.log(`\nMethod usage:`);
	for (const [method, count] of Object.entries(stats.methodUsage)) {
		if (count > 0) {
			const avg = stats.averageTimes[method];
			console.log(`  ${method.padEnd(15)} : ${count}x (avg: ${avg.toFixed(2)}ms)`);
		}
	}

	console.log(`\nBenchmarks collected: ${stats.benchmarksCollected}`);

	// Analyze benchmarks
	console.log(`\n${'='.repeat(80)}`);
	console.log('🔍 Benchmark Analysis');
	console.log('='.repeat(80));

	const analysis = smartParser.analyzeBenchmarks();
	for (const [range, data] of Object.entries(analysis)) {
		console.log(`\n${range}:`);
		if (data.message) {
			console.log(`  ${data.message}`);
		} else {
			console.log(`  Samples: ${data.samples}`);
			console.log(`  Recommended: ${data.recommended}`);
			console.log(`  Average time: ${data.averageTime.toFixed(2)}ms`);
			console.log(`  Methods tested:`);
			for (const [method, methodData] of Object.entries(data.methods)) {
				console.log(`    ${method.padEnd(15)} : ${methodData.average.toFixed(2)}ms (${methodData.count} samples)`);
			}
		}
	}

	// Export detailed report
	const reportFile = './smart-parser-training-report.json';
	smartParser.exportBenchmarks(reportFile);
	console.log(`\n✅ Training complete! Report saved to ${reportFile}\n`);
}

trainParser().catch(error => {
	console.error('\n💥 Training failed:', error);
	process.exit(1);
});

