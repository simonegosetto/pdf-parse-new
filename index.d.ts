export = PdfParse;

declare function PdfParse(dataBuffer: Buffer, options?: PdfParse.Options): Promise<PdfParse.Result>;

export enum VerbosityLevel {
	ERRORS = 0,
	WARNINGS = 1,
	INFO = 5,
}

declare namespace PdfParse {
	type Version = "default" | "v1.9.426" | "v1.10.100" | "v1.10.88" | "v2.0.550";
	interface Result {
		numpages: number;
		numrender: number;
		info: any;
		metadata: any;
		version: Version;
		text: string;
	}
	interface Options {
		pagerender?: ((pageData: any) => string) | undefined;
		max?: number | undefined;
		version?: Version | undefined;
		verbosityLevel?: VerbosityLevel | undefined;
	}
}
