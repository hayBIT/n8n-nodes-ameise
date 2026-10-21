import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import type { AmeiseApiName } from '../shared/constants';
import { ameiseApiRequest } from '../shared/transport';

async function loadList(
	this: ILoadOptionsFunctions,
	api: AmeiseApiName,
	path: string,
	label: (entry: IDataObject) => string,
	value: (entry: IDataObject) => string | number = (entry) => entry.id as string,
): Promise<INodePropertyOptions[]> {
	const response = (await ameiseApiRequest.call(this, api, 'GET', path)) as
		| IDataObject[]
		| { items?: IDataObject[] };
	const entries = Array.isArray(response) ? response : (response.items ?? []);
	return entries
		.map((entry) => ({ name: label(entry), value: value(entry) }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

const text = (entry: IDataObject) => String(entry.text ?? entry.id);
const name = (entry: IDataObject) => String(entry.name ?? entry.id);

export async function getPandaInsuranceLines(this: ILoadOptionsFunctions) {
	return await loadList.call(
		this,
		'panda',
		'/insurance-lines',
		name,
		(entry) => entry.id as number,
	);
}

export async function getPandaIndustries(this: ILoadOptionsFunctions) {
	return await loadList.call(
		this,
		'panda',
		'/industries',
		(entry) =>
			entry.groupName ? `${String(entry.name)} (${String(entry.groupName)})` : name(entry),
		(entry) => entry.id as number,
	);
}

export async function getStocksNations(this: ILoadOptionsFunctions) {
	return await loadList.call(this, 'stocks', '/v1/customer/nations', text);
}

export async function getStocksLegalForms(this: ILoadOptionsFunctions) {
	return await loadList.call(this, 'stocks', '/v1/customer/legal-forms', text);
}

export async function getStocksBlockedReasons(this: ILoadOptionsFunctions) {
	return await loadList.call(this, 'stocks', '/v1/customer/blocked-reasons', text);
}

export async function getStocksSalutations(this: ILoadOptionsFunctions) {
	return await loadList.call(this, 'stocks', '/customer/salutations', text);
}

export async function getStocksCancellationReasons(this: ILoadOptionsFunctions) {
	return await loadList.call(this, 'stocks', '/v1/contracts/cancellation-reasons', text);
}
