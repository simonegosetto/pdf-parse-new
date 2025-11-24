/**
 * Test: SmartPDFParser con modulo custom (No Eval)
 */

const fs = require('fs');
const path = require('path');
const SmartPDFParser = require('../../lib/SmartPDFParser.js');

async function testSmartParserWithModule() {
	console.log('='.repeat(70));
	console.log('Test: SmartPDFParser con Modulo Custom (No Eval)');
	console.log('='.repeat(70));
	console.log();

	const dataBuffer = fs.readFileSync(path.join(__dirname, '../data/01-valid.pdf'));
	const customModulePath = path.join(__dirname, 'custom-render-module.js');
	const smartParser = new SmartPDFParser();

	console.log('Modulo custom:', customModulePath);
	console.log();

	try {
		// Test 1: Selezione automatica con modulo custom
		console.log('🤖 Test 1: Selezione automatica metodo');
		console.log('-'.repeat(70));

		const result1 = await smartParser.parse(dataBuffer, {
			pagerenderModule: customModulePath,
			max: 2
		});

		console.log(`✓ Metodo selezionato: ${result1._meta.method}`);
		console.log('Preview (primi 200 caratteri):');
		console.log(result1.text.substring(0, 200));
		console.log();

		if (result1.text.includes('[CUSTOM]')) {
			console.log('✅ Modulo custom applicato con selezione automatica!');
		} else {
			console.log('❌ ERRORE: Modulo custom non applicato!');
			process.exit(1);
		}
		console.log();

		// Test 2: Forza workers
		console.log('⚙️  Test 2: Forza Workers');
		console.log('-'.repeat(70));

		const result2 = await smartParser.parse(dataBuffer, {
			pagerenderModule: customModulePath,
			forceMethod: 'workers',
			max: 2
		});

		console.log(`✓ Metodo: ${result2._meta.method}`);
		if (result2.text.includes('[CUSTOM]')) {
			console.log('✅ Modulo custom con workers OK!');
		} else {
			console.log('❌ ERRORE con workers!');
			process.exit(1);
		}
		console.log();

		// Test 3: Forza processes
		console.log('🔄 Test 3: Forza Processes');
		console.log('-'.repeat(70));

		const result3 = await smartParser.parse(dataBuffer, {
			pagerenderModule: customModulePath,
			forceMethod: 'processes',
			max: 2
		});

		console.log(`✓ Metodo: ${result3._meta.method}`);
		if (result3.text.includes('[CUSTOM]')) {
			console.log('✅ Modulo custom con processes OK!');
		} else {
			console.log('❌ ERRORE con processes!');
			process.exit(1);
		}
		console.log();

		console.log('='.repeat(70));
		console.log('✅ TUTTI I TEST SUPERATI!');
		console.log('='.repeat(70));
		console.log();
		console.log('✨ SmartPDFParser + Modulo Custom = Nessun Eval!');
		console.log('='.repeat(70));

	} catch (error) {
		console.error('❌ Test fallito:', error.message);
		console.error(error.stack);
		process.exit(1);
	}
}

testSmartParserWithModule().catch(console.error);

