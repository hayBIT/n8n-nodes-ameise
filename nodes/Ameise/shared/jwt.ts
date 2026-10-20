import { createPrivateKey, randomUUID, sign, type JsonWebKeyInput, type KeyObject } from 'crypto';
import type { IDataObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { JWT_BEARER_GRANT_TYPE } from './constants';

type JsonWebKey = JsonWebKeyInput['key'];

export type JwtAlgorithm = 'ES256' | 'ES384' | 'ES512' | 'RS256' | 'RS384' | 'RS512';

const HASHES: Record<JwtAlgorithm, string> = {
	ES256: 'sha256',
	ES384: 'sha384',
	ES512: 'sha512',
	RS256: 'sha256',
	RS384: 'sha384',
	RS512: 'sha512',
};

const CURVE_ALGORITHMS: Record<string, JwtAlgorithm> = {
	'P-256': 'ES256',
	'P-384': 'ES384',
	'P-521': 'ES512',
};

/**
 * Service account document issued by the Ameise
 * (see https://docs.blaudirekt.dev/ameise-apis/auth/#serviceaccount)
 */
export interface ServiceAccount {
	id?: string;
	issuer: string;
	token_endpoint: string;
	audience: string;
	grant_type?: string;
	sub: string;
	scope?: string[] | string;
	jwk: JsonWebKey | string;
	client_id: string;
	client_secret: string;
	expires_at?: string;
}

export interface AssertionClaims {
	issuer: string;
	subject: string;
	audience: string;
	lifetimeSeconds: number;
}

const REQUIRED_KEYS: Array<keyof ServiceAccount> = [
	'issuer',
	'token_endpoint',
	'audience',
	'sub',
	'jwk',
	'client_id',
	'client_secret',
];

export function parseServiceAccount(value: unknown): ServiceAccount {
	const account = (
		typeof value === 'string'
			? jsonParse(value.trim(), { errorMessage: 'The service account is not valid JSON' })
			: value
	) as ServiceAccount;
	if (!account || typeof account !== 'object') {
		throw new Error('The service account must be a JSON object');
	}
	const missing = REQUIRED_KEYS.filter((key) => !account[key]);
	if (missing.length > 0) {
		throw new Error(`The service account is missing: ${missing.join(', ')}`);
	}
	return account;
}

export function serviceAccountScopes(account: ServiceAccount): string {
	return Array.isArray(account.scope) ? account.scope.join(' ') : (account.scope ?? '');
}

/** Accepts a JWK (object or JSON string) or a PEM encoded key */
export function toPrivateKey(key: JsonWebKey | string): KeyObject {
	if (typeof key === 'string') {
		const trimmed = key.trim();
		if (trimmed.startsWith('{')) {
			return createPrivateKey({ key: jsonParse<JsonWebKey>(trimmed), format: 'jwk' });
		}
		return createPrivateKey(trimmed.replace(/\\n/g, '\n'));
	}
	return createPrivateKey({ key, format: 'jwk' });
}

/** Picks the JWS algorithm matching the key; the Ameise issues P-521 keys (ES512) */
export function algorithmForKey(key: KeyObject, jwk?: JsonWebKey | string): JwtAlgorithm {
	if (jwk && typeof jwk === 'object' && typeof jwk.alg === 'string' && jwk.alg in HASHES) {
		return jwk.alg as JwtAlgorithm;
	}
	if (key.asymmetricKeyType === 'rsa') return 'RS256';
	const curve = key.asymmetricKeyDetails?.namedCurve;
	const byCurve: Record<string, JwtAlgorithm> = {
		prime256v1: 'ES256',
		secp384r1: 'ES384',
		secp521r1: 'ES512',
	};
	if (curve && byCurve[curve]) return byCurve[curve];
	if (jwk && typeof jwk === 'object' && jwk.crv && CURVE_ALGORITHMS[jwk.crv]) {
		return CURVE_ALGORITHMS[jwk.crv];
	}
	return 'ES512';
}

const base64Url = (value: Buffer | string) => Buffer.from(value).toString('base64url');

/** Creates a signed JWT assertion for the RFC 7523 JWT bearer grant */
export function createJwtAssertion(
	claims: AssertionClaims,
	key: KeyObject,
	algorithm: JwtAlgorithm,
	now = Math.floor(Date.now() / 1000),
): string {
	const header: IDataObject = { alg: algorithm, typ: 'JWT' };
	const payload: IDataObject = {
		iss: claims.issuer,
		sub: claims.subject,
		aud: claims.audience,
		iat: now,
		exp: now + claims.lifetimeSeconds,
		jti: randomUUID(),
	};

	const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
	const signature = sign(
		HASHES[algorithm],
		Buffer.from(signingInput),
		algorithm.startsWith('ES') ? { key, dsaEncoding: 'ieee-p1363' } : key,
	);

	return `${signingInput}.${base64Url(signature)}`;
}

/** Builds the form body of the token request for a service account */
export function buildTokenRequestBody(
	account: ServiceAccount,
	scope: string,
	lifetimeSeconds: number,
	now?: number,
): string {
	const key = toPrivateKey(account.jwk);
	const assertion = createJwtAssertion(
		{
			issuer: account.issuer,
			subject: account.sub,
			audience: account.audience,
			lifetimeSeconds,
		},
		key,
		algorithmForKey(key, account.jwk),
		now,
	);
	const form = new URLSearchParams({
		grant_type: account.grant_type || JWT_BEARER_GRANT_TYPE,
		assertion,
	});
	if (scope) form.set('scope', scope);
	return form.toString();
}
