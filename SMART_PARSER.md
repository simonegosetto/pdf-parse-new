# Smart PDF Parser - Intelligent Automatic Method Selection

## Overview

`SmartPDFParser` is an intelligent wrapper that automatically selects the optimal PDF parsing method based on:
- PDF characteristics (pages, size, complexity)
- System resources (CPU cores, available memory)
- Historical performance data (machine learning from past parses)

## Key Features

✅ **Automatic Method Selection** - No need to manually choose between sequential, batch, stream, aggressive, or processes
✅ **Adaptive Configuration** - Dynamically adjusts batch sizes and chunk sizes based on PDF characteristics
✅ **Machine Learning** - Learns from historical performance to improve future decisions
✅ **Memory-Aware** - Adjusts strategy based on available system memory
✅ **Multi-Core Optimization** - Automatically uses child processes on multi-core systems
✅ **Benchmark Collection** - Collects performance data for analysis and improvement

## Quick Start

### Basic Usage

```javascript
const pdf = require('pdf-parse-new');
const SmartPDFParser = pdf.SmartPDFParser;
const fs = require('fs');

// Create parser instance
const parser = new SmartPDFParser();

// Parse PDF - method is automatically selected
const buffer = fs.readFileSync('document.pdf');
const result = await parser.parse(buffer);

console.log(`Parsed ${result.numpages} pages using ${result._meta.method}`);
console.log(`Time: ${result._meta.duration}ms`);
console.log(`Text: ${result.text}`);
```

## Configuration Options

```javascript
const parser = new SmartPDFParser({
	// Learning configuration
	enableLearning: true,                    // Enable ML from past parses
	benchmarkFile: './benchmarks.json',      // Where to store benchmark data

	// System configuration
	maxMemoryUsage: os.totalmem() * 0.7,    // Max memory to use (70% of total)

	// PDF size thresholds
	smallPDFPages: 50,                       // Pages threshold for "small" PDFs
	mediumPDFPages: 500,                     // Pages threshold for "medium" PDFs
	largePDFPages: 1000,                     // Pages threshold for "large" PDFs

	// Override
	forceMethod: null                        // Force specific method (or null for auto)
});
```

## How It Works

### 1. PDF Analysis

When you call `parse()`, the parser first analyzes the PDF:

```javascript
{
  size: 1234567,              // File size in bytes
  pages: 373,                 // Number of pages
  estimatedComplexity: 'medium',  // 'simple', 'medium', or 'complex'
  availableMemory: 8589934592,    // Available RAM
  cpuCores: 8                     // CPU cores available
}
```

### 2. Method Selection

Based on the analysis, it selects the optimal method:

| PDF Size | Condition | Method | Configuration |
|----------|-----------|--------|---------------|
| **< 50 pages** | Small | `batch` | batchSize: 5 |
| **50-500 pages** | Medium | `batch` | Adaptive batch (10-20) |
| **500-1000 pages** | Large, low memory | `stream` | Adaptive chunks |
| **500-1000 pages** | Large, enough memory | `aggressive` | chunkSize: 500, batchSize: 20 |
| **1000+ pages** | Huge, 4+ cores | `processes` | Multi-core parallel |
| **1000+ pages** | Huge, < 4 cores | `stream` | Memory-efficient |

### 3. Adaptive Configuration

The parser automatically adjusts parameters:

#### Adaptive Batch Size
```javascript
// Simple PDFs (text-heavy) → larger batches
if (complexity === 'simple') batchSize = 20;

// Complex PDFs (image-heavy) → smaller batches
if (complexity === 'complex') batchSize = 5;

// Many pages → increase batch size
if (pages > 200) batchSize = min(50, batchSize * 2);
```

#### Adaptive Chunk Size
```javascript
// Calculate based on available memory
const memoryPerPage = size / pages;
const safeChunkSize = floor(availableMemory / (memoryPerPage * 2));

// Clamp between 100 and 1000
return max(100, min(1000, safeChunkSize));
```

