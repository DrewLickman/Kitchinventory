<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();

	const nav = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/inventory', label: 'Inventory' },
		{ href: '/locations', label: 'Locations' },
		{ href: '/shopping', label: 'Shopping' },
		{ href: '/scan', label: 'Scan' },
		{ href: '/settings', label: 'Settings' }
	] as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-dvh">
	<header class="sticky top-0 z-10 border-b border-white/10 bg-[rgb(var(--bg))]/90 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
			<a href="/" class="flex items-center gap-2 no-underline">
				<span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold"
					>K</span
				>
				<span class="text-base font-semibold tracking-tight">Kitchinventory</span>
			</a>

			<nav class="flex flex-wrap items-center justify-end gap-2 text-sm">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="rounded-md px-2.5 py-1.5 no-underline transition
							{($page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/'))
								? 'bg-white/10 text-white'
								: 'text-[rgb(var(--muted))] hover:bg-white/5 hover:text-white'}"
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-6">
		{@render children()}
	</main>
</div>
