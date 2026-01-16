import { expect, test } from '@playwright/test';

test('app loads and can navigate', async ({ page }) => {
	page.on('console', async (msg) => {
		// Helpful when debugging CI/dev failures
		console.log(`[browser:${msg.type()}] ${msg.text()}`);
		if (msg.type() === 'error' || msg.type() === 'trace' || msg.type() === 'warning') {
			try {
				const values = await Promise.all(
					msg.args().map(async (a) => {
						try {
							return await a.jsonValue();
						} catch {
							return '[unserializable]';
						}
					})
				);
				console.log(`[browser:${msg.type()}:args]`, values);
			} catch {
				// ignore
			}
		}
	});
	page.on('pageerror', (err) => {
		console.log(`[browser:error] ${err.message}\n${err.stack ?? ''}`);
	});

	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

	await page.getByRole('navigation').getByRole('link', { name: 'Inventory', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();

	await page.getByRole('button', { name: 'Add item' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();

	await page.getByLabel('Product name').fill('Milk');
	await page.getByRole('button', { name: 'Add', exact: true }).click();

	// Item should appear in list.
	await expect(page.getByRole('link', { name: 'Milk' })).toBeVisible();
});

