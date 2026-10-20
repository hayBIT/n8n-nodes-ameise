import type { INodeProperties } from 'n8n-workflow';
import { API_DISPLAY_NAMES, type AmeiseApiName } from './constants';
import type { AmeiseOperation, AmeiseResource } from './types';

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

function paginationProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
			displayOptions: { show: { returnAll: [false] } },
		},
	];
}

const binaryPropertyNameProperty: INodeProperties = {
	displayName: 'Put Output File in Field',
	name: 'binaryPropertyName',
	type: 'string',
	required: true,
	default: 'data',
	hint: 'The name of the output binary field to put the file in',
};

function withDisplayOptions(
	property: INodeProperties,
	resource: string,
	operation: string,
): INodeProperties {
	const show = {
		...(property.displayOptions?.show ?? {}),
		resource: [resource],
		operation: [operation],
	};
	return { ...property, displayOptions: { ...property.displayOptions, show } };
}

export function buildProperties(resources: AmeiseResource[]): INodeProperties[] {
	const apis = [...new Set(resources.map((resource) => resource.api))].sort();

	const properties: INodeProperties[] = [
		{
			displayName: 'API',
			name: 'api',
			type: 'options',
			noDataExpression: true,
			options: apis.map((api) => ({ name: API_DISPLAY_NAMES[api], value: api })),
			default: 'stocks',
		},
	];

	for (const api of apis) {
		const apiResources = resources.filter((resource) => resource.api === api).sort(byName);
		// The default is generated from the resource list
		// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
		properties.push({
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { api: [api] } },
			options: apiResources.map((resource) => ({
				name: resource.name,
				value: resource.value,
				description: resource.description,
			})),
			default: apiResources[0].value,
		});
	}

	for (const resource of resources) {
		const operations = [...resource.operations].sort(byName);
		// The default is generated from the operation list
		// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
		properties.push({
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { api: [resource.api], resource: [resource.value] } },
			options: operations.map((operation) => ({
				name: operation.name,
				value: operation.value,
				description: operation.description,
				action: operation.action,
			})),
			default: operations[0].value,
		});

		for (const operation of resource.operations) {
			const operationProperties: INodeProperties[] = [
				...(operation.fields ?? []).map((field) => field.property as INodeProperties),
				...(operation.pagination ? paginationProperties() : []),
				...(operation.binaryResponse ? [binaryPropertyNameProperty] : []),
			];
			for (const property of operationProperties) {
				properties.push(withDisplayOptions(property, resource.value, operation.value));
			}
		}
	}

	return properties;
}

export function findOperation(
	resources: AmeiseResource[],
	api: AmeiseApiName,
	resourceValue: string,
	operationValue: string,
): { resource: AmeiseResource; operation: AmeiseOperation } | undefined {
	const resource = resources.find((entry) => entry.api === api && entry.value === resourceValue);
	const operation = resource?.operations.find((entry) => entry.value === operationValue);
	return resource && operation ? { resource, operation } : undefined;
}
