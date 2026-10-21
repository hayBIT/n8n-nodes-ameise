export type AmeiseApiName = 'panda' | 'stocks' | 'archive';

/**
 * Production base URLs of the Ameise APIs. Every URL can be overridden in the
 * credentials, e.g. to target an integration environment.
 * To add another Ameise API, add its key to `AmeiseApiName`, a default URL here
 * and a matching `<api>BaseUrl` field to the credentials.
 */
export const DEFAULT_BASE_URLS: Record<AmeiseApiName, string> = {
	panda: 'https://panda.ameiseapis.com/public/api/v1',
	stocks: 'https://stocks.ameiseapis.com/api',
	archive: 'https://customer-archives.ameiseapis.com/api',
};

/** Order of the APIs in the node; Stocks is used most and comes first */
export const API_ORDER: AmeiseApiName[] = ['stocks', 'archive', 'panda'];

export const API_DISPLAY_NAMES: Record<AmeiseApiName, string> = {
	archive: 'Archive',
	panda: 'Panda',
	stocks: 'Stocks',
};

export const JWT_BEARER_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
