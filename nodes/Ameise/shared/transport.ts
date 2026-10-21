import type {
	IAdditionalCredentialOptions,
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

/**
 * The service account token is renewed on 401, and on 403 if the stored
 * expiry (`n8n_expires_at`) has passed; a 403 with a fresh token stays an error.
 */
export const OAUTH2_RETRY_OPTIONS: IAdditionalCredentialOptions = {
	preAuthenticationRetryStatusCode: [401, 403],
	skipPreAuthenticationRetryWhileTokenIsFresh: true,
};

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
	const normalized = baseUrl.replace(/\/+$/, '');
	// Stocks paths include their version (/v1/...); older credentials stored …/api/v1
	return api === 'stocks' ? normalized.replace(/\/v1$/, '') : normalized;
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
			credentialType === CREDENTIAL_TYPES.oAuth2 ? OAUTH2_RETRY_OPTIONS : undefined,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
