# pdf-parse-new

**Pure javascript cross-platform module to extract texts from PDFs.**

## 2025 refresh library of [pdf-parse](https://gitlab.com/autokent/pdf-parse)

## Similar Packages
* [pdf2json](https://www.npmjs.com/package/pdf2json) buggy, no support anymore, memory leak, throws non-catchable fatal errors
* [j-pdfjson](https://www.npmjs.com/package/j-pdfjson) fork of pdf2json
* [pdf-parser](https://github.com/dunso/pdf-parse) buggy, no tests
* [pdfreader](https://www.npmjs.com/package/pdfreader) using pdf2json
* [pdf-extract](https://www.npmjs.com/package/pdf-extract) not cross-platform using xpdf

## Installation
`npm install pdf-parse-new`

## Basic Usage - Local Files

```js
const fs = require('fs');
const pdf = require('pdf-parse-new');

let dataBuffer = fs.readFileSync('path to PDF file...');

pdf(dataBuffer).then(function(data) {

	// number of pages
	console.log(data.numpages);
	// number of rendered pages
	console.log(data.numrender);
	// PDF info
	console.log(data.info);
	// PDF metadata
	console.log(data.metadata);
	// PDF.js version
	// check https://mozilla.github.io/pdf.js/getting_started/
	console.log(data.version);
	// PDF text
	console.log(data.text);

});
```

## Basic Usage - HTTP
You can use [crawler-request](https://www.npmjs.com/package/crawler-request) which uses the `pdf-parse`

## Exception Handling

```js
const fs = require('fs');
const pdf = require('pdf-parse-new');

let dataBuffer = fs.readFileSync('path to PDF file...');

pdf(dataBuffer).then(function(data) {
	// use data
})
.catch(function(error){
	// handle exceptions
})
```

## Extend
* v1.0.9 and above break pagerender callback [changelog](https://github.com/simonegosetto/pdf-parse-new/blob/master/CHANGELOG)
* If you need another format like json, you can change page render behaviour with a callback
* Check out https://mozilla.github.io/pdf.js/

```js
// default render callback
function render_page(pageData) {
    // check documents https://mozilla.github.io/pdf.js/
    let render_options = {
        // replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: false,
        // do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: false,
    }

    return pageData.getTextContent(render_options)
	.then(function(textContent) {
		let lastY, text = '';
		for (let item of textContent.items) {
			if (lastY == item.transform[5] || !lastY){
				text += item.str;
			}
			else{
				text += '\n' + item.str;
			}
			lastY = item.transform[5];
		}
		return text;
	});
}

let options = {
    pagerender: render_page
}

let dataBuffer = fs.readFileSync('path to PDF file...');

pdf(dataBuffer,options).then(function(data) {
	//use new format
});
```

## Options

```js
const DEFAULT_OPTIONS = {
	// internal page parser callback
	// you can set this option, if you need another format except raw text
	pagerender: render_page,
	// max page number to parse
	max: 0,
	// pdf.js verbosity Level
	verbosityLevel: 0, // errors: 0, warnings: 1, infos: 5
	// enable parallel page processing (batch-based)
	parallelizePages: false,
	// number of pages to process in parallel per batch
	batchSize: 10
}
```
### *pagerender* (callback)
If you need another format except raw text.

### *max* (number)
Max number of page to parse. If the value is less than or equal to 0, parser renders all pages.

### *parallelizePages* (boolean)
Enable batch-parallel processing of PDF pages for improved performance on large PDFs.

**Example:**
```js
// Sequential processing (default)
pdf(dataBuffer).then(function(data) {
	console.log(data.text);
});

// Parallel processing with default batch size (10)
pdf(dataBuffer, { parallelizePages: true }).then(function(data) {
	console.log(data.text);
});

// Custom batch size for large PDFs
pdf(dataBuffer, {
	parallelizePages: true,
	batchSize: 20
}).then(function(data) {
	console.log(data.text);
});
```

**Performance:**
- For PDFs with 50+ pages: 15-30% faster
- For PDFs with 200+ pages: up to 40% faster
- Optimal batch size depends on PDF size (see [PARALLEL_PARSING.md](PARALLEL_PARSING.md))

### *batchSize* (number)
Number of pages to process in parallel per batch when `parallelizePages` is enabled. Default is 10.

**Guidelines:**
- Small PDFs (< 50 pages): 5-10
- Medium PDFs (50-200 pages): 10-20
- Large PDFs (200+ pages): 20-50

See [PARALLEL_PARSING.md](PARALLEL_PARSING.md) for detailed benchmarks and best practices.

## 🚀 Advanced: Parsing Very Large PDFs (1000+ pages)

For extremely large PDFs, use specialized methods:

### Streaming with Chunking

Best for reducing memory pressure on large files:

```js
const pdf = require('pdf-parse-new');
const fs = require('fs');

let dataBuffer = fs.readFileSync('huge-file.pdf');

// Use streaming method
pdf.stream(dataBuffer, {
	verbosityLevel: 0,
	chunkSize: 500,      // Process 500 pages per chunk
	batchSize: 10,       // 10 pages parallel within chunk
	onChunkComplete: (progress) => {
		console.log(`Progress: ${progress.progress}% (${progress.processedPages}/${progress.totalPages})`);
	}
}).then(function(data) {
	console.log(data.text);
});
```

**Benefits:**
- Reduced memory usage
- Progress tracking
- Better garbage collection
- 15-25% faster for large files

### Aggressive Parallelization (Maximum Speed)

Best for massive PDFs (1000+ pages):

```js
const pdf = require('pdf-parse-new');
const fs = require('fs');

let dataBuffer = fs.readFileSync('massive-file.pdf');

// Use aggressive parallelization
pdf.aggressive(dataBuffer, {
	verbosityLevel: 0,
	chunkSize: 500,      // Pages per chunk
	batchSize: 20,       // Aggressive batch size (all batches run in parallel)
	onChunkComplete: (progress) => {
		console.log(`Progress: ${progress.progress}% (chunk ${progress.currentChunk}/${progress.totalChunks})`);
	}
}).then(function(data) {
	console.log(data.text);
});
```

**Benefits:**
- 30-50% faster for 1000+ page PDFs
- Maximum parallelization within chunks
- No worker thread overhead
- Progress tracking
- Most reliable for large files

**Note:** Run with `--expose-gc` flag for better memory management:
```bash
node --expose-gc your-script.js
```

>*pdf.js* version is *v4.5.136*
>[mozilla.github.io/pdf.js](https://mozilla.github.io/pdf.js/getting_started/#download)

## Test
* `mocha` or `npm test`
* Check [test folder](https://github.com/simonegosetto/pdf-parse-new/tree/master/test) and [quickstart.js](https://github.com/simonegosetto/pdf-parse-new/blob/master/QUICKSTART.js) for extra usages.

### Submitting an Issue
If you find a bug or a mistake, you can help by submitting an issue [Here](https://github.com/simonegosetto/pdf-parse-new/issues)

### Creating a Merge Request
GitLab calls it merge request instead of pull request.

* [A Guide for First-Timers](https://about.gitlab.com/2016/06/16/fearless-contribution-a-guide-for-first-timers/)
* [How to create a merge request](https://docs.gitlab.com/ee/gitlab-basics/add-merge-request.html)
* Check [Contributing Guide](https://gitlab.com/autokent/pdf-parse/blob/master/CONTRIBUTING.md)

## License
[MIT licensed](https://github.com/simonegosetto/pdf-parse-new/blob/master/LICENSE) and all it's dependencies are MIT or BSD licensed.
