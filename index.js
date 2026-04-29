const Fs = require('fs');
const Pdf = require('./lib/pdf-parse.js');
const PdfStream = require('./lib/pdf-parse-stream.js');
const PdfAggressive = require('./lib/pdf-parse-aggressive.js');
const PdfProcesses = require('./lib/pdf-parse-processes.js');
const PDFWorkers = require('./lib/pdf-parse-workers.js');
const SmartPDFParser = require('./lib/SmartPDFParser.js');
const Markdown = require('./lib/markdown-render.js');

module.exports = Pdf;
module.exports.stream = PdfStream;
module.exports.aggressive = PdfAggressive;
module.exports.processes = PdfProcesses;
module.exports.workers = PDFWorkers;
module.exports.SmartPDFParser = SmartPDFParser;

module.exports.markdown = Markdown.markdown;
module.exports.markdownRender = Markdown.markdownRender;
module.exports.createMarkdownRenderer = Markdown.createMarkdownRenderer;
module.exports.collectFontStats = Markdown.collectFontStats;
module.exports.markdownRenderModule = require.resolve('./lib/markdown-render-page.js');

// ES6/TypeScript compatibility
module.exports.default = Pdf;

