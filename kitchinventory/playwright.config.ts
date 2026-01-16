import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'tests-e2e',
	timeout: 60_000,
	use: {
		baseURL: 'http://127.0.0.1:4173'
	},
	webServer: {
		// Use dev server for smoke tests (no adapter needed).
		command: 'npm run dev:test',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: true,
		timeout: 120_000
	}
});

