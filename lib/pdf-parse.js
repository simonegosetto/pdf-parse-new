const PDFJS = require(`./pdf.js/v4.5.136/build/pdf.js`);

function render_page(pageData) {
	//check documents https://mozilla.github.io/pdf.js/
	//ret.text = ret.text ? ret.text : "";

	let render_options = {
		//replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
		// Changed to true to fix issue #10 (ligature handling)
		normalizeWhitespace: true,
		//do not attempt to combine same line TextItem's. The default value is `false`.
		disableCombineTextItems: false
	}

	return pageData.getTextContent(render_options)
		.then(function (textContent) {
			let lastY, text = '';
			// Y-coordinate tolerance for detecting line breaks (fixes sub-pixel differences)
			// See: https://github.com/simonegosetto/pdf-parse-new/issues/10
			const Y_TOLERANCE = 1.0;

			//https://github.com/mozilla/pdf.js/issues/8963
			//https://github.com/mozilla/pdf.js/issues/2140
			//https://gist.github.com/hubgit/600ec0c224481e910d2a0f883a7b98e3
			for (let item of textContent.items) {
				// Get current Y coordinate
				const currentY = item.transform[5];

				// Detect line break with tolerance (fixes ligature issues)
				const isNewLine = lastY !== undefined && Math.abs(currentY - lastY) > Y_TOLERANCE;

				if (isNewLine) {
					text += '\n';
				}

				// Add text content
				text += item.str;
				lastY = currentY;
			}
			//let strings = textContent.items.map(item => item.str);
			//let text = strings.join("\n");
			//text = text.replace(/[ ]+/ig," ");
			//ret.text = `${ret.text} ${text} \n\n`;
			return text;
		});
}

const DEFAULT_OPTIONS = {
	pagerender: render_page,
	max: 0,
	verbosityLevel: 5, // errors: 0, warnings: 1, infos: 5
	parallelizePages: false,
	batchSize: 10 // Number of pages to process in parallel at once
}

async function PDF(dataBuffer, options) {

	let ret = {
		numpages: 0,
		numrender: 0,
		info: null,
		metadata: null,
		text: "",
		version: null
	};

	if (typeof options == 'undefined') options = DEFAULT_OPTIONS;
	if (typeof options.pagerender != 'function') options.pagerender = DEFAULT_OPTIONS.pagerender;
	if (typeof options.max != 'number') options.max = DEFAULT_OPTIONS.max;
	if (typeof options.parallelizePages != 'boolean') options.parallelizePages = DEFAULT_OPTIONS.parallelizePages;
	if (typeof options.batchSize != 'number') options.batchSize = DEFAULT_OPTIONS.batchSize;

	/*if (typeof PDFJS === 'function') {
		PDFJS = await PDFJS();
	}*/
	// console.log(PDFJS);

	ret.version = PDFJS.version;

	// Disable workers to avoid yet another cross-origin issue (workers need
	// the URL of the script to be loaded, and dynamically loading a cross-origin
	// script does not work).
	PDFJS.disableWorker = true;
	let doc = await PDFJS.getDocument({
		verbosity: options.verbosityLevel ?? DEFAULT_OPTIONS.verbosityLevel,
		data: new Uint8Array(dataBuffer),
	}).promise;

	ret.numpages = doc.numPages;

	let metaData = await doc.getMetadata().catch(function (err) {
		return null;
	});

	ret.info = metaData ? metaData.info : null;
	ret.metadata = metaData ? metaData.metadata : null;

	let counter = options.max <= 0 ? doc.numPages : options.max;
	counter = counter > doc.numPages ? doc.numPages : counter;

	ret.text = "";

	if (options.parallelizePages) {
		// Batch-parallelized page processing
		const pageTexts = [];
		const batchSize = options.batchSize;

		for (let i = 1; i <= counter; i += batchSize) {
			const batchEnd = Math.min(i + batchSize, counter + 1);
			const batchPromises = [];

			for (let j = i; j < batchEnd; j++) {
				batchPromises.push(
					doc.getPage(j)
						.then(pageData => options.pagerender(pageData))
						.catch((err) => {
							return "";
						})
				);
			}

			const batchResults = await Promise.all(batchPromises);
			pageTexts.push(...batchResults);
		}

		ret.text = pageTexts.join('\n\n');
	} else {
		// Sequential page processing
		for (let i = 1; i <= counter; i++) {
			let pageText = await doc.getPage(i).then(pageData => options.pagerender(pageData))
				.catch((err) => {
				return "";
			});
			ret.text = `${ret.text}\n\n${pageText}`;
		}
	}

	ret.numrender = counter;
	doc.destroy();

	return ret;
}

module.exports = PDF;
module.exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;
