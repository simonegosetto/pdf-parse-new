const Fs = require('fs');
const Pdf = require('./lib/pdf-parse.js');
const PdfStream = require('./lib/pdf-parse-stream.js');
const PdfAggressive = require('./lib/pdf-parse-aggressive.js');
const PdfProcesses = require('./lib/pdf-parse-processes.js');
const PDFWorkers = require('./lib/pdf-parse-workers.js');
const SmartPDFParser = require('./lib/SmartPDFParser.js');

module.exports = Pdf;
module.exports.stream = PdfStream;
module.exports.aggressive = PdfAggressive;
module.exports.processes = PdfProcesses;
module.exports.workers = PDFWorkers;
module.exports.SmartPDFParser = SmartPDFParser;
