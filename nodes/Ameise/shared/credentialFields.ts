import type { INodeProperties } from 'n8n-workflow';
/**
 * Base URL fields shared by all Ameise credential types.
 * The defaults must match DEFAULT_BASE_URLS in ./constants (checked by the tests).
 */
export const baseUrlProperties: INodeProperties[] = [
	{
		displayName: 'Panda Base URL',
		name: 'pandaBaseUrl',
		type: 'string',
		default: 'https://panda.ameiseapis.com/public/api/v1',
		description: 'Base URL of the Panda API. Change it to use another environment.',
	},
	{
		displayName: 'Stocks Base URL',
		name: 'stocksBaseUrl',
		type: 'string',
		default: 'https://stocks.ameiseapis.com/api/v1',
		description: 'Base URL of the Stocks API. Change it to use another environment.',
	},
	{
		displayName: 'Archive Base URL',
		name: 'archiveBaseUrl',
		type: 'string',
		default: 'https://customer-archives.ameiseapis.com/api',
		description: 'Base URL of the Customer Archive API. Change it to use another environment.',
	},
];
