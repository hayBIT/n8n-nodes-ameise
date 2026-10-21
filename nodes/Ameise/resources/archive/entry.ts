import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	additionalFields,
	bodyField,
	booleanOption,
	dateOption,
	filters,
	localField,
	pathParam,
	queryField,
	stringOption,
	updateFields,
} from '../../shared/fields';
import type { AmeiseResource, FieldTransform, PreparedRequest } from '../../shared/types';
import { readInputFile } from '../../shared/binary';
import { toDataUri } from '../../shared/utils';

export const customerId = pathParam(
	'customerId',
	'Customer ID',
	'ID of the customer in the Ameise',
);
export const archiveEntryId = pathParam(
	'archiveEntryId',
	'Archive Entry ID',
	'UUID of the archive entry',
);

export const archiveTypeOptions = [
	{ name: 'Audio', value: 'audio' },
	{ name: 'Chat', value: 'chat' },
	{ name: 'Document', value: 'document' },
	{ name: 'Email', value: 'email' },
	{ name: 'Fax', value: 'fax' },
	{ name: 'In Person', value: 'in_person' },
	{ name: 'Information', value: 'information' },
	{ name: 'Letter', value: 'letter' },
	{ name: 'Online', value: 'online' },
	{ name: 'Other', value: 'other' },
	{ name: 'Phone', value: 'phone' },
	{ name: 'SMS', value: 'sms' },
];

const listTransforms: Record<string, FieldTransform> = {
	tags: 'commaList',
	contracts: 'commaList',
	contractLines: 'commaList',
};

const tagsOption = stringOption('tags', 'Tags', 'Comma-separated list of tags');
const contractsOption = stringOption(
	'contracts',
	'Contract IDs',
	'Comma-separated list of contract IDs',
);
const contractLinesOption = stringOption(
	'contractLines',
	'Contract Line IDs',
	'Comma-separated list of contract line (Sparte) IDs',
);

const metadataOption: INodeProperties = {
	displayName: 'Metadata',
	name: 'metadata',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	placeholder: 'Add Metadata',
	default: {},
	options: [
		{
			displayName: 'Entry',
			name: 'entry',
			values: [
				{ displayName: 'Key', name: 'key', type: 'string', default: '' },
				{ displayName: 'Value', name: 'value', type: 'string', default: '' },
			],
		},
	],
};

const authorOptions: INodeProperties[] = [
	{
		displayName: 'Author Type',
		name: 'author__type',
		type: 'options',
		options: [
			{ name: 'Broker', value: 'broker' },
			{ name: 'Customer', value: 'customer' },
			{ name: 'Employee', value: 'employee' },
		],
		default: 'broker',
	},
	stringOption('author__id', 'Author ID', 'ID of the author (requires an author type)'),
];

/** Converts the metadata fixedCollection into the API's `[{ key, value }]` format */
function normalizeMetadata(request: PreparedRequest) {
	const metadata = request.body.metadata as { entry?: IDataObject[] } | undefined;
	if (metadata && !Array.isArray(metadata)) {
		request.body.metadata = metadata.entry ?? [];
	}
}

interface FileEntry {
	binaryPropertyName: string;
	type: string;
	subject?: string;
	fileName?: string;
}

async function attachFiles(this: IExecuteFunctions, itemIndex: number, request: PreparedRequest) {
	const files = this.getNodeParameter('files.file', itemIndex, []) as FileEntry[];
	if (files.length === 0) return;

	request.body.files = await Promise.all(
		files.map(async (file) => {
			const input = await readInputFile.call(this, itemIndex, file.binaryPropertyName);
			const fileName = file.fileName || input.fileName || file.binaryPropertyName;
			return {
				type: file.type,
				fileName,
				subject: file.subject || fileName,
				file: toDataUri(input.buffer, input.mimeType),
			};
		}),
	);
}

