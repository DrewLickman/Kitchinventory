export function newId(prefix = 'id'): string {
	return `${prefix}_${globalThis.crypto.randomUUID()}`;
}

