import type { INodeProperties } from 'n8n-workflow';
import {
	additionalFields,
	bodyField,
	booleanOption,
	filters,
	numberOption,
	stringOption,
} from '../../shared/fields';
import type {
	AmeiseField,
	AmeiseOperation,
	AmeiseResource,
	FieldTransform,
} from '../../shared/types';
import {
	commaListOption,
	contractId,
	customerId,
	dictionaryOperation,
	nationOption,
	STOCKS_MAX_PAGE_SIZE,
} from './common';

const STATE_IDS = 'B, A, N, H, S, P, E, F, R, U, X, Y, Z, K, V, G';
const PAYMENT_INTERVAL_IDS = '1, 2, 4, 5, 6';

function requiredString(name: string, displayName: string, description?: string): AmeiseField {
	return bodyField({ displayName, name, type: 'string', required: true, default: '', description });
}

const contractBaseFields: AmeiseField[] = [
	requiredString('companyId', 'Company ID', 'ID of the insurance company'),
	requiredString('lineId', 'Line ID', 'ID of the contract line (Sparte), e.g. L001'),
	requiredString('policyNumber', 'Policy Number'),
	requiredString('stateId', 'State ID', `Contract state, one of ${STATE_IDS}`),
];

const paymentMethodOption: INodeProperties = {
	displayName: 'Payment Method',
	name: 'paymentMethod',
	type: 'options',
	options: [
		{ name: 'Direct Debit (Lastschrift)', value: 'lastschrift' },
		{ name: 'Bank Transfer (Überweisung)', value: 'ueberweisung' },
		{ name: 'Payment Slip (Zahlschein)', value: 'zahlschein' },
	],
	default: 'lastschrift',
};

const amountOptions = (prefix: string): INodeProperties[] => [
	numberOption(`${prefix}__grossAmount`, 'Payment Gross Amount', undefined, {
		typeOptions: { minValue: 0, numberPrecision: 2 },
	}),
	numberOption(`${prefix}__netAmount`, 'Payment Net Amount', undefined, {
		typeOptions: { minValue: 0, numberPrecision: 2 },
	}),
];

const durationOptions: INodeProperties[] = [
	stringOption('duration__begin', 'Duration Begin', 'ISO 8601, e.g. 2026-01-01T00:00:00+00:00'),
	stringOption('duration__end', 'Duration End', 'ISO 8601, e.g. 2026-12-31T23:59:59+00:00'),
];

const bankAccountOptions: INodeProperties[] = [
	stringOption('bankAccount__birthdate', 'Bank Account Holder Birthdate', 'ISO 8601'),
	stringOption('bankAccount__city', 'Bank Account Holder City'),
	booleanOption(
		'bankAccount__deviant',
		'Bank Account Holder Deviates',
		'Whether the account holder differs from the customer',
	),
	stringOption('bankAccount__firstname', 'Bank Account Holder First Name'),
	stringOption('bankAccount__iban', 'Bank Account IBAN'),
	stringOption('bankAccount__lastname', 'Bank Account Holder Last Name'),
	nationOption('bankAccount__nation', 'Bank Account Holder Nation'),
	stringOption('bankAccount__street', 'Bank Account Holder Street'),
	stringOption('bankAccount__zip', 'Bank Account Holder Zip'),
];

const stateGroupsOption: INodeProperties = {
	displayName: 'State Groups',
	name: 'stateGroups',
	type: 'multiOptions',
	options: [
		{ name: 'Active', value: 'isActive' },
		{ name: 'Active or Requested', value: 'isActiveOrRequested' },
		{ name: 'Canceled', value: 'isCanceled' },
		{ name: 'Order', value: 'isOrder' },
		{ name: 'Portfolio Transfer', value: 'isPortfolioTransfer' },
		{ name: 'Supported by Broker', value: 'isSupportedByBroker' },
		{ name: 'Supported by Mandant', value: 'isSupportedByMandant' },
	],
	default: [],
	description: 'Only contracts in states of these groups',
};

const orderOption: INodeProperties = {
	displayName: 'Order',
	name: 'order',
	type: 'options',
	options: [
		{ name: 'Ascending', value: 'ASC' },
		{ name: 'Descending', value: 'DESC' },
	],
	default: 'ASC',
};

