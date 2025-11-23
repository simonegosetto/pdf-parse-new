/**
 * Select optimal parsing method based on analysis
 * Auto-generated from 9417 benchmark samples
 * Generated on: 2025-11-23T07:08:38.803Z
 */
selectMethod(analysis, userOptions) {
	// Check for forced method
	if (this.options.forceMethod) {
		return this.getMethodConfig(this.options.forceMethod, analysis);
	}

	// Check historical benchmarks for this PDF profile
	const historicalBest = this.findHistoricalBest(analysis);
	if (historicalBest) {
		console.log(`[SmartPDFParser] Using historical best: ${historicalBest.method}`);
		return this.getMethodConfig(historicalBest.method, analysis);
	}

	const { pages, availableMemory, cpuCores, estimatedComplexity } = analysis;

	// Best for tiny PDFs (median: 10.19ms)
	if (pages <= 10) {
		return {
			name: 'batch',
			config: {
			   "parallelizePages": true,
			   "batchSize": 5
			},
			parser: PDF
		};
	}

	// Best for small PDFs (median: 107.18ms)
	else if (pages > 10 && pages <= 50) {
		return {
			name: 'batch',
			config: {
			   "parallelizePages": true,
			   "batchSize": 10
			},
			parser: PDF
		};
	}

	// Best for medium PDFs (median: 331.70ms)
	else if (pages > 50 && pages <= 200) {
		return {
			name: 'batch',
			config: {
			   "parallelizePages": true,
			   "batchSize": 20
			},
			parser: PDF
		};
	}

	// Best for large PDFs (median: 1102.18ms)
	else if (pages > 200 && pages <= 500) {
		return {
			name: 'batch',
			config: {
			   "parallelizePages": true,
			   "batchSize": 50
			},
			parser: PDF
		};
	}

	// Best for x-large PDFs (median: 1988.03ms)
	else if (pages > 500 && pages <= 1000) {
		return {
			name: 'batch',
			config: {
			   "parallelizePages": true,
			   "batchSize": 50
			},
			parser: PDF
		};
	}

	// Best for huge PDFs (median: 2774.96ms)
	else if (pages > 1000) {
		return {
			name: 'processes',
			config: {
			   "chunkSize": 500,
			   "batchSize": 10,
			   "maxProcesses": "Math.max(2, cpuCores - 1)"
			},
			parser: PDFProcesses
		};
	}

	// Fallback to batch processing
	return {
		name: 'batch',
		config: { parallelizePages: true, batchSize: 10 },
		parser: PDF
	};
}
