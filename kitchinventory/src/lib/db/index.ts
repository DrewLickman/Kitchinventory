import Dexie, { type Table } from 'dexie';
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

export const SCHEMA_VERSION = 2;

export const isBrowser =
	typeof window !== 'undefined' && typeof document !== 'undefined' && typeof indexedDB !== 'undefined';

export class KitchinventoryDB extends Dexie {
	locations!: Table<Location, string>;
	products!: Table<Product, string>;
	barcodes!: Table<Barcode, string>;
	batches!: Table<InventoryBatch, string>;
	shoppingLists!: Table<ShoppingList, string>;
	shoppingListItems!: Table<ShoppingListItem, string>;
	recipes!: Table<Recipe, string>;
	auditLog!: Table<AuditLog, string>;

	constructor() {
		super('kitchinventory');

		// v1
		this.version(1).stores({
			locations: 'id, type, sortOrder, name',
			products: 'id, searchName, name, category, brand',
			barcodes: 'code, productId, lastSeenAt',
			batches: 'id, productId, locationId, expiresAt, [locationId+expiresAt], [productId+expiresAt]',
			shoppingLists: 'id, name',
			shoppingListItems: 'id, listId, productId, checked',
			recipes: 'id, title, source',
			auditLog: 'id, type, createdAt'
		});

		// v2: add missing indexes used by queries/UI
		this.version(2).stores({
			locations: 'id, type, sortOrder, name',
			products: 'id, searchName, name, category, brand',
			barcodes: 'code, productId, lastSeenAt',
			batches:
				'id, productId, locationId, expiresAt, updatedAt, [locationId+expiresAt], [productId+expiresAt]',
			shoppingLists: 'id, name',
			shoppingListItems: 'id, listId, productId, checked',
			recipes: 'id, title, source',
			auditLog: 'id, type, createdAt'
		});
	}
}

/**
 * IndexedDB is browser-only. Never use the DB instance during SSR.
 * Import `db` and call it only when `isBrowser === true`, or use `getDb()`.
 */
export const db: KitchinventoryDB | null = isBrowser ? new KitchinventoryDB() : null;

export function getDb(): KitchinventoryDB {
	if (!db) throw new Error('KitchinventoryDB is only available in the browser');
	return db;
}

