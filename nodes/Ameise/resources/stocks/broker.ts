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
import type { AmeiseField, AmeiseOperation, AmeiseResource } from '../../shared/types';
import { parseJson } from '../../shared/utils';
import {
	brokerId,
	commaListOption,
	dateHint,
	dictionaryOperation,
	imageUploadOperation,
	salutationOption,
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

const legitimationTemplatePath = '/brokers/legitimation-document-template/{brokerId}';

const brokerExtraOperations: AmeiseOperation[] = [
	{
		value: 'getLegitimationTemplate',
		name: 'Get Legitimation Document Template',
		action: 'Get the legitimation document template of a broker',
		description: 'Retrieve subject and body of the legitimation document template',
		method: 'GET',
		path: legitimationTemplatePath,
		fields: [brokerId],
	},
	{
		value: 'getNames',
		name: 'Get Names',
		action: 'Get broker names',
		description: 'Retrieve the names of a set of brokers',
		method: 'POST',
		path: '/brokers/names',
		fields: [
			bodyField(
				{
					displayName: 'Broker IDs',
					name: 'brokerIds',
					type: 'string',
					required: true,
					default: '',
					description: 'Comma-separated list of broker IDs',
				},
				{ transform: 'commaList' },
			),
		],
	},
	{
		value: 'getParentIds',
		name: 'Get Parent IDs',
		action: 'Get the parent broker IDs',
		description: 'Retrieve all parent broker IDs of a broker up to the root',
		method: 'GET',
		path: '/brokers/parent-ids/{brokerId}',
		fields: [brokerId],
	},
	{
		value: 'removeLogo',
		name: 'Remove Logo',
		action: 'Remove the logo of a broker',
		description: 'Remove the logo image of a broker',
		method: 'DELETE',
		path: '/brokers/logo-image-remove/{brokerId}',
		fields: [brokerId],
	},
	{
		value: 'resetLegitimationTemplate',
		name: 'Reset Legitimation Document Template',
		action: 'Reset the legitimation document template of a broker',
		description: 'Reset the legitimation document template to its default',
		method: 'PUT',
		path: '/brokers/legitimation-document-template-reset/{brokerId}',
		fields: [brokerId],
	},
	{
		value: 'updateLegitimationTemplate',
		name: 'Update Legitimation Document Template',
		action: 'Update the legitimation document template of a broker',
		description: 'Update subject and body of the legitimation document template',
		method: 'PUT',
		path: legitimationTemplatePath,
		fields: [
			brokerId,
			updateFields([
				stringOption('subject', 'Subject'),
				stringOption('template', 'Template', undefined, { typeOptions: { rows: 8 } }),
			]),
		],
	},
	imageUploadOperation(
		'uploadLogo',
		'Upload Logo',
		'the logo of a broker',
		'/brokers/logo-image/{brokerId}',
		brokerId,
	),
];

const employeeExtraOperations: AmeiseOperation[] = [
	{
		value: 'getAll',
		name: 'Get Many',
		action: 'Get many broker employees',
		description: 'Retrieve broker employees, optionally filtered',
		method: 'GET',
		path: '/employees',
		pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
		fields: [
			filters(
				[
					commaListOption('employeeIds', 'Employee IDs', 'Only these employees'),
					booleanOption('onlyActive', 'Only Active', 'Whether to only return active employees'),
					stringOption('search', 'Search'),
				],
				{ employeeIds: 'commaList' },
			),
		],
	},
	{
		value: 'getAllForBroker',
		name: 'Get Many for Broker',
		action: 'Get the employees of a broker',
		description: 'Retrieve the employees of a broker',
		method: 'GET',
		path: '/brokers/employees/{brokerId}',
		pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
		fields: [brokerId, filters([stringOption('search', 'Search')])],
	},
	{
		value: 'getSpecialRoles',
		name: 'Get Special Roles',
		action: 'Get employees with special roles',
		description:
			'Retrieve the employees of a broker with special roles (contract signer, customer supporter)',
		method: 'GET',
		path: '/brokers/employee/special-roles/{brokerId}',
		fields: [brokerId],
	},
	{
		value: 'removeContractSigner',
		name: 'Remove Contract Signer Role',
		action: 'Remove the contract signer role',
		description: 'Remove the contract signer role from an employee',
		method: 'DELETE',
		path: '/brokers/employee/remove-signer/{employeeId}',
		fields: [employeeId],
	},
	{
		value: 'removeSupporter',
		name: 'Remove Customer Supporter Role',
		action: 'Remove the customer supporter role',
		description: 'Remove the customer supporter role from an employee',
		method: 'DELETE',
		path: '/brokers/employee/remove-supporter/{employeeId}',
		fields: [employeeId],
	},
	{
		value: 'setContractSigner',
		name: 'Set Contract Signer Role',
		action: 'Set the contract signer role',
		description: 'Assign the contract signer role to an employee',
		method: 'PUT',
		path: '/brokers/employee/set-signer/{employeeId}',
		fields: [employeeId],
	},
	{
		value: 'setSupporter',
		name: 'Set Customer Supporter Role',
		action: 'Set the customer supporter role',
		description: 'Assign the customer supporter role to an employee',
		method: 'PUT',
		path: '/brokers/employee/set-supporter/{employeeId}',
		fields: [employeeId],
	},
	imageUploadOperation(
		'uploadProfileImage',
		'Upload Profile Image',
		'the profile image of an employee',
		'/brokers/employee/profile-image/{employeeId}',
		employeeId,
	),
	imageUploadOperation(
		'uploadSignatureImage',
		'Upload Signature Image',
		'the signature image of an employee',
		'/brokers/employee/signature-image/{employeeId}',
		employeeId,
	),
];

const agencyStatusOption: INodeProperties = {
	displayName: 'Status',
	name: 'status',
	type: 'options',
	options: [
		{ name: 'Active (Aktiv)', value: 'aktiv' },
		{ name: 'Deleted (Gelöscht)', value: 'geloescht' },
		{ name: 'No New Business (Kein Neugeschäft)', value: 'kein_neugeschaeft' },
	],
	default: 'aktiv',
};

const agencyInternalId = pathParam('agencyInternalId', 'Agency ID', 'Internal ID of the agency');
const companyId = pathParam('companyId', 'Company ID', 'ID of the insurance company');

function agencyBodyFields(): AmeiseField[] {
	return [
		bodyField({
			displayName: 'Number',
			name: 'number',
			type: 'string',
			required: true,
			default: '',
			description: 'Agency number',
		}),
		bodyField({ displayName: 'Name', name: 'name', type: 'string', required: true, default: '' }),
		bodyField({ ...agencyStatusOption, required: true }),
	];
}

const brokerIdsField: AmeiseField = bodyField(
	{
		displayName: 'Broker IDs',
		name: 'brokers',
		type: 'string',
		default: '',
		description: 'Comma-separated list of brokers the agency is assigned to',
	},
	{ transform: 'commaList' },
);

export const stocksAgency: AmeiseResource = {
	api: 'stocks',
	value: 'stocksAgency',
	name: 'Agency',
	description: 'Agencies (Agenturen) of insurance companies',
	operations: [
		{
			value: 'create',
			name: 'Create',
			action: 'Create an agency',
			description: 'Create an agency for an insurance company',
			method: 'POST',
			path: '/companies/{companyId}/agencies',
			fields: [
				companyId,
				...agencyBodyFields(),
				bodyField({
					displayName: 'Is Sub-Agency',
					name: 'isSubAgency',
					type: 'boolean',
					default: false,
					description: 'Whether the agency is a sub-agency',
				}),
				brokerIdsField,
			],
			async preSend(_itemIndex, request) {
				request.body.brokers = request.body.brokers ?? [];
			},
		},
		{
			value: 'get',
			name: 'Get',
			action: 'Get an agency',
			description: 'Retrieve an agency by its internal ID',
			method: 'GET',
			path: '/agencies/{agencyInternalId}',
			fields: [agencyInternalId],
		},
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many agencies',
			description: 'Retrieve agencies, optionally filtered',
			method: 'GET',
			path: '/agencies',
			pagination: { maxPageSize: STOCKS_MAX_PAGE_SIZE },
			fields: [
				filters([
					stringOption('brokerId', 'Broker ID'),
					stringOption('companyId', 'Company ID'),
					booleanOption(
						'isSubAgency',
						'Is Sub-Agency',
						'Whether to return sub-agencies or main agencies',
					),
					agencyStatusOption,
				]),
			],
		},
		{
			value: 'update',
			name: 'Update',
			action: 'Update an agency',
			description: 'Update an agency of an insurance company',
			method: 'PUT',
			path: '/companies/{companyId}/agencies/{agencyInternalId}',
			fields: [
				companyId,
				agencyInternalId,
				...agencyBodyFields(),
				additionalFields(
					[
						commaListOption('brokers', 'Broker IDs', 'Brokers the agency is assigned to'),
						booleanOption('isSubAgency', 'Is Sub-Agency', 'Whether the agency is a sub-agency'),
					],
					{ brokers: 'commaList' },
				),
			],
		},
	],
};

