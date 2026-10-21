import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';
import { baseUrlProperties } from '../nodes/Ameise/shared/credentialFields';
import {
	buildTokenRequestBody,
	parseServiceAccount,
	serviceAccountScopes,
} from '../nodes/Ameise/shared/jwt';

/**
 * OAuth2 credentials for an Ameise service account (JWT bearer grant, RFC 7523).
 * n8n's generic OAuth2 credential does not support this grant type, so the
 * access token is requested in `preAuthentication` and cached by n8n until the
 * API answers with 401.
 * See https://docs.blaudirekt.dev/ameise-apis/auth/#serviceaccount
 */
export class AmeiseOAuth2Api implements ICredentialType {
	name = 'ameiseOAuth2Api';

	displayName = 'Ameise Service Account OAuth2 API';

	icon: Icon = { light: 'file:../icons/ameise.svg', dark: 'file:../icons/ameise.dark.svg' };

	documentationUrl = 'https://docs.blaudirekt.dev/ameise-apis/auth/#serviceaccount';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: { expirable: true, password: true },
			default: '',
		},
		{
			// Expiry of the access token (ms timestamp), read by n8n to tell an
			// expired token from a real 403
			displayName: 'Access Token Expires At',
			name: 'n8n_expires_at',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Service Account (JSON)',
			name: 'serviceAccountSecret',
			type: 'string',
			typeOptions: { password: true, rows: 6 },
			required: true,
			default: '',
			placeholder: '{"version": "v1", "issuer": "…", "token_endpoint": "…", "jwk": {…}, …}',
			description:
				'The complete service account JSON document issued by the Ameise, including the private key (jwk), client ID and client secret',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: '',
			placeholder: 'ameise.stocks panda ameise.customer-archives',
			description:
				'Space-separated scopes to request. Leave empty to request all scopes of the service account.',
		},
		...baseUrlProperties,
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const account = parseServiceAccount(credentials.serviceAccountSecret);
		const scope = String(credentials.scope || serviceAccountScopes(account)).trim();

		const response = (await this.helpers.httpRequest({
			method: 'POST',
			url: account.token_endpoint,
			auth: { username: account.client_id, password: account.client_secret },
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			// The Ameise expects assertions to be valid for 5 seconds only
			body: buildTokenRequestBody(account, scope, 5),
			json: true,
		})) as IDataObject;

		const expiresIn = Number(response.expires_in);
		return {
			accessToken: response.access_token as string,
			...(Number.isFinite(expiresIn) && expiresIn > 0
				? { n8n_expires_at: String(Date.now() + expiresIn * 1000) }
				: {}),
		};
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.pandaBaseUrl.replace(/\\/+$/, "")}}',
			url: '/insurance-lines',
			method: 'GET',
		},
	};
}
