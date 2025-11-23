# pdf-parse-new

**Pure JavaScript cross-platform module to extract text from PDFs with smart performance optimization.**

[![npm version](https://img.shields.io/npm/v/pdf-parse-new.svg)](https://www.npmjs.com/package/pdf-parse-new)
[![License](https://img.shields.io/npm/l/pdf-parse-new.svg)](LICENSE)

Modern 2025 refresh of [pdf-parse](https://gitlab.com/autokent/pdf-parse) with performance improvements and smart parsing strategies.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Smart Parser](#smart-parser)
- [API Reference](#api-reference)
- [Performance Optimization](#performance-optimization)
- [Benchmarking](#benchmarking)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

✨ **Smart Performance Optimization**
- Automatically selects the best parsing method based on PDF size
- 4-5x faster for large PDFs (1000+ pages) using worker threads
- Optimized batch processing for small to medium PDFs

🚀 **Multiple Parsing Strategies**
- **Batch Processing**: Parallel page processing (optimal for 0-1000 pages)
- **Worker Threads**: Multi-threaded parsing (best for 1000+ pages)
- **Streaming**: Memory-efficient for constrained environments
- **Sequential**: Traditional fallback method

📊 **Battle-Tested**
- Decision tree optimized on 9,417 real-world PDF benchmarks
- Tested on documents ranging from 1 to 2000+ pages
- Production-ready with comprehensive error handling

🔧 **Easy to Use**
- Drop-in replacement for pdf-parse
- Simple API with sensible defaults
- Optional manual method selection

---

## Installation

```bash
npm install pdf-parse-new
```

---

## Quick Start

### Basic Usage

```javascript
const fs = require('fs');
const pdf = require('pdf-parse-new');

const dataBuffer = fs.readFileSync('path/to/file.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.numpages);  // Number of pages
    console.log(data.text);       // Full text content
    console.log(data.info);       // PDF metadata
});
```

### With Smart Parser (Recommended)

```javascript
const SmartParser = require('pdf-parse-new/lib/SmartPDFParser');

const parser = new SmartParser();
const dataBuffer = fs.readFileSync('large-document.pdf');

parser.parse(dataBuffer).then(function(result) {
    console.log(`Parsed ${result.numpages} pages in ${result._meta.duration}ms`);
    console.log(`Method used: ${result._meta.method}`);
    console.log(result.text);
});
```

### Exception Handling

```javascript
pdf(dataBuffer)
    .then(data => {
        // Process data
    })
    .catch(error => {
        console.error('Error parsing PDF:', error);
    });
```

---

## Smart Parser

The `SmartPDFParser` automatically selects the optimal parsing method based on PDF characteristics.

### Decision Tree

Based on 9,417 real-world benchmarks:

| Pages     | Method    | Avg Time | Best For                    |
|-----------|-----------|----------|-----------------------------|
| 1-10      | batch-5   | ~10ms    | Tiny documents              |
| 11-50     | batch-10  | ~107ms   | Small documents             |
| 51-200    | batch-20  | ~332ms   | Medium documents            |
| 201-500   | batch-50  | ~1102ms  | Large documents             |
| 501-1000  | batch-50  | ~1988ms  | X-Large documents           |
| **1000+** | **workers** | **~2355ms** | **Huge documents (4x faster!)** |

### Usage Options

#### Automatic (Recommended)

```javascript
const SmartParser = require('pdf-parse-new/lib/SmartPDFParser');
const parser = new SmartParser();

// Automatically selects best method
const result = await parser.parse(pdfBuffer);
```

#### Force Specific Method

```javascript
const parser = new SmartParser({
    forceMethod: 'workers'  // 'batch', 'workers', 'processes', 'stream', 'sequential'
});
```

#### Memory Limit

```javascript
const parser = new SmartParser({
    maxMemoryUsage: 2e9  // 2GB limit
});
```

### Get Statistics

```javascript
const stats = parser.getStats();
console.log(stats);
// {
//   totalParses: 10,
//   methodUsage: { batch: 8, workers: 2 },
//   averageTimes: { batch: 150.5, workers: 2300.1 },
//   failedParses: 0
// }
```

---

## API Reference

### pdf(dataBuffer, options)

Parse a PDF file and extract text content.

**Parameters:**
- `dataBuffer` (Buffer): PDF file buffer
- `options` (Object, optional):
  - `pagerender` (Function): Custom page rendering function
  - `max` (Number): Maximum number of pages to parse
  - `version` (String): PDF.js version to use

**Returns:** Promise<Object>
- `numpages` (Number): Total number of pages
- `numrender` (Number): Number of rendered pages
- `info` (Object): PDF metadata
- `metadata` (Object): PDF metadata object
- `text` (String): Extracted text content
- `version` (String): PDF.js version used

### SmartPDFParser

#### constructor(options)

**Options:**
- `forceMethod` (String): Force specific parsing method
- `maxMemoryUsage` (Number): Maximum memory usage in bytes
- `availableCPUs` (Number): Override CPU count detection

#### parse(dataBuffer, userOptions)

Parse PDF with automatic method selection.

**Returns:** Promise<Object> (same as pdf() with additional `_meta` field)
- `_meta.method` (String): Parsing method used
- `_meta.duration` (Number): Parse time in milliseconds
- `_meta.analysis` (Object): PDF analysis data

#### getStats()

Get parsing statistics for current session.

---

## Performance Optimization

### Performance Comparison

For a 1500-page PDF:

| Method     | Time    | Speed vs Batch |
|------------|---------|----------------|
| Workers    | ~3.5s   | **5x faster** ✨ |
| Processes  | ~4.2s   | 4.2x faster    |
| Batch      | ~17.6s  | baseline       |
| Sequential | ~17.8s  | 0.99x          |

### Best Practices

1. **Use SmartParser for large documents** (100+ pages)
2. **Batch processing is optimal** for most use cases (0-1000 pages)
3. **Workers excel at huge PDFs** (1000+ pages)
4. **Avoid sequential** unless you have a specific reason
5. **Monitor memory** for PDFs over 500 pages

### When to Use Each Method

**Batch** (default for most cases)
- PDFs up to 1000 pages
- Balanced speed and memory usage
- Best all-around performance

**Workers** (best for huge PDFs)
- PDFs over 1000 pages
- Multi-core systems
- When speed is critical

**Processes** (alternative to workers)
- Similar to workers but uses child processes
- Better isolation but slightly slower

**Stream** (memory constrained)
- Very limited memory environments
- When you need to process PDFs larger than available RAM

**Sequential** (fallback)
- Single-core systems
- When parallel processing causes issues
- Debugging purposes

---

## Benchmarking

The library includes comprehensive benchmarking tools for optimization.

### Directory Structure

```
benchmark/
├── collect-benchmarks.js        # Collect performance data
├── train-smart-parser.js        # Train decision tree
├── test-pdfs.example.json       # Example PDF list
└── test-pdfs.json              # Your PDFs (gitignored)
```

### Running Benchmarks

1. **Setup test PDFs:**

```bash
cp benchmark/test-pdfs.example.json benchmark/test-pdfs.json
# Edit test-pdfs.json with your PDF URLs/paths
```

2. **Collect benchmark data:**

```bash
node benchmark/collect-benchmarks.js
```

Features:
- Tests all parsing methods on each PDF
- Supports local files and remote URLs
- Saves incrementally (no data loss on interruption)
- Generates detailed performance reports

3. **Train decision tree (library developers only):**

```bash
node benchmark/train-smart-parser.js
```

Analyzes collected benchmarks and generates optimized parsing rules.

### Example test-pdfs.json

```json
{
  "note": "Add your PDF URLs or file paths here",
  "urls": [
    "./test/data/sample.pdf",
    "https://example.com/document.pdf",
    "/absolute/path/to/file.pdf"
  ]
}
```

---

## Troubleshooting

### Common Issues

**Out of Memory**
```javascript
// Limit memory usage
const parser = new SmartParser({ maxMemoryUsage: 2e9 });

// Or use streaming
const parser = new SmartParser({ forceMethod: 'stream' });
```

**Slow Parsing**
```javascript
// For large PDFs, force workers
const parser = new SmartParser({ forceMethod: 'workers' });
```

**Corrupted/Invalid PDFs**
```javascript
// More aggressive parsing
const pdf = require('pdf-parse-new/lib/pdf-parse-aggressive');
pdf(dataBuffer).then(data => console.log(data.text));
```

### Debug Mode

```javascript
// Enable verbose logging
process.env.DEBUG = 'pdf-parse:*';
```

### Get Help

- 📝 [Open an issue](https://github.com/your-repo/pdf-parse-new/issues)
- 💬 Check existing issues for solutions
- 📊 Include benchmark data when reporting performance issues

---

## Advanced Usage

### Custom Page Renderer

```javascript
function customPageRenderer(pageData) {
    const renderOptions = {
        normalizeWhitespace: true,
        disableCombineTextItems: false
    };

    return pageData.getTextContent(renderOptions).then(textContent => {
        let text = '';
        for (let item of textContent.items) {
            text += item.str + ' ';
        }
        return text;
    });
}

const options = { pagerender: customPageRenderer };
pdf(dataBuffer, options).then(data => console.log(data.text));
```

### Limit Pages

```javascript
// Parse only first 10 pages
pdf(dataBuffer, { max: 10 }).then(data => {
    console.log(`Parsed ${data.numrender} of ${data.numpages} pages`);
});
```

### Parallel Processing

```javascript
const PDFProcess = require('pdf-parse-new/lib/pdf-parse-processes');

PDFProcess(dataBuffer, {
    maxProcesses: 4,  // Use 4 parallel processes
    batchSize: 10     // Process 10 pages per batch
}).then(data => console.log(data.text));
```

---

## Why pdf-parse-new?

### vs. Original pdf-parse
- ✅ 4-5x faster for large PDFs
- ✅ Smart automatic optimization
- ✅ Modern JavaScript (async/await)
- ✅ Better error handling
- ✅ Active maintenance
- ✅ Comprehensive benchmarks

### vs. Other PDF Libraries
- ✅ Pure JavaScript (no native dependencies)
- ✅ Cross-platform (Windows, Mac, Linux)
- ✅ No memory leaks
- ✅ Proper error handling (catchable exceptions)
- ✅ Production-ready
- ✅ Well-tested

---

## Contributing

Contributions are welcome! Please read our contributing guidelines.

### Development Setup

```bash
git clone https://github.com/your-repo/pdf-parse-new.git
cd pdf-parse-new
npm install
npm test
```

### Running Tests

```bash
npm test                    # Run all tests
npm run test:smart         # Test smart parser
npm run benchmark          # Run benchmarks
```

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Credits

- Based on [pdf-parse](https://gitlab.com/autokent/pdf-parse) by autokent
- Powered by [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla
- Performance optimization by [your name/org]

---

## Changelog

See [CHANGELOG](CHANGELOG) for version history and migration guides.

---

**Made with ❤️ for the JavaScript community**

