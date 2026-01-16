<script lang="ts">
	import { browser } from '$app/environment';
	import { liveQuery } from 'dexie';
	import { fromObservable } from '$lib/stores/liveQuery';
	import { getDb } from '$lib/db/index';
	import { newId } from '$lib/db/ids';
	import { nowIso } from '$lib/db/time';
	import type { Location, LocationType } from '$lib/db/schema';

	const locations = browser
		? fromObservable(
				liveQuery(async () => {
					const db = getDb();
					return db.locations.orderBy('sortOrder').toArray();
				}),
				[] as Location[]
			)
		: fromObservable(liveQuery(async () => [] as Location[]), []);

	let name = '';
	let type: LocationType = 'fridge';

	async function addLocation() {
		const trimmed = name.trim();
		if (!trimmed) return;
		const db = getDb();
		const now = nowIso();
		const sortOrder = await db.locations.count();
		await db.locations.add({
			id: newId('loc'),
			name: trimmed,
			type,
			sortOrder,
			createdAt: now,
			updatedAt: now
		});
		name = '';
		type = 'fridge';
	}

	async function rename(loc: Location, newName: string) {
		const trimmed = newName.trim();
		if (!trimmed) return;
		const db = getDb();
		await db.locations.update(loc.id, { name: trimmed, updatedAt: nowIso() });
	}

	async function remove(loc: Location) {
		const db = getDb();
		const batchCount = await db.batches.where('locationId').equals(loc.id).count();
		if (batchCount > 0) return;
		await db.locations.delete(loc.id);
	}
</script>

<div class="space-y-4">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Locations</h1>
		<p class="mt-1 text-sm text-[rgb(var(--muted))]">
			Manage where you store items (fridge, freezer, pantry…).
		</p>
	</div>

	<div class="rounded-xl border border-white/10 bg-white/5 p-4">
		<div class="grid gap-3 sm:grid-cols-3">
			<label class="grid gap-1 sm:col-span-2">
				<span class="text-sm text-[rgb(var(--muted))]">Name</span>
				<input
					class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
					placeholder="e.g., Garage freezer"
					bind:value={name}
				/>
			</label>
			<label class="grid gap-1">
				<span class="text-sm text-[rgb(var(--muted))]">Type</span>
				<select
					class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
					bind:value={type}
				>
					<option value="fridge">fridge</option>
					<option value="freezer">freezer</option>
					<option value="pantry">pantry</option>
					<option value="other">other</option>
				</select>
			</label>
		</div>

		<div class="mt-3 flex justify-end">
			<button
				type="button"
				class="rounded-md bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
				disabled={!name.trim()}
				on:click={addLocation}
			>
				Add location
			</button>
		</div>
	</div>

	<div class="overflow-hidden rounded-xl border border-white/10 bg-white/5">
		<div class="border-b border-white/10 px-4 py-3 text-sm font-semibold">Your locations</div>
		{#if $locations.length === 0}
			<div class="px-4 py-6 text-sm text-[rgb(var(--muted))]">No locations yet.</div>
		{:else}
			<ul class="divide-y divide-white/10">
				{#each $locations as loc (loc.id)}
					<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
						<div class="min-w-0">
							<div class="font-medium">{loc.name}</div>
							<div class="mt-0.5 text-sm text-[rgb(var(--muted))]">{loc.type}</div>
						</div>

						<div class="flex items-center gap-2">
							<button
								type="button"
								class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/10"
								on:click={() => {
									const next = prompt('Rename location', loc.name);
									if (next) rename(loc, next);
								}}
							>
								Rename
							</button>
							<button
								type="button"
								class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/10 disabled:opacity-50"
								on:click={() => remove(loc)}
								title="Can’t delete a location that still has batches."
							>
								Delete
							</button>
						</div>
					</li>
				{/each}
			</ul>
			<p class="px-4 py-3 text-xs text-[rgb(var(--muted))]">
				Note: you can’t delete a location while inventory batches still reference it.
			</p>
		{/if}
	</div>
</div>