### 4. Machine Learning

The parser learns from each parse:

```javascript
// Benchmark data collected
{
  timestamp: 1234567890,
  pages: 373,
  size: 1234567,
  complexity: 'medium',
  method: 'batch',
  config: { batchSize: 10 },
  duration: 2064.35,
  success: true
}
```

For similar PDFs in the future, it will use the historically best method!

## Advanced Features

### Benchmark Collection

Collect comprehensive performance data:

```javascript
node collect-benchmarks.js
```

This tests all methods on all available PDFs and generates:
- `intensive-benchmarks.json` - Raw benchmark data
- `smart-parser-benchmarks.json` - Data in learning format

### Training

Train the parser with your PDFs:

```javascript
node train-smart-parser.js
```

Output:
```
📚 Training Smart Parser with available PDFs...

📄 Processing: ./test/data/test_373.pdf
[SmartPDFParser] Selected method: batch
[SmartPDFParser] PDF: 373 pages, 0.97 MB
✅ Success!
   Method used: batch
   Time: 2064.35ms

📊 Training Statistics
Total parses: 4
Method usage:
  batch          : 3x (avg: 2145.67ms)
  processes      : 1x (avg: 9061.87ms)

🔍 Benchmark Analysis
Medium (50-500):
  Samples: 3
  Recommended: batch
  Average time: 2145.67ms
```

### Statistics & Analysis

```javascript
// Get statistics
const stats = parser.getStats();
console.log(stats);
// {
//   totalParses: 10,
//   methodUsage: { batch: 7, processes: 3 },
//   averageTimes: { batch: 2100, processes: 9000 },
//   benchmarksCollected: 10
// }

// Analyze benchmarks
const analysis = parser.analyzeBenchmarks();
// {
//   'Small (0-50)': { recommended: 'batch', ... },
//   'Medium (50-500)': { recommended: 'batch', ... },
//   'Huge (1000+)': { recommended: 'processes', ... }
// }

// Export for external analysis
parser.exportBenchmarks('./detailed-report.json');
```

## Decision Tree

```
PDF File
│
├─ Analyze
│  ├─ Pages: 373
│  ├─ Size: 1 MB
│  ├─ Complexity: medium
│  └─ Memory: 8 GB free
│
├─ Check Historical Data
│  └─ Found similar PDF → used "batch" (2064ms)
│     └─ Use "batch"! ✓
│
└─ Or Apply Rules
   ├─ Pages < 50? → batch (size 5)
   ├─ Pages < 500? → batch (adaptive)
   ├─ Pages < 1000? → check memory
   │  ├─ Low memory → stream
   │  └─ Enough → aggressive
   └─ Pages >= 1000?
      ├─ 4+ cores → processes ✓
      └─ < 4 cores → stream
```

## Real-World Examples

### Example 1: REST API

```javascript
const express = require('express');
const pdf = require('pdf-parse-new');
const SmartPDFParser = pdf.SmartPDFParser;

const app = express();
const parser = new SmartPDFParser({
	enableLearning: true,
	benchmarkFile: './api-benchmarks.json'
});

app.post('/parse-pdf', async (req, res) => {
	try {
		const result = await parser.parse(req.body.buffer);

		res.json({
			success: true,
			text: result.text,
			pages: result.numpages,
			method: result._meta.method,
			duration: result._meta.duration
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

app.listen(3000);
```

### Example 2: Batch Processing

```javascript
const pdf = require('pdf-parse-new');
const SmartPDFParser = pdf.SmartPDFParser;
const fs = require('fs');

const parser = new SmartPDFParser({
	enableLearning: true
});

async function processBatch(files) {
	for (const file of files) {
		console.log(`Processing ${file}...`);

		const buffer = fs.readFileSync(file);
		const result = await parser.parse(buffer);

		// Save text
		fs.writeFileSync(
			`${file}.txt`,
			result.text
		);

		console.log(`✓ ${result._meta.method} - ${result._meta.duration}ms`);
	}

	// Export benchmarks for analysis
	parser.exportBenchmarks('./batch-benchmarks.json');
}
```

