# Changelog

All notable changes to pdf-parse-new will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2025-11-23

### 🎉 Major Release - Complete Rewrite with AI-Powered Optimization

This is a major release that introduces intelligent automatic method selection, multi-core processing, and comprehensive performance optimizations while maintaining 100% backward compatibility.

### ✨ Added

#### SmartPDFParser
- **Intelligent method selection** based on PDF characteristics and system resources
- **CPU-aware thresholds** that adapt from 4-core laptops to 48-core servers
- **Fast-path optimization**: 50x faster overhead for small PDFs (25ms → 0.5ms)
- **LRU caching**: 25x faster on repeated similar PDFs (cache hit in ~1ms)
- **Common scenario matching**: 90%+ hit rate for typical PDFs
- **Decision tree** trained on 9,417 real-world benchmark samples
- **Statistics tracking**: method usage, cache hits, optimization rates

#### Multi-Core Processing
- **Child Processes** (`pdf-parse-processes.js`): True multi-processing for maximum performance
- **Worker Threads** (`pdf-parse-workers.js`): Alternative multi-threading with lower overhead
- **Oversaturation factor**: Use 1.5x-2x cores for better CPU utilization (I/O-bound optimization)
- **Automatic memory limiting**: Prevents OOM by monitoring available RAM
- **Progress callbacks**: Real-time progress tracking for long-running tasks

#### Performance Optimizations
- **Fast-path for tiny PDFs** (< 0.5 MB): Instant decision, no tree navigation
- **Fast-path for small PDFs** (< 1 MB): Immediate batch-5 selection
- **Cache for similar PDFs**: Second parse of similar PDF takes ~1ms
- **CPU normalization**: Thresholds scale with available cores
- **Memory-safe**: Automatic worker limiting based on available RAM

#### Developer Experience
- **7 production-ready examples** in `test/examples/`:
  - `01-basic-parse.js` - Basic usage
  - `02-batch-parse.js` - Batch optimization
  - `03-stream-parse.js` - Memory-efficient streaming
  - `04-workers-parse.js` - Worker threads
  - `05-processes-parse.js` - Child processes
  - `06-smart-parser.js` - SmartPDFParser (recommended)
  - `07-compare-all.js` - Compare all methods
- **npm scripts** for quick example execution (`npm run example:smart`)
- **Complete TypeScript definitions** with all new features
- **Comprehensive benchmarking tools** in `benchmark/`
- **Detailed documentation** with real-world performance data

#### Infrastructure
- **CPU-aware benchmarking**: Tools for collecting data across different CPUs
- **Training pipeline**: Re-train decision tree from benchmark data
- **Incremental saving**: No data loss during long benchmark runs
- **URL support**: Benchmark remote PDFs via HTTP/HTTPS

### 🚀 Improved

#### Performance
- **2-4x faster** for huge PDFs (1000+ pages) using processes/workers
- **50x faster overhead** for tiny PDFs (< 0.5 MB) via fast-path
- **25x faster** on cache hits for repeated similar PDFs
- **Better CPU utilization** via oversaturation (1.5x cores)
- **Reduced memory usage** with automatic worker limiting

#### API
- **Backward compatible**: All v1.x code continues to work
- **New `_meta` field** in results with method, duration, analysis
- **Progress callbacks** for all parallel methods
- **Timeout support** for child processes
- **Resource limits** for worker threads

#### Code Quality
- **Organized structure**: Examples in `test/examples/`, benchmarks in `benchmark/`
- **Clean root**: No more scattered test files
- **TypeScript coverage**: 100% of public API
- **Error handling**: Comprehensive error messages with troubleshooting hints
- **Path resolution**: NPM-safe, works in `node_modules/`

### 🔧 Changed

#### Default Behavior
- SmartPDFParser now uses **processes** as default for huge PDFs (more consistent than workers)
- **Oversaturation factor** default is 1.5x (was 1.0x, i.e., cores - 1)
- **Fast-path enabled** by default (can disable with `enableFastPath: false`)
- **Caching enabled** by default (can disable with `enableCache: false`)

#### Benchmarking
- Moved all benchmark tools to `benchmark/` directory
- Private URLs/paths now in `benchmark/test-pdfs.json` (gitignored)
- Template provided in `benchmark/test-pdfs.example.json`
- Removed redundant `intensive-benchmarks.json` file

### 🗑️ Removed

