import type { IDataObject, INodeProperties } from 'n8n-workflow';
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
import type { AmeiseResource } from '../../shared/types';
import { parseJson } from '../../shared/utils';
import {
	brokerId,
	dateHint,
	dictionaryOperation,
	salutationDescription,
	STOCKS_MAX_PAGE_SIZE,
} from './common';

const employeeId = pathParam('employeeId', 'Employee ID', 'ID of the broker employee');

const accountStatusOption: INodeProperties = {
	displayName: 'Account Status',
	name: 'accountStatus',
	type: 'options',
	options: [
		{ name: 'Active', value: 'active' },
		{ name: 'Deleted', value: 'deleted' },
		{ name: 'Locked', value: 'locked' },
	],
	default: 'active',
};

export const stocksBroker: AmeiseResource = {
	api: 'stocks',
	value: 'stocksBroker',
	name: 'Broker',
	description: 'Brokers (Vermittler) and their profile data',
	operations: [
		{
			value: 'createSubBroker',
			name: 'Create Sub-Broker',
			action: 'Create a sub broker',
			description: 'Create a sub-broker below a parent broker',
			method: 'POST',
			path: '/brokers/{brokerId}/sub-brokers',
			fields: [
				{ ...brokerId, property: { ...brokerId.property, displayName: 'Parent Broker ID' } },
				bodyField({
					displayName: 'Name',
					name: 'name',
					type: 'string',
					required: true,
					default: '',
				}),
			],
		},
		{
			value: 'get',
			name: 'Get',
			action: 'Get a broker',
			description: 'Retrieve the profile of a broker',
			method: 'GET',
			path: '/brokers/{brokerId}',
			fields: [brokerId],
		},
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many brokers',
			description: 'Retrieve brokers, optionally filtered by name, ID or ancestor',
			method: 'GET',
			path: '/brokers',
			pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
			fields: [
				filters([
					stringOption('ancestorId', 'Ancestor ID', 'Only brokers below this broker'),
					stringOption('nameOrId', 'Name or ID'),
				]),
			],
		},
		{
			value: 'getLegalIds',
			name: 'Get Legal IDs',
			action: 'Get the legal IDs of a broker',
			description: 'Retrieve tax, VAT and registration numbers of a broker',
			method: 'GET',
			path: '/brokers/{brokerId}/legal-ids',
			fields: [brokerId],
		},
		{
			value: 'getStatus',
			name: 'Get Status',
			action: 'Get the status of a broker',
			description: 'Retrieve the status of a broker',
			method: 'GET',
			path: '/brokers/{brokerId}/status',
			fields: [brokerId],
		},
		{
			value: 'getSupporter',
			name: 'Get Supporter',
			action: 'Get the supporter of a broker',
			description: 'Retrieve the supporter (Betreuer) of a broker',
			method: 'GET',
			path: '/brokers/{brokerId}/supporter',
			fields: [brokerId],
		},
		{
			value: 'setSupporter',
			name: 'Set Supporter Role',
			action: 'Set the supporter role of a broker',
			description: 'Grant or remove the supporter (Betreuer) role of a broker',
			method: 'PUT',
			path: '/brokers/{brokerId}/is-supporter',
			fields: [
				brokerId,
				bodyField({
					displayName: 'Is Supporter',
					name: 'isSupporter',
					type: 'boolean',
					default: true,
					description: 'Whether the broker holds the supporter role',
				}),
			],
		},
		{
			value: 'update',
			name: 'Update',
			action: 'Update a broker',
			description: 'Update name, address and communication data of a broker',
			method: 'PUT',
			path: '/brokers/{brokerId}',
			fields: [
				brokerId,
				updateFields([
					stringOption('appointmentUrl', 'Appointment URL'),
					stringOption('address__city', 'City'),
					stringOption('communication__email', 'Email', undefined, {
						placeholder: 'name@email.com',
					}),
					stringOption('imprintUrl', 'Imprint URL'),
					stringOption('communication__mobile', 'Mobile'),
					stringOption('name', 'Name'),
					stringOption('nameAddon', 'Name Addon'),
					stringOption('communication__phone', 'Phone'),
					stringOption('address__street', 'Street'),
					stringOption('webPage', 'Web Page'),
					stringOption('address__zip', 'Zip'),
				]),
			],
			async preSend(_itemIndex, request) {
				// address and communication are required objects
				request.body.address = request.body.address ?? {};
				request.body.communication = request.body.communication ?? {};
			},
		},
		{
			value: 'updateBankAccount',
			name: 'Update Bank Account',
			action: 'Update the bank account of a broker',
			description: 'Update the bank account used in broker documents',
			method: 'PUT',
			path: '/brokers/{brokerId}/broker-documents-data/bank-account',
			fields: [
				brokerId,
				bodyField({
					displayName: 'IBAN',
					name: 'iban',
					type: 'string',
					required: true,
					default: '',
				}),
				bodyField({
					displayName: 'Account Holder',
					name: 'accountHolder',
					type: 'string',
					required: true,
					default: '',
				}),
			],
		},
		{
			value: 'updateContractualDates',
			name: 'Update Contractual Dates',
			action: 'Update the contractual dates of a broker',
			description: 'Replace the contract start and end date of a broker',
			method: 'PUT',
			path: '/brokers/{brokerId}/contractual-dates',
			fields: [
				brokerId,
				bodyField(
					{
						displayName: 'Contract Start',
						name: 'contractStart',
						type: 'string',
						default: '',
						description: dateHint,
					},
					{ sendEmpty: true, transform: 'nullIfEmpty' },
				),
				bodyField(
					{
						displayName: 'Contract End',
						name: 'contractEnd',
						type: 'string',
						default: '',
						description: dateHint,
					},
					{ sendEmpty: true, transform: 'nullIfEmpty' },
				),
			],
		},
		{
			value: 'updateLegalIds',
			name: 'Update Legal IDs',
			action: 'Update the legal IDs of a broker',
			description: 'Update tax, VAT and registration numbers. Only chosen fields are changed.',
			method: 'PATCH',
			path: '/brokers/{brokerId}/legal-ids',
			fields: [
				brokerId,
				updateFields([
					{
						displayName: 'Additional Registration Numbers',
						name: 'additionalRegistrationNumbers',
						type: 'json',
						default: '{}',
						description: 'Registration numbers keyed by ident, e.g. {"34c": "…", "34f_34h": "…"}',
					},
					stringOption('commercialRegisterNumber', 'Commercial Register Number'),
					stringOption('courtOfRegistration', 'Court of Registration'),
					stringOption('creditorId', 'Creditor ID'),
					stringOption('economicId', 'Economic ID'),
					stringOption('management', 'Management'),
					stringOption('registrationNumber', 'Registration Number'),
					stringOption('taxNumber', 'Tax Number'),
					stringOption('vatId', 'VAT ID'),
				]),
			],
			async preSend(_itemIndex, request) {
				const numbers = request.body.additionalRegistrationNumbers;
				if (typeof numbers === 'string') {
					request.body.additionalRegistrationNumbers = parseJson(numbers) as IDataObject;
				}
			},
		},
		{
			value: 'updateLegalStatus',
			name: 'Update Legal Status',
			action: 'Update the legal status of a broker',
			description: 'Update the legal status ("Tätig als") of a broker',
			method: 'PUT',
			path: '/brokers/{brokerId}/legal-status',
			fields: [
				brokerId,
				bodyField(
					{
						displayName: 'Legal Status ID',
						name: 'legalStatusId',
						type: 'string',
						default: '',
						description: 'Leave empty to clear the legal status',
					},
					{ sendEmpty: true, transform: 'nullIfEmpty' },
				),
			],
			async preSend(_itemIndex, request) {
				if (request.body.legalStatusId !== null) {
					request.body.legalStatusId = Number(request.body.legalStatusId);
				}
			},
		},
		{
			value: 'updateStatus',
			name: 'Update Status',
			action: 'Update the status of a broker',
			description: 'Activate, lock or delete a broker',
			method: 'PUT',
			path: '/brokers/{brokerId}/status',
			fields: [
				brokerId,
				bodyField({
					displayName: 'Status',
					name: 'status',
					type: 'options',
					options: [
						{ name: 'Active', value: 'active' },
						{ name: 'Completely Locked', value: 'completelyLocked' },
						{ name: 'Deleted', value: 'deleted' },
						{ name: 'Locked', value: 'locked' },
					],
					required: true,
					default: 'active',
				}),
				additionalFields([
					{
						displayName: 'Reason',
						name: 'reason',
						type: 'options',
						options: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 20].map((reason) => ({
							name: String(reason),
							value: reason,
						})),
						default: 0,
						description: 'Reason code of the status change',
					},
				]),
			],
		},
	],
};

