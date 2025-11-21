const fs = require('fs');
const os = require('os');
const PDF = require('./pdf-parse');
const PDFStream = require('./pdf-parse-stream');
const PDFAggressive = require('./pdf-parse-aggressive');
const PDFProcesses = require('./pdf-parse-processes');

/**
 * Smart PDF Parser - Automatically selects the optimal parsing method
 * based on PDF characteristics and system resources
 */
class SmartPDFParser {
	constructor(options = {}) {
		this.options = {
			// Learning configuration
			enableLearning: options.enableLearning !== false,
			benchmarkFile: options.benchmarkFile || './pdf-parse-benchmarks.json',

			// System configuration
			availableCPUs: os.cpus().length,
			maxMemoryUsage: options.maxMemoryUsage || (os.totalmem() * 0.7), // 70% of total RAM

			// Performance thresholds
			smallPDFPages: options.smallPDFPages || 50,
			mediumPDFPages: options.mediumPDFPages || 500,
			largePDFPages: options.largePDFPages || 1000,

			// Override options
			forceMethod: options.forceMethod || null, // 'sequential', 'batch', 'stream', 'aggressive', 'processes'

			...options
		};

		// Load historical benchmarks
		this.benchmarks = this.loadBenchmarks();

		// Statistics
		this.stats = {
			totalParses: 0,
			methodUsage: {
				sequential: 0,
				batch: 0,
				stream: 0,
				aggressive: 0,
				processes: 0
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

			// Record benchmark
			if (this.options.enableLearning) {
				await this.recordBenchmark(analysis, method, duration, true);
			}

			// Update stats
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
			if (bytesPerPage < 10000) {
				analysis.estimatedComplexity = 'simple'; // Text-heavy
			} else if (bytesPerPage > 100000) {
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

		// Decision tree based on pages and resources
		const { pages, availableMemory, cpuCores } = analysis;

		// Small PDFs (< 50 pages)
		if (pages < this.options.smallPDFPages) {
			return {
				name: 'batch',
				config: { parallelizePages: true, batchSize: 5 },
				parser: PDF
			};
		}

		// Medium PDFs (50-500 pages)
		if (pages < this.options.mediumPDFPages) {
			return {
				name: 'batch',
				config: { parallelizePages: true, batchSize: this.adaptiveBatchSize(analysis) },
				parser: PDF
			};
		}

		// Large PDFs (500-1000 pages)
		if (pages < this.options.largePDFPages) {
			// Check memory availability
			const estimatedMemoryNeeded = pages * 50000; // Rough estimate

			if (availableMemory < estimatedMemoryNeeded * 1.5) {
				// Memory constrained - use streaming
				return {
					name: 'stream',
					config: {
						chunkSize: this.adaptiveChunkSize(analysis),
						batchSize: 10
					},
					parser: PDFStream
				};
			}

			// Enough memory - use aggressive
			return {
				name: 'aggressive',
				config: {
					chunkSize: 500,
					batchSize: 20
				},
				parser: PDFAggressive
			};
		}

		// Huge PDFs (1000+ pages) - Use multi-core
		if (cpuCores >= 4) {
			return {
				name: 'processes',
				config: {
					chunkSize: this.adaptiveChunkSize(analysis),
					batchSize: 10,
					maxProcesses: Math.max(2, cpuCores - 1)
				},
				parser: PDFProcesses
			};
		}

		// Fallback to streaming for single/dual core systems
		return {
			name: 'stream',
			config: {
				chunkSize: this.adaptiveChunkSize(analysis),
				batchSize: 10
			},
			parser: PDFStream
		};
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
	 * Find best historical method for similar PDFs
	 */
	findHistoricalBest(analysis) {
		if (!this.benchmarks || this.benchmarks.length === 0) {
			return null;
		}

		// Find similar PDFs (within 20% page count)
		const similar = this.benchmarks.filter(b => {
			const pageDiff = Math.abs(b.pages - analysis.pages) / analysis.pages;
			return pageDiff < 0.2 && b.success;
		});

		if (similar.length === 0) {
			return null;
		}

		// Find fastest method
		const best = similar.reduce((best, current) => {
			return current.duration < best.duration ? current : best;
		});

		return {
			method: best.method,
			expectedDuration: best.duration
		};
	}

	/**
	 * Record benchmark result
	 */
	async recordBenchmark(analysis, method, duration, success) {
		const benchmark = {
			timestamp: Date.now(),
			pages: analysis.pages,
			size: analysis.size,
			complexity: analysis.estimatedComplexity,
			method: method.name,
			config: method.config,
			duration,
			success,
			cpuCores: this.options.availableCPUs,
			availableMemory: analysis.availableMemory
		};

		this.benchmarks.push(benchmark);

		// Keep only last 1000 benchmarks
		if (this.benchmarks.length > 1000) {
			this.benchmarks = this.benchmarks.slice(-1000);
		}

		// Save to file
		try {
			fs.writeFileSync(
				this.options.benchmarkFile,
				JSON.stringify(this.benchmarks, null, 2)
			);
		} catch (error) {
			console.warn('[SmartPDFParser] Failed to save benchmarks:', error.message);
		}
	}

	/**
	 * Load historical benchmarks
	 */
	loadBenchmarks() {
		try {
			if (fs.existsSync(this.options.benchmarkFile)) {
				const data = fs.readFileSync(this.options.benchmarkFile, 'utf8');
				return JSON.parse(data);
			}
		} catch (error) {
			console.warn('[SmartPDFParser] Failed to load benchmarks:', error.message);
		}
		return [];
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
	 * Get statistics
	 */
	getStats() {
		const avgTimes = {};
		for (const [method, times] of Object.entries(this.stats.averageTimes)) {
			avgTimes[method] = times.reduce((a, b) => a + b, 0) / times.length;
		}

		return {
			...this.stats,
			averageTimes: avgTimes,
			benchmarksCollected: this.benchmarks.length
		};
	}

	/**
	 * Analyze all benchmarks and suggest optimal configurations
	 */
	analyzeBenchmarks() {
		if (this.benchmarks.length === 0) {
			return { message: 'No benchmarks collected yet' };
		}

		// Group by page ranges
		const ranges = [
			{ name: 'Small (0-50)', min: 0, max: 50 },
			{ name: 'Medium (50-500)', min: 50, max: 500 },
			{ name: 'Large (500-1000)', min: 500, max: 1000 },
			{ name: 'Huge (1000+)', min: 1000, max: Infinity }
		];

		const analysis = {};

		for (const range of ranges) {
			const inRange = this.benchmarks.filter(b =>
				b.pages >= range.min && b.pages < range.max && b.success
			);

			if (inRange.length === 0) {
				analysis[range.name] = { message: 'No data' };
				continue;
			}

			// Find best method for this range
			const byMethod = {};
			for (const b of inRange) {
				if (!byMethod[b.method]) {
					byMethod[b.method] = [];
				}
				byMethod[b.method].push(b.duration);
			}

			const avgByMethod = {};
			for (const [method, durations] of Object.entries(byMethod)) {
				avgByMethod[method] = {
					average: durations.reduce((a, b) => a + b, 0) / durations.length,
					count: durations.length
				};
			}

			// Find best
			let best = null;
			let bestAvg = Infinity;
			for (const [method, data] of Object.entries(avgByMethod)) {
				if (data.average < bestAvg && data.count >= 2) {
					bestAvg = data.average;
					best = method;
				}
			}

			analysis[range.name] = {
				samples: inRange.length,
				methods: avgByMethod,
				recommended: best,
				averageTime: bestAvg
			};
		}

		return analysis;
	}

	/**
	 * Export benchmarks for analysis
	 */
	exportBenchmarks(filename) {
		const data = {
			exportDate: new Date().toISOString(),
			systemInfo: {
				cpus: this.options.availableCPUs,
				totalMemory: os.totalmem(),
				platform: os.platform()
			},
			benchmarks: this.benchmarks,
			stats: this.getStats(),
			analysis: this.analyzeBenchmarks()
		};

		fs.writeFileSync(filename, JSON.stringify(data, null, 2));
		console.log(`[SmartPDFParser] Exported ${this.benchmarks.length} benchmarks to ${filename}`);
	}
}

module.exports = SmartPDFParser;

