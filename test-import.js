// Test minimale per verificare l'import
console.log('Testing SmartPDFParser import...\n');

const pdf = require('./index.js');

console.log('1. pdf module:', typeof pdf);
console.log('2. pdf.SmartPDFParser:', typeof pdf.SmartPDFParser);

if (pdf.SmartPDFParser) {
	console.log('3. SmartPDFParser is available ✓');

	try {
		const parser = new pdf.SmartPDFParser();
		console.log('4. Instance created successfully ✓');
		console.log('5. Instance type:', parser.constructor.name);
		console.log('\n✅ SmartPDFParser is working correctly!');
	} catch (error) {
		console.error('❌ Failed to create instance:', error.message);
	}
} else {
	console.error('❌ SmartPDFParser is not exported!');
	console.log('\nAvailable exports:', Object.keys(pdf));
}

