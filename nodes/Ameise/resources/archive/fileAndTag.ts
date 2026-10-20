import { pathParam } from '../../shared/fields';
import type { AmeiseResource } from '../../shared/types';
import { archiveEntryId, customerId } from './entry';

const contractId = pathParam('contractId', 'Contract ID', 'ID of the contract in the Ameise');

export const archiveFile: AmeiseResource = {
	api: 'archive',
	value: 'archiveFile',
	name: 'Archive File',
	operations: [
		{
			value: 'download',
			name: 'Download',
			action: 'Download an archive file',
			description: 'Download a file of an archive entry as binary data',
			method: 'GET',
			path: '/customers/{customerId}/archive-entries/{archiveEntryId}/files/{fileId}',
			fields: [customerId, archiveEntryId, pathParam('fileId', 'File ID', 'ID of the file')],
			binaryResponse: true,
		},
	],
};

export const archiveTag: AmeiseResource = {
	api: 'archive',
	value: 'archiveTag',
	name: 'Archive Tag',
	operations: [
		{
			value: 'getContractFavourites',
			name: 'Get Contract Favourite Tags',
			action: 'Get favourite contract tags',
			description: 'Retrieve the favourite tags for contracts',
			method: 'GET',
			path: '/contracts/tags',
			wrapPrimitivesAs: 'tag',
		},
		{
			value: 'getContractTags',
			name: 'Get Contract Tags',
			action: 'Get tags used for a contract',
			description: "Retrieve all tags used in a contract's archive entries",
			method: 'GET',
			path: '/contracts/{contractId}/tags',
			fields: [contractId],
			wrapPrimitivesAs: 'tag',
		},
		{
			value: 'getCustomerFavourites',
			name: 'Get Customer Favourite Tags',
			action: 'Get favourite customer tags',
			description: 'Retrieve the favourite tags for customers',
			method: 'GET',
			path: '/customers/tags',
			wrapPrimitivesAs: 'tag',
		},
		{
			value: 'getCustomerTags',
			name: 'Get Customer Tags',
			action: 'Get tags used for a customer',
			description: "Retrieve all tags used in a customer's archive entries",
			method: 'GET',
			path: '/customers/{customerId}/tags',
			fields: [customerId],
			wrapPrimitivesAs: 'tag',
		},
		{
			value: 'getLatestEntries',
			name: 'Get Latest Entries per Tag',
			action: 'Get the latest archive entry for every tag',
			description: 'Retrieve the latest archive entry of a customer for every tag',
			method: 'GET',
			path: '/customers/{customerId}/tags/latest-archives',
			fields: [customerId],
		},
	],
};
