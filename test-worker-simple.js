/**
 * Test worker thread implementation
 */

const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

console.log('=== Testing Worker Thread Implementation ===\n');

const testFile = './test/data/01-valid.pdf';
if (!fs.existsSync(testFile)) {
	console.error('❌ Test file not found:', testFile);
	process.exit(1);
}

const dataBuffer = fs.readFileSync(testFile);
console.log(`✓ Loaded test file: ${(dataBuffer.length / 1024).toFixed(2)} KB`);
console.log(`✓ Node version: ${process.version}`);
console.log();

// Convert to Uint8Array for worker
const uint8Array = new Uint8Array(dataBuffer);
console.log(`✓ Created Uint8Array: ${uint8Array.length} bytes\n`);

console.log('Starting worker thread...\n');

const worker = new Worker(path.join(__dirname, 'lib', 'pdf-worker.js'), {
	workerData: {
		dataBuffer: uint8Array,
		startPage: 1,
		endPage: 2,
		batchSize: 10,
		verbosityLevel: 0
	}
});

let messageReceived = false;

worker.on('message', (message) => {
	messageReceived = true;
	if (message.success) {
		console.log('✅ Worker succeeded!');
		console.log(`   Pages processed: ${message.pagesProcessed}`);
		console.log(`   Text length: ${message.text.length} characters`);
		console.log(`   First 150 chars: ${message.text.substring(0, 150).replace(/\n/g, ' ')}...`);
		console.log('\n🎉 Worker threads are working correctly!');
		process.exit(0);
	} else {
		console.error('❌ Worker failed!');
		console.error('   Error:', message.error);
		if (message.stack) {
			console.error('   Stack:', message.stack);
		}
		process.exit(1);
	}
});

worker.on('error', (error) => {
	console.error('❌ Worker runtime error!');
	console.error('   Error:', error.message);
	console.error('   Stack:', error.stack);
	process.exit(1);
});

worker.on('exit', (code) => {
	if (code !== 0 && !messageReceived) {
		console.error(`❌ Worker exited with code ${code}`);
		console.error('   This usually means there was an uncaught error in the worker.');
		console.error('   Check stderr above for details from the worker process.');
		process.exit(1);
	}
});

// Timeout after 15 seconds
setTimeout(() => {
	console.error('❌ Worker timeout after 15 seconds');
	worker.terminate();
	process.exit(1);
}, 15000);

console.log('Waiting for worker to complete...');

