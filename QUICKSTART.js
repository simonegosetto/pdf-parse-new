const PDF = require('./');
const PDFStream = require('./lib/pdf-parse-stream');
const PDFAggressive = require('./lib/pdf-parse-aggressive');
const PDFProcesses = require('./lib/pdf-parse-processes');
const PDFWorkers = require('./lib/pdf-parse-workers');
const fs = require('fs');


// Test with large PDF - adjust path as needed
let PDF_FILE = './test/data/test_9000.pdf';
if (!fs.existsSync(PDF_FILE)) {
	PDF_FILE = './test/data/test_373.pdf';
	if (!fs.existsSync(PDF_FILE)) {
		PDF_FILE = './test/data/01-valid.pdf';
	}
}

let dataBuffer = fs.readFileSync(PDF_FILE);

console.log('=== PDF Parsing Benchmark ===');
console.log(`File: ${PDF_FILE}`);
console.log(`Size: ${(dataBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);

async function runBenchmark() {
	const results = [];
	let savedText = ''; // Store text from first successful parse

	// 1. Sequential parsing (baseline)
	console.log('🔄 Sequential parsing...');
	const startSequential = performance.now();
	const dataSeq = await PDF(dataBuffer, {
		verbosityLevel: 0,
		parallelizePages: false
	});
	const timeSequential = (performance.now() - startSequential).toFixed(2);

	console.log(`✓ Sequential completed in: ${timeSequential}ms`);
	console.log(`  - Pages: ${dataSeq.numpages}, Characters: ${dataSeq.text.length}\n`);

	results.push({
		mode: 'Sequential',
		time: parseFloat(timeSequential),
		pages: dataSeq.numpages,
		chars: dataSeq.text.length
	});

	// 2. Test different batch sizes (original method)
	const batchSizes = [5, 10, 20, 50];

	for (const batchSize of batchSizes) {
		console.log(`🚀 Batch parallel (size: ${batchSize})...`);
		const startBatch = performance.now();
		const dataBatch = await PDF(dataBuffer, {
			verbosityLevel: 0,
			parallelizePages: true,
			batchSize: batchSize
		});
		const timeBatch = (performance.now() - startBatch).toFixed(2);

		console.log(`✓ Batch ${batchSize} completed in: ${timeBatch}ms`);
		console.log(`  - Characters: ${dataBatch.text.length}\n`);

		results.push({
			mode: `Batch ${batchSize}`,
			time: parseFloat(timeBatch),
			pages: dataBatch.numpages,
			chars: dataBatch.text.length
		});
	}

	// 3. Streaming with chunking (for large files)
	if (dataSeq.numpages > 50) {
		console.log('🌊 Streaming with chunking...');
		const startStream = performance.now();
		const dataStream = await PDFStream(dataBuffer, {
			verbosityLevel: 0,
			chunkSize: 500,
			batchSize: 10,
			onChunkComplete: ({ processedPages, totalPages, progress }) => {
				process.stdout.write(`\r   Progress: ${progress}% (${processedPages}/${totalPages} pages)`);
			}
		});
		const timeStream = (performance.now() - startStream).toFixed(2);

		console.log(`\n✓ Streaming completed in: ${timeStream}ms`);
		console.log(`  - Characters: ${dataStream.text.length}\n`);

		results.push({
			mode: 'Stream (chunk:500)',
			time: parseFloat(timeStream),
			pages: dataStream.numpages,
			chars: dataStream.text.length
		});
	}

	// 4. Worker Threads (TRUE MULTI-CORE PARALLELISM) 🚀
	// Get page count first
	const quickCheck = await PDF(dataBuffer, { max: 1 });
	const totalPages = quickCheck.numpages;

	if (totalPages > 100) {
		try {
			console.log('⚡ Worker threads (true multi-core parallelism)...');
			const cpuCores = require('os').cpus().length;
			const pdfSizeMB = dataBuffer.length / 1024 / 1024;

			// Limit workers for large PDFs to avoid memory issues
			// Each worker gets a copy of the PDF data
			let workers;
			if (pdfSizeMB > 50) {
				workers = Math.min(4, Math.max(2, cpuCores - 1));
				console.log(`  - Large PDF (${pdfSizeMB.toFixed(1)}MB): limiting to ${workers} workers`);
			} else {
				workers = Math.max(2, cpuCores - 1);
			}
			console.log(`  - Using ${workers} CPU cores out of ${cpuCores}`);

			const startWorkers = performance.now();
			const dataWorkers = await PDFWorkers(dataBuffer, {
				verbosityLevel: 0,
				chunkSize: 500,
				batchSize: 10,
				maxWorkers: workers,
				onProgress: ({ completedChunks, totalChunks, progress }) => {
					process.stdout.write(`\r   Progress: ${progress}% (${completedChunks}/${totalChunks} chunks)`);
				}
			});
			const timeWorkers = (performance.now() - startWorkers).toFixed(2);

			console.log(`\n✓ Workers completed in: ${timeWorkers}ms`);
			console.log(`  - Characters: ${dataWorkers.text.length}`);
			console.log(`  - TRUE parallel execution across ${workers} CPU cores 🚀\n`);

			if (!savedText) savedText = dataWorkers.text; // Save first result

			results.push({
				mode: 'Workers (threads)',
				time: parseFloat(timeWorkers),
				pages: dataWorkers.numpages,
				chars: dataWorkers.text.length
			});
		} catch (error) {
			console.log(`✗ Workers failed: ${error.message}`);
			console.log(`  Reason: ${error.stack ? error.stack.split('\n')[0] : 'Unknown'}\n`);
		}
	}

	// 5. Child Processes (Alternative multi-core) 🚀
	if (totalPages > 100) {
		try {
			console.log('🔥 Child processes (alternative multi-core)...');
			const cpuCores = require('os').cpus().length;
			const processes = Math.max(2, cpuCores - 1);
			console.log(`  - Using ${processes} CPU cores out of ${cpuCores}`);

			const startProcesses = performance.now();
			const dataProcesses = await PDFProcesses(dataBuffer, {
				verbosityLevel: 0,
				chunkSize: 500,
				batchSize: 10,
				maxProcesses: processes,
				onProgress: ({ completedChunks, totalChunks, progress }) => {
					process.stdout.write(`\r   Progress: ${progress}% (${completedChunks}/${totalChunks} chunks)`);
				}
			});
			const timeProcesses = (performance.now() - startProcesses).toFixed(2);

			console.log(`\n✓ Processes completed in: ${timeProcesses}ms`);
			console.log(`  - Characters: ${dataProcesses.text.length}`);
			console.log(`  - TRUE parallel execution across ${processes} CPU cores\n`);

			if (!savedText) savedText = dataProcesses.text; // Save if not saved yet

			results.push({
				mode: 'Processes (fork)',
				time: parseFloat(timeProcesses),
				pages: dataProcesses.numpages,
				chars: dataProcesses.text.length
			});
		} catch (error) {
			console.log(`✗ Processes failed: ${error.message}`);
			console.log(`  Stack: ${error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'Unknown'}\n`);
		}
	}

	// 6. Aggressive parallelization (single-thread fallback)
	/*if (dataSeq.numpages > 100) {
		console.log('💥 Aggressive parallelization (single-thread)...');
		const startAggressive = performance.now();
		const dataAggressive = await PDFAggressive(dataBuffer, {
			verbosityLevel: 0,
			chunkSize: 500,
			batchSize: 20, // Larger batch for more parallelism
			onChunkComplete: ({ processedPages, totalPages, progress }) => {
				process.stdout.write(`\r   Progress: ${progress}% (${processedPages}/${totalPages} pages)`);
			}
		});
		const timeAggressive = (performance.now() - startAggressive).toFixed(2);

		console.log(`\n✓ Aggressive completed in: ${timeAggressive}ms`);
		console.log(`  - Characters: ${dataAggressive.text.length}\n`);

		results.push({
			mode: 'Aggressive (single)',
			time: parseFloat(timeAggressive),
			pages: dataAggressive.numpages,
			chars: dataAggressive.text.length
		});
	}*/

	// Summary
	console.log('\n📊 Results Summary:');
	console.log('═'.repeat(80));
	console.log(`${'Method'.padEnd(22)} | ${'Time'.padStart(10)} | ${'Improvement'.padStart(10)} | ${'Speedup'.padStart(7)} | ${'Characters'.padStart(10)}`);
	console.log('═'.repeat(80));

	const baseTime = results[0].time;
	const baseChars = results[0].chars;

	results.forEach((result, index) => {
		const improvement = index === 0 ? 0 : ((baseTime - result.time) / baseTime * 100).toFixed(2);
		const speedup = index === 0 ? 1.00 : (baseTime / result.time).toFixed(2);
		const charsDiff = result.chars === baseChars ? '✓' : `${result.chars}`;

		console.log(`${result.mode.padEnd(22)} | ${result.time.toFixed(2).padStart(10)}ms | ${improvement.toString().padStart(9)}% | ${speedup.toString().padStart(6)}x | ${charsDiff.padStart(10)}`);
	});

	console.log('═'.repeat(80));

	// Find best result
	const bestResult = results.reduce((best, current) =>
		current.time < best.time ? current : best
	);

	console.log('\n🏆 Best configuration: ' + bestResult.mode);
	console.log(`   Time: ${bestResult.time.toFixed(2)}ms`);
	console.log(`   Improvement: ${((baseTime - bestResult.time) / baseTime * 100).toFixed(2)}%`);
	console.log(`   Speedup: ${(baseTime / bestResult.time).toFixed(2)}x`);
	console.log(`   Characters: ${bestResult.chars.toLocaleString()}`);

	// Save result
	if (savedText) {
		fs.writeFileSync(`${PDF_FILE}.txt`, savedText, {
			encoding: 'utf8',
			flag: 'w'
		});
		console.log(`\n💾 Text saved to: ${PDF_FILE}.txt`);
	}

	// Recommendations
	console.log('\n💡 Recommendations:');
	if (totalPages < 50) {
		console.log(`   For ${totalPages} pages: Use sequential or small batch (5-10)`);
	} else if (totalPages < 500) {
		console.log(`   For ${totalPages} pages: Use batch 10-20`);
	} else if (totalPages < 1000) {
		console.log(`   For ${totalPages} pages: Use streaming for memory efficiency`);
	} else {
		console.log(`   For ${totalPages} pages: Use processes or workers for best performance`);
	}
}

runBenchmark().catch(function(err) {
	console.error('\n❌ Error:', err);
	process.exit(1);
});
