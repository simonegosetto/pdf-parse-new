/**
 * Esempio di modulo custom per render_page
 * Questo può essere richiesto da workers e child processes
 */

// Puoi usare variabili globali, require, ecc.
const MY_PREFIX = "[CUSTOM]";
const MY_SUFFIX = "[/CUSTOM]";

function customRenderPage(pageData) {
	let render_options = {
		normalizeWhitespace: true,
		disableCombineTextItems: false
	}

	return pageData.getTextContent(render_options)
		.then(function (textContent) {
			let lastY, text = '';
			const Y_TOLERANCE = 1.0;

			// Aggiungi prefix con variabile globale
			text = `${MY_PREFIX} Page ${pageData.pageNumber} ${MY_SUFFIX}\n`;

			for (let item of textContent.items) {
				const currentY = item.transform[5];
				const isNewLine = lastY !== undefined && Math.abs(currentY - lastY) > Y_TOLERANCE;

				if (isNewLine) {
					text += '\n';
				}

				// Converti in maiuscolo
				text += item.str.toUpperCase();
				lastY = currentY;
			}
			return text;
		});
}

// Esporta la funzione
module.exports = customRenderPage;

// Puoi anche esportare in altri modi:
// module.exports.render_page = customRenderPage;
// module.exports.default = customRenderPage;

