export type Id = string;

export type IsoDateString = string; // e.g. "2026-01-16"
export type IsoDateTimeString = string; // e.g. "2026-01-16T10:30:00.000Z"

export type Unit = 'count' | 'grams' | 'ml';

export type LocationType = 'fridge' | 'freezer' | 'pantry' | 'other';

export interface Location {
	id: Id;
	name: string;
	type: LocationType;
	sortOrder: number;
	createdAt: IsoDateTimeString;
	updatedAt: IsoDateTimeString;
}

export interface Product {
	id: Id;
	name: string;
	brand?: string;
	category?: string;
	defaultUnit: Unit;
	defaultShelfLifeDays?: number;
	notes?: string;
	imageBlobId?: Id;
	searchName: string; // normalized name for search
	createdAt: IsoDateTimeString;
	updatedAt: IsoDateTimeString;
}

export interface Barcode {
	code: string; // primary key
	productId: Id;
	format?: string;
	lastSeenAt: IsoDateTimeString;
}

export type QuantityState = 'sealed' | 'opened' | 'unknown';

export interface InventoryBatch {
	id: Id;
	productId: Id;
	locationId: Id;
	purchasedAt?: IsoDateString;
	expiresAt?: IsoDateString;
	openedAt?: IsoDateString;
	quantity: number;
	unit: Unit;
	quantityState: QuantityState;
	cost?: number;
	notes?: string;
	createdAt: IsoDateTimeString;
	updatedAt: IsoDateTimeString;
}

export interface ShoppingList {
	id: Id;
	name: string;
	createdAt: IsoDateTimeString;
	updatedAt: IsoDateTimeString;
}

export interface ShoppingListItem {
	id: Id;
	listId: Id;
	productId?: Id;
	label: string;
	desiredQty?: number;
	unit?: Unit;
	checked: boolean;
	createdAt: IsoDateTimeString;
	updatedAt: IsoDateTimeString;
}

export type RecipeSource = 'local' | 'import' | 'api';

export interface Recipe {
	id: Id;
	title: string;
	source: RecipeSource;
	ingredients: unknown;
	instructions: string;
	servings?: number;
	tags?: string[];
	nutrition?: unknown;
	createdAt: IsoDateTimeString;
	updatedAt: IsoDateTimeString;
}

export type AuditEventType =
	| 'product.created'
	| 'product.updated'
	| 'product.deleted'
	| 'location.created'
	| 'location.updated'
	| 'location.deleted'
	| 'batch.created'
	| 'batch.updated'
	| 'batch.deleted'
	| 'batch.consumed'
	| 'shoppingList.created'
	| 'shoppingList.updated'
	| 'shoppingList.deleted'
	| 'shoppingListItem.created'
	| 'shoppingListItem.updated'
	| 'shoppingListItem.deleted'
	| 'barcode.mapped';

export interface AuditLog {
	id: Id;
	type: AuditEventType;
	payload: unknown;
	createdAt: IsoDateTimeString;
}

