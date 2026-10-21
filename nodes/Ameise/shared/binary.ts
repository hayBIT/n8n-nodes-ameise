import type { IExecuteFunctions } from 'n8n-workflow';

export interface InputFile {
	buffer: Buffer;
	fileName?: string;
	mimeType: string;
}

/** Reads a file from a binary field of the input item */
export async function readInputFile(
	this: IExecuteFunctions,
	itemIndex: number,
	binaryPropertyName: string,
): Promise<InputFile> {
	const binary = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
	return { buffer, fileName: binary.fileName, mimeType: binary.mimeType };
}