export const stocksEmployee: AmeiseResource = {
	api: 'stocks',
	value: 'stocksEmployee',
	name: 'Broker Employee',
	operations: [
		{
			value: 'create',
			name: 'Create',
			action: 'Create a broker employee',
			description: 'Create an employee for a broker and send the access data mail',
			method: 'POST',
			path: '/brokers/{brokerId}/employees',
			fields: [
				brokerId,
				bodyField({
					displayName: 'Salutation ID',
					name: 'salutationId',
					type: 'string',
					required: true,
					default: '1',
					description: salutationDescription,
				}),
				bodyField({
					displayName: 'Last Name',
					name: 'lastname',
					type: 'string',
					required: true,
					default: '',
				}),
				bodyField({
					displayName: 'Username',
					name: 'username',
					type: 'string',
					required: true,
					default: '',
				}),
				bodyField({
					displayName: 'Email',
					name: 'email',
					type: 'string',
					placeholder: 'name@email.com',
					required: true,
					default: '',
				}),
				additionalFields([
					stringOption('birthdate', 'Birthdate', dateHint),
					stringOption('city', 'City'),
					stringOption('firstname', 'First Name'),
					stringOption('mobile', 'Mobile'),
					booleanOption(
						'passwordLink',
						'Password Link',
						'Whether to also send a link to set an own password',
					),
					stringOption('phone', 'Phone'),
					stringOption('street', 'Street'),
					stringOption('zip', 'Zip'),
				]),
			],
		},
		{
			value: 'get',
			name: 'Get',
			action: 'Get a broker employee',
			description: 'Retrieve the profile of a broker employee',
			method: 'GET',
			path: '/employees/{employeeId}',
			fields: [employeeId],
		},
		{
			value: 'update',
			name: 'Update',
			action: 'Update a broker employee',
			description: 'Update the profile of a broker employee. Only chosen fields are changed.',
			method: 'PATCH',
			path: '/employees/{employeeId}',
			fields: [
				employeeId,
				updateFields(
					[
						accountStatusOption,
						stringOption('birthdate', 'Birthdate', dateHint),
						stringOption('city', 'City'),
						stringOption('departments', 'Departments', 'Comma-separated list of department IDs'),
						stringOption('email', 'Email', undefined, { placeholder: 'name@email.com' }),
						stringOption('firstname', 'First Name'),
						stringOption('jobTitle', 'Job Title'),
						stringOption('lastname', 'Last Name'),
						stringOption('mobile', 'Mobile'),
						stringOption('phone', 'Phone'),
						stringOption('salutation', 'Salutation ID', salutationDescription),
						stringOption('street', 'Street'),
						stringOption('username', 'Username'),
						stringOption('zip', 'Zip'),
					],
					{ departments: 'commaList' },
				),
			],
		},
	],
};

