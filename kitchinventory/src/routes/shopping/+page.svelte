<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { clientLiveQuery } from '$lib/stores/liveQuery';
	import { getDb } from '$lib/db/index';
	import type { ShoppingListItem } from '$lib/db/schema';
	import { addShoppingItem, deleteShoppingItem, ensureDefaultShoppingList, toggleShoppingItemChecked } from '$lib/usecases/shopping';
	import { getShoppingSuggestions } from '$lib/usecases/suggestions';

	let listId = '';
	let newItem = '';
	let busy = false;
	let error: string | null = null;

	onMount(() => {
		if (!browser) return;
		void init();
	});

	async function init() {
		error = null;
		try {
			listId = await ensureDefaultShoppingList();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	const items = clientLiveQuery(async () => {
		if (!listId) return [];
		const db = getDb();
		const all = await db.shoppingListItems.where('listId').equals(listId).toArray();
		return all.sort((a, b) => Number(a.checked) - Number(b.checked) || a.createdAt.localeCompare(b.createdAt));
	}, [] as ShoppingListItem[]);

	const suggestions = clientLiveQuery(async () => {
		if (!listId) return [];
		return getShoppingSuggestions();
	}, []);

	async function addManual() {
		const label = newItem.trim();
		if (!label || !listId) return;
		busy = true;
		error = null;
		try {
			await addShoppingItem({ listId, label });
			newItem = '';
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function addSuggestion(productId: string, label: string) {
		if (!listId) return;
		busy = true;
		error = null;
		try {
			await addShoppingItem({ listId, label, productId });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function addAllSuggestions() {
		if (!listId) return;
		busy = true;
		error = null;
		try {
			for (const s of $suggestions) {
				await addShoppingItem({ listId, label: s.label, productId: s.productId });
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Shopping</h1>
			<p class="mt-1 text-sm text-[rgb(var(--muted))]">Your grocery list (offline-first).</p>
		</div>
	</div>

	{#if !browser}
		<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-[rgb(var(--muted))]">
			Shopping lists are available in the browser.
		</div>
	{:else if error}
		<div class="rounded-xl border border-white/10 bg-[rgba(244,67,54,0.12)] p-4 text-sm">{error}</div>
	{:else}
		<div class="rounded-xl border border-white/10 bg-white/5 p-4">
			<div class="flex flex-wrap gap-2">
				<input
					class="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/20 sm:w-96"
					placeholder="Add an item…"
					bind:value={newItem}
					onkeydown={(e) => {
						if (e.key === 'Enter') void addManual();
					}}
				/>
				<button
					type="button"
					class="rounded-md bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
					disabled={!newItem.trim() || busy}
					onclick={addManual}
				>
					Add
				</button>
			</div>
		</div>

		<div class="overflow-hidden rounded-xl border border-white/10 bg-white/5">
			<div class="border-b border-white/10 px-4 py-3 text-sm font-semibold">Groceries</div>
			{#if $items.length === 0}
				<div class="px-4 py-6 text-sm text-[rgb(var(--muted))]">Your list is empty.</div>
			{:else}
				<ul class="divide-y divide-white/10">
					{#each $items as item (item.id)}
						<li class="flex items-center justify-between gap-3 px-4 py-3">
							<label class="flex min-w-0 items-center gap-3">
								<input
									type="checkbox"
									checked={item.checked}
									onchange={(e) => toggleShoppingItemChecked(item.id, e.currentTarget.checked)}
								/>
								<span class="truncate {item.checked ? 'line-through text-white/50' : ''}">
									{item.label}
								</span>
							</label>
							<button
								type="button"
								class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/10"
								onclick={() => deleteShoppingItem(item.id)}
							>
								Delete
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="overflow-hidden rounded-xl border border-white/10 bg-white/5">
			<div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
				<div>
					<div class="text-sm font-semibold">Suggestions</div>
					<div class="text-xs text-[rgb(var(--muted))]">Based on low/out-of-stock items</div>
				</div>
				<button
					type="button"
					class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/10 disabled:opacity-50"
					disabled={$suggestions.length === 0 || busy}
					onclick={addAllSuggestions}
				>
					Add all
				</button>
			</div>

			{#if $suggestions.length === 0}
				<div class="px-4 py-6 text-sm text-[rgb(var(--muted))]">No suggestions right now.</div>
			{:else}
				<ul class="divide-y divide-white/10">
					{#each $suggestions as s (s.productId)}
						<li class="flex items-center justify-between gap-3 px-4 py-3">
							<div class="min-w-0">
								<div class="truncate font-medium">{s.label}</div>
								<div class="mt-0.5 text-sm text-[rgb(var(--muted))]">
									{#if s.reason === 'out_of_stock'}
										Out of stock
									{:else}
										Low stock ({s.totalQty} {s.unit})
									{/if}
								</div>
							</div>
							<button
								type="button"
								class="rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-medium hover:bg-white/15 disabled:opacity-50"
								disabled={busy}
								onclick={() => addSuggestion(s.productId, s.label)}
							>
								Add
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

