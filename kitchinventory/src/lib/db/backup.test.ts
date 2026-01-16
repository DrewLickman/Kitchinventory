import { describe, expect, it } from 'vitest';
import { assertBackupV1 } from './backup';

describe('assertBackupV1', () => {
	it('accepts a valid backup shape', () => {
		const backup = {
			schemaVersion: 1,
			exportedAt: new Date().toISOString(),
			data: {
				locations: [],
				products: [],
				barcodes: [],
				batches: [],
				shoppingLists: [],
				shoppingListItems: [],
				recipes: [],
				auditLog: []
			}
		};

		expect(() => assertBackupV1(backup)).not.toThrow();
	});

	it('rejects invalid schemaVersion', () => {
		const backup = {
			schemaVersion: 2,
			exportedAt: new Date().toISOString(),
			data: {
				locations: [],
				products: [],
				barcodes: [],
				batches: [],
				shoppingLists: [],
				shoppingListItems: [],
				recipes: [],
				auditLog: []
			}
		};

		expect(() => assertBackupV1(backup)).toThrow(/schemaVersion/i);
	});
});

