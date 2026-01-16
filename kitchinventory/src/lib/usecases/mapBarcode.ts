import { getDb } from '$lib/db/index';
import { nowIso } from '$lib/db/time';
import type { Barcode } from '$lib/db/schema';
import { logEvent } from './audit';

export async function mapBarcodeToProduct(code: string, productId: string, format?: string) {
	const db = getDb();
	const rec: Barcode = {
		code,
		productId,
		format,
		lastSeenAt: nowIso()
	};
	await db.barcodes.put(rec);
	await logEvent('barcode.mapped', { code, productId, format });
}

export async function findProductIdForBarcode(code: string): Promise<string | null> {
	const db = getDb();
	const rec = await db.barcodes.get(code);
	return rec?.productId ?? null;
}