#### Deprecated Files
- Removed `QUICKSTART.js` (replaced by 7 focused examples)
- Removed scattered test files from root (consolidated in `test/examples/`)
- Removed redundant markdown files (consolidated in main README.md)
- Removed `intensive-benchmarks.json` (kept only `smart-parser-benchmarks.json`)

### 📝 Documentation

#### New Documentation
- **Complete README.md**: All features, examples, benchmarks
- **test/examples/README.md**: Guide to all 7 examples
- **benchmark/README.md**: Benchmarking guide
- **benchmark/CPU_BENCHMARKING_GUIDE.md**: Multi-CPU testing guide
- **TypeScript definitions**: Complete with JSDoc comments

#### Updated Documentation
- Added "What's New in 2.0.0" section
- Added migration guide from 1.x
- Added real-world performance data
- Added comparison table with original pdf-parse
- Added troubleshooting section
- Added oversaturation explanation

### 🐛 Fixed

#### Workers/Processes
- Fixed worker exit code 1 error (Buffer serialization issue)
- Fixed memory exhaustion on large PDFs (added safety limits)
- Fixed path resolution for npm module installation
- Fixed double processing on errors (added completion flags)
- Fixed memory calculation for worker limiting

#### SmartPDFParser
- Fixed hardcoded method selection (now respects benchmark data)
- Fixed missing cpuCores in analysis
- Fixed cache key generation
- Fixed stats initialization

### 🔒 Security

- No known security vulnerabilities
- All dependencies updated to latest secure versions
- Proper cleanup of worker threads and child processes
- Memory limits prevent DoS via large PDFs

### 📊 Performance Data

#### Benchmark Results (9,924 pages, 13.77 MB, 24 cores)

```
Method          Time      vs Sequential  vs Batch
─────────────────────────────────────────────────
Sequential      ~15,000ms  1.00x         3.3x slower
Batch-50        ~11,723ms  1.28x faster  1.00x
Workers          ~6,963ms  2.15x faster  1.68x faster
Processes        ~4,468ms  3.36x faster  2.62x faster ⚡

SmartParser: Automatically selects Processes
```

#### Overhead Comparison

```
PDF Type         Before    After     Speedup
───────────────────────────────────────────────
Tiny (< 0.5 MB)  25ms      0.5ms     50x faster
Small (< 1 MB)   25ms      0.5ms     50x faster
Cached           25ms      1ms       25x faster
Common           25ms      2ms       12x faster
Rare             25ms      25ms      Same
```

### ⚠️ Breaking Changes

**None** - Version 2.0.0 is fully backward compatible with 1.x.

All existing code continues to work without modifications. New features are opt-in via SmartPDFParser.

### 🔄 Migration Guide

#### From 1.x to 2.0.0

**No changes required** - your code will continue to work:

```javascript
// v1.x code (still works in v2.0.0)
const pdf = require('pdf-parse-new');
pdf(buffer).then(data => console.log(data.text));
```

**To use new features:**

```javascript
// Use SmartPDFParser for automatic optimization
const SmartParser = require('pdf-parse-new/lib/SmartPDFParser');
const parser = new SmartParser();
const result = await parser.parse(buffer);

console.log(`Method: ${result._meta.method}`);
console.log(`Duration: ${result._meta.duration}ms`);
console.log(`Fast-path: ${result._meta.fastPath}`);
```

**To force specific method:**

```javascript
// Force processes for huge PDFs
const parser = new SmartParser({ forceMethod: 'processes' });

// Force workers (alternative)
const parser = new SmartParser({ forceMethod: 'workers' });

// Adjust oversaturation
const parser = new SmartParser({ oversaturationFactor: 2.0 });
```

### 🙏 Contributors

- Simone Gosetto - Lead developer, v2.0 implementation
- autokent - Original pdf-parse library
- Mozilla - PDF.js library

### 📦 Dependencies

- `debug`: ^4.3.4
- `node-ensure`: ^0.0.0
- PDF.js: v4.5.136 (bundled)

No breaking dependency changes.

---

## [1.x] - Previous Versions

For changelog of versions prior to 2.0.0, see the original [pdf-parse changelog](https://gitlab.com/autokent/pdf-parse/-/blob/master/CHANGELOG.md).

---

**[Unreleased]**: https://github.com/simonegosetto/pdf-parse-new/compare/v2.0.0...HEAD
**[2.0.0]**: https://github.com/simonegosetto/pdf-parse-new/releases/tag/v2.0.0

