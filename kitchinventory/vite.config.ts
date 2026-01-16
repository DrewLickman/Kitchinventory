import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		SvelteKitPWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			registerType: 'autoUpdate',
			injectRegister: null,
			// Override default patterns to avoid referencing missing `prerendered/` output.
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webmanifest,json}']
			},
			manifest: {
				name: 'Kitchinventory',
				short_name: 'Kitchinventory',
				description: 'Offline-first kitchen inventory management',
				theme_color: '#0f0f12',
				background_color: '#0f0f12',
				display: 'standalone',
				start_url: '/',
				scope: '/',
				icons: [
					{ src: '/icons/icon.svg', sizes: '512x512', type: 'image/svg+xml' }
				]
			},
			devOptions: {
				enabled: false
			}
		}),
		sveltekit()
	]
});
