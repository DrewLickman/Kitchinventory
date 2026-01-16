/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Images: cache-first with a small LRU.
registerRoute(
	({ request }) => request.destination === 'image',
	new CacheFirst({
		cacheName: 'images',
		plugins: [
			new CacheableResponsePlugin({ statuses: [0, 200] }),
			new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })
		]
	})
);

// Documents/navigation: network-first with offline fallback to precached shell.
registerRoute(
	({ request }) => request.mode === 'navigate',
	new NetworkFirst({
		cacheName: 'pages',
		networkTimeoutSeconds: 3,
		plugins: [new CacheableResponsePlugin({ statuses: [200] })]
	})
);

