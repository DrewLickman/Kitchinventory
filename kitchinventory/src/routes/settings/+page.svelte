<script lang="ts">
	import { browser } from '$app/environment';
	import { exportBackup, restoreBackup } from '$lib/db/backup';
	import { downloadJson, readJsonFile } from '$lib/device/files';
	import { seedExampleData } from '$lib/usecases/seedExampleData';

	let busy = false;
	let message: { type: 'ok' | 'err'; text: string } | null = null;

	async function doExport() {
		setMessage(null);
		busy = true;
		try {
			const backup = await exportBackup();
			downloadJson(`kitchinventory-backup-${backup.exportedAt}.json`, backup);
			setMessage({ type: 'ok', text: 'Backup exported.' });
		} catch (e) {
			setMessage({ type: 'err', text: e instanceof Error ? e.message : String(e) });
		} finally {
			busy = false;
		}
	}

	async function doRestore(file: File) {
		setMessage(null);
		busy = true;
		try {
			const raw = await readJsonFile(file);
			await restoreBackup(raw);
			setMessage({ type: 'ok', text: 'Backup restored.' });
		} catch (e) {
			setMessage({ type: 'err', text: e instanceof Error ? e.message : String(e) });
		} finally {
			busy = false;
		}
	}

	function setMessage(next: typeof message) {
		message = next;
	}

	async function loadExampleData() {
		setMessage(null);
		busy = true;
		try {
			const { addedProducts, addedBatches } = await seedExampleData();
			setMessage({
				type: 'ok',
				text: `Loaded example data: ${addedProducts} products, ${addedBatches} batches.`
			});
		} catch (e) {
			setMessage({ type: 'err', text: e instanceof Error ? e.message : String(e) });
		} finally {
			busy = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
		<p class="mt-1 text-sm text-[rgb(var(--muted))]">Backup and restore your local data.</p>
	</div>

	{#if !browser}
		<div class="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[rgb(var(--muted))]">
			Settings are available in the browser.
		</div>
	{:else}
		<div class="rounded-xl border border-white/10 bg-white/5 p-4">
			<h2 class="text-base font-semibold">Example data</h2>
			<p class="mt-1 text-sm text-[rgb(var(--muted))]">
				Adds a handful of sample products and inventory batches so you can click around.
			</p>
			<div class="mt-3">
				<button
					type="button"
					class="rounded-md bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-50"
					disabled={busy}
					on:click={loadExampleData}
				>
					Load example data
				</button>
			</div>
		</div>

		<div class="rounded-xl border border-white/10 bg-white/5 p-4">
			<h2 class="text-base font-semibold">Backup</h2>
			<p class="mt-1 text-sm text-[rgb(var(--muted))]">
				Exports a JSON file you can store anywhere.
			</p>
			<div class="mt-3">
				<button
					type="button"
					class="rounded-md bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
					disabled={busy}
					on:click={doExport}
				>
					Export backup
				</button>
			</div>
		</div>

		<div class="rounded-xl border border-white/10 bg-white/5 p-4">
			<h2 class="text-base font-semibold">Restore</h2>
			<p class="mt-1 text-sm text-[rgb(var(--muted))]">
				Restoring overwrites your current local data.
			</p>
			<div class="mt-3">
				<label class="block">
					<input
						type="file"
						accept="application/json,.json"
						disabled={busy}
						on:change={(e) => {
							const input = e.currentTarget;
							const file = input.files?.[0];
							if (!file) return;
							void doRestore(file);
							input.value = '';
						}}
					/>
				</label>
			</div>
		</div>

		{#if message}
			<div
				class="rounded-xl border border-white/10 p-4 text-sm
					{message.type === 'ok' ? 'bg-[rgba(76,175,80,0.12)]' : 'bg-[rgba(244,67,54,0.12)]'}"
			>
				{message.text}
			</div>
		{/if}
	{/if}
</div>

