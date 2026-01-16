import { getDb } from './index';
import { newId } from './ids';
import type { Location } from './schema';
import { nowIso } from './time';

const DEFAULT_LOCATIONS: Array<Pick<Location, 'name' | 'type'>> = [
	{ name: 'Main Fridge', type: 'fridge' },
	{ name: 'Freezer', type: 'freezer' },
	{ name: 'Pantry', type: 'pantry' }
];

export async function ensureDefaults(): Promise<void> {
	const db = getDb();
	const count = await db.locations.count();
	if (count > 0) return;

	const now = nowIso();
	await db.locations.bulkAdd(
		DEFAULT_LOCATIONS.map((l, idx) => ({
			id: newId('loc'),
			name: l.name,
			type: l.type,
			sortOrder: idx,
			createdAt: now,
			updatedAt: now
		}))
	);
}

