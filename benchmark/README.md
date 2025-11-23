# Benchmarking Tools

This directory contains tools for performance analysis and optimization of pdf-parse-new.

## Files

- **collect-benchmarks.js** - Collect performance data from PDFs
- **train-smart-parser.js** - Analyze benchmarks and generate optimized decision tree
- **test-pdfs.example.json** - Example configuration file
- **test-pdfs.json** - Your PDF list (gitignored, create from example)
- **smart-parser-benchmarks.json** - Benchmark data (gitignored, auto-generated)

## Quick Start

### 1. Setup Test PDFs

```bash
cp test-pdfs.example.json test-pdfs.json
```

Edit `test-pdfs.json` with your PDF URLs or file paths:

```json
{
  "note": "Add your PDF URLs or file paths here",
  "urls": [
    "./test/data/sample.pdf",
    "https://example.com/document.pdf"
  ]
}
```

### 2. Collect Benchmarks

```bash
node collect-benchmarks.js
```

This will:
- Test all parsing methods on each PDF
- Support local files and remote URLs
- Save results incrementally (no data loss)
- Generate detailed performance reports

Output file:
- `smart-parser-benchmarks.json` - Training data (optimized format)

### 3. Train Decision Tree (Optional)

For library developers only:

```bash
node train-smart-parser.js
```

This analyzes benchmarks and generates optimized parsing rules in:
- `smart-parser-training-report.json` - Analysis report
- `smart-parser-optimized.js` - Generated code

## Features

### collect-benchmarks.js

- ✅ Supports local files and remote URLs
- ✅ Tests all available parsing methods
- ✅ Incremental saving (interrupt-safe)
- ✅ Detailed timing and memory metrics
- ✅ Error handling and retry logic

### train-smart-parser.js

- ✅ Analyzes 9000+ benchmarks
- ✅ Generates optimized decision tree
- ✅ Statistical analysis (median, P95, std dev)
- ✅ Identifies best method per PDF size category
- ✅ Creates production-ready code

## Notes

- All `*.json` files are gitignored (except examples)
- `test-pdfs.json` keeps your private URLs safe
- Benchmark data is for development/optimization only
- End users don't need to run these tools

## Performance Insights

From 9,417 real-world benchmarks:

| PDF Size | Best Method | Median Time |
|----------|-------------|-------------|
| 1-10 pages | batch-5 | 10ms |
| 11-50 pages | batch-10 | 107ms |
| 51-200 pages | batch-20 | 332ms |
| 201-500 pages | batch-50 | 1102ms |
| 501-1000 pages | batch-50 | 1988ms |
| **1000+ pages** | **processes** | **4468ms (2.6x faster!)** |

