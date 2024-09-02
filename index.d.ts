export = PdfParse;

declare function PdfParse(dataBuffer: Buffer, options?: PdfParse.Options): Promise<PdfParse.Result>;

declare namespace PdfParse {
	// type Version = "default" | "v1.10.100" | "v2.0.550" | "v4.5.136";
	interface Result {
		numpages: number;
		numrender: number;
		info: any;
		metadata: any;
		// version: Version;
		text: string;
	}
	interface Options {
		pagerender?: ((pageData: any) => string) | undefined;
		max?: number | undefined;
		// version?: Version | undefined;
		verbosityLevel?: 0 | 1 | 5 | undefined;
	}
}