### Example 3: Memory-Constrained Environment

```javascript
const parser = new SmartPDFParser({
	maxMemoryUsage: 1024 * 1024 * 1024,  // 1 GB max
	largePDFPages: 500,                   // Be more conservative
	enableLearning: true
});

// Will automatically prefer streaming for large PDFs
const result = await parser.parse(buffer);
```

## Performance Expectations

Based on collected benchmarks:

### Small PDFs (< 50 pages)
- **Method:** batch (size 5-10)
- **Time:** ~100-500ms
- **Improvement:** +5-15% vs sequential

### Medium PDFs (50-500 pages)
- **Method:** batch (size 10-20)
- **Time:** ~1-3 seconds
- **Improvement:** +10-20% vs sequential

### Large PDFs (500-1000 pages)
- **Method:** stream or aggressive
- **Time:** ~5-15 seconds
- **Improvement:** +20-30% vs sequential

### Huge PDFs (1000+ pages)
- **Method:** processes (multi-core)
- **Time:** ~10-20 seconds
- **Improvement:** +50-70% vs sequential

## Future Improvements

The class is designed to be extended with:

- ✅ **Adaptive batch sizing** - Based on page complexity (IMPLEMENTED)
- ✅ **Memory-aware adjustment** - Based on available RAM (IMPLEMENTED)
- ✅ **Auto-detection** - Automatic method selection (IMPLEMENTED)
- 🔄 **Page complexity detection** - Analyze first few pages to estimate complexity
- 🔄 **Dynamic batch adjustment** - Adjust batch size during parsing based on performance
- 🔄 **Neural network** - Use ML model for even better predictions
- 🔄 **Cloud learning** - Share benchmarks across instances for collective learning

## Contributing Benchmarks

Help improve the parser by sharing your benchmark data:

1. Run intensive benchmarks:
   ```bash
   node collect-benchmarks.js
   ```

2. This generates `intensive-benchmarks.json` with anonymized data

3. Share the file to help improve default configurations!

## API Reference

### Constructor

```typescript
new SmartPDFParser(options?: {
	enableLearning?: boolean;
	benchmarkFile?: string;
	maxMemoryUsage?: number;
	smallPDFPages?: number;
	mediumPDFPages?: number;
	largePDFPages?: number;
	forceMethod?: 'sequential' | 'batch' | 'stream' | 'aggressive' | 'processes';
})
```

### Methods

#### `parse(dataBuffer, userOptions?)`
Parse PDF with automatic method selection.

**Returns:** Promise with PDF data + metadata

#### `getStats()`
Get parsing statistics.

**Returns:** Object with totalParses, methodUsage, averageTimes, etc.

#### `analyzeBenchmarks()`
Analyze collected benchmarks to find optimal methods per PDF size range.

**Returns:** Object with recommendations per range

#### `exportBenchmarks(filename)`
Export all collected benchmarks to JSON file for analysis.

## Troubleshooting

### Parser always uses same method

Check if `forceMethod` is set. If not, it might be due to limited benchmark data. Run `train-smart-parser.js` with diverse PDFs.

### Unexpected method selection

Enable detailed logging and check the analysis:
```javascript
const result = await parser.parse(buffer);
console.log(result._meta.analysis);  // See what was detected
```

### Want to reset learning

Delete the benchmark file:
```javascript
fs.unlinkSync('./pdf-parse-benchmarks.json');
```

## Conclusion

`SmartPDFParser` takes the guesswork out of PDF parsing optimization. It automatically:
- Analyzes your PDFs
- Selects the best method
- Adapts to your system
- Learns from experience
- Provides detailed insights

**Just parse and let it handle the rest!** 🚀

