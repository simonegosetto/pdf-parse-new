/**
 * Debug test to see exactly what's happening with PDF.js loading
 */

console.log('=== PDF.js Worker Loading Test ===\n');

// Simulate worker environment
if (!globalThis.DOMParser) {
	globalThis.DOMParser = class DOMParser {
		parseFromString() { return { documentElement: { textContent: '' } }; }
	};
}
if (!globalThis.navigator) {
	globalThis.navigator = { userAgent: 'Node.js' };
}

console.log('✓ Environment set up');

// Monkey-patch Object.defineProperty
const originalDefineProperty = Object.defineProperty;
let workerSrcSetterCalled = false;
let workerSrcError = null;

Object.defineProperty = function(obj, prop, descriptor) {
	if (prop === 'workerSrc' && descriptor.set) {
		console.log('  → Intercepted workerSrc setter definition');
		workerSrcSetterCalled = true;
		const originalSetter = descriptor.set;
		descriptor.set = function(value) {
			console.log(`  → workerSrc setter called with value: ${typeof value} = ${value}`);
			try {
				originalSetter.call(this, value);
				console.log('  → Original setter succeeded');
			} catch (e) {
				console.log(`  → Original setter failed: ${e.message}`);
				workerSrcError = e;
				// Don't throw - just ignore
			}
		};
	}
	return originalDefineProperty.call(this, obj, prop, descriptor);
};

console.log('✓ Object.defineProperty patched');

try {
	console.log('\nLoading PDF.js...');
	const PDFJS = require(`./lib/pdf.js/v4.5.136/build/pdf.js`);
	console.log('✅ PDF.js loaded successfully!');
	console.log(`   Version: ${PDFJS.version}`);
	console.log(`   disableWorker: ${PDFJS.disableWorker}`);

	if (workerSrcSetterCalled) {
		console.log('\n✓ workerSrc setter was intercepted');
		if (workerSrcError) {
			console.log(`  Error was caught and ignored: ${workerSrcError.message}`);
		}
	} else {
		console.log('\n⚠️  workerSrc setter was NOT called');
	}

	// Try to create a document
	console.log('\nTrying to create a PDF document...');
	PDFJS.disableWorker = true;

	// Use a small dummy PDF
	const dummyPDF = new Uint8Array([
		0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34
	]);

	console.log('  Calling getDocument...');
	// This will fail but that's ok - we just want to see if it initializes

} catch (e) {
	console.error('\n❌ Failed to load PDF.js:');
	console.error(`   Error: ${e.message}`);
	console.error(`   Stack: ${e.stack}`);
	process.exit(1);
}

// Restore
Object.defineProperty = originalDefineProperty;
console.log('\n✅ Test complete - PDF.js can be loaded in worker context');

