import type { InventoryBatch } from '$lib/db/schema';
import { clientLiveQuery } from './liveQuery';
import { getDb } from '$lib/db/index';
import { addDaysIsoDate, todayIsoDate } from '$lib/db/time';

export const expiringSoonBatches = clientLiveQuery(async () => {
	const db = getDb();
	const today = todayIsoDate();
	const cutoff = addDaysIsoDate(today, 7);
	return db.batches.where('expiresAt').between(today, cutoff, true, true).sortBy('expiresAt');
}, [] as InventoryBatch[]);