const contractListTransforms: Record<string, FieldTransform> = {
	companyIds: 'commaList',
	ids: 'commaList',
	lineGroupCategories: 'commaList',
	lineIds: 'commaList',
};

const contractReadOperations: AmeiseOperation[] = [
	{
		value: 'addNote',
		name: 'Add Note',
		action: 'Add a note to a contract',
		description: 'Add a note to a contract',
		method: 'PUT',
		path: '/contracts/notes/{contractId}',
		fields: [
			contractId,
			bodyField({
				displayName: 'Note',
				name: 'note',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
			}),
		],
	},
	{
		value: 'get',
		name: 'Get',
		action: 'Get a contract',
		description: 'Retrieve the details of a contract',
		method: 'GET',
		path: '/contracts/get-by-id/{contractId}',
		fields: [contractId],
	},
	{
		value: 'getAggregatedBankAccounts',
		name: 'Get Aggregated Bank Accounts',
		action: 'Get the aggregated bank accounts of a customer',
		description: 'Retrieve the bank accounts used in the contracts of a customer',
		method: 'GET',
		path: '/contracts/aggregated-bank-accounts/{customerId}',
		fields: [customerId],
	},
	{
		value: 'getAll',
		name: 'Get Many',
		action: 'Get many contracts',
		description: 'Retrieve contracts of the logged-in broker',
		method: 'GET',
		path: '/contracts',
		pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
		fields: [
			filters(
				[
					stringOption('brokerId', 'Broker ID', 'Only contracts of this broker'),
					commaListOption('companyIds', 'Company IDs', 'Only contracts of these companies'),
					commaListOption('ids', 'Contract IDs', 'Only these contracts'),
					{
						displayName: 'Include Sub-Brokers',
						name: 'includeSubbrokers',
						type: 'options',
						options: [
							{ name: 'Yes', value: 'true' },
							{ name: 'No', value: 'false' },
						],
						default: 'true',
						description: 'Whether to include contracts of all sub-brokers of the broker',
					},
					orderOption,
					stringOption('policyNumber', 'Policy Number'),
					stateGroupsOption,
				],
				contractListTransforms,
			),
		],
	},
	{
		value: 'getAllByAddress',
		name: 'Get Many Grouped by Address',
		action: 'Get the contracts of a customer grouped by address',
		description: 'Retrieve the contracts of a customer grouped by address',
		method: 'GET',
		path: '/contracts/aggregated-by-address/{customerId}',
		fields: [customerId],
	},
	{
		value: 'getAllForCustomer',
		name: 'Get Many for Customer',
		action: 'Get the contracts of a customer',
		description: 'Retrieve the contracts of a customer',
		method: 'GET',
		path: '/contracts/{customerId}',
		pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
		fields: [
			customerId,
			filters(
				[
					numberOption(
						'addressId',
						'Address ID',
						'Only contracts of this address. 0 = main address.',
					),
					commaListOption('ids', 'Contract IDs', 'Only these contracts'),
					commaListOption(
						'lineGroupCategories',
						'Line Group Categories',
						'Only contracts of these line group categories',
					),
					commaListOption('lineIds', 'Line IDs', 'Only contracts of these lines (Sparten)'),
					orderOption,
					{
						displayName: 'Sort By',
						name: 'sortBy',
						type: 'options',
						options: [
							{ name: 'Line', value: 'line' },
							{ name: 'Policy Number', value: 'policyNumber' },
							{ name: 'Risk', value: 'risk' },
							{ name: 'State', value: 'state' },
						],
						default: 'state',
					},
					stateGroupsOption,
					{
						displayName: 'Stock',
						name: 'stock',
						type: 'options',
						options: [
							{ name: 'Broker Pool', value: 'brokerPool' },
							{ name: 'Direct Agreement', value: 'directAgreement' },
							{ name: 'Foreign', value: 'foreign' },
						],
						default: 'brokerPool',
					},
				],
				contractListTransforms,
			),
		],
	},
	{
		value: 'getBankAccounts',
		name: 'Get Bank Accounts',
		action: 'Get the bank accounts of a customer',
		description: 'Retrieve the bank accounts of a customer grouped by account',
		method: 'GET',
		path: '/contracts/bank-accounts/{customerId}',
		fields: [customerId],
	},
	{
		value: 'getInsured',
		name: 'Get Insured Contracts',
		action: 'Get contracts insuring a customer',
		description: 'Retrieve contracts in which the customer is insured but not the policyholder',
		method: 'GET',
		path: '/contracts/insured/{customerId}',
		fields: [customerId],
	},
	{
		value: 'getLines',
		name: 'Get Lines',
		action: 'Get contract lines',
		description: 'Retrieve the available contract lines (Sparten)',
		method: 'GET',
		path: '/contracts/lines',
	},
	{
		value: 'getStates',
		name: 'Get States',
		action: 'Get contract states',
		description: 'Retrieve all contract states with their properties',
		method: 'GET',
		path: '/contracts/states',
		fields: [
			filters([
				stringOption(
					'possibleTransitionFromStateId',
					'Possible Transition From State ID',
					'Only states that can follow this state, e.g. A',
				),
			]),
		],
	},
	{
		value: 'getSumOfPremiums',
		name: 'Get Sum of Premiums',
		action: 'Get the sum of premiums of a customer',
		description: 'Retrieve the sum of the premiums of the contracts of a customer',
		method: 'GET',
		path: '/contracts/get-sum-of-premiums/{customerId}',
		fields: [
			customerId,
			filters(
				[
					commaListOption('ids', 'Contract IDs', 'Only these contracts'),
					commaListOption('lineIds', 'Line IDs', 'Only contracts of these lines (Sparten)'),
					stateGroupsOption,
				],
				contractListTransforms,
			),
		],
	},
	{
		value: 'notifyCompany',
		name: 'Notify Company',
		action: 'Notify the company about a contract change',
		description:
			'Queue a VDA notification to the insurance company about a changed address or bank account',
		method: 'POST',
		path: '/vda/contracts/{contractId}/notifications',
		fields: [
			contractId,
			bodyField({
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Address', value: 'address' },
					{ name: 'Bank Account', value: 'bank-account' },
				],
				required: true,
				default: 'address',
			}),
		],
	},
	{
		value: 'updateBankAccount',
		name: 'Update Bank Account',
		action: 'Update the bank account of a contract',
		description: 'Change the bank account and billing information of a contract',
		method: 'PUT',
		path: '/contracts/bank-accounts/{contractId}',
		fields: [
			contractId,
			bodyField({ displayName: 'IBAN', name: 'iban', type: 'string', required: true, default: '' }),
			additionalFields([
				stringOption(
					'birthdate',
					'Account Holder Birthdate',
					'ISO 8601, e.g. 1990-05-21T00:00:00+00:00',
				),
				stringOption('city', 'Account Holder City'),
				booleanOption(
					'deviant',
					'Account Holder Deviates',
					'Whether the account holder differs from the customer',
				),
				stringOption('firstname', 'Account Holder First Name'),
				stringOption('lastname', 'Account Holder Last Name'),
				nationOption('nation', 'Account Holder Nation'),
				stringOption('street', 'Account Holder Street'),
				stringOption('zip', 'Account Holder Zip'),
			]),
		],
	},
];

