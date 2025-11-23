
declare namespace PdfParse {
	interface Result {
		numpages: number;
		numrender: number;
		info: any;
		metadata: any;
		text: string;
		version?: string;
		_meta?: {
			method?: string;
			duration?: number;
			analysis?: any;
			fastPath?: boolean;
			cached?: boolean;
			commonScenario?: boolean;
		};
	}

	interface Options {
		pagerender?: ((pageData: any) => string | Promise<string>) | undefined;
		max?: number | undefined;
		verbosityLevel?: 0 | 1 | 5 | undefined;
		parallelizePages?: boolean | undefined;
		batchSize?: number | undefined;
	}

	interface SmartParserOptions {
		/** Force a specific parsing method instead of auto-selection */
		forceMethod?: 'sequential' | 'batch' | 'stream' | 'aggressive' | 'processes' | 'workers' | null;

		/** Maximum memory usage in bytes (default: 70% of total RAM) */
		maxMemoryUsage?: number;

		/** Number of available CPUs (auto-detected by default) */
		availableCPUs?: number;

		/** Enable fast-path optimization for tiny PDFs (default: true) */
		enableFastPath?: boolean;

		/** Enable decision caching (default: true) */
		enableCache?: boolean;

		/** Oversaturation factor for worker/process count (default: 1.5) */
		oversaturationFactor?: number;

		/** Hard limit on maximum workers/processes (default: null = auto) */
		maxWorkerLimit?: number | null;
	}

	interface SmartParserStats {
		totalParses: number;
		methodUsage: {
			sequential: number;
			batch: number;
			stream: number;
			aggressive: number;
			processes: number;
			workers: number;
		};
		averageTimes: Record<string, number>;
		failedParses: number;
		fastPathHits: number;
		cacheHits: number;
		treeNavigations: number;
		optimizationRate: string;
		averageOverhead: string;
	}

	interface StreamOptions extends Options {
		chunkSize?: number | undefined;
		onChunkComplete?: ((progress: ChunkProgress) => void) | undefined;
	}

	interface WorkersOptions extends Options {
		chunkSize?: number | undefined;
		maxWorkers?: number | undefined;
		/** Batch size for processing pages within each worker (default: 10) */
		batchSize?: number | undefined;
		onProgress?: ((progress: WorkerProgress) => void) | undefined;
	}

	interface ProcessesOptions extends Options {
		chunkSize?: number | undefined;
		maxProcesses?: number | undefined;
		/** Timeout for each child process in milliseconds (default: 300000) */
		processTimeout?: number | undefined;
		/** Batch size for processing pages within each process (default: 10) */
		batchSize?: number | undefined;
		onProgress?: ((progress: ProcessProgress) => void) | undefined;
	}

	interface ChunkProgress {
		processedPages: number;
		totalPages: number;
		progress: string;
		currentChunk: number;
		totalChunks: number;
	}

	interface WorkerProgress {
		completedChunks: number;
		totalChunks: number;
		progress: string;
	}

	interface ProcessProgress {
		completedChunks: number;
		totalChunks: number;
		progress: string;
	}

	const DEFAULT_OPTIONS: Options;


}

/**
 * Main PDF parsing function
 * @param dataBuffer - PDF file buffer
 * @param options - Parsing options
 * @returns Promise with parsed PDF data
 */
declare function PdfParse(dataBuffer: Buffer, options?: PdfParse.Options): Promise<PdfParse.Result>;

/**
 * Parse PDF with streaming/chunking approach for large files
 * Reduces memory pressure by processing in chunks
 * Best for 500-1000 page PDFs
 * @param dataBuffer - PDF file buffer
 * @param options - Streaming options
 * @returns Promise with parsed PDF data
 */
declare function stream(dataBuffer: Buffer, options?: PdfParse.StreamOptions): Promise<PdfParse.Result>;

/**
 * Parse PDF with aggressive parallelization for maximum speed
 * Best for very large PDFs (1000+ pages)
 * All batches within a chunk run in parallel (single-thread)
 * @param dataBuffer - PDF file buffer
 * @param options - Aggressive parsing options
 * @returns Promise with parsed PDF data
 */
declare function aggressive(dataBuffer: Buffer, options?: PdfParse.StreamOptions): Promise<PdfParse.Result>;

/**
 * Parse PDF using worker threads for true multi-core parallelism
 * May have compatibility issues with PDF.js in some environments
 * Best for very large PDFs (1000+ pages) on multi-core systems
 * @param dataBuffer - PDF file buffer
 * @param options - Worker threads options
 * @returns Promise with parsed PDF data
 */
declare function workers(dataBuffer: Buffer, options?: PdfParse.WorkersOptions): Promise<PdfParse.Result>;

/**
 * Parse PDF using child processes for true multi-core parallelism
 * Most reliable multi-threading option, works in all environments
 * Best for very large PDFs (1000+ pages) on multi-core systems
 * @param dataBuffer - PDF file buffer
 * @param options - Child processes options
 * @returns Promise with parsed PDF data
 */
declare function processes(dataBuffer: Buffer, options?: PdfParse.ProcessesOptions): Promise<PdfParse.Result>;

/**
 * Smart PDF Parser - Automatically selects optimal parsing method
 * based on PDF characteristics and system resources.
 *
 * Features:
 * - CPU-aware decision tree (adapts to available cores)
 * - Fast-path optimization (0.5ms overhead for tiny PDFs)
 * - LRU cache for repeated similar PDFs
 * - Common scenario matching (90%+ hit rate)
 * - Oversaturation for maximum CPU utilization
 *
 * @example
 * ```typescript
 * const SmartParser = require('pdf-parse-new/lib/SmartPDFParser');
 * const parser = new SmartParser();
 * const result = await parser.parse(pdfBuffer);
 * console.log(`Parsed ${result.numpages} pages using ${result._meta.method}`);
 * ```
 */
declare class SmartPDFParser {
	constructor(options?: PdfParse.SmartParserOptions);

	/**
	 * Parse PDF with automatic method selection
	 * @param dataBuffer - PDF file buffer
	 * @param userOptions - Optional parsing options to override defaults
	 * @returns Promise with parsed PDF data including _meta with method and performance info
	 */
	parse(dataBuffer: Buffer, userOptions?: PdfParse.Options): Promise<PdfParse.Result>;

	/**
	 * Get parser statistics (in-memory for current session)
	 * @returns Statistics object with parse counts, method usage, and optimization metrics
	 */
	getStats(): PdfParse.SmartParserStats;
}

declare namespace PdfParse {
	export { stream, aggressive, workers, processes, SmartPDFParser };
}

export = PdfParse;
