# PDF Parse Examples

This directory contains practical examples demonstrating all parsing methods.

## Quick Start

```bash
# Run any example
node test/examples/01-basic-parse.js
node test/examples/06-smart-parser.js
node test/examples/07-compare-all.js
```

## Examples

### 01-basic-parse.js
**Basic PDF parsing** with default options.
- Learn: How to parse a PDF with minimal code
- Best for: Quick integration, simple use cases

### 02-batch-parse.js
**Batch processing** with different batch sizes.
- Learn: How to optimize batch size for your PDFs
- Best for: Small to medium PDFs (< 1000 pages)

### 03-stream-parse.js
**Streaming parse** with progress tracking.
- Learn: Memory-efficient parsing with visual progress
- Best for: Large PDFs with limited memory

### 04-workers-parse.js
**Worker threads** for true multi-core parallelism.
- Learn: How to use all CPU cores for huge PDFs
- Best for: PDFs with 1000+ pages on multi-core systems

### 05-processes-parse.js
**Child processes** for maximum performance.
- Learn: Multi-processing for fastest parsing
- Best for: Huge PDFs (often faster than workers)

### 06-smart-parser.js
**SmartPDFParser** with automatic method selection.
- Learn: How the smart parser chooses the best method
- See: Fast-path optimization, caching, statistics
- Best for: Production use, mixed PDF sizes

### 07-compare-all.js
**Compare all methods** on the same PDF.
- Learn: Performance differences between methods
- See: Benchmark results, speedup factors
- Best for: Understanding when to use which method

## Running Examples

### With Small PDFs (included)
All examples work with the included test PDFs:
```bash
node test/examples/01-basic-parse.js
node test/examples/02-batch-parse.js
node test/examples/06-smart-parser.js
```

### With Large PDFs (optional)
Some examples perform better with large PDFs:
```bash
# Place a large PDF in test/data/test_9000.pdf
node test/examples/04-workers-parse.js
node test/examples/05-processes-parse.js
node test/examples/07-compare-all.js
```

If large PDF is not found, examples automatically use smaller test files.

## What You'll Learn

### Performance Optimization
- When to use batch vs workers vs processes
- How oversaturation improves CPU utilization
- Impact of batch size on performance

### Smart Features
- Fast-path optimization (50x faster overhead)
- Decision caching (25x faster on cache hit)
- CPU-aware thresholds (adapts to your hardware)

### Production Patterns
- Error handling
- Progress tracking
- Method comparison
- Statistics monitoring

## Tips

1. **Start with SmartPDFParser** (example 06) - it auto-selects the best method
2. **Run comparison** (example 07) to see differences on your hardware
3. **Test batch sizes** (example 02) to find optimal configuration
4. **Monitor progress** (examples 03, 04, 05) for long-running tasks

## Next Steps

After trying examples:
1. Read the main [README.md](../../README.md) for full documentation
2. Check [lib/README.md](../../lib/README.md) for architecture details
3. See [benchmark/](../../benchmark/) for benchmarking tools

---

**All examples are production-ready code!** Copy and adapt them for your projects.

