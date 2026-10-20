import type { INodeProperties } from 'n8n-workflow';
import {
	additionalFields,
	bodyField,
	booleanOption,
	filters,
	pathParam,
	queryField,
	stringOption,
	updateFields,
} from '../../shared/fields';
import type { AmeiseResource, FieldTransform } from '../../shared/types';
import {
	brokerId,
	customerId,
	dateHint,
	legalFormOption,
	nationOption,
	salutationDescription,
	STOCKS_MAX_PAGE_SIZE,
} from './common';

const listFilters: INodeProperties[] = [
	stringOption('birthdateOrFoundDateMax', 'Birthdate or Found Date Max', dateHint),
	stringOption('birthdateOrFoundDateMin', 'Birthdate or Found Date Min', dateHint),
	stringOption('city', 'City'),
	stringOption('customerIds', 'Customer IDs', 'Comma-separated list of customer IDs'),
	stringOption('nameOrId', 'Name or ID', 'Search by name or customer ID'),
	{
		displayName: 'Order',
		name: 'order',
		type: 'options',
		options: [
			{ name: 'Ascending', value: 'ASC' },
			{ name: 'Descending', value: 'DESC' },
		],
		default: 'ASC',
	},
	stringOption('phoneNumber', 'Phone Number'),
	stringOption('street', 'Street'),
	stringOption('zip', 'Zip'),
];

const noteId = pathParam('noteId', 'Note ID', 'ID of the note');

const listTransforms: Record<string, FieldTransform> = { customerIds: 'commaList' };

const logModules = [
	'addresses',
	'communication',
	'details',
	'insiders',
	'logins',
	'notes',
	'notifications',
	'parent',
	'password',
	'profession',
	'relations',
	'risks',
	'sessions',
	'status',
	'tags',
];

