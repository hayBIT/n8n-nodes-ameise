import { generateKeyPairSync } from 'crypto';
import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { AmeiseOAuth2Api } from '../credentials/AmeiseOAuth2Api.credentials';

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-521' });

const serviceAccount = JSON.stringify({
	issuer: 'sa-issuer',
	token_endpoint: 'https://auth.example.com/oauth2/token',
	audience: 'https://auth.example.com',
	sub: 'EMP42',
	scope: ['ameise.stocks'],
	jwk: privateKey.export({ format: 'jwk' }),
	client_id: 'client',
	client_secret: 'secret',
});

function helper(response: object) {
	const httpRequest = vi.fn<(options: IHttpRequestOptions) => Promise<object>>(
		async () => response,
	);
	return { context: { helpers: { httpRequest } } as unknown as IHttpRequestHelper, httpRequest };
}

describe('AmeiseOAuth2Api.preAuthentication', () => {
	it('returns the token and its expiry', async () => {
		const { context, httpRequest } = helper({ access_token: 'tok', expires_in: 3600 });
		const before = Date.now();

		const result = await new AmeiseOAuth2Api().preAuthentication.call(context, {
			serviceAccountSecret: serviceAccount,
			scope: '',
		});

		expect(result.accessToken).toBe('tok');
		const expiresAt = Number(result.n8n_expires_at);
		expect(expiresAt).toBeGreaterThanOrEqual(before + 3600_000);
		expect(expiresAt).toBeLessThanOrEqual(Date.now() + 3600_000);

		const request = httpRequest.mock.calls[0][0];
		expect(request.url).toBe('https://auth.example.com/oauth2/token');
		expect(request.auth).toEqual({ username: 'client', password: 'secret' });
		expect(new URLSearchParams(request.body as string).get('scope')).toBe('ameise.stocks');
	});

	it('omits the expiry when the token endpoint does not send one', async () => {
		const { context } = helper({ access_token: 'tok' });
		const result = await new AmeiseOAuth2Api().preAuthentication.call(context, {
			serviceAccountSecret: serviceAccount,
		});
		expect(result).toEqual({ accessToken: 'tok' });
	});
});
