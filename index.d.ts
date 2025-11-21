
declare namespace PdfParse {
	interface Result {
		numpages: number;
		numrender: number;
		info: any;
		metadata: any;
		text: string;
		version?: string;
	}

	interface Options {
		pagerender?: ((pageData: any) => string | Promise<string>) | undefined;
		max?: number | undefined;
		verbosityLevel?: 0 | 1 | 5 | undefined;
		parallelizePages?: boolean | undefined;
		batchSize?: number | undefined;
	}

	interface StreamOptions extends Options {
		chunkSize?: number | undefined;
		onChunkComplete?: ((progress: ChunkProgress) => void) | undefined;
	}

	interface WorkersOptions extends Options {
		chunkSize?: number | undefined;
		maxWorkers?: number | undefined;
		onProgress?: ((progress: WorkerProgress) => void) | undefined;
	}

	interface ProcessesOptions extends Options {
		chunkSize?: number | undefined;
		maxProcesses?: number | undefined;
		processTimeout?: number | undefined;
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

declare namespace PdfParse {
	export { stream, aggressive, workers, processes };
}

export = PdfParse;
