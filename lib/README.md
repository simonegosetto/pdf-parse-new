# PDF Parse - Advanced Parsing Methods

This directory contains advanced implementations for parsing large PDFs efficiently.

## Files

- **pdf-parse.js** - Original batch parallelization method
- **pdf-parse-stream.js** - Streaming with chunking for memory efficiency
- **pdf-parse-workers.js** - Worker threads for true CPU parallelism
- **pdf-worker.js** - Worker thread implementation

## When to Use Each Method

### Standard (pdf-parse.js)
**Best for:** < 500 pages
```javascript
const pdf = require('pdf-parse-new');
await pdf(buffer, {
  parallelizePages: true,
  batchSize: 10
});
```

### Streaming (pdf-parse-stream.js)
**Best for:** 500-1000 pages, memory-constrained environments
```javascript
const pdf = require('pdf-parse-new');
await pdf.stream(buffer, {
  chunkSize: 500,
  batchSize: 10
});
```
**Benefits:**
- Reduced memory pressure
- Better garbage collection
- Progress tracking
- 15-25% faster for large files

### Workers (pdf-parse-workers.js)
**Best for:** 1000+ pages, multi-core systems
```javascript
const pdf = require('pdf-parse-new');
await pdf.workers(buffer, {
  chunkSize: 500,
  maxWorkers: 4
});
```
**Benefits:**
- True multi-core parallelism
- 30-50% faster for huge files
- Maximum CPU utilization
- Isolated worker memory

## Performance Tips

1. **Enable Garbage Collection**
   ```bash
   node --expose-gc your-script.js
   ```

2. **Adjust Chunk Size**
   - Small PDFs: N/A
   - Medium (50-500): batchSize 10-20
   - Large (500-1000): chunkSize 500, batchSize 10
   - Huge (1000+): chunkSize 500, maxWorkers = CPU cores - 1

3. **Monitor Memory**
   ```javascript
   console.log(`Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
   ```

## Architecture

### Batch Parallelization
```
[Page 1-10] → Promise.all → [Text 1-10]
[Page 11-20] → Promise.all → [Text 11-20]
...
```

### Streaming
```
Chunk 1 [Page 1-500]
  ├─ Batch [1-10]
  ├─ Batch [11-20]
  └─ ...
  → GC
Chunk 2 [Page 501-1000]
  └─ ...
```

### Workers
```
Worker 1 → [Page 1-500]   ─┐
Worker 2 → [Page 501-1000] ├─→ Combine → Result
Worker 3 → [Page 1001-1500]┘
```

## Benchmarks

See [PARALLEL_PARSING.md](../PARALLEL_PARSING.md) for detailed benchmarks.

Quick reference:
- **373 pages**: Batch 10 = +12.6% faster
- **9000 pages**: Workers = +45-50% faster

