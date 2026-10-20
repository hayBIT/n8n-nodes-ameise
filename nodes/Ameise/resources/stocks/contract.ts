import type { INodeProperties } from 'n8n-workflow';
import {
	additionalFields,
	bodyField,
	booleanOption,
	filters,
	numberOption,
	stringOption,
} from '../../shared/fields';
import type { AmeiseField, AmeiseResource } from '../../shared/types';
import { contractId, dictionaryOperation, nationOption, STOCKS_MAX_PAGE_SIZE } from './common';

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

export const stocksContract: AmeiseResource = {
	api: 'stocks',
	value: 'stocksContract',
	name: 'Contract',
	operations: [
		{
			value: 'create',
			name: 'Create',
			action: 'Create a contract',
			description: 'Create a contract for a customer',
			method: 'POST',
			path: '/contracts',
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
			'/contracts/cancellation-reasons',
		),
		{
			value: 'getContactPeople',
			name: 'Get Contact People',
			action: 'Get the contact people of a contract',
			description: 'Retrieve the contact people of the agency assigned to a contract',
			method: 'GET',
			path: '/contracts/{contractId}/contact-people',
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
			'/contracts/line-group-categories',
		),
		{
			value: 'getLogs',
			name: 'Get Logs',
			action: 'Get the change logs of a contract',
			description: 'Retrieve the change logs of a contract',
			method: 'GET',
			path: '/contracts/{contractId}/logs',
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
			path: '/contracts/{contractId}',
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
			path: '/contracts/{contractId}/address',
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
			path: '/contracts/{contractId}/broker',
			fields: [contractId, requiredString('brokerId', 'Broker ID')],
		},
		{
			value: 'validatePolicyNumber',
			name: 'Validate Policy Number',
			action: 'Validate a policy number',
			description: 'Check whether a policy number is valid for a company, line and state',
			method: 'POST',
			path: '/contracts/validate-policy-number',
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