export const archiveEntry: AmeiseResource = {
	api: 'archive',
	value: 'archiveEntry',
	name: 'Archive Entry',
	description: 'Entries of the customer archive (documents, emails, notes, …)',
	operations: [
		{
			value: 'create',
			name: 'Create',
			action: 'Create an archive entry',
			description: 'Create an archive entry for a customer, optionally with files from binary data',
			method: 'POST',
			path: '/customers/{customerId}/archive-entries',
			fields: [
				customerId,
				bodyField({
					displayName: 'Archive Type',
					name: 'archiveType',
					type: 'options',
					options: archiveTypeOptions,
					required: true,
					default: 'document',
				}),
				bodyField({
					displayName: 'Public',
					name: 'isPublic',
					type: 'boolean',
					required: true,
					default: false,
					description: 'Whether the entry is visible to the customer',
				}),
				localField({
					displayName: 'Files',
					name: 'files',
					type: 'fixedCollection',
					typeOptions: { multipleValues: true },
					placeholder: 'Add File',
					default: {},
					options: [
						{
							displayName: 'File',
							name: 'file',
							values: [
								{
									displayName: 'Input Binary Field',
									name: 'binaryPropertyName',
									type: 'string',
									default: 'data',
									hint: 'The name of the input binary field containing the file',
								},
								{
									displayName: 'Type',
									name: 'type',
									type: 'options',
									options: [
										{ name: 'Main', value: 'main' },
										{ name: 'Attachment', value: 'attachment' },
									],
									default: 'main',
								},
								{
									displayName: 'File Name',
									name: 'fileName',
									type: 'string',
									default: '',
									description: 'Leave empty to use the file name of the binary data',
								},
								{
									displayName: 'Subject',
									name: 'subject',
									type: 'string',
									default: '',
									description: 'Leave empty to use the file name',
								},
							],
						},
					],
				}),
				additionalFields(
					[
						...authorOptions,
						contractLinesOption,
						contractsOption,
						dateOption('date', 'Date', 'Date of the entry. Defaults to now.'),
						metadataOption,
						booleanOption('notifyBroker', 'Notify Broker', 'Whether to notify the broker'),
						booleanOption('requiresReview', 'Requires Review', 'Whether the entry needs a review'),
						booleanOption(
							'sendNotification',
							'Send Notification',
							'Whether to notify the customer about the new entry',
						),
						stringOption('subject', 'Subject'),
						tagsOption,
						stringOption('text', 'Text', undefined, { typeOptions: { rows: 5 } }),
					],
					listTransforms,
				),
			],
			async preSend(itemIndex, request) {
				normalizeMetadata(request);
				await attachFiles.call(this, itemIndex, request);
			},
		},
		{
			value: 'delete',
			name: 'Delete',
			action: 'Delete an archive entry',
			description: 'Delete an archive entry of a customer',
			method: 'DELETE',
			path: '/customers/{customerId}/archive-entries/{archiveEntryId}',
			fields: [customerId, archiveEntryId],
		},
		{
			value: 'get',
			name: 'Get',
			action: 'Get an archive entry',
			description: 'Retrieve an archive entry of a customer',
			method: 'GET',
			path: '/customers/{customerId}/archive-entries/{archiveEntryId}',
			fields: [customerId, archiveEntryId],
		},
		{
			value: 'getById',
			name: 'Get by ID',
			action: 'Get an archive entry by ID',
			description: 'Retrieve an archive entry by its ID without knowing the customer',
			method: 'GET',
			path: '/archive-entries/{archiveEntryId}',
			fields: [archiveEntryId],
		},
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many archive entries',
			description: 'Retrieve archive entries of a customer',
			method: 'GET',
			path: '/customers/{customerId}/archive-entries',
			pagination: { maxPageSize: 200 },
			fields: [
				customerId,
				filters(
					[
						contractLinesOption,
						contractsOption,
						dateOption('dateMax', 'Date Max', 'Only entries up to this date'),
						dateOption('dateMin', 'Date Min', 'Only entries from this date'),
						booleanOption(
							'isDeleted',
							'Deleted',
							'Whether to return deleted or not deleted entries',
						),
						booleanOption('isPublic', 'Public', 'Whether to return public or private entries'),
						stringOption('name', 'Name', 'Filter by name (at least 3 characters)'),
						tagsOption,
						{
							displayName: 'Types',
							name: 'types',
							type: 'multiOptions',
							options: archiveTypeOptions,
							default: [],
						},
					],
					listTransforms,
				),
			],
		},
		{
			value: 'getLatestByTag',
			name: 'Get Latest by Tag',
			action: 'Get the latest archive entry with a tag',
			description: 'Retrieve the most recent archive entry of a customer that has a tag',
			method: 'GET',
			path: '/customers/{customerId}/archive-entries/latest',
			fields: [
				customerId,
				queryField({
					displayName: 'Tag',
					name: 'tag',
					type: 'string',
					required: true,
					default: '',
				}),
			],
		},
		{
			value: 'getLogs',
			name: 'Get Logs',
			action: 'Get the change logs of an archive entry',
			description: 'Retrieve the change logs of an archive entry',
			method: 'GET',
			path: '/customers/{customerId}/archive-entries/{archiveEntryId}/logs',
			pagination: { maxPageSize: 200 },
			fields: [
				customerId,
				archiveEntryId,
				filters([
					{
						displayName: 'Module',
						name: 'module',
						type: 'options',
						options: [
							{ name: 'General', value: 'general' },
							{ name: 'Metadata', value: 'metadata' },
							{ name: 'Relations', value: 'relations' },
							{ name: 'Tags', value: 'tags' },
						],
						default: 'general',
					},
				]),
			],
		},
		{
			value: 'mapId',
			name: 'Map ID',
			action: 'Map an archive entry ID',
			description: 'Translate between new (UUID) and legacy archive entry IDs',
			method: 'GET',
			path: '/archive-entries/id-mapping',
			fields: [
				queryField({
					displayName: 'Map From',
					name: 'mapFrom',
					type: 'options',
					options: [
						{ name: 'Archive API ID (UUID)', value: 'archiveApiId' },
						{ name: 'Legacy ID', value: 'legacyId' },
					],
					default: 'legacyId',
				}),
				localField({
					displayName: 'ID',
					name: 'id',
					type: 'string',
					required: true,
					default: '',
				}),
			],
			async preSend(itemIndex, request) {
				const mapFrom = request.qs.mapFrom as string;
				delete request.qs.mapFrom;
				request.qs[mapFrom] = this.getNodeParameter('id', itemIndex) as string;
			},
		},
		{
			value: 'notify',
			name: 'Send Notification',
			action: 'Send a notification for an archive entry',
			description: 'Notify about an archive entry',
			method: 'POST',
			path: '/customers/{customerId}/archive-entries/{archiveEntryId}/notify',
			fields: [customerId, archiveEntryId],
		},
		{
			value: 'update',
			name: 'Update',
			action: 'Update an archive entry',
			description: 'Update an archive entry of a customer',
			method: 'PATCH',
			path: '/customers/{customerId}/archive-entries/{archiveEntryId}',
			fields: [
				customerId,
				archiveEntryId,
				bodyField({
					displayName: 'Public',
					name: 'isPublic',
					type: 'boolean',
					required: true,
					default: false,
					description: 'Whether the entry is visible to the customer',
				}),
				bodyField({
					displayName: 'Deleted',
					name: 'isDeleted',
					type: 'boolean',
					required: true,
					default: false,
					description: 'Whether the entry is marked as deleted',
				}),
				updateFields(
					[
						{
							displayName: 'Archive Type',
							name: 'archiveType',
							type: 'options',
							options: archiveTypeOptions,
							default: 'document',
						},
						contractLinesOption,
						contractsOption,
						dateOption('date', 'Date'),
						metadataOption,
						booleanOption('notifyBroker', 'Notify Broker', 'Whether to notify the broker'),
						booleanOption('requiresReview', 'Requires Review', 'Whether the entry needs a review'),
						stringOption('subject', 'Subject'),
						tagsOption,
						stringOption('text', 'Text', undefined, { typeOptions: { rows: 5 } }),
					],
					listTransforms,
				),
			],
			async preSend(_itemIndex, request) {
				normalizeMetadata(request);
			},
		},
	],
};
