import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { type AmeiseApiName, DEFAULT_BASE_URLS } from './constants';

type Context = IExecuteFunctions | ILoadOptionsFunctions;

export const CREDENTIAL_TYPES = {
	accessToken: 'ameiseApi',
	oAuth2: 'ameiseOAuth2Api',
} as const;

export interface AmeiseRequestOptions {
	qs?: IDataObject;
	body?: unknown;
	/** Return the raw file content instead of parsed JSON */
	binary?: boolean;
}

export function getCredentialType(this: Context): string {
	const authentication = this.getNodeParameter('authentication', 0, 'accessToken') as string;
	return authentication === 'oAuth2' ? CREDENTIAL_TYPES.oAuth2 : CREDENTIAL_TYPES.accessToken;
}

export function resolveBaseUrl(api: AmeiseApiName, credentials: IDataObject): string {
	const configured = credentials[`${api}BaseUrl`];
	const baseUrl =
		typeof configured === 'string' && configured.trim() !== ''
			? configured.trim()
			: DEFAULT_BASE_URLS[api];
	return baseUrl.replace(/\/+$/, '');
}

function hasContent(body: unknown): boolean {
	if (body === undefined || body === null) return false;
	if (Array.isArray(body)) return true;
	return typeof body !== 'object' || Object.keys(body as IDataObject).length > 0;
}

export async function ameiseApiRequest(
	this: Context,
	api: AmeiseApiName,
	method: IHttpRequestMethods,
	path: string,
	options: AmeiseRequestOptions = {},
) {
	const credentialType = getCredentialType.call(this);
	const credentials = await this.getCredentials(credentialType);

	const requestOptions: IHttpRequestOptions = {
		method,
		url: `${resolveBaseUrl(api, credentials)}${path}`,
		qs: options.qs,
		arrayFormat: 'brackets',
		headers: { Accept: 'application/json' },
		json: true,
	};

	if (hasContent(options.body)) {
		requestOptions.body = options.body as IDataObject;
	}

	if (options.binary) {
		requestOptions.encoding = 'arraybuffer';
		requestOptions.returnFullResponse = true;
		requestOptions.json = false;
		requestOptions.headers = { Accept: '*/*' };
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			credentialType,
			requestOptions,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
