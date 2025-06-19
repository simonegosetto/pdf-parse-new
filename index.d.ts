export = PdfParse;

declare function PdfParse(dataBuffer: Buffer, options?: PdfParse.Options): Promise<PdfParse.Result>;

declare namespace PdfParse {
	interface Result {
		numpages: number;
		numrender: number;
		info: any;
		metadata: any;
		text: string;
	}
	interface Options {
		pagerender?: ((pageData: any) => string | Promise<string>) | undefined;
		max?: number | undefined;
		verbosityLevel?: 0 | 1 | 5 | undefined;
	}
	const DEFAULT_OPTIONS: Options;
}
