import type { AuditEventType } from '$lib/db/schema';
import { getDb } from '$lib/db/index';
import { newId } from '$lib/db/ids';
import { nowIso } from '$lib/db/time';

export async function logEvent(type: AuditEventType, payload: unknown): Promise<void> {
	const db = getDb();
	await db.auditLog.add({
		id: newId('evt'),
		type,
		payload,
		createdAt: nowIso()
	});
}

