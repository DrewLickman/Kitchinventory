import { getDb } from '../index';
import { addDaysIsoDate, todayIsoDate } from '../time';
import type { InventoryBatch } from '../schema';

export async function getExpiringSoon(days = 7): Promise<InventoryBatch[]> {
	const db = getDb();
	const today = todayIsoDate();
	const cutoff = addDaysIsoDate(today, days);
	return db.batches
		.where('expiresAt')
		.between(today, cutoff, true, true)
		.sortBy('expiresAt');
}

