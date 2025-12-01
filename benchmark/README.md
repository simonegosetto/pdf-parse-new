# Benchmarking Tools

This directory contains tools for performance analysis and optimization of pdf-parse-new.

## Files

- **collect-benchmarks.js** - Collect performance data from PDFs
- **train-smart-parser.js** - Analyze benchmarks and generate decision rules (outputs `lib/smart-parser-rules.json`)
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
- `smart-parser-training-report.json` - Training report with decision rules

## Features

### collect-benchmarks.js

- ✅ Supports local files and remote URLs
- ✅ Tests all available parsing methods
- ✅ Incremental saving (interrupt-safe)
- ✅ Detailed timing and memory metrics
- ✅ Error handling and retry logic

### train-smart-parser.js

- ✅ Analyzes 15,526+ benchmarks
- ✅ Generates JSON-based decision rules (not code!)
- ✅ Statistical analysis (median, P95, std dev)
- ✅ Identifies best method per PDF size category
- ✅ CPU-aware normalization for multi-core systems

### Output: `lib/smart-parser-rules.json`

The training script generates a JSON configuration file that SmartPDFParser reads at runtime. This means:
- 🚀 No code modification needed to update rules
- 📊 Easy to version and track changes
- 🔧 Can be customized per deployment
- 🧪 Enables A/B testing of different strategies

## Notes

- All `*.json` files are gitignored (except examples)
- `test-pdfs.json` keeps your private URLs safe
- Benchmark data is for development/optimization only
- End users don't need to run these tools

## Performance Insights

From 15,526 real-world benchmarks (trained 2025-11-23):

| PDF Size | Best Method | Median Time | Samples |
|----------|-------------|-------------|---------|
| 1-10 pages | batch-5 | 10.66ms | 4,887 |
| 11-50 pages | batch-10 | 103.87ms | 1,602 |
| 51-200 pages | stream | 262.02ms | 4,904 |
| 201-500 pages | batch-50 | 1007.83ms | 1,768 |
| 501-1000 pages | processes | 1907.46ms | 90 |
| **1000+ pages** | **processes** | **4016.89ms** | **2,275** |

