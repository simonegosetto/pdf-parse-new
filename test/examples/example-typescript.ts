/**
 * Esempio TypeScript: Uso di pagerenderModule con tipizzazione
 */

import PdfParse, { processes, workers, SmartPDFParser, ProcessesOptions, WorkersOptions } from '../../index';
import * as fs from 'fs';
import * as path from 'path';

async function exampleWithTypes() {
	const pdfBuffer = fs.readFileSync(path.join(__dirname, '../data/01-valid.pdf'));
	const customModulePath = path.join(__dirname, 'custom-render-module.js');

	// Esempio 1: Workers con tipizzazione
	const workersOptions: WorkersOptions = {
		pagerenderModule: customModulePath,
		maxWorkers: 4,
		max: 10,
		chunkSize: 50
	};

	const result1 = await workers(pdfBuffer, workersOptions);
	console.log(`Workers: ${result1.numpages} pages, ${result1.text.length} chars`);

	// Esempio 2: Processes con tipizzazione
	const processesOptions: ProcessesOptions = {
		pagerenderModule: customModulePath,
		maxProcesses: 4,
		max: 10,
		processTimeout: 60000
	};

	const result2 = await processes(pdfBuffer, processesOptions);
	console.log(`Processes: ${result2.numpages} pages, ${result2.text.length} chars`);

	// Esempio 3: SmartPDFParser con tipizzazione
	const smartParser = new SmartPDFParser({
		maxWorkerLimit: 8,
		enableFastPath: true
	});

	const result3 = await smartParser.parse(pdfBuffer, {
		pagerenderModule: customModulePath,
		max: 10
	});

	console.log(`Smart: ${result3._meta?.method} - ${result3.numpages} pages`);

	// Esempio 4: Custom render function (senza modulo esterno)
	const result4 = await PdfParse(pdfBuffer, {
		pagerender: (pageData) => {
			return pageData.getTextContent().then((tc: any) => {
				return tc.items.map((i: any) => i.str).join(' ');
			});
		},
		max: 5
	});

	console.log(`Custom function: ${result4.numpages} pages`);
}

// Nota: questo è solo un esempio di tipizzazione
// Non può essere eseguito direttamente perché usa import invece di require
console.log('Questo è un esempio di tipizzazione TypeScript');
console.log('Per eseguire i test, usa i file .js nella stessa cartella');

