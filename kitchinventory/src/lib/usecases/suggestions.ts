import { getDb } from '$lib/db/index';
import type { Unit } from '$lib/db/schema';

export type SuggestionReason = 'out_of_stock' | 'low_stock';

export interface ShoppingSuggestion {
	productId: string;
	label: string;
	reason: SuggestionReason;
	totalQty: number;
	unit: Unit;
}

function thresholdForUnit(unit: Unit): number {
	switch (unit) {
		case 'count':
			return 1;
		case 'grams':
			return 100;
		case 'ml':
			return 250;
	}
}

export async function getShoppingSuggestions(): Promise<ShoppingSuggestion[]> {
	const db = getDb();
	const [products, batches] = await Promise.all([db.products.toArray(), db.batches.toArray()]);

	const totals = new Map<string, { total: number; unit: Unit }>();
	for (const b of batches) {
		const prev = totals.get(b.productId);
		if (!prev) {
			totals.set(b.productId, { total: b.quantity, unit: b.unit });
			continue;
		}
		// If units mismatch, keep first unit and just sum raw numbers (simple heuristic).
		totals.set(b.productId, { total: prev.total + b.quantity, unit: prev.unit });
	}

	const suggestions: ShoppingSuggestion[] = [];
	for (const p of products) {
		const t = totals.get(p.id);
		if (!t) {
			suggestions.push({
				productId: p.id,
				label: p.name,
				reason: 'out_of_stock',
				totalQty: 0,
				unit: p.defaultUnit
			});
			continue;
		}
		const threshold = thresholdForUnit(t.unit);
		if (t.total <= threshold) {
			suggestions.push({
				productId: p.id,
				label: p.name,
				reason: 'low_stock',
				totalQty: t.total,
				unit: t.unit
			});
		}
	}

	// Put out_of_stock first, then low_stock, then by name.
	suggestions.sort((a, b) => {
		const prio = (r: SuggestionReason) => (r === 'out_of_stock' ? 0 : 1);
		return prio(a.reason) - prio(b.reason) || a.label.localeCompare(b.label);
	});

	return suggestions;
}

