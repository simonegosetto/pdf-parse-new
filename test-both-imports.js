// Step-by-step test
console.log('Step 1: Load SmartPDFParser directly from lib\n');

try {
	const SmartPDFParser = require('./lib/SmartPDFParser');
	console.log('✓ SmartPDFParser loaded directly');
	console.log('  Type:', typeof SmartPDFParser);

	const parser = new SmartPDFParser();
	console.log('✓ Instance created');
	console.log('  Constructor:', parser.constructor.name);

	console.log('\n✅ Direct import works!\n');

} catch (error) {
	console.error('❌ Direct import failed:', error.message);
	console.error(error.stack);
}

console.log('\nStep 2: Load SmartPDFParser via index.js\n');

try {
	const pdf = require('./index');
	console.log('✓ index.js loaded');
	console.log('  Type of pdf:', typeof pdf);
	console.log('  pdf is function?', typeof pdf === 'function');
	console.log('  pdf.SmartPDFParser:', typeof pdf.SmartPDFParser);

	if (!pdf.SmartPDFParser) {
		console.error('\n❌ pdf.SmartPDFParser is undefined!');
		console.log('Available properties:', Object.keys(pdf));
		process.exit(1);
	}

	const SmartPDFParser = pdf.SmartPDFParser;
	const parser = new SmartPDFParser();
	console.log('✓ Instance created via index');

	console.log('\n✅ Index import works!\n');

} catch (error) {
	console.error('❌ Index import failed:', error.message);
	console.error(error.stack);
}