export const stocksCustomer: AmeiseResource = {
	api: 'stocks',
	value: 'stocksCustomer',
	name: 'Customer',
	operations: [
		{
			value: 'create',
			name: 'Create',
			action: 'Create a customer',
			description: 'Create a customer with personal, address and contact data',
			method: 'POST',
			path: '/customers',
			fields: [
				bodyField({
					displayName: 'Salutation ID',
					name: 'salutationId',
					type: 'string',
					required: true,
					default: '1',
					description: salutationDescription,
				}),
				bodyField(
					{
						displayName: 'Last Name',
						name: 'lastname',
						type: 'string',
						default: '',
						description: 'Required for personal customers',
					},
					{ sendEmpty: true },
				),
				bodyField(
					{
						displayName: 'Company Name',
						name: 'companyName',
						type: 'string',
						default: '',
						description: 'Required for company customers (salutation 7)',
					},
					{ sendEmpty: true },
				),
				bodyField({ ...nationOption('country', 'Country', true), default: 'de' }),
				additionalFields([
					stringOption('birthdate', 'Birthdate', dateHint),
					stringOption('brokerId', 'Broker ID', 'Defaults to the logged-in broker'),
					stringOption('city', 'City'),
					stringOption('contactPerson', 'Contact Person'),
					stringOption('email', 'Email', undefined, { placeholder: 'name@email.com' }),
					stringOption('firstname', 'First Name'),
					stringOption('foundDate', 'Found Date', dateHint),
					booleanOption(
						'informally',
						'Informal Address',
						'Whether the customer is addressed informally ("Du")',
					),
					legalFormOption(),
					stringOption('mobile', 'Mobile'),
					nationOption('nationality', 'Nationality'),
					stringOption('phone', 'Phone'),
					booleanOption(
						'sendLoginData',
						'Send Login Data',
						'Whether to send login data to the customer',
					),
					booleanOption(
						'sendPasswordReset',
						'Send Password Reset',
						'Whether to send a password reset to the customer',
					),
					stringOption('street', 'Street'),
					stringOption('title', 'Title'),
					stringOption('zip', 'Zip'),
				]),
			],
		},
		{
			value: 'get',
			name: 'Get',
			action: 'Get a customer',
			description: 'Retrieve the profile of a customer',
			method: 'GET',
			path: '/customers/{customerId}',
			fields: [customerId],
		},
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many customers',
			description: 'Retrieve customers accessible to the logged-in broker',
			method: 'GET',
			path: '/customers',
			pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
			fields: [filters(listFilters, listTransforms)],
		},
		{
			value: 'getAllForBroker',
			name: 'Get Many for Broker',
			action: 'Get many customers of a broker',
			description: 'Retrieve customers assigned to a broker',
			method: 'GET',
			path: '/brokers/{brokerId}/customers',
			pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
			fields: [
				brokerId,
				queryField({
					displayName: 'Include Sub-Brokers',
					name: 'includeSubBrokers',
					type: 'boolean',
					default: false,
					description: 'Whether to include customers of all sub-brokers',
				}),
				filters(listFilters, listTransforms),
			],
		},
		{
			value: 'getLogs',
			name: 'Get Logs',
			action: 'Get the change logs of a customer',
			description: 'Retrieve the change logs of a customer',
			method: 'GET',
			path: '/customers/{customerId}/logs',
			pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
			fields: [
				customerId,
				filters([
					{
						displayName: 'Module',
						name: 'module',
						type: 'options',
						options: logModules.map((module) => ({ name: module, value: module })),
						default: 'details',
					},
				]),
			],
		},
		{
			value: 'getNames',
			name: 'Get Names',
			action: 'Get customer names',
			description: 'Retrieve the display names of a set of customers',
			method: 'GET',
			path: '/customers/names',
			fields: [
				queryField(
					{
						displayName: 'Customer IDs',
						name: 'customerIds',
						type: 'string',
						required: true,
						default: '',
						description: 'Comma-separated list of customer IDs',
					},
					{ transform: 'commaList' },
				),
				filters([stringOption('nameOrId', 'Name or ID', 'Filter the result by name or ID')]),
			],
		},
		{
			value: 'sendNotification',
			name: 'Send Notification',
			action: 'Send a notification to a customer',
			description: 'Send login data, a password reset or initial information to a customer',
			method: 'POST',
			path: '/customers/{customerId}/notifications',
			fields: [
				customerId,
				bodyField({
					displayName: 'Notification Type',
					name: 'notificationType',
					type: 'options',
					options: [
						{ name: 'Initial Info', value: 'initial-info' },
						{ name: 'Login Data', value: 'login-data' },
						{ name: 'Password Reset Data', value: 'password-reset-data' },
					],
					required: true,
					default: 'login-data',
				}),
			],
		},
		{
			value: 'update',
			name: 'Update',
			action: 'Update a customer',
			description:
				'Update the basic data of a customer. Personal and company customers accept different fields.',
			method: 'PUT',
			path: '/customers/{customerId}',
			fields: [
				customerId,
				updateFields([
					stringOption('birthdate', 'Birthdate', `Personal customers only. ${dateHint}.`),
					stringOption('companyName', 'Company Name', 'Company customers only'),
					stringOption('contactPerson', 'Contact Person', 'Company customers only'),
					stringOption('firstname', 'First Name', 'Personal customers only'),
					stringOption('foundDate', 'Found Date', `Company customers only. ${dateHint}.`),
					booleanOption(
						'informally',
						'Informal Address',
						'Whether the customer is addressed informally ("Du")',
					),
					stringOption('lastname', 'Last Name', 'Personal customers only'),
					legalFormOption(),
					nationOption('nationality', 'Nationality'),
					stringOption('occupation', 'Occupation', 'Personal customers only'),
					stringOption('operationMode', 'Operation Mode', 'Company customers only, e.g. B2B'),
					stringOption('salutationId', 'Salutation ID', salutationDescription),
					stringOption('specialization', 'Specialization'),
					stringOption('title', 'Title', 'Personal customers only, e.g. Dr.'),
				]),
			],
		},
		{
			value: 'updateBlockType',
			name: 'Update Block Type',
			action: 'Update the block type of a customer',
			description: 'Update the block type of a customer (Mandant brokers only)',
			method: 'PUT',
			path: '/customers/{customerId}/block-type',
			fields: [
				customerId,
				bodyField(
					{
						displayName: 'Block Type Name or ID',
						name: 'type',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getStocksBlockedReasons' },
						default: '',
						description:
							'Leave empty to unblock the customer. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{ sendEmpty: true, transform: 'nullIfEmpty' },
				),
			],
		},
		{
			value: 'updateBroker',
			name: 'Update Broker',
			action: 'Update the broker of a customer',
			description: 'Assign a customer to another broker',
			method: 'PUT',
			path: '/customers/{customerId}/broker',
			fields: [
				customerId,
				bodyField({
					displayName: 'Broker ID',
					name: 'brokerId',
					type: 'string',
					required: true,
					default: '',
				}),
				bodyField({
					displayName: 'Update All Contracts',
					name: 'updateAllContracts',
					type: 'boolean',
					default: false,
					description: 'Whether to move all contracts of the customer to the new broker as well',
				}),
			],
		},
		{
			value: 'updateState',
			name: 'Update State',
			action: 'Update the state of a customer',
			description: 'Update the alive status and broker mandate termination date of a customer',
			method: 'PUT',
			path: '/customers/{customerId}/state',
			fields: [
				customerId,
				bodyField({
					displayName: 'Is Alive',
					name: 'isAlive',
					type: 'boolean',
					required: true,
					default: true,
					description: 'Whether the customer is active',
				}),
				additionalFields([
					stringOption('brokerMandateTerminationDate', 'Broker Mandate Termination Date', dateHint),
				]),
			],
		},
		{
			value: 'updateTags',
			name: 'Update Tags',
			action: 'Replace the tags of a customer',
			description: 'Overwrite the full set of tags assigned to a customer',
			method: 'PUT',
			path: '/customers/{customerId}/tags',
			fields: [
				customerId,
				bodyField(
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Comma-separated list of tags. Leave empty to remove all tags.',
					},
					{ transform: 'commaList', sendEmpty: true },
				),
			],
		},
	],
};

