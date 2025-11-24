/**
 * Esempio Pratico: Estrazione Strutturata con Custom Render
 *
 * Questo esempio mostra come usare una funzione custom per estrarre
 * testo in modo strutturato, aggiungendo metadati per ogni pagina.
 */

const fs = require('fs');
const path = require('path');

// Prova diversi parser
const pdfParse = require('../../lib/pdf-parse.js');
const pdfParseWorkers = require('../../lib/pdf-parse-workers.js');
const pdfParseProcesses = require('../../lib/pdf-parse-processes.js');

/**
 * Funzione custom che aggiunge metadata per ogni pagina
 * Utile per documenti che necessitano di tracciare il numero di pagina
 */
function structuredRenderPage(pageData) {
	return pageData.getTextContent({
		normalizeWhitespace: true,
		disableCombineTextItems: false
	}).then(function (textContent) {
		let lastY;
		let text = '';
		const Y_TOLERANCE = 1.0;
		let lineCount = 0;

		// Header della pagina con metadata
		text += '\n┌─────────────────────────────────────┐\n';
		text += `│ PAGINA ${pageData.pageNumber.toString().padStart(4, '0')}                        │\n`;
		text += '├─────────────────────────────────────┤\n';

		for (let item of textContent.items) {
			const currentY = item.transform[5];
			const isNewLine = lastY !== undefined &&
				Math.abs(currentY - lastY) > Y_TOLERANCE;

			if (isNewLine) {
				text += '\n';
				lineCount++;
			}

			text += item.str;
			lastY = currentY;
		}

		// Footer con statistiche
		text += '\n├─────────────────────────────────────┤\n';
		text += `│ Righe: ${lineCount.toString().padStart(4, ' ')}                        │\n`;
		text += `│ Caratteri: ${text.length.toString().padStart(4, ' ')}                   │\n`;
		text += '└─────────────────────────────────────┘\n';

		return text;
	});
}

/**
 * Funzione custom per estrarre solo titoli (testo con font size grande)
 */
function titleOnlyRenderPage(pageData) {
	return pageData.getTextContent({
		normalizeWhitespace: true,
		disableCombineTextItems: false
	}).then(function (textContent) {
		let text = '';

		for (let item of textContent.items) {
			// Estrai solo testo con font size > 12 (probabilmente titoli)
			const fontSize = item.transform[0];
			if (fontSize > 12) {
				text += item.str + ' ';
			}
		}

		return text.trim() ? `[Pag. ${pageData.pageNumber}] ${text.trim()}` : '';
	});
}

async function main() {
	console.log('='.repeat(60));
	console.log('Esempio: Custom Render per Estrazione Strutturata');
	console.log('='.repeat(60));
	console.log();

	const dataBuffer = fs.readFileSync(path.join(__dirname, '../data/01-valid.pdf'));

	// Esempio 1: Parser standard con rendering strutturato
	console.log('📄 Esempio 1: Rendering Strutturato (Prime 2 pagine)');
	console.log('-'.repeat(60));

	const result1 = await pdfParse(dataBuffer, {
		pagerender: structuredRenderPage,
		max: 2
	});

	console.log(result1.text);
	console.log();

	// Esempio 2: Workers con estrazione solo titoli
	console.log('📋 Esempio 2: Estrazione Solo Titoli (con Workers)');
	console.log('-'.repeat(60));

	const result2 = await pdfParseWorkers(dataBuffer, {
		pagerender: titleOnlyRenderPage,
		max: 3,
		maxWorkers: 2
	});

	console.log(result2.text);
	console.log();

	// Esempio 3: Processes con rendering strutturato
	console.log('⚙️  Esempio 3: Rendering Strutturato (con Processes)');
	console.log('-'.repeat(60));

	const result3 = await pdfParseProcesses(dataBuffer, {
		pagerender: structuredRenderPage,
		max: 2,
		maxProcesses: 2,
		chunkSize: 1
	});

	console.log(result3.text.substring(0, 500) + '...');
	console.log();

	// Statistiche finali
	console.log('='.repeat(60));
	console.log('📊 Statistiche');
	console.log('='.repeat(60));
	console.log(`PDF analizzato: ${result1.numpages} pagine totali`);
	console.log(`Esempio 1 - Lunghezza testo: ${result1.text.length} caratteri`);
	console.log(`Esempio 2 - Lunghezza testo: ${result2.text.length} caratteri`);
	console.log(`Esempio 3 - Lunghezza testo: ${result3.text.length} caratteri`);
	console.log();
	console.log('✅ Tutti gli esempi completati con successo!');
}

main().catch(err => {
	console.error('❌ Errore:', err.message);
	console.error(err.stack);
	process.exit(1);
});

