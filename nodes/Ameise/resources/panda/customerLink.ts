import { bodyField, filters, pathParam, stringOption } from '../../shared/fields';
import type { AmeiseResource } from '../../shared/types';

const linkTypeOptions = [
	{ name: 'Basic Analysis', value: 'basic_analysis' },
	{ name: 'Risk', value: 'risk' },
];

export const pandaCustomerLink: AmeiseResource = {
	api: 'panda',
	value: 'pandaCustomerLink',
	name: 'Customer Link',
	description: 'Links that let customers fill in questionnaires themselves',
	operations: [
		{
			value: 'create',
			name: 'Create',
			action: 'Create a customer link',
			description: 'Create a customer link. An existing link for the same parameters is disabled.',
			method: 'POST',
			path: '/customer-links',
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
					displayName: 'Type',
					name: 'type',
					type: 'options',
					options: linkTypeOptions,
					required: true,
					default: 'basic_analysis',
				}),
				bodyField({
					displayName: 'Tender ID',
					name: 'tenderId',
					type: 'string',
					required: true,
					default: '',
					description: 'Panda tender ID',
					displayOptions: { show: { type: ['risk'] } },
				}),
				bodyField({
					displayName: 'Handle Emails',
					name: 'handleEmails',
					type: 'boolean',
					default: true,
					description: 'Whether Panda sends emails with password and reminders to the customer',
				}),
				bodyField({
					displayName: 'Require Answers',
					name: 'requireAnswers',
					type: 'boolean',
					default: false,
					description: 'Whether the customer must fill in the mandatory fields in order to proceed',
				}),
				bodyField({
					displayName: 'Additional Fields',
					name: 'additionalFields',
					type: 'collection',
					placeholder: 'Add Field',
					default: {},
					options: [
						stringOption('email', 'Email', 'Email address the link is sent to', {
							placeholder: 'name@email.com',
						}),
						stringOption('message', 'Message', 'Message for the customer', {
							typeOptions: { rows: 4 },
						}),
					],
				}),
			],
		},
		{
			value: 'get',
			name: 'Get',
			action: 'Get a customer link',
			description: 'Retrieve a customer link by its hash',
			method: 'GET',
			path: '/customer-links/{hash}',
			fields: [pathParam('hash', 'Hash', 'Hash of the customer link (48 hex characters)')],
		},
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many customer links',
			description: 'Retrieve all customer links created by the logged-in broker',
			method: 'GET',
			path: '/customer-links',
			fields: [
				filters([
					{
						displayName: 'Customer ID',
						name: 'customerId',
						type: 'number',
						default: 0,
						description: 'Blau direkt customer ID',
					},
					{
						displayName: 'Only Active',
						name: 'active',
						type: 'options',
						options: [
							{ name: 'Yes', value: 1 },
							{ name: 'No', value: 0 },
						],
						default: 1,
						description: 'Whether to only return active customer links',
					},
				]),
			],
		},
	],
};
