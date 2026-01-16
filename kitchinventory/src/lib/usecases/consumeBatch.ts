import { getDb } from '$lib/db/index';
import { nowIso } from '$lib/db/time';
import { logEvent } from './audit';

export async function consumeBatch(batchId: string, amount = 1): Promise<void> {
	const db = getDb();
	const batch = await db.batches.get(batchId);
	if (!batch) return;

	const nextQty = Math.max(0, batch.quantity - amount);
	if (nextQty === 0) {
		await db.batches.delete(batchId);
		await logEvent('batch.deleted', { batchId, reason: 'consumed' });
		return;
	}

	await db.batches.update(batchId, { quantity: nextQty, updatedAt: nowIso() });
	await logEvent('batch.consumed', { batchId, amount, nextQty });
}

