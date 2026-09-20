import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// DOM events stand in for trusted input; see workspace-journey.spec.ts for why.
const fixturePath = new URL('../../src/lib/fixtures/comparison-v1.json', import.meta.url);

test('swap exchanges two players in one template and flips the draft to unsaved', async ({
	page
}) => {
	await page.goto('/');
	const selects = page.getByLabel(/assigned player/);
	await expect(selects.first()).toBeVisible();
	const before = await selects.evaluateAll((els) =>
		els.map((el) => (el as HTMLSelectElement).value)
	);
	expect(before.length).toBeGreaterThan(1);

	const form = page.locator('form.swap').first();
	await form.locator('select[name="swap-a"]').selectOption({ index: 0 });
	await form.locator('select[name="swap-b"]').selectOption({ index: 1 });
	await form.getByRole('button', { name: 'Swap' }).dispatchEvent('click');

	await expect(page.locator('.notice-text')).toContainText('Draft changed locally');
	const after = await selects.evaluateAll((els) =>
		els.map((el) => (el as HTMLSelectElement).value)
	);
	expect(after[0]).toBe(before[1]);
	expect(after[1]).toBe(before[0]);
});

test('importing a valid bundle activates it; a malformed one leaves the workspace intact', async ({
	page
}) => {
	await page.goto('/');
	const input = page.locator('input[type="file"]');
	const heading = page.getByRole('heading', { level: 1 });
	const originalName = await heading.textContent();

	await input.setInputFiles({
		name: 'broken.json',
		mimeType: 'application/json',
		buffer: Buffer.from('{"not":"a bundle"}')
	});
	await expect(page.locator('.storage-pill')).toHaveAttribute('data-state', 'failed');
	await expect(page.locator('.notice-text')).toContainText('Import rejected');
	await expect(heading).toHaveText(originalName ?? '');

	await input.setInputFiles({
		name: 'comparison.json',
		mimeType: 'application/json',
		buffer: readFileSync(fixturePath)
	});
	await expect(page.locator('.storage-pill')).toHaveAttribute('data-state', 'saved');
	await expect(page.locator('.notice-text')).toContainText('Imported');
});
