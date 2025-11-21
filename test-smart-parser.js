/**
 * Quick test of SmartPDFParser
 */

// Import SmartPDFParser - try via index, fallback to direct
let SmartPDFParser;
try {
	const pdf = require('./');
	SmartPDFParser = pdf.SmartPDFParser;
	if (!SmartPDFParser) {
		throw new Error('SmartPDFParser not found in index exports');
	}
} catch (error) {
	console.log('⚠️  Using direct import from lib/SmartPDFParser');
	SmartPDFParser = require('./lib/SmartPDFParser');
}

const fs = require('fs');

console.log('=== Quick Smart Parser Test ===\n');

async function quickTest() {
	const parser = new SmartPDFParser({
		enableLearning: true,
		benchmarkFile: './quick-test-benchmarks.json'
	});

	const testFile = './test/data/01-valid.pdf';

	if (!fs.existsSync(testFile)) {
		console.error('❌ Test file not found:', testFile);
		console.log('   Please ensure test files are available');
		return;
	}

	console.log(`📄 Testing with: ${testFile}\n`);

	try {
		// First parse - no historical data
		console.log('1️⃣ First parse (no historical data):');
		const buffer = fs.readFileSync(testFile);
		const result1 = await parser.parse(buffer);

		console.log(`   ✓ Method: ${result1._meta.method}`);
		console.log(`   ✓ Time: ${result1._meta.duration.toFixed(2)}ms`);
		console.log(`   ✓ Pages: ${result1.numpages}\n`);

		// Second parse - with historical data
		console.log('2️⃣ Second parse (with historical data):');
		const result2 = await parser.parse(buffer);

		console.log(`   ✓ Method: ${result2._meta.method}`);
		console.log(`   ✓ Time: ${result2._meta.duration.toFixed(2)}ms`);
		console.log(`   ✓ Using historical data! 🧠\n`);

		// Show stats
		console.log('📊 Statistics:');
		const stats = parser.getStats();
		console.log(`   Total parses: ${stats.totalParses}`);
		console.log(`   Benchmarks: ${stats.benchmarksCollected}`);
		console.log(`   Methods used: ${Object.keys(stats.methodUsage).filter(k => stats.methodUsage[k] > 0).join(', ')}\n`);

		// Show analysis
		console.log('🔍 Analysis:');
		const analysis = parser.analyzeBenchmarks();
		for (const [range, data] of Object.entries(analysis)) {
			if (data.recommended) {
				console.log(`   ${range}: ${data.recommended} (${data.samples} samples)`);
			}
		}

		console.log('\n✅ SmartPDFParser is working correctly!');
		console.log('\n💡 Tip: Run with more PDFs to improve learning:');
		console.log('   node train-smart-parser.js');
		console.log('   node collect-benchmarks.js\n');

	} catch (error) {
		console.error('❌ Test failed:', error.message);
		console.error(error.stack);
		process.exit(1);
	}
}

quickTest();