export const stocksBroker: AmeiseResource = {
	api: 'stocks',
	value: 'stocksBroker',
	name: 'Broker',
	description: 'Brokers (Vermittler) and their profile data',
	operations: [
		...brokerExtraOperations,
		{
			value: 'createSubBroker',
			name: 'Create Sub-Broker',
			action: 'Create a sub broker',
			description: 'Create a sub-broker below a parent broker',
			method: 'POST',
			path: '/v1/brokers/{brokerId}/sub-brokers',
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
			path: '/v1/brokers/{brokerId}',
			fields: [brokerId],
		},
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many brokers',
			description: 'Retrieve brokers, optionally filtered by name, ID or ancestor',
			method: 'GET',
			path: '/v1/brokers',
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
			path: '/v1/brokers/{brokerId}/legal-ids',
			fields: [brokerId],
		},
		{
			value: 'getStatus',
			name: 'Get Status',
			action: 'Get the status of a broker',
			description: 'Retrieve the status of a broker',
			method: 'GET',
			path: '/v1/brokers/{brokerId}/status',
			fields: [brokerId],
		},
		{
			value: 'getSupporter',
			name: 'Get Supporter',
			action: 'Get the supporter of a broker',
			description: 'Retrieve the supporter (Betreuer) of a broker',
			method: 'GET',
			path: '/v1/brokers/{brokerId}/supporter',
			fields: [brokerId],
		},
		{
			value: 'setSupporter',
			name: 'Set Supporter Role',
			action: 'Set the supporter role of a broker',
			description: 'Grant or remove the supporter (Betreuer) role of a broker',
			method: 'PUT',
			path: '/v1/brokers/{brokerId}/is-supporter',
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
			path: '/v1/brokers/{brokerId}',
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
			path: '/v1/brokers/{brokerId}/broker-documents-data/bank-account',
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
			path: '/v1/brokers/{brokerId}/contractual-dates',
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
			path: '/v1/brokers/{brokerId}/legal-ids',
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
			path: '/v1/brokers/{brokerId}/legal-status',
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
			path: '/v1/brokers/{brokerId}/status',
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
		...employeeExtraOperations,
		{
			value: 'create',
			name: 'Create',
			action: 'Create a broker employee',
			description: 'Create an employee for a broker and send the access data mail',
			method: 'POST',
			path: '/v1/brokers/{brokerId}/employees',
			fields: [
				brokerId,
				bodyField(salutationOption('salutationId', true)),
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
			path: '/v1/employees/{employeeId}',
			fields: [employeeId],
		},
		{
			value: 'update',
			name: 'Update',
			action: 'Update a broker employee',
			description: 'Update the profile of a broker employee. Only chosen fields are changed.',
			method: 'PATCH',
			path: '/v1/employees/{employeeId}',
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
						salutationOption('salutation'),
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
			path: '/v1/companies/{companyId}',
			fields: [pathParam('companyId', 'Company ID', 'ID of the insurance company')],
		},
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many companies',
			description: 'Retrieve insurance companies',
			method: 'GET',
			path: '/v1/companies',
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
			path: '/v1/companies/{companyId}/agencies/valid',
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
			path: '/v1/bafin/{bafinNumber}/agencies/valid',
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
			'/v1/customer/blocked-reasons',
			'items',
		),
		dictionaryOperation(
			'getLegalForms',
			'Get Legal Forms',
			'legal forms',
			'/v1/customer/legal-forms',
			'items',
		),
		dictionaryOperation('getNations', 'Get Nations', 'nations', '/v1/customer/nations', 'items'),
		dictionaryOperation(
			'getSalutations',
			'Get Salutations',
			'salutations',
			'/customer/salutations',
		),
	],
};
