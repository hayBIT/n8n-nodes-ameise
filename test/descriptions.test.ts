import { describe, expect, it } from 'vitest';
import { AmeiseApi } from '../credentials/AmeiseApi.credentials';
import { Ameise } from '../nodes/Ameise/Ameise.node';
import { resources } from '../nodes/Ameise/resources';
import { DEFAULT_BASE_URLS } from '../nodes/Ameise/shared/constants';

describe('resource definitions', () => {
	it('uses unique resource values', () => {
		const values = resources.map((resource) => resource.value);
		expect(new Set(values).size).toBe(values.length);
	});

	for (const resource of resources) {
		describe(resource.value, () => {
			it('uses unique operation values', () => {
				const values = resource.operations.map((operation) => operation.value);
				expect(new Set(values).size).toBe(values.length);
			});

			for (const operation of resource.operations) {
				it(`${operation.value}: has a path field for every placeholder`, () => {
					const placeholders = [...operation.path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
					const pathFields = (operation.fields ?? [])
						.filter((field) => field.location === 'path')
						.map((field) => field.property.name);
					expect(pathFields.sort()).toEqual(placeholders.sort());
				});
			}
		});
	}

	it('covers all 66 non-deprecated Stocks v1 operations', () => {
		const count = resources
			.filter((resource) => resource.api === 'stocks')
			.reduce((sum, resource) => sum + resource.operations.length, 0);
		expect(count).toBe(66);
	});
});

describe('node and credentials', () => {
	it('builds the node description', () => {
		const node = new Ameise();
		expect(node.description.properties.length).toBeGreaterThan(100);
	});

	it('keeps credential defaults in sync with the base URLs', () => {
		const defaults = Object.fromEntries(
			new AmeiseApi().properties.map((property) => [property.name, property.default]),
		);
		expect(defaults.pandaBaseUrl).toBe(DEFAULT_BASE_URLS.panda);
		expect(defaults.stocksBaseUrl).toBe(DEFAULT_BASE_URLS.stocks);
		expect(defaults.archiveBaseUrl).toBe(DEFAULT_BASE_URLS.archive);
	});
});
