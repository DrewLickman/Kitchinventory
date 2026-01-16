import { getDb } from '$lib/db/index';
import type { Unit } from '$lib/db/schema';
import { newId } from '$lib/db/ids';
import { nowIso, todayIsoDate } from '$lib/db/time';
import { logEvent } from './audit';

export interface AddItemInput {
	productName: string;
	brand?: string;
	category?: string;
	unit: Unit;
	quantity: number;
	locationId: string;
	expiresAt?: string;
}

export async function addItem(input: AddItemInput): Promise<void> {
	const db = getDb();
	const now = nowIso();
	const trimmed = input.productName.trim();
	if (!trimmed) throw new Error('Product name is required');
	if (!input.locationId) throw new Error('Location is required');

	const productId = newId('prd');
	await db.products.add({
		id: productId,
		name: trimmed,
		searchName: trimmed.toLowerCase(),
		defaultUnit: input.unit,
		brand: input.brand?.trim() || undefined,
		category: input.category?.trim() || undefined,
		createdAt: now,
		updatedAt: now
	});

	await logEvent('product.created', { productId });

	const batchId = newId('bat');
	await db.batches.add({
		id: batchId,
		productId,
		locationId: input.locationId,
		quantity: Number(input.quantity) || 1,
		unit: input.unit,
		quantityState: 'unknown',
		purchasedAt: todayIsoDate(),
		expiresAt: input.expiresAt || undefined,
		createdAt: now,
		updatedAt: now
	});

	await logEvent('batch.created', { batchId, productId });
}

