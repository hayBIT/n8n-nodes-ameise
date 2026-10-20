import type { INodeProperties } from 'n8n-workflow';
import { pathParam } from '../../shared/fields';
import type { AmeiseOperation } from '../../shared/types';

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

export const salutationDescription = 'Salutation ID (1–7). The value 7 marks a company customer.';

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
