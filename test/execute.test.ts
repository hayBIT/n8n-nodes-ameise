import { describe, expect, it } from 'vitest';
import { resources } from '../nodes/Ameise/resources';
import { findOperation } from '../nodes/Ameise/shared/descriptions';
import { buildRequest, executeOperation } from '../nodes/Ameise/shared/execute';
import { createContext } from './helpers';

function operation(api: 'panda' | 'stocks' | 'archive', resource: string, op: string) {
	const found = findOperation(resources, api, resource, op);
	if (!found) throw new Error(`${resource}.${op} not found`);
	return found;
}

describe('request building', () => {
	it('fills path parameters, nests body keys and splits comma lists', () => {
		const { operation: createContract } = operation('stocks', 'stocksContract', 'create');
		const { context } = createContext({
			customerId: 42,
			companyId: 'cmp2',
			lineId: 'L001',
			policyNumber: '123',
			stateId: 'A',
			additionalFields: { payment__netAmount: 10.5, payment__intervalId: '1', risk: 'Car' },
		});
		const request = buildRequest.call(context, createContract, 0);
		expect(request.path).toBe('/v1/contracts');
		expect(request.body).toEqual({
			customerId: 42,
			companyId: 'cmp2',
			lineId: 'L001',
			policyNumber: '123',
			stateId: 'A',
			risk: 'Car',
			payment: { netAmount: 10.5, intervalId: '1' },
		});

		const { operation: updateTags } = operation('stocks', 'stocksCustomer', 'updateTags');
		const tags = buildRequest.call(
			createContext({ customerId: 'C 1', tags: 'vip, kfz' }).context,
			updateTags,
			0,
		);
		expect(tags.path).toBe('/v1/customers/C%201/tags');
		expect(tags.body).toEqual({ tags: ['vip', 'kfz'] });
	});

	it('sends cleared update fields as null', () => {
		const { operation: update } = operation('stocks', 'stocksCustomer', 'update');
		const request = buildRequest.call(
			createContext({ customerId: '1', updateFields: { title: '', lastname: 'Doe' } }).context,
			update,
			0,
		);
		expect(request.body).toEqual({ title: null, lastname: 'Doe' });
	});
});

