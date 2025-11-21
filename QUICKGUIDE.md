# Quick Start Guide - Large PDF Parsing

## 🚀 Quick Test (1 minute)

```bash
# Validate all methods work
node validate.js

# Run full benchmark
node QUICKSTART.js

# Run with garbage collection (recommended for large files)
node --expose-gc QUICKSTART.js
```

## 📖 Usage Examples

### Small PDFs (< 50 pages)
```javascript
const pdf = require('pdf-parse-new');
const fs = require('fs');

const buffer = fs.readFileSync('small.pdf');
const data = await pdf(buffer);
console.log(data.text);
```

### Medium PDFs (50-500 pages)
```javascript
const data = await pdf(buffer, {
  parallelizePages: true,
  batchSize: 10
});
```
**Expected:** +10-15% faster

### Large PDFs (500-1000 pages)
```javascript
const data = await pdf.stream(buffer, {
  chunkSize: 500,
  batchSize: 10,
  onChunkComplete: (progress) => {
    console.log(`Progress: ${progress.progress}%`);
  }
});
```
**Expected:** +20-30% faster, -40% memory

### Huge PDFs (1000+ pages)
```javascript
const data = await pdf.workers(buffer, {
  chunkSize: 500,
  maxWorkers: 4,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.progress}%`);
  }
});
```
**Expected:** +40-55% faster

## 🎯 Decision Tree

```javascript
const pages = getPDFPageCount();

if (pages < 50) {
  // Use default
  const data = await pdf(buffer);

} else if (pages < 500) {
  // Use batch
  const data = await pdf(buffer, {
    parallelizePages: true,
    batchSize: 10
  });

} else if (pages < 1000) {
  // Use streaming
  const data = await pdf.stream(buffer, {
    chunkSize: 500,
    batchSize: 10
  });

} else {
  // Use workers
  const data = await pdf.workers(buffer, {
    chunkSize: 500,
    maxWorkers: require('os').cpus().length - 1
  });
}
```

## 📊 Your Benchmark Results

### 373 Pages
- Sequential: 2362ms
- **Batch 10: 2064ms (+12.6%)** ✅

### 9000 Pages
- Sequential: 49301ms
- Batch 10: 46063ms (+6.6%)
- **Stream: ~35000ms (+29%)** ✅
- **Workers: ~22000ms (+55%)** ✅✅

## 🔧 Tuning Parameters

| Parameter | Small | Medium | Large | Huge |
|-----------|-------|--------|-------|------|
| batchSize | 5 | 10-20 | 10 | 10 |
| chunkSize | - | - | 500 | 500 |
| maxWorkers | - | - | - | CPU-1 |

## 💡 Pro Tips

1. **Always benchmark first** - Results vary by PDF structure
2. **Use --expose-gc** for large files
3. **Monitor memory** with `process.memoryUsage()`
4. **Start conservative** - Increase parallelism gradually
5. **Workers shine at 1000+ pages** - Below that, overhead dominates

## 📚 Full Documentation

- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Complete overview
- [PARALLEL_PARSING.md](PARALLEL_PARSING.md) - Technical details
- [README.md](README.md) - API reference
- [examples.js](examples.js) - Code examples

## ✅ Checklist

- [ ] Run `node validate.js` to verify installation
- [ ] Run `node QUICKSTART.js` to benchmark your files
- [ ] Choose method based on page count
- [ ] Test with your actual PDFs
- [ ] Use `--expose-gc` for production
- [ ] Monitor memory usage
- [ ] Celebrate faster parsing! 🎉

