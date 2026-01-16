import { getDb } from '$lib/db/index';
import { ensureDefaults } from '$lib/db/bootstrap';
import { newId } from '$lib/db/ids';
import type { Unit } from '$lib/db/schema';
import { addDaysIsoDate, nowIso, todayIsoDate } from '$lib/db/time';
import { mapBarcodeToProduct } from '$lib/usecases/mapBarcode';
import { logEvent } from '$lib/usecases/audit';

type ExampleProduct = {
	name: string;
	searchName: string;
	category: string;
	brand?: string;
	defaultUnit: Unit;
	batch: {
		locationName: string;
		quantity: number;
		unit: Unit;
		expiresInDays?: number;
	};
	barcode?: { code: string; format?: string };
};

const EXAMPLES: ExampleProduct[] = [
	{
		name: 'Milk',
		searchName: 'milk',
		category: 'Dairy',
		brand: 'Organic Valley',
		defaultUnit: 'ml',
		batch: { locationName: 'Main Fridge', quantity: 1890, unit: 'ml', expiresInDays: 5 },
		barcode: { code: '042100005264', format: 'upc_a' }
	},
	{
		name: 'Eggs',
		searchName: 'eggs',
		category: 'Dairy',
		brand: 'Farm Fresh',
		defaultUnit: 'count',
		batch: { locationName: 'Main Fridge', quantity: 10, unit: 'count', expiresInDays: 12 },
		barcode: { code: '000111100001', format: 'upc_a' }
	},
	{
		name: 'Spinach',
		searchName: 'spinach',
		category: 'Produce',
		defaultUnit: 'grams',
		batch: { locationName: 'Main Fridge', quantity: 200, unit: 'grams', expiresInDays: 3 }
	},
	{
		name: 'Chicken Breast',
		searchName: 'chicken breast',
		category: 'Meat',
		defaultUnit: 'grams',
		batch: { locationName: 'Freezer', quantity: 900, unit: 'grams', expiresInDays: 90 }
	},
	{
		name: 'Rice',
		searchName: 'rice',
		category: 'Grains',
		defaultUnit: 'grams',
		batch: { locationName: 'Pantry', quantity: 2000, unit: 'grams' }
	},
	{
		name: 'Butter',
		searchName: 'butter',
		category: 'Dairy',
		defaultUnit: 'grams',
		batch: { locationName: 'Main Fridge', quantity: 454, unit: 'grams', expiresInDays: 30 }
	},
	{
		name: 'Bread',
		searchName: 'bread',
		category: 'Bakery',
		defaultUnit: 'count',
		batch: { locationName: 'Pantry', quantity: 1, unit: 'count', expiresInDays: 6 }
	},
	{
		name: 'Olive Oil',
		searchName: 'olive oil',
		category: 'Pantry',
		defaultUnit: 'ml',
		batch: { locationName: 'Pantry', quantity: 250, unit: 'ml' }
	}
];

export async function seedExampleData(): Promise<{ addedProducts: number; addedBatches: number }> {
	const db = getDb();
	await ensureDefaults();

	const now = nowIso();
	const today = todayIsoDate();

	const locations = await db.locations.toArray();
	const locationByName = new Map(locations.map((l) => [l.name.toLowerCase(), l]));

	let addedProducts = 0;
	let addedBatches = 0;

	await db.transaction('rw', [db.products, db.batches, db.barcodes, db.auditLog], async () => {
		for (const ex of EXAMPLES) {
			const existing = await db.products.where('searchName').equals(ex.searchName).first();
			const productId = existing?.id ?? newId('prd');

			if (!existing) {
				await db.products.add({
					id: productId,
					name: ex.name,
					searchName: ex.searchName,
					category: ex.category,
					brand: ex.brand,
					defaultUnit: ex.defaultUnit,
					createdAt: now,
					updatedAt: now
				});
				await logEvent('product.created', { productId, source: 'example' });
				addedProducts++;
			}

			// Bind barcode (if specified) even if product already exists.
			if (ex.barcode) {
				await mapBarcodeToProduct(ex.barcode.code, productId, ex.barcode.format);
			}

			// Add one batch if there isn't any batch for this product.
			const hasAnyBatch = (await db.batches.where('productId').equals(productId).count()) > 0;
			if (hasAnyBatch) continue;

			const loc = locationByName.get(ex.batch.locationName.toLowerCase());
			if (!loc) continue;

			const expiresAt =
				typeof ex.batch.expiresInDays === 'number' ? addDaysIsoDate(today, ex.batch.expiresInDays) : undefined;

			const batchId = newId('bat');
			await db.batches.add({
				id: batchId,
				productId,
				locationId: loc.id,
				quantity: ex.batch.quantity,
				unit: ex.batch.unit,
				quantityState: 'unknown',
				purchasedAt: today,
				expiresAt,
				createdAt: now,
				updatedAt: now
			});
			await logEvent('batch.created', { batchId, productId, source: 'example' });
			addedBatches++;
		}
	});

	return { addedProducts, addedBatches };
}

