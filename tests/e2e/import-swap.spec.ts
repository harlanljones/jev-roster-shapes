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

test('importing a changed bundle under a saved ID offers replace-as-new-revision', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();

	// Save the fixture first so the edited re-import hits the duplicate-ID path.
	await page.getByRole('button', { name: 'Save draft' }).dispatchEvent('click');
	await expect(page.locator('.storage-pill')).toHaveAttribute('data-state', 'saved');

	const edited = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
		bundleId: string;
		dataset: { players: { id: string; name: string }[] };
	};
	const renamed = 'Renamed Demo Player';
	const firstPlayer = edited.dataset.players[0];
	if (!firstPlayer) throw new Error('fixture has no players');
	firstPlayer.name = renamed;

	await page.locator('input[type="file"]').setInputFiles({
		name: 'comparison-edited.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(edited))
	});
	await expect(page.locator('.notice-text')).toContainText(
		`A saved comparison with ID ${edited.bundleId} already exists`
	);
	const replaceButton = page.getByRole('button', { name: 'Replace as new revision' });
	await expect(replaceButton).toBeVisible();

	await replaceButton.dispatchEvent('click');
	await expect(page.locator('.storage-pill')).toHaveAttribute('data-state', 'saved');
	await expect(page.locator('.notice-text')).toContainText('Imported');
	await expect(page.getByRole('option', { name: renamed }).first()).toBeAttached();
});

test('move relocates one player into an unassigned slot and shows a live preview', async ({
	page
}) => {
	await page.goto('/');
	const selects = page.getByLabel(/assigned player/);
	await expect(selects.first()).toBeVisible();

	// Clear the first slot of the first template to create a Move destination.
	await selects.first().evaluate((el) => {
		const select = el as HTMLSelectElement;
		select.value = '';
		select.dispatchEvent(new Event('change', { bubbles: true }));
	});
	await expect(page.locator('.notice-text')).toContainText('Draft changed locally');

	const moveForm = page.locator('form.swap').nth(1);
	// From the second slot (assigned) to the first slot (now Unassigned).
	await moveForm.locator('select[name="move-from"]').selectOption({ index: 1 });
	await moveForm.locator('select[name="move-to"]').selectOption({ index: 0 });
	await expect(moveForm.locator('p.form-preview')).toContainText('becomes Unassigned');
	await expect(moveForm.getByRole('button', { name: 'Move' })).toBeEnabled();

	const before = await selects.evaluateAll((els) =>
		els.map((el) => (el as HTMLSelectElement).value)
	);
	await moveForm.getByRole('button', { name: 'Move' }).dispatchEvent('click');
	await expect(page.locator('.notice-text')).toContainText('Draft changed locally');
	const after = await selects.evaluateAll((els) =>
		els.map((el) => (el as HTMLSelectElement).value)
	);
	expect(after[0]).toBe(before[1]);
	expect(after[1]).toBe('');
});
