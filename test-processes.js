/**
 * Test child processes implementation
 */

const pdf = require('./');
const fs = require('fs');

console.log('=== Testing Child Processes Implementation ===\n');

const testFile = './test/data/01-valid.pdf';
if (!fs.existsSync(testFile)) {
	console.error('❌ Test file not found:', testFile);
	process.exit(1);
}

const dataBuffer = fs.readFileSync(testFile);
console.log(`✓ Loaded test file: ${(dataBuffer.length / 1024).toFixed(2)} KB`);
console.log(`✓ Node version: ${process.version}`);
console.log();

(async () => {
	try {
		console.log('Starting child processes test...\n');

		const start = performance.now();
		const data = await PdfPro(dataBuffer, {
			verbosityLevel: 0,
			chunkSize: 50,
			batchSize: 10,
			maxProcesses: 2,
			onProgress: (progress) => {
				process.stdout.write(`\r   Progress: ${progress.progress}% (${progress.completedChunks}/${progress.totalChunks} chunks)`);
			}
		});
		const time = (performance.now() - start).toFixed(2);

		console.log(`\n\n✅ Child processes succeeded!`);
		console.log(`   Pages: ${data.numpages}`);
		console.log(`   Characters: ${data.text.length}`);
		console.log(`   Time: ${time}ms`);
		console.log(`   First 150 chars: ${data.text.substring(0, 150).replace(/\n/g, ' ')}...`);
		console.log('\n🎉 Child processes are working correctly!');

		process.exit(0);
	} catch (error) {
		console.error('\n❌ Child processes failed!');
		console.error(`   Error: ${error.message}`);
		if (error.stack) {
			console.error(`   Stack: ${error.stack}`);
		}
		process.exit(1);
	}
})();

