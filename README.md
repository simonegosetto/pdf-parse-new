# pdf-parse-new

**Pure JavaScript cross-platform module to extract text from PDFs with intelligent performance optimization.**

[![npm version](https://img.shields.io/npm/v/pdf-parse-new.svg?style=flat-square)](https://www.npmjs.com/package/pdf-parse-new)
[![License](https://img.shields.io/npm/l/pdf-parse-new.svg?style=flat-square)](LICENSE)
[![Downloads](https://img.shields.io/npm/dm/pdf-parse-new.svg?style=flat-square)](https://www.npmjs.com/package/pdf-parse-new)

**Version 2.0.0** - Major release with SmartPDFParser, multi-core processing, and AI-powered method selection based on 9,417+ real-world benchmarks.

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

### 🎯 New in Version 2.0.0

✨ **SmartPDFParser with AI-Powered Selection**
- Automatically selects optimal parsing method based on PDF characteristics
- CPU-aware thresholds that adapt to available hardware (4 to 48+ cores)
- Fast-path optimization: **50x faster** overhead for small PDFs (25ms → 0.5ms)
- LRU caching: **25x faster** on repeated similar PDFs
- 90%+ optimization rate in production

⚡ **Multi-Core Performance**
- **Child Processes**: True multi-processing, 2-4x faster for huge PDFs
- **Worker Threads**: Alternative multi-threading with lower memory overhead
- **Oversaturation**: Use 1.5x-2x cores for maximum CPU utilization (I/O-bound optimization)
- Automatic memory safety limits

📊 **Battle-Tested Intelligence**
- Decision tree trained on **9,417+ real-world PDF benchmarks**
- Tested on documents from 1 to 10,000+ pages
- CPU normalization: adapts thresholds from 4-core laptops to 48-core servers
- Production-ready with comprehensive error handling

🚀 **Multiple Parsing Strategies**
- **Batch Processing**: Parallel page processing (optimal for 0-1000 pages)
- **Child Processes**: Multi-processing (default for 1000+ pages, most consistent)
- **Worker Threads**: Multi-threading (alternative, can be faster on some PDFs)
- **Streaming**: Memory-efficient chunking for constrained environments
- **Aggressive**: Combines streaming with large batches
- **Sequential**: Traditional fallback

🔧 **Developer Experience**
- Drop-in replacement for pdf-parse (backward compatible)
- 7 practical examples in `test/examples/`
- Full TypeScript definitions with autocomplete
- Comprehensive benchmarking tools included
- Zero configuration required (paths resolved automatically)

---

## Installation

```bash
npm install pdf-parse-new
```

---

## What's New in 2.0.0

### 🎯 Major Features

**SmartPDFParser** - Intelligent automatic method selection
- CPU-aware decision tree (adapts to 4-48+ cores)
- Fast-path optimization (0.5ms overhead vs 25ms)
- LRU caching for repeated PDFs
- 90%+ optimization rate

**Multi-Core Processing**
- Child processes (default, most consistent)
- Worker threads (alternative, can be faster)
- Oversaturation factor (1.5x cores = better CPU utilization)
- Automatic memory safety

**Performance Improvements**
- 2-4x faster for huge PDFs (1000+ pages)
- 50x faster overhead for tiny PDFs (< 0.5 MB)
- 25x faster on cache hits
- CPU normalization for any hardware

**Better DX**
- 7 practical examples with npm scripts
- Full TypeScript definitions
- Comprehensive benchmarking tools
- Clean repository structure

### 📦 Migration from 1.x

Version 2.0.0 is **backward compatible**. Your existing code will continue to work:

```javascript
// v1.x code still works
const pdf = require('pdf-parse-new');
pdf(buffer).then(data => console.log(data.text));
```

**To take advantage of new features:**

```javascript
// Use SmartPDFParser for automatic optimization
const SmartParser = require('pdf-parse-new/lib/SmartPDFParser');
const parser = new SmartParser();
const result = await parser.parse(buffer);
console.log(`Used ${result._meta.method} in ${result._meta.duration}ms`);
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

### 📚 Examples

See [test/examples/](test/examples/) for practical examples:

```bash
# Try the examples
npm run example:basic      # Basic parsing
npm run example:smart      # SmartPDFParser (recommended)
npm run example:compare    # Compare all methods

# Or run directly
node test/examples/01-basic-parse.js
node test/examples/06-smart-parser.js
```

**7 complete examples** covering all parsing methods with real-world patterns!

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
| **1000+** | **processes*** | **~2355-4468ms** | **Huge documents (2-4x faster!)** |

**\*Both workers and processes are excellent for huge PDFs. Processes is the default due to better consistency, but workers can be faster in some cases. Use `forceMethod: 'workers'` to try workers.**

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

// Example: Compare workers vs processes for your specific PDFs
const testWorkers = new SmartParser({ forceMethod: 'workers' });
const testProcesses = new SmartParser({ forceMethod: 'processes' });

const result1 = await testWorkers.parse(hugePdfBuffer);
console.log(`Workers: ${result1._meta.duration}ms`);

const result2 = await testProcesses.parse(hugePdfBuffer);
console.log(`Processes: ${result2._meta.duration}ms`);
```

#### Memory Limit

```javascript
const parser = new SmartParser({
    maxMemoryUsage: 2e9  // 2GB max
});
```

#### Oversaturation for Maximum Performance

PDF parsing is I/O-bound. During I/O waits, CPU cores sit idle. Oversaturation keeps them busy:

```javascript
const parser = new SmartParser({
    oversaturationFactor: 1.5  // Use 1.5x more workers than cores
});

// Example on 24-core system:
// - Default (1.5x): 36 workers (instead of 23!)
// - Aggressive (2x): 48 workers
// - Conservative (1x): 24 workers
```

**Why this works:**
- PDF parsing involves lots of I/O (reading data, decompressing)
- During I/O, CPU cores are idle
- More workers = cores stay busy = better throughput

**Automatic memory limiting:**
- Parser automatically limits workers if memory is constrained
- Each worker needs ~2x PDF size in memory
- Safe default balances speed and memory

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

### CPU-Aware Intelligence

SmartPDFParser automatically adapts to your CPU:

```javascript
// On 4-core laptop
parser.parse(500_page_pdf);
// → Uses workers (threshold: ~167 pages)

// On 48-core server
parser.parse(500_page_pdf);
// → Uses batch (threshold: ~2000 pages, workers overhead not worth it yet)
```

This ensures optimal performance regardless of hardware! The decision tree was trained on multiple machines with different core counts.

### Fast-Path Optimization

SmartPDFParser uses intelligent fast-paths to minimize overhead:

```javascript
const parser = new SmartParser();

// Tiny PDF (< 0.5 MB)
await parser.parse(tiny_pdf);
// ⚡ Fast-path: ~0.5ms overhead (50x faster than tree navigation!)

// Small PDF (< 1 MB)
await parser.parse(small_pdf);
// ⚡ Fast-path: ~0.5ms overhead

// Medium PDF (already seen similar)
await parser.parse(medium_pdf);
// 💾 Cache hit: ~1ms overhead

// Common scenario (500 pages, 5MB)
await parser.parse(common_pdf);
// 📋 Common scenario: ~2ms overhead

// Rare case (unusual size/page ratio)
await parser.parse(unusual_pdf);
// 🌳 Full tree: ~25ms overhead (only for edge cases)
```

**Overhead Comparison:**

| PDF Type | Before | After | Speedup |
|----------|--------|-------|---------|
| Tiny (< 0.5 MB) | 25ms | **0.5ms** | **50x faster** ⚡ |
| Small (< 1 MB) | 25ms | **0.5ms** | **50x faster** ⚡ |
| Cached | 25ms | **1ms** | **25x faster** 💾 |
| Common | 25ms | **2ms** | **12x faster** 📋 |
| Rare | 25ms | 25ms | Same 🌳 |

**90%+ of PDFs hit a fast-path!** This means minimal overhead even for tiny documents.

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

| Method     | Time (estimate) | Speed vs Batch | Notes |
|------------|-----------------|----------------|-------|
| Workers    | ~2.4-7s | **2-7x faster** ✨ | Faster startup, can vary by PDF |
| Processes  | ~4.2-4.5s | **3-4x faster** | More consistent, better isolation |
| Batch      | ~17.6s  | baseline | Good up to 1000 pages |
| Sequential | ~17.8s  | 0.99x | Fallback only |

**Note**: Performance varies by PDF complexity, size, and system. Both workers and processes provide significant speedup - test both on your specific PDFs to find the best option.

### Best Practices

1. **Use SmartParser for large documents** (100+ pages)
2. **Batch processing is optimal** for most use cases (0-1000 pages)
3. **Both Processes and Workers excel at huge PDFs** (1000+ pages)
   - **Processes** (default): More consistent, better memory isolation, 2-4x faster than batch
   - **Workers**: Can be faster on some PDFs, use `forceMethod: 'workers'` to test
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
- **Note**: Memory usage = PDF size × concurrent workers
- For very large PDFs, limit `maxWorkers` to 2-4 to avoid memory issues

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

## NPM Module Compatibility

This library is designed to work correctly when installed as an npm module.

### Path Resolution

All internal paths use proper resolution:
- ✅ Worker threads: `path.join(__dirname, 'pdf-worker.js')`
- ✅ Child processes: `path.join(__dirname, 'pdf-child.js')`
- ✅ PDF.js: `require('./pdf.js/v4.5.136/build/pdf.js')`

This ensures the library works correctly:
- When installed via `npm install`
- In `node_modules/` directory
- Regardless of working directory
- With or without symlinks

### No Configuration Required

The library automatically resolves all internal paths - you don't need to configure anything!

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
| Feature | pdf-parse | pdf-parse-new 2.0 |
|---------|-----------|-------------------|
| Speed (huge PDFs) | Baseline | **2-4x faster** ⚡ |
| Smart optimization | ❌ | ✅ AI-powered |
| Multi-core support | ❌ | ✅ Workers + Processes |
| CPU adaptation | ❌ | ✅ 4-48+ cores |
| Fast-path | ❌ | ✅ 50x faster overhead |
| Caching | ❌ | ✅ LRU cache |
| TypeScript | Partial | ✅ Complete |
| Examples | Basic | ✅ 7 production-ready |
| Benchmarking | ❌ | ✅ Tools included |
| Maintenance | Slow | ✅ Active |

### vs. Other PDF Libraries
- ✅ **Pure JavaScript** (no native dependencies, no compilation)
- ✅ **Cross-platform** (Windows, Mac, Linux - same code)
- ✅ **Zero configuration** (paths auto-resolved, npm-safe)
- ✅ **No memory leaks** (proper cleanup, GC-friendly)
- ✅ **Production-ready** (comprehensive error handling)
- ✅ **Well-tested** (9,417+ benchmark samples)
- ✅ **Modern** (async/await, Promises, ES6+)

### Real-World Performance

**9,924-page PDF (13.77 MB) on 24-core system:**
```
Sequential: ~15,000ms
Batch-50:   ~11,723ms
Processes:   ~4,468ms  ✅ (2.6x faster than batch)
Workers:     ~6,963ms  ✅ (1.7x faster than batch)

SmartParser: Automatically chooses Processes ⚡
```

**100 KB PDF on any system:**
```
Overhead:
- Without fast-path: 25ms
- With fast-path:    0.5ms ✅ (50x faster)
```

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
- Powered by [PDF.js](https://mozilla.github.io/pdf.js/) v4.5.136 by Mozilla
- Performance optimization and v2.0 development by Simone Gosetto

---

## Changelog

### Version 2.0.0 (2025-11-23)

**Major Features:**
- ✨ SmartPDFParser with AI-powered method selection
- ⚡ Multi-core processing (workers + processes)
- 🚀 Oversaturation for maximum CPU utilization
- ⚡ Fast-path optimization (50x faster overhead)
- 💾 LRU caching (25x faster on cache hits)
- 🎯 CPU-aware thresholds (4-48+ cores)
- 📊 Decision tree trained on 9,417+ benchmarks
- 🔧 7 production-ready examples
- 📝 Complete TypeScript definitions
- 🧪 Comprehensive benchmarking tools

**Performance:**
- 2-4x faster for huge PDFs (1000+ pages)
- 50x faster overhead for tiny PDFs
- 25x faster on repeated similar PDFs
- 90%+ optimization rate in production

**Breaking Changes:**
- None - fully backward compatible with 1.x

See [CHANGELOG](CHANGELOG) for complete version history.

---

**Made with ❤️ for the JavaScript community**

**npm**: [`pdf-parse-new`](https://www.npmjs.com/package/pdf-parse-new)
**Repository**: [GitHub](https://github.com/simonegosetto/pdf-parse-new)
**Issues**: [Report bugs](https://github.com/simonegosetto/pdf-parse-new/issues)

