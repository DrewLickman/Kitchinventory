import { getDb } from './index';
import type {
	AuditLog,
	Barcode,
	InventoryBatch,
	Location,
	Product,
	Recipe,
	ShoppingList,
	ShoppingListItem
} from './schema';
import { nowIso } from './time';

export type BackupSchemaVersion = 1;

export interface BackupV1 {
	schemaVersion: BackupSchemaVersion;
	exportedAt: string;
	data: {
		locations: Location[];
		products: Product[];
		barcodes: Barcode[];
		batches: InventoryBatch[];
		shoppingLists: ShoppingList[];
		shoppingListItems: ShoppingListItem[];
		recipes: Recipe[];
		auditLog: AuditLog[];
	};
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function isNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
	return typeof value === 'string';
}

function requireArray(obj: Record<string, unknown>, key: string): unknown[] {
	const v = obj[key];
	if (!isArray(v)) throw new Error(`Invalid backup: ${key} must be an array`);
	return v;
}

function requireString(obj: Record<string, unknown>, key: string): string {
	const v = obj[key];
	if (!isString(v)) throw new Error(`Invalid backup: ${key} must be a string`);
	return v;
}

function requireNumber(obj: Record<string, unknown>, key: string): number {
	const v = obj[key];
	if (!isNumber(v)) throw new Error(`Invalid backup: ${key} must be a number`);
	return v;
}

export function assertBackupV1(value: unknown): asserts value is BackupV1 {
	if (!isObject(value)) throw new Error('Invalid backup: root must be an object');
	const schemaVersion = requireNumber(value, 'schemaVersion');
	if (schemaVersion !== 1) throw new Error(`Unsupported backup schemaVersion: ${schemaVersion}`);
	requireString(value, 'exportedAt');
	const data = value.data;
	if (!isObject(data)) throw new Error('Invalid backup: data must be an object');

	// We validate container shapes here. Deeper validation can be added later if needed.
	requireArray(data, 'locations');
	requireArray(data, 'products');
	requireArray(data, 'barcodes');
	requireArray(data, 'batches');
	requireArray(data, 'shoppingLists');
	requireArray(data, 'shoppingListItems');
	requireArray(data, 'recipes');
	requireArray(data, 'auditLog');
}

export async function exportBackup(): Promise<BackupV1> {
	const db = getDb();
	return {
		schemaVersion: 1,
		exportedAt: nowIso(),
		data: {
			locations: await db.locations.toArray(),
			products: await db.products.toArray(),
			barcodes: await db.barcodes.toArray(),
			batches: await db.batches.toArray(),
			shoppingLists: await db.shoppingLists.toArray(),
			shoppingListItems: await db.shoppingListItems.toArray(),
			recipes: await db.recipes.toArray(),
			auditLog: await db.auditLog.toArray()
		}
	};
}

export async function restoreBackup(raw: unknown): Promise<void> {
	assertBackupV1(raw);
	const db = getDb();

	await db.transaction(
		'rw',
		[
			db.locations,
			db.products,
			db.barcodes,
			db.batches,
			db.shoppingLists,
			db.shoppingListItems,
			db.recipes,
			db.auditLog
		],
		async () => {
			await Promise.all([
				db.locations.clear(),
				db.products.clear(),
				db.barcodes.clear(),
				db.batches.clear(),
				db.shoppingLists.clear(),
				db.shoppingListItems.clear(),
				db.recipes.clear(),
				db.auditLog.clear()
			]);

			await db.locations.bulkAdd(raw.data.locations);
			await db.products.bulkAdd(raw.data.products);
			await db.barcodes.bulkAdd(raw.data.barcodes);
			await db.batches.bulkAdd(raw.data.batches);
			await db.shoppingLists.bulkAdd(raw.data.shoppingLists);
			await db.shoppingListItems.bulkAdd(raw.data.shoppingListItems);
			await db.recipes.bulkAdd(raw.data.recipes);
			await db.auditLog.bulkAdd(raw.data.auditLog);
		}
	);
}

