/**
 * Test: Custom render con modulo esterno (NO EVAL!)
 *
 * Questo test dimostra come usare un modulo esterno per
 * la funzione render_page custom con workers e processes.
 */

const fs = require('fs');
const path = require('path');
const pdfParseWorkers = require('../../lib/pdf-parse-workers.js');
const pdfParseProcesses = require('../../lib/pdf-parse-processes.js');

async function testCustomModule() {
	console.log('='.repeat(70));
	console.log('Test: Custom Render con Modulo Esterno (No Eval)');
	console.log('='.repeat(70));
	console.log();

	const dataBuffer = fs.readFileSync(path.join(__dirname, '../data/01-valid.pdf'));
	const customModulePath = path.join(__dirname, 'custom-render-module.js');

	console.log('Modulo custom:', customModulePath);
	console.log();

	try {
		// Test 1: Workers con modulo custom
		console.log('⚙️  Test 1: Workers con modulo custom');
		console.log('-'.repeat(70));

		const result1 = await pdfParseWorkers(dataBuffer, {
			pagerenderModule: customModulePath,
			max: 2,
			maxWorkers: 2,
			chunkSize: 1
		});

		console.log('✓ Workers completato');
		console.log('Preview (primi 300 caratteri):');
		console.log(result1.text.substring(0, 300));
		console.log();

		// Verifica che il custom render sia stato usato
		if (result1.text.includes('[CUSTOM]') && result1.text.includes('[/CUSTOM]')) {
			console.log('✅ Modulo custom APPLICATO nei workers!');
		} else {
			console.log('❌ ERRORE: Modulo custom NON applicato nei workers!');
			process.exit(1);
		}
		console.log();

		// Test 2: Processes con modulo custom
		console.log('🔄 Test 2: Processes con modulo custom');
		console.log('-'.repeat(70));

		const result2 = await pdfParseProcesses(dataBuffer, {
			pagerenderModule: customModulePath,
			max: 2,
			maxProcesses: 2,
			chunkSize: 1
		});

		console.log('✓ Processes completato');
		console.log('Preview (primi 300 caratteri):');
		console.log(result2.text.substring(0, 300));
		console.log();

		// Verifica che il custom render sia stato usato
		if (result2.text.includes('[CUSTOM]') && result2.text.includes('[/CUSTOM]')) {
			console.log('✅ Modulo custom APPLICATO nei processes!');
		} else {
			console.log('❌ ERRORE: Modulo custom NON applicato nei processes!');
			process.exit(1);
		}
		console.log();

		// Confronta i risultati
		console.log('📊 Confronto risultati:');
		console.log('-'.repeat(70));
		console.log(`Workers length: ${result1.text.length}`);
		console.log(`Processes length: ${result2.text.length}`);

		if (result1.text === result2.text) {
			console.log('✅ I risultati sono IDENTICI!');
		} else {
			console.log('⚠️  I risultati differiscono leggermente (può essere normale)');
		}
		console.log();

		console.log('='.repeat(70));
		console.log('✅ TUTTI I TEST SUPERATI!');
		console.log('='.repeat(70));
		console.log();
		console.log('💡 Vantaggi del modulo esterno:');
		console.log('   - Nessun eval() pericoloso');
		console.log('   - Supporto per variabili globali e closure');
		console.log('   - Può usare require() e dipendenze esterne');
		console.log('   - Codice più pulito e manutenibile');
		console.log('='.repeat(70));

	} catch (error) {
		console.error('❌ Test fallito:', error.message);
		console.error(error.stack);
		process.exit(1);
	}
}

// Esegui il test
testCustomModule().catch(err => {
	console.error('Errore non gestito:', err);
	process.exit(1);
});

