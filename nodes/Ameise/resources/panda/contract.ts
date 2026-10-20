import { pathParam } from '../../shared/fields';
import type { AmeiseResource } from '../../shared/types';

export const pandaContract: AmeiseResource = {
	api: 'panda',
	value: 'pandaContract',
	name: 'Contract',
	operations: [
		{
			value: 'getStatus',
			name: 'Get Status',
			action: 'Get the Panda status of a contract',
			description: 'Retrieve whether a tender is possible for an Ameise contract',
			method: 'GET',
			path: '/contracts/{id}',
			fields: [pathParam('id', 'Contract ID', 'ID of the contract in the Ameise')],
		},
	],
};

export const pandaFile: AmeiseResource = {
	api: 'panda',
	value: 'pandaFile',
	name: 'File',
	operations: [
		{
			value: 'download',
			name: 'Download',
			action: 'Download a file',
			description: 'Download a file (e.g. an offer PDF) as binary data',
			method: 'GET',
			path: '/files/{id}/content',
			fields: [pathParam('id', 'File ID', 'ID of the file, e.g. from the files of a tender offer')],
			binaryResponse: true,
		},
	],
};
