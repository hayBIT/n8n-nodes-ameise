import {
	additionalFields,
	bodyField,
	filters,
	jsonField,
	numberOption,
	pathParam,
	stringOption,
} from '../../shared/fields';
import type { AmeiseResource } from '../../shared/types';

const tenderId = pathParam('id', 'Tender ID', 'Panda tender ID (24 hex characters)');

export const paymentIntervalOptions = [
	{ name: 'Half-Yearly', value: 'half_yearly' },
	{ name: 'Monthly', value: 'monthly' },
	{ name: 'One-Time', value: 'one_time' },
	{ name: 'Quarterly', value: 'quarterly' },
	{ name: 'Yearly', value: 'yearly' },
];

export const answersDescription =
	'Answers as JSON object of question key → value, e.g. {"123": "foo", "risk-0-125": "bar"}';

export const pandaTender: AmeiseResource = {
	api: 'panda',
	value: 'pandaTender',
	name: 'Tender',
	description: 'Tenders (Ausschreibungen) sent to insurance companies',
	operations: [
		{
			value: 'create',
			name: 'Create',
			action: 'Create a tender',
			description: 'Create a tender for a customer and insurance line',
			method: 'POST',
			path: '/tenders',
			fields: [
				bodyField({
					displayName: 'Customer ID',
					name: 'customerId',
					type: 'number',
					required: true,
					default: 0,
					description: 'Blau direkt customer ID',
				}),
				bodyField({
					displayName: 'Insurance Line Name or ID',
					name: 'insuranceLineId',
					type: 'options',
					typeOptions: { loadOptionsMethod: 'getPandaInsuranceLines' },
					required: true,
					default: '',
					description:
						'Panda insurance line. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				}),
			],
		},
		{
			value: 'get',
			name: 'Get',
			action: 'Get a tender',
			description: 'Retrieve a tender including the answers of its question cascade',
			method: 'GET',
			path: '/tenders/{id}',
			fields: [tenderId],
		},
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many tenders',
			description: 'Retrieve active tenders',
			method: 'GET',
			path: '/tenders',
			fields: [
				filters([
					numberOption('customerId', 'Customer ID', 'Blau direkt customer ID'),
					numberOption('insuranceLineId', 'Insurance Line ID', 'Panda insurance line ID'),
				]),
			],
		},
		{
			value: 'archive',
			name: 'Archive',
			action: 'Archive a tender',
			description: 'Archive a tender',
			method: 'POST',
			path: '/tenders/{id}/archive',
			fields: [
				tenderId,
				additionalFields([stringOption('reason', 'Reason', 'Why the tender was archived')]),
			],
		},
		{
			value: 'createOrder',
			name: 'Create Order',
			action: 'Create an order for a tender',
			description: 'Order the offer of an insurance company for a tender',
			method: 'POST',
			path: '/tenders/{id}/order',
			fields: [
				tenderId,
				bodyField({
					displayName: 'Insurance Company ID',
					name: 'insuranceId',
					type: 'number',
					required: true,
					default: 0,
					description: 'Panda insurance company ID of the inquiry',
				}),
				bodyField({
					displayName: 'Contract ID',
					name: 'contractId',
					type: 'number',
					required: true,
					default: 0,
					description: 'Ameise contract ID',
				}),
				additionalFields([
					stringOption('offerId', 'Offer ID', 'ID of the offer the order is created for'),
					numberOption('insurancePremium', 'Insurance Premium', 'Premium of the contract', {
						typeOptions: { minValue: 0, numberPrecision: 2 },
					}),
					{
						displayName: 'Payment Interval',
						name: 'paymentInterval',
						type: 'options',
						options: paymentIntervalOptions,
						default: 'yearly',
					},
				]),
			],
		},
		{
			value: 'updateCascade',
			name: 'Update Cascade Answers',
			action: 'Update the cascade answers of a tender',
			description: 'Change answers in the question cascade of a tender',
			method: 'PATCH',
			path: '/tenders/{id}/cascade',
			fields: [tenderId, jsonField('answers', 'Answers', answersDescription)],
		},
	],
};
