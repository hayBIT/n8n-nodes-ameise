import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeProperties,
} from 'n8n-workflow';
import type { AmeiseApiName } from './constants';

/**
 * Where the value of a node parameter ends up in the HTTP request.
 * - `path`: replaces `{name}` in the operation path
 * - `query` / `body`: set as `key` (defaults to the parameter name)
 * - `none`: not sent automatically, handled by `preSend`
 *
 * For `collection` parameters (and fields with `merge: true`) the contained
 * keys are merged into the query or body. Keys containing `__` are nested, e.g. `payment__netAmount`
 * becomes `{ payment: { netAmount } }`.
 */
export type FieldLocation = 'path' | 'query' | 'body' | 'none';

/**
 * Optional value conversions applied before a value is sent.
 * - `commaList`: "a, b" → ["a", "b"]
 * - `json`: parse a JSON string (objects/arrays are passed through)
 * - `nullIfEmpty`: "" → null (used to explicitly clear values)
 */
export type FieldTransform = 'commaList' | 'json' | 'nullIfEmpty';

export type AmeiseFieldProperty = Omit<INodeProperties, 'displayOptions'> & {
	displayOptions?: INodeProperties['displayOptions'];
};

export interface AmeiseField {
	location: FieldLocation;
	/** Request key, defaults to the parameter name */
	key?: string;
	transform?: FieldTransform;
	/** Send the value even when it is empty (""), e.g. to clear a field */
	sendEmpty?: boolean;
	/** Merge the keys of a JSON object into the query/body instead of sending it as one key */
	merge?: boolean;
	/** Transforms for single keys of a collection, e.g. `{ tags: 'commaList' }` */
	optionTransforms?: Record<string, FieldTransform>;
	property: AmeiseFieldProperty;
}

export interface PreparedRequest {
	method: IHttpRequestMethods;
	path: string;
	qs: IDataObject;
	body: IDataObject;
	/** Replace the JSON body entirely, e.g. with an array */
	rawBody?: unknown;
}

export interface AmeisePagination {
	/** Maximum page size accepted by the API */
	maxPageSize: number;
	/** Key of the array inside the response, defaults to `items` */
	itemsKey?: string;
}

export interface AmeiseOperation {
	value: string;
	name: string;
	action: string;
	description: string;
	method: IHttpRequestMethods;
	/** Path relative to the API base URL, with `{param}` placeholders */
	path: string;
	fields?: AmeiseField[];
	/** Adds "Return All"/"Limit" and walks `page`/`pageSize` pages */
	pagination?: AmeisePagination;
	/** Split `response[itemsKey]` into separate n8n items */
	itemsKey?: string;
	/** Wrap primitive array entries (e.g. tag strings) as `{ [key]: value }` */
	wrapPrimitivesAs?: string;
	/** The response is a file that is returned as binary data */
	binaryResponse?: boolean;
	/** Hook to adjust the request before it is sent */
	preSend?: (this: IExecuteFunctions, itemIndex: number, request: PreparedRequest) => Promise<void>;
}

export interface AmeiseResource {
	api: AmeiseApiName;
	value: string;
	name: string;
	description?: string;
	operations: AmeiseOperation[];
}
