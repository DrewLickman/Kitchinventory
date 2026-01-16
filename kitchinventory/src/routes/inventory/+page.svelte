<script lang="ts">
	import { browser } from '$app/environment';
	import { liveQuery } from 'dexie';
	import { fromObservable } from '$lib/stores/liveQuery';
	import { getDb } from '$lib/db/index';
	import type { InventoryBatch, Location, Product, Unit } from '$lib/db/schema';
	import { addItem as addItemUsecase } from '$lib/usecases/addItem';
	import { consumeBatch } from '$lib/usecases/consumeBatch';

	type InventoryRow = {
		batch: InventoryBatch;
		product: Product | null;
		location: Location | null;
	};

	const rows = browser
		? fromObservable(
				liveQuery(async () => {
					const db = getDb();
					const batches = await db.batches.orderBy('updatedAt').reverse().toArray();
					const productIds = [...new Set(batches.map((b) => b.productId))];
					const locationIds = [...new Set(batches.map((b) => b.locationId))];
					const [products, locations] = await Promise.all([
						db.products.bulkGet(productIds),
						db.locations.bulkGet(locationIds)
					]);
					const productById = new Map(products.filter(Boolean).map((p) => [p!.id, p!]));
					const locationById = new Map(locations.filter(Boolean).map((l) => [l!.id, l!]));

					return batches.map((batch) => ({
						batch,
						product: productById.get(batch.productId) ?? null,
						location: locationById.get(batch.locationId) ?? null
					})) satisfies InventoryRow[];
				}),
				[] as InventoryRow[]
			)
		: fromObservable(liveQuery(async () => [] as InventoryRow[]), []);

	const locations = browser
		? fromObservable(
				liveQuery(async () => {
					const db = getDb();
					return db.locations.orderBy('sortOrder').toArray();
				}),
				[] as Location[]
			)
		: fromObservable(liveQuery(async () => [] as Location[]), []);

	let query = '';
	let locationFilter = 'all';

	let isAddOpen = false;
	let productName = '';
	let brand = '';
	let category = '';
	let unit: Unit = 'count';
	let quantity = 1;
	let locationId = '';
	let expiresAt = '';

	$: filtered = $rows.filter((r) => {
		const name = (r.product?.name ?? '').toLowerCase();
		const q = query.trim().toLowerCase();
		const matchesQuery = q ? name.includes(q) : true;
		const matchesLocation = locationFilter === 'all' ? true : r.batch.locationId === locationFilter;
		return matchesQuery && matchesLocation;
	});

	function openAdd() {
		isAddOpen = true;
		productName = '';
		brand = '';
		category = '';
		unit = 'count';
		quantity = 1;
		expiresAt = '';
		locationId = $locations[0]?.id ?? '';
	}

	async function submitAddItem() {
		await addItemUsecase({
			productName,
			brand,
			category,
			unit,
			quantity,
			locationId,
			expiresAt: expiresAt || undefined
		});
		isAddOpen = false;
	}

	async function consume(batchId: string) {
		await consumeBatch(batchId, 1);
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Inventory</h1>
			<p class="mt-1 text-sm text-[rgb(var(--muted))]">Batches you currently have on hand.</p>
		</div>
		<button
			type="button"
			class="rounded-md bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-black hover:brightness-110"
			onclick={openAdd}
		>
			Add item
		</button>
	</div>

	<div class="flex flex-wrap gap-2">
		<input
			class="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/20 sm:w-80"
			placeholder="Search products…"
			bind:value={query}
		/>
		<select
			class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
			bind:value={locationFilter}
		>
			<option value="all">All locations</option>
			{#each $locations as loc (loc.id)}
				<option value={loc.id}>{loc.name}</option>
			{/each}
		</select>
	</div>

	{#if filtered.length === 0}
		<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-[rgb(var(--muted))]">
			No inventory yet.
		</div>
	{:else}
		<ul class="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
			{#each filtered as row (row.batch.id)}
				<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div class="min-w-0">
						<a
							href={row.product ? `/inventory/product/${row.product.id}` : '/inventory'}
							class="truncate font-medium no-underline hover:underline"
						>
							{row.product?.name ?? 'Unknown product'}
						</a>
						<div class="mt-0.5 text-sm text-[rgb(var(--muted))]">
							{row.location?.name ?? 'Unknown location'}
							{#if row.batch.expiresAt}
								• expires {row.batch.expiresAt}
							{/if}
						</div>
					</div>

					<div class="flex items-center gap-3">
						<div class="text-sm tabular-nums text-[rgb(var(--muted))]">
							{row.batch.quantity} {row.batch.unit}
						</div>
						<button
							type="button"
							class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/10"
							onclick={() => consume(row.batch.id)}
						>
							Use 1
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if isAddOpen}
	<div
		class="fixed inset-0 z-20 grid place-items-center bg-black/70 p-4"
		role="button"
		tabindex="0"
		aria-label="Close dialog"
		onclick={(e) => {
			if (e.currentTarget === e.target) isAddOpen = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') isAddOpen = false;
		}}
	>
		<div
			class="w-full max-w-lg rounded-xl border border-white/10 bg-[rgb(var(--surface))] p-4"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="flex items-start justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold">Add item</h2>
					<p class="mt-0.5 text-sm text-[rgb(var(--muted))]">
						Create a product and add a batch to your inventory.
					</p>
				</div>
				<button
					type="button"
					class="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm hover:bg-white/10"
					onclick={() => (isAddOpen = false)}
				>
					Close
				</button>
			</div>

			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				<label class="grid gap-1 sm:col-span-2">
					<span class="text-sm text-[rgb(var(--muted))]">Product name</span>
					<input
						class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
						placeholder="e.g., Milk"
						bind:value={productName}
					/>
				</label>

				<label class="grid gap-1">
					<span class="text-sm text-[rgb(var(--muted))]">Brand</span>
					<input
						class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
						placeholder="Optional"
						bind:value={brand}
					/>
				</label>

				<label class="grid gap-1">
					<span class="text-sm text-[rgb(var(--muted))]">Category</span>
					<input
						class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
						placeholder="Optional"
						bind:value={category}
					/>
				</label>

				<label class="grid gap-1">
					<span class="text-sm text-[rgb(var(--muted))]">Quantity</span>
					<input
						type="number"
						min="0.01"
						step="0.01"
						class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
						bind:value={quantity}
					/>
				</label>

				<label class="grid gap-1">
					<span class="text-sm text-[rgb(var(--muted))]">Unit</span>
					<select
						class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
						bind:value={unit}
					>
						<option value="count">count</option>
						<option value="grams">grams</option>
						<option value="ml">ml</option>
					</select>
				</label>

				<label class="grid gap-1 sm:col-span-2">
					<span class="text-sm text-[rgb(var(--muted))]">Location</span>
					<select
						class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
						bind:value={locationId}
					>
						{#each $locations as loc (loc.id)}
							<option value={loc.id}>{loc.name}</option>
						{/each}
					</select>
				</label>

				<label class="grid gap-1 sm:col-span-2">
					<span class="text-sm text-[rgb(var(--muted))]">Expiration date</span>
					<input
						type="date"
						class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
						bind:value={expiresAt}
					/>
				</label>
			</div>

			<div class="mt-4 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
					onclick={() => (isAddOpen = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
					disabled={!productName.trim() || !locationId}
					onclick={submitAddItem}
				>
					Add
				</button>
			</div>
		</div>
	</div>
{/if}

