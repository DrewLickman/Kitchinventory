<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

	const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
		onRegisterError(error: unknown) {
			console.error('SW registration error', error);
		}
	});

	function close() {
		offlineReady.set(false);
		needRefresh.set(false);
	}
</script>

{#if $offlineReady || $needRefresh}
	<div class="fixed bottom-4 left-1/2 z-50 w-[min(560px,calc(100%-2rem))] -translate-x-1/2">
		<div class="rounded-xl border border-white/10 bg-[rgb(var(--surface))] p-4 shadow-xl">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="min-w-0">
					{#if $offlineReady}
						<div class="font-semibold">Ready offline</div>
						<div class="mt-0.5 text-sm text-[rgb(var(--muted))]">
							Kitchinventory is cached and can run without a network connection.
						</div>
					{:else}
						<div class="font-semibold">Update available</div>
						<div class="mt-0.5 text-sm text-[rgb(var(--muted))]">
							New content is available. Reload to update.
						</div>
					{/if}
				</div>

				<div class="flex gap-2">
					{#if $needRefresh}
						<button
							type="button"
							class="rounded-md bg-[rgb(var(--accent))] px-3 py-2 text-sm font-semibold text-black hover:brightness-110"
							onclick={() => updateServiceWorker(true)}
						>
							Reload
						</button>
					{/if}
					<button
						type="button"
						class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
						onclick={close}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

