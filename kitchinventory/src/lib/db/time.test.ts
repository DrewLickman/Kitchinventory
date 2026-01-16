import { describe, expect, it } from 'vitest';
import { addDaysIsoDate } from './time';

describe('addDaysIsoDate', () => {
	it('adds days in UTC', () => {
		expect(addDaysIsoDate('2026-01-16', 1)).toBe('2026-01-17');
		expect(addDaysIsoDate('2026-01-31', 1)).toBe('2026-02-01');
	});
});