export const stocksCompany: AmeiseResource = {
	api: 'stocks',
	value: 'stocksCompany',
	name: 'Company',
	description: 'Insurance companies (Gesellschaften) and their agencies',
	operations: [
		{
			value: 'get',
			name: 'Get',
			action: 'Get a company',
			description: 'Retrieve an insurance company',
			method: 'GET',
			path: '/companies/{companyId}',
			fields: [pathParam('companyId', 'Company ID', 'ID of the insurance company')],
		},
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many companies',
			description: 'Retrieve insurance companies',
			method: 'GET',
			path: '/companies',
			pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
			fields: [
				filters([
					stringOption('nameOrId', 'Name or ID'),
					booleanOption(
						'onlyClientCompanies',
						'Only Client Companies',
						'Whether to only return client-wide companies',
					),
				]),
			],
		},
		{
			value: 'getValidAgencies',
			name: 'Get Valid Agencies',
			action: 'Get the valid agencies of a company',
			description:
				'Retrieve valid agencies for a company, insurance line, broker and contract status',
			method: 'GET',
			path: '/companies/{companyId}/agencies/valid',
			fields: [
				pathParam('companyId', 'Company ID', 'ID of the insurance company'),
				queryField({
					displayName: 'Insurance Line ID',
					name: 'insuranceLineId',
					type: 'string',
					required: true,
					default: '',
				}),
				queryField({
					displayName: 'Broker ID',
					name: 'brokerId',
					type: 'string',
					required: true,
					default: '',
				}),
				queryField({
					displayName: 'Contract Status',
					name: 'contractStatus',
					type: 'string',
					required: true,
					default: '',
				}),
			],
		},
		{
			value: 'getValidAgenciesByBafin',
			name: 'Get Valid Agencies by BaFin Number',
			action: 'Get the valid agencies for a BaFin number',
			description: 'Retrieve valid agencies of the company with a BaFin number',
			method: 'GET',
			path: '/bafin/{bafinNumber}/agencies/valid',
			fields: [
				pathParam('bafinNumber', 'BaFin Number', 'BaFin number of the insurance company'),
				queryField({
					displayName: 'Contract Status',
					name: 'contractStatus',
					type: 'string',
					required: true,
					default: '',
				}),
				filters([
					stringOption('brokerId', 'Broker ID', 'Defaults to the broker of the logged-in user'),
				]),
			],
		},
	],
};

export const stocksDictionary: AmeiseResource = {
	api: 'stocks',
	value: 'stocksDictionary',
	name: 'Dictionary',
	description: 'Lists of values used by other operations',
	operations: [
		dictionaryOperation(
			'getBlockedReasons',
			'Get Blocked Reasons',
			'customer blocked reasons',
			'/customer/blocked-reasons',
			'items',
		),
		dictionaryOperation(
			'getLegalForms',
			'Get Legal Forms',
			'legal forms',
			'/customer/legal-forms',
			'items',
		),
		dictionaryOperation('getNations', 'Get Nations', 'nations', '/customer/nations', 'items'),
	],
};
