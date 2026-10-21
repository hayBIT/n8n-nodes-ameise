import type { INodeProperties } from 'n8n-workflow';
import { readInputFile } from '../../shared/binary';
import { localField, pathParam } from '../../shared/fields';
import type { AmeiseField, AmeiseOperation } from '../../shared/types';

export const STOCKS_MAX_PAGE_SIZE = 100;

export const customerId = pathParam(
	'customerId',
	'Customer ID',
	'ID of the customer in the Ameise',
);
export const brokerId = pathParam('brokerId', 'Broker ID', 'ID of the broker (Vermittler)');
export const contractId = pathParam(
	'contractId',
	'Contract ID',
	'ID of the contract in the Ameise',
);

export function nationOption(name: string, displayName: string, required = false): INodeProperties {
	return {
		displayName: `${displayName} Name or ID`,
		name,
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStocksNations' },
		required,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
}

export function legalFormOption(name = 'legalForm'): INodeProperties {
	return {
		displayName: 'Legal Form Name or ID',
		name,
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStocksLegalForms' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
}

export const salutationDescription = 'The salutation with ID 7 marks a company customer';

export function salutationOption(name: string, required = false): INodeProperties {
	return {
		displayName: 'Salutation Name or ID',
		name,
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStocksSalutations' },
		required,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
}

export const dateHint = 'Format: YYYY-MM-DD';

export function dictionaryOperation(
	value: string,
	name: string,
	noun: string,
	path: string,
	itemsKey?: string,
): AmeiseOperation {
	return {
		value,
		name,
		action: `Get ${noun}`,
		description: `Retrieve the available ${noun}`,
		method: 'GET',
		path,
		itemsKey,
	};
}

export function commaListOption(name: string, displayName: string, description: string) {
	return {
		displayName,
		name,
		type: 'string' as const,
		default: '',
		description: `${description} (comma-separated)`,
	};
}

const imageField: AmeiseField = localField({
	displayName: 'Input Binary Field',
	name: 'binaryPropertyName',
	type: 'string',
	required: true,
	default: 'data',
	hint: 'The name of the input binary field containing the image',
});

/** PUT of a base64-encoded image (`{ base64 }`) read from a binary field */
export function imageUploadOperation(
	value: string,
	name: string,
	noun: string,
	path: string,
	pathField: AmeiseField,
): AmeiseOperation {
	return {
		value,
		name,
		action: `Upload ${noun}`,
		description: `Upload ${noun} from binary data`,
		method: 'PUT',
		path,
		fields: [pathField, imageField],
		async preSend(itemIndex, request) {
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
			const input = await readInputFile.call(this, itemIndex, binaryPropertyName);
			request.body.base64 = input.buffer.toString('base64');
		},
	};
}
