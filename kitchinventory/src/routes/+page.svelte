<script lang="ts">
	import { expiringSoonBatches } from '$lib/stores/dashboard';
	import { browser } from '$app/environment';
	import { liveQuery } from 'dexie';
	import { fromObservable } from '$lib/stores/liveQuery';
	import type { InventoryBatch } from '$lib/db/schema';
	import { getDb } from '$lib/db/index';

	const totalBatches = browser
		? fromObservable(
				liveQuery(async () => {
					const db = getDb();
					return db.batches.count();
				}),
				0
			)
		: fromObservable(liveQuery(async () => 0), 0);

	const totalProducts = browser
		? fromObservable(
				liveQuery(async () => {
					const db = getDb();
					return db.products.count();
				}),
				0
			)
		: fromObservable(liveQuery(async () => 0), 0);

	const enrichedExpiringSoon = browser
		? fromObservable(
				liveQuery(async () => {
					const db = getDb();
					const batches = await db.batches
						.where('expiresAt')
						.between('0000-00-00', '9999-12-31', true, true)
						.filter((b) => !!b.expiresAt)
						.sortBy('expiresAt');
					const soon = batches.slice(0, 8);
					const productIds = [...new Set(soon.map((b) => b.productId))];
					const locationIds = [...new Set(soon.map((b) => b.locationId))];
					const [products, locations] = await Promise.all([
						db.products.bulkGet(productIds),
						db.locations.bulkGet(locationIds)
					]);
					const productById = new Map(products.filter(Boolean).map((p) => [p!.id, p!]));
					const locationById = new Map(locations.filter(Boolean).map((l) => [l!.id, l!]));
					return soon.map((b) => ({
						batch: b,
						productName: productById.get(b.productId)?.name ?? 'Unknown',
						locationName: locationById.get(b.locationId)?.name ?? 'Unknown'
					}));
				}),
				[] as Array<{ batch: InventoryBatch; productName: string; locationName: string }>
			)
		: fromObservable(liveQuery(async () => []), []);
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
			<p class="mt-1 text-sm text-[rgb(var(--muted))]">Offline-first kitchen inventory.</p>
		</div>

		<div class="flex gap-2">
			<a
				href="/inventory"
				class="rounded-md bg-white/10 px-3 py-2 text-sm font-medium no-underline hover:bg-white/15"
			>
				View inventory
			</a>
			<a
				href="/scan"
				class="rounded-md bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-black no-underline hover:brightness-110"
			>
				Scan barcode
			</a>
		</div>
	</div>

	<div class="grid gap-3 sm:grid-cols-2">
		<div class="rounded-xl border border-white/10 bg-white/5 p-4">
			<div class="text-sm text-[rgb(var(--muted))]">Products</div>
			<div class="mt-1 text-3xl font-semibold tabular-nums">{$totalProducts}</div>
		</div>
		<div class="rounded-xl border border-white/10 bg-white/5 p-4">
			<div class="text-sm text-[rgb(var(--muted))]">Batches</div>
			<div class="mt-1 text-3xl font-semibold tabular-nums">{$totalBatches}</div>
		</div>
	</div>

	<section class="rounded-xl border border-white/10 bg-white/5">
		<div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
			<div>
				<h2 class="text-base font-semibold">Expiring soon</h2>
				<p class="text-sm text-[rgb(var(--muted))]">Next 7 days</p>
			</div>
			<a href="/inventory" class="text-sm text-[rgb(var(--muted))] hover:text-white">See all</a>
		</div>

		{#if $expiringSoonBatches.length === 0}
			<div class="px-4 py-6 text-sm text-[rgb(var(--muted))]">No expiring items yet.</div>
		{:else}
			<ul class="divide-y divide-white/10">
				{#each $enrichedExpiringSoon as row (row.batch.id)}
					<li class="flex items-center justify-between gap-3 px-4 py-3">
						<div class="min-w-0">
							<div class="truncate font-medium">{row.productName}</div>
							<div class="mt-0.5 text-sm text-[rgb(var(--muted))]">
								{row.locationName} • expires {row.batch.expiresAt}
							</div>
						</div>
						<div class="text-sm tabular-nums text-[rgb(var(--muted))]">
							{row.batch.quantity} {row.batch.unit}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
