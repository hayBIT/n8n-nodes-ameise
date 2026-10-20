import type { IDataObject, IExecuteFunctions, IHttpRequestOptions, INode } from 'n8n-workflow';
import { vi } from 'vitest';

const node: INode = {
	id: 'ameise',
	name: 'Ameise',
	type: 'n8n-nodes-ameise.ameise',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

/** Minimal IExecuteFunctions mock: parameters by name, HTTP responses from `respond` */
export function createContext(
	parameters: IDataObject,
	respond: (options: IHttpRequestOptions) => unknown = () => ({}),
	credentials: IDataObject = {},
) {
	const requests: IHttpRequestOptions[] = [];
	const context = {
		getNode: () => node,
		getInputData: () => [{ json: {} }],
		continueOnFail: () => false,
		getCredentials: vi.fn(async () => credentials),
		getNodeParameter: (name: string, _itemIndex: number, fallback?: unknown) => {
			const value = name
				.split('.')
				.reduce<unknown>((current, key) => (current as IDataObject | undefined)?.[key], parameters);
			if (value === undefined) {
				if (fallback !== undefined) return fallback;
				throw new Error(`Missing parameter ${name}`);
			}
			return value;
		},
		helpers: {
			httpRequestWithAuthentication: vi.fn(async (_type: string, options: IHttpRequestOptions) => {
				requests.push(options);
				return respond(options);
			}),
			prepareBinaryData: vi.fn(async (buffer: Buffer, fileName: string, mimeType: string) => ({
				data: buffer.toString('base64'),
				fileName,
				mimeType,
			})),
			assertBinaryData: vi.fn((_itemIndex: number, name: string) => ({
				data: '',
				fileName: `${name}.pdf`,
				mimeType: 'application/pdf',
			})),
			getBinaryDataBuffer: vi.fn(async () => Buffer.from('hello')),
		},
	};
	return { context: context as unknown as IExecuteFunctions, requests };
}