export const stocksCustomerNote: AmeiseResource = {
	api: 'stocks',
	value: 'stocksCustomerNote',
	name: 'Customer Note',
	operations: [
		{
			value: 'create',
			name: 'Create',
			action: 'Create a customer note',
			description: 'Create a note for a customer',
			method: 'POST',
			path: '/customers/{customerId}/notes',
			fields: [customerId, ...noteFields()],
		},
		{
			value: 'delete',
			name: 'Delete',
			action: 'Delete a customer note',
			description: 'Delete a note of a customer',
			method: 'DELETE',
			path: '/customers/{customerId}/notes/{noteId}',
			fields: [customerId, noteId],
		},
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many customer notes',
			description: 'Retrieve the notes of a customer',
			method: 'GET',
			path: '/customers/{customerId}/notes',
			pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
			fields: [customerId],
		},
		{
			value: 'update',
			name: 'Update',
			action: 'Update a customer note',
			description: 'Update a note of a customer',
			method: 'PUT',
			path: '/customers/{customerId}/notes/{noteId}',
			fields: [customerId, noteId, ...noteFields()],
		},
	],
};

function noteFields() {
	return [
		bodyField({
			displayName: 'Type',
			name: 'type',
			type: 'options',
			options: [
				{ name: 'Default', value: 'default' },
				{ name: 'Info', value: 'info' },
				{ name: 'Warning', value: 'warning' },
			],
			required: true,
			default: 'default',
		}),
		bodyField({
			displayName: 'Text',
			name: 'text',
			type: 'string',
			typeOptions: { rows: 4 },
			required: true,
			default: '',
		}),
	];
}
