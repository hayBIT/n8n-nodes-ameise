import { jsonField, pathParam, stringOption, updateFields } from '../../shared/fields';
import type { AmeiseResource } from '../../shared/types';
import { answersDescription } from './tender';

const ameiseId = pathParam('ameiseId', 'Customer ID', 'Numeric ID of the customer in the Ameise', {
	type: 'number',
	default: 0,
});

export const pandaCustomer: AmeiseResource = {
	api: 'panda',
	value: 'pandaCustomer',
	name: 'Customer',
	description: 'Extended customer data stored in Panda',
	operations: [
		{
			value: 'get',
			name: 'Get',
			action: 'Get a customer',
			description:
				'Retrieve extended customer data stored in Panda, including basic analysis answers',
			method: 'GET',
			path: '/customers/{ameiseId}',
			fields: [ameiseId],
		},
		{
			value: 'update',
			name: 'Update',
			action: 'Update a customer',
			description: 'Update industries and business description of a customer',
			method: 'PATCH',
			path: '/customers/{ameiseId}',
			fields: [
				ameiseId,
				updateFields([
					stringOption('businessDescription', 'Business Description', undefined, {
						typeOptions: { rows: 4 },
					}),
					{
						displayName: 'Industries',
						name: 'industries',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						placeholder: 'Add Industry',
						default: {},
						options: [
							{
								displayName: 'Industry',
								name: 'industry',
								values: [
									{
										displayName: 'Industry Name or ID',
										name: 'id',
										type: 'options',
										typeOptions: { loadOptionsMethod: 'getPandaIndustries' },
										default: '',
										description:
											'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
									},
									{
										displayName: 'Percentage',
										name: 'percentage',
										type: 'number',
										typeOptions: { minValue: 0, maxValue: 100 },
										default: 100,
									},
								],
							},
						],
					},
				]),
			],
			async preSend(_itemIndex, request) {
				const industries = request.body.industries as
					| { industry?: Array<{ id: string; percentage: number }> }
					| undefined;
				if (industries) {
					request.body.industries = (industries.industry ?? []).map((entry) => ({
						id: Number(entry.id),
						percentage: entry.percentage,
					}));
				}
			},
		},
		{
			value: 'getInsuranceLines',
			name: 'Get Insurance Lines',
			action: 'Get insurance lines of a customer',
			description: 'Retrieve the sorted insurance lines available for a customer',
			method: 'GET',
			path: '/customers/{ameiseId}/insurance-lines',
			fields: [ameiseId],
		},
		{
			value: 'updateCascade',
			name: 'Update Cascade Answers',
			action: 'Update the basic analysis answers of a customer',
			description: 'Change answers in the basic analysis cascade of a customer',
			method: 'PATCH',
			path: '/customers/{ameiseId}/cascade',
			fields: [ameiseId, jsonField('answers', 'Answers', answersDescription)],
		},
	],
};
