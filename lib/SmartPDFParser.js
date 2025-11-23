const os = require('os');
const PDF = require('./pdf-parse');
const PDFStream = require('./pdf-parse-stream');
const PDFAggressive = require('./pdf-parse-aggressive');
const PDFProcesses = require('./pdf-parse-processes');
const PDFWorkers = require('./pdf-parse-workers');

/**
 * Smart PDF Parser - Automatically selects the optimal parsing method
 * based on PDF characteristics and system resources
 */
class SmartPDFParser {
	constructor(options = {}) {
		this.options = {
			// System configuration
			availableCPUs: os.cpus().length,
			maxMemoryUsage: options.maxMemoryUsage || (os.totalmem() * 0.7), // 70% of total RAM

			// Override options
			forceMethod: options.forceMethod || null, // 'sequential', 'batch', 'stream', 'aggressive', 'processes', 'workers'

			...options
		};

		// Statistics (in-memory only)
		this.stats = {
			totalParses: 0,
			methodUsage: {
				sequential: 0,
				batch: 0,
				stream: 0,
				aggressive: 0,
				processes: 0,
				workers: 0
			},
			averageTimes: {},
			failedParses: 0
		};
	}

	/**
	 * Main parsing method - automatically selects optimal strategy
	 */
	async parse(dataBuffer, userOptions = {}) {
		const startTime = performance.now();

		try {
			// Analyze PDF characteristics
			const analysis = await this.analyzePDF(dataBuffer);

			// Select optimal method
			const method = this.selectMethod(analysis, userOptions);

			console.log(`[SmartPDFParser] Selected method: ${method.name}`);
			console.log(`[SmartPDFParser] PDF: ${analysis.pages} pages, ${(analysis.size / 1024 / 1024).toFixed(2)} MB`);
			console.log(`[SmartPDFParser] Config: ${JSON.stringify(method.config)}`);

			// Parse with selected method
			const result = await this.parseWithMethod(dataBuffer, method, userOptions);

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Update stats (in-memory only)
			this.updateStats(method.name, duration, true);

			console.log(`[SmartPDFParser] Completed in ${duration.toFixed(2)}ms\n`);

			return {
				...result,
				_meta: {
					method: method.name,
					duration,
					analysis
				}
			};

		} catch (error) {
			const endTime = performance.now();
			const duration = endTime - startTime;

			this.stats.failedParses++;
			console.error(`[SmartPDFParser] Failed after ${duration.toFixed(2)}ms:`, error.message);

			throw error;
		}
	}

	/**
	 * Analyze PDF to extract characteristics
	 */
	async analyzePDF(dataBuffer) {
		const analysis = {
			size: dataBuffer.length,
			pages: 0,
			estimatedComplexity: 'medium',
			availableMemory: os.freemem(),
			cpuCores: this.options.availableCPUs
		};

		try {
			// Quick metadata extraction (minimal parsing)
			const quickParse = await PDF(dataBuffer, {
				max: 1,
				verbosityLevel: 0
			});

			analysis.pages = quickParse.numpages;

			// Estimate complexity based on size per page
			const bytesPerPage = analysis.size / analysis.pages;
			if (bytesPerPage < 10_000) {
				analysis.estimatedComplexity = 'simple'; // Text-heavy
			} else if (bytesPerPage > 100_000) {
				analysis.estimatedComplexity = 'complex'; // Image-heavy
			}

		} catch (error) {
			console.warn('[SmartPDFParser] Failed to analyze PDF:', error.message);
			// Estimate based on size alone
			analysis.pages = Math.max(10, Math.floor(analysis.size / 50000));
		}

		return analysis;
	}

