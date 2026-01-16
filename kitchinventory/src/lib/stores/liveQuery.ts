import type { Readable } from 'svelte/store';
import { readable } from 'svelte/store';
import type { Observable } from 'dexie';
import { liveQuery } from 'dexie';
import { browser } from '$app/environment';

export function fromObservable<T>(observable: Observable<T>, initial: T): Readable<T> {
	return readable<T>(initial, (set) => {
		const sub = observable.subscribe({
			next: (value) => set(value),
			error: (err) => console.error(err)
		});
		return () => sub.unsubscribe();
	});
}

export function clientLiveQuery<T>(query: () => Promise<T>, initial: T): Readable<T> {
	if (!browser) return readable(initial, () => {});
	return fromObservable(liveQuery(query), initial);
}

