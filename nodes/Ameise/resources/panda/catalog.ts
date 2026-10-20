import type { AmeiseResource } from '../../shared/types';

export const pandaIndustry: AmeiseResource = {
	api: 'panda',
	value: 'pandaIndustry',
	name: 'Industry',
	operations: [
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many industries',
			description: 'Retrieve all industries available in Panda',
			method: 'GET',
			path: '/industries',
		},
	],
};

export const pandaInsuranceLine: AmeiseResource = {
	api: 'panda',
	value: 'pandaInsuranceLine',
	name: 'Insurance Line',
	operations: [
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many insurance lines',
			description: 'Retrieve all insurance lines available in Panda, including their Ameise IDs',
			method: 'GET',
			path: '/insurance-lines',
		},
	],
};

export const pandaInsuranceCompany: AmeiseResource = {
	api: 'panda',
	value: 'pandaInsuranceCompany',
	name: 'Insurance Company',
	operations: [
		{
			value: 'getAll',
			name: 'Get Many',
			action: 'Get many insurance companies',
			description: 'Retrieve all insurance companies available in Panda',
			method: 'GET',
			path: '/insurance-companies',
		},
	],
};