export const stocksContract: AmeiseResource = {
	api: 'stocks',
	value: 'stocksContract',
	name: 'Contract',
	operations: [
		...contractReadOperations,
		{
			value: 'create',
			name: 'Create',
			action: 'Create a contract',
			description: 'Create a contract for a customer',
			method: 'POST',
			path: '/v1/contracts',
			fields: [
				bodyField({
					displayName: 'Customer ID',
					name: 'customerId',
					type: 'number',
					required: true,
					default: 0,
				}),
				...contractBaseFields,
				additionalFields([
					stringOption('agencyId', 'Agency ID'),
					stringOption('applicationId', 'Application ID', 'UUID of the application'),
					...bankAccountOptions,
					stringOption('brokerId', 'Broker ID', 'Defaults to the logged-in broker'),
					...durationOptions,
					stringOption('impersonatedBy', 'Impersonated By', 'Employee ID to impersonate'),
					...amountOptions('payment'),
					stringOption(
						'payment__intervalId',
						'Payment Interval ID',
						`One of ${PAYMENT_INTERVAL_IDS}`,
					),
					paymentMethodOption,
					booleanOption(
						'resolveDefaultAgency',
						'Resolve Default Agency',
						'Whether the default agency is resolved automatically (only without agency ID)',
					),
					stringOption('risk', 'Risk'),
				]),
			],
		},
		dictionaryOperation(
			'getCancellationReasons',
			'Get Cancellation Reasons',
			'contract cancellation reasons',
			'/v1/contracts/cancellation-reasons',
		),
		{
			value: 'getContactPeople',
			name: 'Get Contact People',
			action: 'Get the contact people of a contract',
			description: 'Retrieve the contact people of the agency assigned to a contract',
			method: 'GET',
			path: '/v1/contracts/{contractId}/contact-people',
			pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
			fields: [
				contractId,
				filters([stringOption('function', 'Function', 'Contact person function')]),
			],
		},
		dictionaryOperation(
			'getLineGroupCategories',
			'Get Line Group Categories',
			'line group categories',
			'/v1/contracts/line-group-categories',
		),
		{
			value: 'getLogs',
			name: 'Get Logs',
			action: 'Get the change logs of a contract',
			description: 'Retrieve the change logs of a contract',
			method: 'GET',
			path: '/v1/contracts/{contractId}/logs',
			pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
			fields: [
				contractId,
				filters([
					{
						displayName: 'Module',
						name: 'module',
						type: 'options',
						options: [
							'address',
							'bankAccount',
							'cancellation',
							'duration',
							'masterData',
							'parent',
							'paymentData',
							'premium',
							'status',
						].map((module) => ({ name: module, value: module })),
						default: 'status',
					},
				]),
			],
		},
		{
			value: 'update',
			name: 'Update',
			action: 'Update a contract',
			description: 'Update the basic data of a contract',
			method: 'PUT',
			path: '/v1/contracts/{contractId}',
			fields: [
				contractId,
				...contractBaseFields,
				additionalFields([
					stringOption('agencyId', 'Agency ID'),
					stringOption(
						'cancellationDate',
						'Cancellation Date',
						'Required for closed states (S, P, Y, Z). ISO 8601.',
					),
					{
						displayName: 'Cancellation Reason Name or ID',
						name: 'cancellationReason',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getStocksCancellationReasons' },
						default: '',
						description:
							'Required for closed states (S, P, Y, Z). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					...durationOptions,
					...amountOptions('payment'),
					stringOption('payment__id', 'Payment Interval ID', `One of ${PAYMENT_INTERVAL_IDS}`),
					paymentMethodOption,
					stringOption('risk', 'Risk'),
				]),
			],
		},
		{
			value: 'updateAddress',
			name: 'Update Address',
			action: 'Change the address of a contract',
			description: 'Assign another existing address of the customer to a contract',
			method: 'PUT',
			path: '/v1/contracts/{contractId}/address',
			fields: [
				contractId,
				bodyField(
					{
						displayName: 'Address ID',
						name: 'addressId',
						type: 'string',
						default: '',
						description: 'ID of the customer address. Leave empty to use the main address.',
					},
					{ sendEmpty: true, transform: 'nullIfEmpty' },
				),
			],
			async preSend(_itemIndex, request) {
				if (request.body.addressId !== null) {
					request.body.addressId = Number(request.body.addressId);
				}
			},
		},
		{
			value: 'updateBroker',
			name: 'Update Broker',
			action: 'Change the broker of a contract',
			description: 'Assign a contract to another broker',
			method: 'PUT',
			path: '/v1/contracts/{contractId}/broker',
			fields: [contractId, requiredString('brokerId', 'Broker ID')],
		},
		{
			value: 'validatePolicyNumber',
			name: 'Validate Policy Number',
			action: 'Validate a policy number',
			description: 'Check whether a policy number is valid for a company, line and state',
			method: 'POST',
			path: '/v1/contracts/validate-policy-number',
			fields: [
				bodyField(
					{
						displayName: 'Company ID',
						name: 'companyId',
						type: 'string',
						required: true,
						default: '',
					},
					{ key: 'company__id' },
				),
				bodyField(
					{ displayName: 'Line ID', name: 'lineId', type: 'string', required: true, default: '' },
					{ key: 'line__id' },
				),
				requiredString('stateId', 'State ID', `Contract state, one of ${STATE_IDS}`),
				requiredString('policyNumber', 'Policy Number'),
				bodyField(
					{
						displayName: 'Broker ID',
						name: 'brokerId',
						type: 'string',
						default: '',
						description: 'Optional broker the policy number is validated for',
					},
					{ key: 'broker__id' },
				),
			],
		},
	],
};
