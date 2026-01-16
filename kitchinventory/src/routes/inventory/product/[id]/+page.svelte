<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { clientLiveQuery } from '$lib/stores/liveQuery';
	import { getDb } from '$lib/db/index';
	import type { InventoryBatch, Location, Product } from '$lib/db/schema';
	import { consumeBatch } from '$lib/usecases/consumeBatch';

	const productId = $derived($page.params.id ?? '');

	const product = clientLiveQuery(async () => {
		if (!productId) return null;
		const db = getDb();
		return (await db.products.get(productId)) ?? null;
	}, null as Product | null);

	const batches = clientLiveQuery(async () => {
		if (!productId) return [];
		const db = getDb();
		return db.batches.where('productId').equals(productId).sortBy('expiresAt');
	}, [] as InventoryBatch[]);

	const locationsById = browser
		? clientLiveQuery(async () => {
				const db = getDb();
				const locations = await db.locations.toArray();
				return new Map(locations.map((l) => [l.id, l]));
			}, new Map<string, Location>())
		: clientLiveQuery(async () => new Map<string, Location>(), new Map<string, Location>());
</script>

{#if !$product}
	<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-[rgb(var(--muted))]">
		Product not found.
	</div>
{:else}
	<div class="space-y-4">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h1 class="text-2xl font-semibold tracking-tight">{$product.name}</h1>
				<p class="mt-1 text-sm text-[rgb(var(--muted))]">
					{#if $product.brand}{ $product.brand }{/if}
					{#if $product.category}
						{#if $product.brand} • {/if}{ $product.category }
					{/if}
				</p>
			</div>
			<a
				href="/inventory"
				class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm no-underline hover:bg-white/10"
			>
				Back
			</a>
		</div>

		<div class="overflow-hidden rounded-xl border border-white/10 bg-white/5">
			<div class="border-b border-white/10 px-4 py-3 text-sm font-semibold">Batches</div>
			{#if $batches.length === 0}
				<div class="px-4 py-6 text-sm text-[rgb(var(--muted))]">No batches for this product yet.</div>
			{:else}
				<ul class="divide-y divide-white/10">
					{#each $batches as b (b.id)}
						<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
							<div class="min-w-0">
								<div class="font-medium">
									{$locationsById.get(b.locationId)?.name ?? 'Unknown location'}
								</div>
								<div class="mt-0.5 text-sm text-[rgb(var(--muted))]">
									{#if b.expiresAt}expires {b.expiresAt}{:else}no expiration date{/if}
								</div>
							</div>
							<div class="flex items-center gap-3">
								<div class="text-sm tabular-nums text-[rgb(var(--muted))]">{b.quantity} {b.unit}</div>
								<button
									type="button"
									class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/10"
									onclick={() => consumeBatch(b.id, 1)}
								>
									Use 1
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

