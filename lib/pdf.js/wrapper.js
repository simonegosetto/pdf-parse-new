// wrapper.js
async function PDFJS() {
    const module = await import('./v4.5.136/build/pdf.mjs');
    return module;
}

module.exports = PDFJS;
