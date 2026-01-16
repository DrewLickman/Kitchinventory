<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { scanFromVideoElement } from '$lib/device/barcode';
	import { findProductIdForBarcode, mapBarcodeToProduct } from '$lib/usecases/mapBarcode';
	import { getDb } from '$lib/db/index';
	import { newId } from '$lib/db/ids';
	import { nowIso, todayIsoDate } from '$lib/db/time';
	import type { Location, Unit } from '$lib/db/schema';

	let videoEl: HTMLVideoElement | null = null;
	let stopScan: null | (() => void) = null;

	let error: string | null = null;
	let lastCode: string | null = null;
	let lastFormat: string | undefined;

	const unit: Unit = 'count';
	let quantity = 1;
	let expiresAt = '';

	let locations: Location[] = [];
	let locationId = '';

	let step: 'scanning' | 'known' | 'unknown' = 'scanning';
	let productName = '';

	onMount(() => {
		if (!browser) return;
		void init();
		return () => {
			stopScan?.();
			stopScan = null;
		};
	});

	async function init() {
		error = null;
		step = 'scanning';
		lastCode = null;

		const db = getDb();
		locations = await db.locations.orderBy('sortOrder').toArray();
		locationId = locations[0]?.id ?? '';

		if (!videoEl) return;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
				audio: false
			});
			videoEl.srcObject = stream;
			await videoEl.play();

			stopScan = await scanFromVideoElement(videoEl, (res) => {
				if (lastCode === res.code) return;
				lastCode = res.code;
				lastFormat = res.format;
				void handleCode(res.code);
			});
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	async function handleCode(code: string) {
		const productId = await findProductIdForBarcode(code);
		if (productId) {
			step = 'known';
			return;
		}
		step = 'unknown';
	}

	async function addKnownBatch() {
		if (!lastCode) return;
		if (!locationId) return;
		const db = getDb();
		const productId = await findProductIdForBarcode(lastCode);
		if (!productId) {
			step = 'unknown';
			return;
		}

		const now = nowIso();
		await db.batches.add({
			id: newId('bat'),
			productId,
			locationId,
			quantity: Number(quantity) || 1,
			unit,
			quantityState: 'unknown',
			purchasedAt: todayIsoDate(),
			expiresAt: expiresAt || undefined,
			createdAt: now,
			updatedAt: now
		});

		step = 'scanning';
	}

	async function createProductAndBind() {
		if (!lastCode) return;
		if (!locationId) return;
		const name = productName.trim();
		if (!name) return;

		const db = getDb();
		const now = nowIso();
		const productId = newId('prd');
		await db.products.add({
			id: productId,
			name,
			searchName: name.toLowerCase(),
			defaultUnit: unit,
			createdAt: now,
			updatedAt: now
		});

		await mapBarcodeToProduct(lastCode, productId, lastFormat);

		await db.batches.add({
			id: newId('bat'),
			productId,
			locationId,
			quantity: Number(quantity) || 1,
			unit,
			quantityState: 'unknown',
			purchasedAt: todayIsoDate(),
			expiresAt: expiresAt || undefined,
			createdAt: now,
			updatedAt: now
		});

		productName = '';
		step = 'scanning';
	}

	function reset() {
		productName = '';
		expiresAt = '';
		quantity = 1;
		step = 'scanning';
		error = null;
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Scan</h1>
			<p class="mt-1 text-sm text-[rgb(var(--muted))]">Scan a barcode to add inventory faster.</p>
		</div>
		<button
			type="button"
			class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
			onclick={() => init()}
		>
			Restart camera
		</button>
	</div>

	{#if !browser}
		<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-[rgb(var(--muted))]">
			Barcode scanning is available in the browser.
		</div>
	{:else}
		{#if error}
			<div class="rounded-xl border border-white/10 bg-[rgba(244,67,54,0.12)] p-4 text-sm">
				<div class="font-semibold">Camera error</div>
				<div class="mt-1 text-[rgb(var(--muted))]">{error}</div>
			</div>
		{/if}

		<div class="grid gap-4 lg:grid-cols-2">
			<div class="overflow-hidden rounded-xl border border-white/10 bg-white/5">
				<video bind:this={videoEl} class="aspect-video w-full bg-black" playsinline muted></video>
				<div class="border-t border-white/10 px-4 py-3 text-sm text-[rgb(var(--muted))]">
					{#if lastCode}
						Last scan: <span class="font-mono text-white">{lastCode}</span>
					{:else}
						Point your camera at a barcode.
					{/if}
				</div>
			</div>

			<div class="space-y-3">
				<div class="rounded-xl border border-white/10 bg-white/5 p-4">
					<h2 class="text-base font-semibold">Batch details</h2>
					<div class="mt-3 grid gap-3 sm:grid-cols-2">
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
							<input
								class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-[rgb(var(--muted))]"
								value={unit}
								readonly
							/>
						</label>
						<label class="grid gap-1 sm:col-span-2">
							<span class="text-sm text-[rgb(var(--muted))]">Location</span>
							<select
								class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
								bind:value={locationId}
							>
								{#each locations as loc (loc.id)}
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
					<div class="mt-3 flex justify-end">
						<button
							type="button"
							class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
							onclick={reset}
						>
							Clear
						</button>
					</div>
				</div>

				{#if step === 'known'}
					<div class="rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 class="text-base font-semibold">Known barcode</h2>
						<p class="mt-1 text-sm text-[rgb(var(--muted))]">This barcode is already mapped.</p>
						<div class="mt-3 flex justify-end">
							<button
								type="button"
								class="rounded-md bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
								disabled={!lastCode || !locationId}
								onclick={addKnownBatch}
							>
								Add to inventory
							</button>
						</div>
					</div>
				{:else if step === 'unknown'}
					<div class="rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 class="text-base font-semibold">Unknown barcode</h2>
						<p class="mt-1 text-sm text-[rgb(var(--muted))]">
							Name this product once and we’ll remember it next time.
						</p>
						<div class="mt-3 grid gap-3">
							<label class="grid gap-1">
								<span class="text-sm text-[rgb(var(--muted))]">Product name</span>
								<input
									class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
									placeholder="e.g., Pasta sauce"
									bind:value={productName}
								/>
							</label>
						</div>
						<div class="mt-3 flex justify-end">
							<button
								type="button"
								class="rounded-md bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
								disabled={!lastCode || !locationId || !productName.trim()}
								onclick={createProductAndBind}
							>
								Create & add
							</button>
						</div>
					</div>
				{:else}
					<div class="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[rgb(var(--muted))]">
						Scan a barcode to begin.
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

