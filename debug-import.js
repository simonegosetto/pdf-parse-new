// Replica esatta del codice dell'esempio per vedere l'errore
console.log('=== Replicating example code ===\n');

try {
	const pdf = require('./');
	console.log('✓ Module loaded');
	console.log('  Type:', typeof pdf);
	console.log('  Keys:', Object.keys(pdf).filter(k => typeof pdf[k] !== 'function' || k === 'SmartPDFParser'));

	const SmartPDFParser = pdf.SmartPDFParser;
	console.log('\n✓ SmartPDFParser extracted');
	console.log('  Type:', typeof SmartPDFParser);
	console.log('  Value:', SmartPDFParser);

	if (typeof SmartPDFParser !== 'function') {
		console.error('\n❌ SmartPDFParser is not a function!');
		console.error('   This is the problem!');
		process.exit(1);
	}

	console.log('\n✓ Creating instance...');
	const parser = new SmartPDFParser();
	console.log('✓ Instance created:', parser.constructor.name);

	console.log('\n✅ Everything works!\n');

} catch (error) {
	console.error('\n❌ Error:', error.message);
	console.error('\nStack:', error.stack);
	process.exit(1);
}

