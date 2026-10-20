import type { INodeProperties } from 'n8n-workflow';
import type { AmeiseField, AmeiseFieldProperty, FieldLocation, FieldTransform } from './types';

interface FieldOptions {
	key?: string;
	transform?: FieldTransform;
	sendEmpty?: boolean;
	merge?: boolean;
	optionTransforms?: Record<string, FieldTransform>;
}

function field(
	location: FieldLocation,
	property: AmeiseFieldProperty,
	options: FieldOptions = {},
): AmeiseField {
	return { location, property, ...options };
}

/** Required string path parameter; the name must match the `{name}` placeholder */
export function pathParam(
	name: string,
	displayName: string,
	description: string,
	extra: Partial<AmeiseFieldProperty> = {},
): AmeiseField {
	return field('path', {
		displayName,
		name,
		type: 'string',
		required: true,
		default: '',
		description,
		...extra,
	});
}

export function queryField(property: AmeiseFieldProperty, options?: FieldOptions): AmeiseField {
	return field('query', property, options);
}

export function bodyField(property: AmeiseFieldProperty, options?: FieldOptions): AmeiseField {
	return field('body', property, options);
}

/** Field that is not sent automatically and is read by a `preSend` hook */
export function localField(property: AmeiseFieldProperty): AmeiseField {
	return field('none', property);
}

/** Optional query parameters, merged into the query string */
export function filters(
	options: INodeProperties[],
	optionTransforms?: Record<string, FieldTransform>,
): AmeiseField {
	return field(
		'query',
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			placeholder: 'Add Filter',
			default: {},
			options,
		},
		{ optionTransforms },
	);
}

/** Optional body fields, merged into the request body */
export function additionalFields(
	options: INodeProperties[],
	optionTransforms?: Record<string, FieldTransform>,
): AmeiseField {
	return field(
		'body',
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			options,
		},
		{ optionTransforms },
	);
}

/** Fields of a partial update; every chosen field is sent, an empty value clears it */
export function updateFields(
	options: INodeProperties[],
	optionTransforms?: Record<string, FieldTransform>,
): AmeiseField {
	return field(
		'body',
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			options,
		},
		{ transform: 'nullIfEmpty', optionTransforms },
	);
}

/** JSON object whose keys are merged into the request body */
export function jsonBody(
	name: string,
	displayName: string,
	description: string,
	defaultValue = '{}',
	required = false,
): AmeiseField {
	return field(
		'body',
		{
			displayName,
			name,
			type: 'json',
			default: defaultValue,
			required,
			description,
		},
		{ transform: 'json', merge: true },
	);
}

/** JSON value sent as a single body key */
export function jsonField(
	name: string,
	displayName: string,
	description: string,
	defaultValue = '{}',
	required = true,
): AmeiseField {
	return field(
		'body',
		{ displayName, name, type: 'json', default: defaultValue, required, description },
		{ transform: 'json' },
	);
}

export function stringOption(
	name: string,
	displayName: string,
	description?: string,
	extra: Partial<INodeProperties> = {},
): INodeProperties {
	return { displayName, name, type: 'string', default: '', description, ...extra };
}

export function booleanOption(
	name: string,
	displayName: string,
	description?: string,
): INodeProperties {
	return { displayName, name, type: 'boolean', default: false, description };
}

export function numberOption(
	name: string,
	displayName: string,
	description?: string,
	extra: Partial<INodeProperties> = {},
): INodeProperties {
	return { displayName, name, type: 'number', default: 0, description, ...extra };
}

export function dateOption(
	name: string,
	displayName: string,
	description?: string,
): INodeProperties {
	return { displayName, name, type: 'dateTime', default: '', description };
}
