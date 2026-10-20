import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { ameiseApiRequest } from './transport';
import type { AmeiseOperation, AmeiseResource, PreparedRequest } from './types';
import { applyTransform, fileNameFromContentDisposition, isEmptyValue, setNested } from './utils';

const MISSING = '__ameiseParameterMissing__';

export function buildRequest(
	this: IExecuteFunctions,
	operation: AmeiseOperation,
	itemIndex: number,
): PreparedRequest {
	const request: PreparedRequest = {
		method: operation.method,
		path: operation.path,
		qs: {},
		body: {},
	};

	for (const field of operation.fields ?? []) {
		if (field.location === 'none') continue;
		const { name, type } = field.property;
		const raw = this.getNodeParameter(name, itemIndex, MISSING) as unknown;
		if (raw === MISSING) continue;

		if (field.location === 'path') {
			request.path = request.path.replace(`{${name}}`, encodeURIComponent(String(raw)));
			continue;
		}

		const target = field.location === 'query' ? request.qs : request.body;

		if (type === 'collection' || field.merge) {
			const value = type === 'json' ? applyTransform(raw, 'json') : raw;
			if (Array.isArray(value)) {
				request.rawBody = value;
				continue;
			}
			if (value === null || typeof value !== 'object') continue;
			for (const [key, entry] of Object.entries(value as IDataObject)) {
				const transformed =
					type === 'json'
						? entry
						: applyTransform(entry, field.optionTransforms?.[key] ?? field.transform);
				if (transformed === undefined) continue;
				setNested(target, key, transformed);
			}
			continue;
		}

		if (isEmptyValue(raw) && !field.sendEmpty) continue;
		const value = applyTransform(raw, field.transform);
		if (value === undefined) continue;
		setNested(target, field.key ?? name, value);
	}

	return request;
}

function toExecutionData(
	response: unknown,
	operation: AmeiseOperation,
	itemIndex: number,
): INodeExecutionData[] {
	const pairedItem = { item: itemIndex };

	if (response === undefined || response === null || response === '') {
		return [{ json: { success: true }, pairedItem }];
	}

	let entries: unknown[];
	if (operation.itemsKey && Array.isArray((response as IDataObject)[operation.itemsKey])) {
		entries = (response as IDataObject)[operation.itemsKey] as unknown[];
	} else if (Array.isArray(response)) {
		entries = response;
	} else {
		entries = [response];
	}

	return entries.map((entry) => ({
		json:
			entry !== null && typeof entry === 'object'
				? (entry as IDataObject)
				: { [operation.wrapPrimitivesAs ?? 'value']: entry as string },
		pairedItem,
	}));
}

async function fetchPages(
	this: IExecuteFunctions,
	resource: AmeiseResource,
	operation: AmeiseOperation,
	request: PreparedRequest,
	itemIndex: number,
): Promise<unknown[]> {
	const pagination = operation.pagination!;
	const itemsKey = pagination.itemsKey ?? 'items';
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = returnAll ? Infinity : (this.getNodeParameter('limit', itemIndex, 50) as number);
	const pageSize = Math.min(pagination.maxPageSize, Number.isFinite(limit) ? limit : Infinity);

	const results: unknown[] = [];
	let page = 1;
	for (;;) {
		const response = (await ameiseApiRequest.call(
			this,
			resource.api,
			request.method,
			request.path,
			{
				qs: { ...request.qs, page, pageSize },
				body: request.rawBody ?? request.body,
			},
		)) as IDataObject;
		const pageItems = Array.isArray(response?.[itemsKey]) ? (response[itemsKey] as unknown[]) : [];
		results.push(...pageItems);

		const numberOfPages = Number(response?.numberOfPages ?? page);
		if (results.length >= limit || pageItems.length === 0 || page >= numberOfPages) break;
		page++;
	}

	return Number.isFinite(limit) ? results.slice(0, limit) : results;
}

async function downloadBinary(
	this: IExecuteFunctions,
	resource: AmeiseResource,
	request: PreparedRequest,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const response = (await ameiseApiRequest.call(this, resource.api, request.method, request.path, {
		qs: request.qs,
		binary: true,
	})) as { body: ArrayBuffer | Buffer; headers: IDataObject };

	const buffer = Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body);
	const headers = response.headers ?? {};
	const mimeType = String(headers['content-type'] ?? 'application/octet-stream').split(';')[0];
	const fileName =
		fileNameFromContentDisposition(headers['content-disposition']) ??
		decodeURIComponent(request.path.split('/').filter(Boolean).pop() ?? 'file');
	const binaryPropertyName = this.getNodeParameter(
		'binaryPropertyName',
		itemIndex,
		'data',
	) as string;

	const binaryData = await this.helpers.prepareBinaryData(buffer, fileName, mimeType);

	return [
		{
			json: { fileName, mimeType, fileSize: buffer.length },
			binary: { [binaryPropertyName]: binaryData },
			pairedItem: { item: itemIndex },
		},
	];
}

export async function executeOperation(
	this: IExecuteFunctions,
	resource: AmeiseResource,
	operation: AmeiseOperation,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const request = buildRequest.call(this, operation, itemIndex);
	if (operation.preSend) {
		await operation.preSend.call(this, itemIndex, request);
	}

	if (operation.binaryResponse) {
		return await downloadBinary.call(this, resource, request, itemIndex);
	}

	if (operation.pagination) {
		const results = await fetchPages.call(this, resource, operation, request, itemIndex);
		return toExecutionData(results, operation, itemIndex);
	}

	const response = await ameiseApiRequest.call(this, resource.api, request.method, request.path, {
		qs: request.qs,
		body: request.rawBody ?? request.body,
	});
	return toExecutionData(response, operation, itemIndex);
}
