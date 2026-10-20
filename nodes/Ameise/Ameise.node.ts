import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	getPandaIndustries,
	getPandaInsuranceLines,
	getStocksBlockedReasons,
	getStocksCancellationReasons,
	getStocksLegalForms,
	getStocksNations,
} from './methods/loadOptions';
import { resources } from './resources';
import type { AmeiseApiName } from './shared/constants';
import { buildProperties, findOperation } from './shared/descriptions';
import { executeOperation } from './shared/execute';

export class Ameise implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ameise',
		name: 'ameise',
		icon: { light: 'file:../../icons/ameise.svg', dark: 'file:../../icons/ameise.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with customers, contracts, archives and tenders in the Ameise (blau direkt)',
		defaults: {
			name: 'Ameise',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'ameiseApi',
				required: true,
				displayOptions: { show: { authentication: ['accessToken'] } },
			},
			{
				name: 'ameiseOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oAuth2'] } },
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2 (Service Account)',
						value: 'oAuth2',
					},
				],
				default: 'oAuth2',
			},
			...buildProperties(resources),
		],
	};

	methods = {
		loadOptions: {
			getPandaIndustries,
			getPandaInsuranceLines,
			getStocksBlockedReasons,
			getStocksCancellationReasons,
			getStocksLegalForms,
			getStocksNations,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const api = this.getNodeParameter('api', i) as AmeiseApiName;
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				const definition = findOperation(resources, api, resource, operation);
				if (!definition) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				returnData.push(
					...(await executeOperation.call(this, definition.resource, definition.operation, i)),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				const nodeError =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
				nodeError.context.itemIndex = i;
				throw nodeError;
			}
		}

		return [returnData];
	}
}
