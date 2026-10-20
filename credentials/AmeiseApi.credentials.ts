import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { baseUrlProperties } from '../nodes/Ameise/shared/credentialFields';

export class AmeiseApi implements ICredentialType {
	name = 'ameiseApi';

	displayName = 'Ameise Access Token API';

	icon: Icon = { light: 'file:../icons/ameise.svg', dark: 'file:../icons/ameise.dark.svg' };

	documentationUrl = 'https://github.com/hayBIT/n8n-nodes-ameise#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Bearer token (JWT) for the Ameise APIs. Tokens expire and must be renewed manually.',
		},
		...baseUrlProperties,
	];

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