	/**
	 * Select optimal parsing method based on analysis
	 * Optimized from 9417 real-world benchmark samples
	 * Last trained: 2025-11-23
	 */
	selectMethod(analysis, userOptions) {
		// Check for forced method
		if (this.options.forceMethod) {
			return this.getMethodConfig(this.options.forceMethod, analysis);
		}

		const { pages, cpuCores } = analysis;

		// Tiny PDFs (1-10 pages) - Best: batch with small batches
		// Data shows median: 10.19ms with batch processing
		if (pages <= 10) {
			return {
				name: 'batch',
				config: {
					parallelizePages: true,
					batchSize: 5
				},
				parser: PDF
			};
		}

		// Small PDFs (11-50 pages) - Best: batch processing
		// Data shows median: 107.18ms with batch-10
		if (pages <= 50) {
			return {
				name: 'batch',
				config: {
					parallelizePages: true,
					batchSize: 10
				},
				parser: PDF
			};
		}

		// Medium PDFs (51-200 pages) - Best: batch with larger batches
		// Data shows median: 331.70ms with batch-20
		if (pages <= 200) {
			return {
				name: 'batch',
				config: {
					parallelizePages: true,
					batchSize: 20
				},
				parser: PDF
			};
		}

		// Large PDFs (201-500 pages) - Best: batch with large batches
		// Data shows median: 1102.18ms with batch-50
		if (pages <= 500) {
			return {
				name: 'batch',
				config: {
					parallelizePages: true,
					batchSize: 50
				},
				parser: PDF
			};
		}

		// X-Large PDFs (501-1000 pages) - Best: batch (still competitive)
		// Data shows median: 1988.03ms with batch-50
		if (pages <= 1000) {
			return {
				name: 'batch',
				config: {
					parallelizePages: true,
					batchSize: 50
				},
				parser: PDF
			};
		}

		// Huge PDFs (1000+ pages) - Best: multi-threading for parallelism
		// Data shows: workers 2355ms, processes 2775ms (vs 11723ms with batch)
		// Workers are slightly faster and more stable than processes
		// Use workers if available, fallback to processes
		const useWorkers = true; // Workers preferred for stability

		if (useWorkers) {
			return {
				name: 'workers',
				config: {
					chunkSize: 500,
					batchSize: 10,
					maxWorkers: Math.max(2, cpuCores - 1)
				},
				parser: PDFWorkers
			};
		} else {
			return {
				name: 'processes',
				config: {
					chunkSize: 500,
					batchSize: 10,
					maxProcesses: Math.max(2, cpuCores - 1)
				},
				parser: PDFProcesses
			};
		}
	}


	/**
	 * Adaptive batch size based on page complexity
	 */
	adaptiveBatchSize(analysis) {
		const { pages, estimatedComplexity } = analysis;

		// Base batch size
		let batchSize = 10;

		// Adjust for complexity
		if (estimatedComplexity === 'simple') {
			batchSize = 20; // Simple PDFs can handle larger batches
		} else if (estimatedComplexity === 'complex') {
			batchSize = 5; // Complex PDFs need smaller batches
		}

		// Adjust for total pages
		if (pages > 200) {
			batchSize = Math.min(50, batchSize * 2);
		}

		return batchSize;
	}

	/**
	 * Adaptive chunk size based on available memory
	 */
	adaptiveChunkSize(analysis) {
		const { pages, availableMemory, size } = analysis;

		// Estimate memory per page
		const memoryPerPage = size / pages;

		// Calculate safe chunk size
		const safeChunkSize = Math.floor(availableMemory / (memoryPerPage * 2)); // 2x safety factor

		// Clamp between 100 and 1000
		return Math.max(100, Math.min(1000, safeChunkSize));
	}

	/**
	 * Get method configuration by name
	 */
	getMethodConfig(methodName, analysis) {
		const configs = {
			sequential: {
				name: 'sequential',
				config: { parallelizePages: false },
				parser: PDF
			},
			batch: {
				name: 'batch',
				config: {
					parallelizePages: true,
					batchSize: this.adaptiveBatchSize(analysis)
				},
				parser: PDF
			},
			stream: {
				name: 'stream',
				config: {
					chunkSize: this.adaptiveChunkSize(analysis),
					batchSize: 10
				},
				parser: PDFStream
			},
			aggressive: {
				name: 'aggressive',
				config: {
					chunkSize: 500,
					batchSize: 20
				},
				parser: PDFAggressive
			},
			processes: {
				name: 'processes',
				config: {
					chunkSize: this.adaptiveChunkSize(analysis),
					batchSize: 10,
					maxProcesses: Math.max(2, this.options.availableCPUs - 1)
				},
				parser: PDFProcesses
			},
			workers: {
				name: 'workers',
				config: {
					chunkSize: this.adaptiveChunkSize(analysis),
					batchSize: 10,
					maxWorkers: Math.max(2, this.options.availableCPUs - 1)
				},
				parser: PDFWorkers
			}
		};

		return configs[methodName] || configs.batch;
	}

	/**
	 * Parse with selected method
	 */
	async parseWithMethod(dataBuffer, method, userOptions) {
		const config = {
			verbosityLevel: 0,
			...method.config,
			...userOptions
		};

		return await method.parser(dataBuffer, config);
	}



	/**
	 * Update statistics
	 */
	updateStats(method, duration, success) {
		this.stats.totalParses++;
		this.stats.methodUsage[method]++;

		if (!this.stats.averageTimes[method]) {
			this.stats.averageTimes[method] = [];
		}
		this.stats.averageTimes[method].push(duration);
	}

	/**
	 * Get statistics (in-memory only for current session)
	 */
	getStats() {
		const avgTimes = {};
		for (const [method, times] of Object.entries(this.stats.averageTimes)) {
			avgTimes[method] = times.reduce((a, b) => a + b, 0) / times.length;
		}

		return {
			...this.stats,
			averageTimes: avgTimes
		};
	}


}

module.exports = SmartPDFParser;

