import type { IDataObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import type { FieldTransform } from './types';

export const NESTING_SEPARATOR = '__';

/** Sets `value` at `key`, creating nested objects for keys like `payment__netAmount` */
export function setNested(target: IDataObject, key: string, value: unknown): void {
	const parts = key.split(NESTING_SEPARATOR);
	let current = target;
	for (const part of parts.slice(0, -1)) {
		if (typeof current[part] !== 'object' || current[part] === null) {
			current[part] = {};
		}
		current = current[part] as IDataObject;
	}
	current[parts[parts.length - 1]] = value as IDataObject[keyof IDataObject];
}

export function isEmptyValue(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

export function toList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String).filter((entry) => entry !== '');
	if (isEmptyValue(value)) return [];
	return String(value)
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

/** Like `toList`, but converts every entry to a number ("1, 2" → [1, 2]) */
export function toNumberList(value: unknown): number[] {
	return toList(value).map((entry) => {
		const parsed = Number(entry);
		if (Number.isNaN(parsed)) {
			throw new Error(`"${entry}" is not a valid number`);
		}
		return parsed;
	});
}

export function parseJson(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	if (value.trim() === '') return undefined;
	return jsonParse(value, { errorMessage: 'The JSON value is not valid' });
}

export function applyTransform(value: unknown, transform?: FieldTransform): unknown {
	switch (transform) {
		case 'commaList':
			return toList(value);
		case 'numberList':
			return toNumberList(value);
		case 'json':
			return parseJson(value);
		case 'nullIfEmpty':
			return value === '' ? null : value;
		default:
			return value;
	}
}

/** Picks a file name out of a `Content-Disposition` header */
export function fileNameFromContentDisposition(header: unknown): string | undefined {
	if (typeof header !== 'string') return undefined;
	const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
	if (encoded) return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''));
	const plain = /filename="?([^";]+)"?/i.exec(header);
	return plain ? plain[1].trim() : undefined;
}

/** Builds a data URI (`data:<mime>;base64,<content>`) as expected by the Archive API */
export function toDataUri(buffer: Buffer, mimeType: string): string {
	return `data:${mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
}
