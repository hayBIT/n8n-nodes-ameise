import { generateKeyPairSync, verify } from 'crypto';
import { describe, expect, it } from 'vitest';
import {
	algorithmForKey,
	buildTokenRequestBody,
	parseServiceAccount,
	serviceAccountScopes,
	toPrivateKey,
} from '../nodes/Ameise/shared/jwt';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-521' });

const account = {
	version: 'v1',
	id: 'sa-1',
	issuer: 'service-account-issuer',
	token_endpoint: 'https://auth.dionera.com/oauth2/token',
	audience: 'https://auth.dionera.com/oauth2/token',
	grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
	sub: 'EMPLOYEE1',
	scope: ['ameise.stocks', 'panda'],
	jwk: privateKey.export({ format: 'jwk' }),
	client_id: 'client',
	client_secret: 'secret',
};

const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString());

describe('service account', () => {
	it('parses the JSON document and joins scopes', () => {
		const parsed = parseServiceAccount(JSON.stringify(account));
		expect(parsed.client_id).toBe('client');
		expect(serviceAccountScopes(parsed)).toBe('ameise.stocks panda');
	});

	it('reports missing attributes', () => {
		expect(() => parseServiceAccount('{"issuer": "x"}')).toThrow(/missing: token_endpoint/);
	});

	it('uses ES512 for P-521 keys', () => {
		expect(algorithmForKey(toPrivateKey(account.jwk), account.jwk)).toBe('ES512');
	});

	it('builds a token request with a valid ES512 assertion', () => {
		const now = 1_700_000_000;
		const form = new URLSearchParams(buildTokenRequestBody(account, 'panda', 5, now));

		expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
		expect(form.get('scope')).toBe('panda');

		const [header, payload, signature] = form.get('assertion')!.split('.');
		expect(decode(header)).toEqual({ alg: 'ES512', typ: 'JWT' });
		expect(decode(payload)).toMatchObject({
			iss: 'service-account-issuer',
			sub: 'EMPLOYEE1',
			aud: 'https://auth.dionera.com/oauth2/token',
			iat: now,
			exp: now + 5,
		});
		expect(decode(payload).jti).toMatch(/^[0-9a-f-]{36}$/);

		const valid = verify(
			'sha512',
			Buffer.from(`${header}.${payload}`),
			{ key: publicKey, dsaEncoding: 'ieee-p1363' },
			Buffer.from(signature, 'base64url'),
		);
		expect(valid).toBe(true);
	});
});
