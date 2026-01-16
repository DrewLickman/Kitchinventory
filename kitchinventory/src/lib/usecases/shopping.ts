import { getDb } from '$lib/db/index';
import { newId } from '$lib/db/ids';
import type { ShoppingListItem, Unit } from '$lib/db/schema';
import { nowIso } from '$lib/db/time';
import { logEvent } from './audit';

export async function ensureDefaultShoppingList(): Promise<string> {
	const db = getDb();
	const existing = await db.shoppingLists.where('name').equals('Groceries').first();
	if (existing) return existing.id;

	const now = nowIso();
	const id = newId('lst');
	await db.shoppingLists.add({ id, name: 'Groceries', createdAt: now, updatedAt: now });
	await logEvent('shoppingList.created', { listId: id, name: 'Groceries' });
	return id;
}

export async function addShoppingItem(params: {
	listId: string;
	label: string;
	productId?: string;
	desiredQty?: number;
	unit?: Unit;
}): Promise<void> {
	const db = getDb();
	const now = nowIso();
	const label = params.label.trim();
	if (!label) throw new Error('Item label is required');

	const existing = params.productId
		? await db.shoppingListItems
				.where('listId')
				.equals(params.listId)
				.and((i) => i.productId === params.productId && !i.checked)
				.first()
		: null;
	if (existing) return;

	const id = newId('sli');
	const rec: ShoppingListItem = {
		id,
		listId: params.listId,
		label,
		productId: params.productId,
		desiredQty: params.desiredQty,
		unit: params.unit,
		checked: false,
		createdAt: now,
		updatedAt: now
	};
	await db.shoppingListItems.add(rec);
	await logEvent('shoppingListItem.created', { id, listId: params.listId, productId: params.productId });
}

export async function toggleShoppingItemChecked(id: string, checked: boolean): Promise<void> {
	const db = getDb();
	await db.shoppingListItems.update(id, { checked, updatedAt: nowIso() });
	await logEvent('shoppingListItem.updated', { id, checked });
}

export async function deleteShoppingItem(id: string): Promise<void> {
	const db = getDb();
	await db.shoppingListItems.delete(id);
	await logEvent('shoppingListItem.deleted', { id });
}

