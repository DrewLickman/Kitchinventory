import type { IsoDateString, IsoDateTimeString } from './schema';

export function nowIso(): IsoDateTimeString {
	return new Date().toISOString();
}

export function todayIsoDate(): IsoDateString {
	return new Date().toISOString().slice(0, 10);
}

export function addDaysIsoDate(baseIsoDate: IsoDateString, days: number): IsoDateString {
	const base = new Date(`${baseIsoDate}T00:00:00.000Z`);
	base.setUTCDate(base.getUTCDate() + days);
	return base.toISOString().slice(0, 10);
}

