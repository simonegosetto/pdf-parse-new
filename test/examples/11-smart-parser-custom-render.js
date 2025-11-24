/**
 * Test: SmartPDFParser con Custom Render Page
 *
 * Verifica che lo SmartPDFParser passi correttamente la funzione
 * pagerender custom ai vari parser che seleziona automaticamente.
 */

const fs = require('fs');
const path = require('path');
const SmartPDFParser = require('../../lib/SmartPDFParser.js');

/**
 * Funzione custom che aggiunge un marker identificativo
 * per verificare che venga effettivamente utilizzata
 */
function customRenderPageWithMarker(pageData) {
	return pageData.getTextContent({
		normalizeWhitespace: true,
		disableCombineTextItems: false
	}).then(function (textContent) {
		// Aggiunge un marker unico all'inizio
		let text = `[CUSTOM_RENDER_PAGE_${pageData.pageNumber}]`;

		for (let item of textContent.items) {
			text += item.str;
		}

		return text;
	});
}

async function testSmartParserWithCustomRender() {
	console.log('='.repeat(70));
	console.log('Test: SmartPDFParser con Custom Render Page Function');
	console.log('='.repeat(70));
	console.log();

	const dataBuffer = fs.readFileSync(path.join(__dirname, '../data/01-valid.pdf'));
	const smartParser = new SmartPDFParser();

	try {
		// Test 1: PDF piccolo (dovrebbe usare sequential o batch)
		console.log('📄 Test 1: PDF piccolo con custom render');
		console.log('-'.repeat(70));

		const result1 = await smartParser.parse(dataBuffer, {
			pagerender: customRenderPageWithMarker,
			max: 2 // Solo 2 pagine per velocità
		});

		console.log(`✓ Metodo selezionato: ${result1._meta.method}`);
		console.log(`✓ Pagine processate: ${result1.numrender}`);

		// Verifica che il marker custom sia presente
		if (result1.text.includes('[CUSTOM_RENDER_PAGE_1]')) {
			console.log('✅ Custom render function APPLICATA correttamente!');
		} else {
			console.log('❌ ERRORE: Custom render function NON applicata!');
			console.log('Primi 200 caratteri:', result1.text.substring(0, 200));
			process.exit(1);
		}
		console.log();

		// Test 2: Forza l'uso di workers con custom render
		console.log('⚙️  Test 2: Forza Workers con custom render');
		console.log('-'.repeat(70));

		const result2 = await smartParser.parse(dataBuffer, {
			pagerender: customRenderPageWithMarker,
			forceMethod: 'workers',
			max: 2
		});

		console.log(`✓ Metodo selezionato: ${result2._meta.method}`);
		console.log(`✓ Pagine processate: ${result2.numrender}`);

		if (result2.text.includes('[CUSTOM_RENDER_PAGE_1]')) {
			console.log('✅ Custom render function con WORKERS funziona!');
		} else {
			console.log('❌ ERRORE: Custom render con workers non funziona!');
			process.exit(1);
		}
		console.log();

		// Test 3: Forza l'uso di processes con custom render
		console.log('🔄 Test 3: Forza Processes con custom render');
		console.log('-'.repeat(70));

		const result3 = await smartParser.parse(dataBuffer, {
			pagerender: customRenderPageWithMarker,
			forceMethod: 'processes',
			max: 2
		});

		console.log(`✓ Metodo selezionato: ${result3._meta.method}`);
		console.log(`✓ Pagine processate: ${result3.numrender}`);

		if (result3.text.includes('[CUSTOM_RENDER_PAGE_1]')) {
			console.log('✅ Custom render function con PROCESSES funziona!');
		} else {
			console.log('❌ ERRORE: Custom render con processes non funziona!');
			process.exit(1);
		}
		console.log();

		// Test 4: Forza stream con custom render
		console.log('🌊 Test 4: Forza Stream con custom render');
		console.log('-'.repeat(70));

		const result4 = await smartParser.parse(dataBuffer, {
			pagerender: customRenderPageWithMarker,
			forceMethod: 'stream',
			max: 2
		});

		console.log(`✓ Metodo selezionato: ${result4._meta.method}`);
		console.log(`✓ Pagine processate: ${result4.numrender}`);

		if (result4.text.includes('[CUSTOM_RENDER_PAGE_1]')) {
			console.log('✅ Custom render function con STREAM funziona!');
		} else {
			console.log('❌ ERRORE: Custom render con stream non funziona!');
			process.exit(1);
		}
		console.log();

		// Statistiche finali
		console.log('='.repeat(70));
		console.log('📊 Statistiche SmartParser');
		console.log('='.repeat(70));
		const stats = smartParser.getStats();
		console.log('Metodi utilizzati:', stats.methodUsage);
		console.log('Ottimizzazione:', stats.optimizationRate);
		console.log();

		console.log('='.repeat(70));
		console.log('✅ TUTTI I TEST SUPERATI!');
		console.log('='.repeat(70));
		console.log('SmartPDFParser passa correttamente il parametro pagerender');
		console.log('a tutti i parser (sequential, batch, stream, workers, processes)');
		console.log('='.repeat(70));

	} catch (error) {
		console.error('❌ Test fallito:', error.message);
		console.error(error.stack);
		process.exit(1);
	}
}

// Esegui il test
testSmartParserWithCustomRender().catch(err => {
	console.error('Errore non gestito:', err);
	process.exit(1);
});