describe('execution', () => {
	const credentials = { archiveBaseUrl: 'https://archive.example.com/api/' };

	it('walks all pages when "Return All" is set', async () => {
		const { resource, operation: getAll } = operation('archive', 'archiveEntry', 'getAll');
		const { context, requests } = createContext(
			{ authentication: 'oAuth2', customerId: '7', returnAll: true, filters: { tags: 'a,b' } },
			(options) => {
				const page = (options.qs as { page: number }).page;
				return { numberOfPages: 2, currentPage: page, items: [{ id: `entry-${page}` }] };
			},
			credentials,
		);

		const result = await executeOperation.call(context, resource, getAll, 0);

		expect(result.map((item) => item.json.id)).toEqual(['entry-1', 'entry-2']);
		expect(requests).toHaveLength(2);
		expect(requests[0].url).toBe('https://archive.example.com/api/customers/7/archive-entries');
		expect(requests[0].qs).toEqual({ tags: ['a', 'b'], page: 1, pageSize: 200 });
		expect(requests[0].arrayFormat).toBe('brackets');
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'ameiseOAuth2Api',
			expect.anything(),
			{
				preAuthenticationRetryStatusCode: [401, 403],
				skipPreAuthenticationRetryWhileTokenIsFresh: true,
			},
		);
	});

	it('respects the limit', async () => {
		const { resource, operation: getAll } = operation('stocks', 'stocksCustomerNote', 'getAll');
		const { context, requests } = createContext(
			{ authentication: 'accessToken', customerId: '7', returnAll: false, limit: 3 },
			() => ({ numberOfPages: 5, items: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
		);

		const result = await executeOperation.call(context, resource, getAll, 0);

		expect(result).toHaveLength(3);
		expect(requests).toHaveLength(1);
		expect(requests[0].url).toBe('https://stocks.ameiseapis.com/api/v1/customers/7/notes');
		expect(requests[0].qs).toMatchObject({ page: 1, pageSize: 3 });
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'ameiseApi',
			expect.anything(),
			undefined,
		);
	});

	it('returns downloaded files as binary data', async () => {
		const { resource, operation: download } = operation('panda', 'pandaFile', 'download');
		const { context } = createContext({ id: 'abc', binaryPropertyName: 'file' }, () => ({
			body: Buffer.from('%PDF'),
			headers: {
				'content-type': 'application/pdf',
				'content-disposition': 'attachment; filename="offer.pdf"',
			},
		}));

		const [item] = await executeOperation.call(context, resource, download, 0);

		expect(item.json).toEqual({ fileName: 'offer.pdf', mimeType: 'application/pdf', fileSize: 4 });
		expect(item.binary?.file).toMatchObject({ fileName: 'offer.pdf', mimeType: 'application/pdf' });
	});

	it('uploads binary files as data URIs when creating archive entries', async () => {
		const { resource, operation: create } = operation('archive', 'archiveEntry', 'create');
		const { context, requests } = createContext({
			customerId: '7',
			archiveType: 'document',
			isPublic: false,
			files: { file: [{ binaryPropertyName: 'data', type: 'main', fileName: '', subject: '' }] },
			additionalFields: { metadata: { entry: [{ key: 'source', value: 'n8n' }] } },
		});

		await executeOperation.call(context, resource, create, 0);

		expect(requests[0].body).toEqual({
			archiveType: 'document',
			isPublic: false,
			metadata: [{ key: 'source', value: 'n8n' }],
			files: [
				{
					type: 'main',
					fileName: 'data.pdf',
					subject: 'data.pdf',
					file: `data:application/pdf;base64,${Buffer.from('hello').toString('base64')}`,
				},
			],
		});
	});

	it('calls v1 and unversioned Stocks endpoints, also with an old …/api/v1 base URL', async () => {
		for (const stocksBaseUrl of [
			'https://stocks.example.com/api',
			'https://stocks.example.com/api/v1/',
		]) {
			const tags = operation('stocks', 'stocksCustomer', 'getAllTags');
			const note = operation('stocks', 'stocksCustomerNote', 'create');
			const { context, requests } = createContext(
				{ customerId: '7', type: 'info', text: 'Hi' },
				() => [{ tag: 'vip' }],
				{ stocksBaseUrl },
			);
			const result = await executeOperation.call(context, tags.resource, tags.operation, 0);
			await executeOperation.call(context, note.resource, note.operation, 0);

			expect(result.map((item) => item.json)).toEqual([{ tag: 'vip' }]);
			expect(requests.map((request) => request.url)).toEqual([
				'https://stocks.example.com/api/customer/tags/all',
				'https://stocks.example.com/api/v1/customers/7/notes',
			]);
		}
	});

	it('uploads images from binary data as base64', async () => {
		const { resource, operation: upload } = operation('stocks', 'stocksBroker', 'uploadLogo');
		const { context, requests } = createContext({ brokerId: 'B1', binaryPropertyName: 'data' });

		await executeOperation.call(context, resource, upload, 0);

		expect(requests[0].method).toBe('PUT');
		expect(requests[0].url).toBe('https://stocks.ameiseapis.com/api/brokers/logo-image/B1');
		expect(requests[0].body).toEqual({ base64: Buffer.from('hello').toString('base64') });
	});

	it('only sends the customer notification for public archive entries', async () => {
		const { resource, operation: create } = operation('archive', 'archiveEntry', 'create');
		for (const isPublic of [true, false]) {
			const { context, requests } = createContext({
				customerId: '7',
				archiveType: 'chat',
				isPublic,
				sendNotification: true,
				subject: 'Hinweis',
				files: {},
			});
			await executeOperation.call(context, resource, create, 0);
			expect(requests[0].body).toEqual({
				archiveType: 'chat',
				isPublic,
				subject: 'Hinweis',
				...(isPublic ? { sendNotification: true } : {}),
			});
		}
	});

	it('wraps primitive arrays and reports success for empty responses', async () => {
		const tags = operation('archive', 'archiveTag', 'getCustomerFavourites');
		const result = await executeOperation.call(
			createContext({}, () => ['a', 'b']).context,
			tags.resource,
			tags.operation,
			0,
		);
		expect(result.map((item) => item.json)).toEqual([{ tag: 'a' }, { tag: 'b' }]);

		const remove = operation('stocks', 'stocksCustomerNote', 'delete');
		const deleted = await executeOperation.call(
			createContext({ customerId: '1', noteId: '2' }, () => '').context,
			remove.resource,
			remove.operation,
			0,
		);
		expect(deleted[0].json).toEqual({ success: true });
	});
});
