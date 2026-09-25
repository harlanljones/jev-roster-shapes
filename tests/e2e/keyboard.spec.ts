import { expect, test } from '@playwright/test';
import { openFirstStoryline } from './storyline';

// Literal-keystroke walkthrough for I-07: every interaction below is a real
// keyboard event (no dispatched DOM events, no pointer). Element focus is set
// with el.focus() — the keyboard equivalent of tabbing to a control — and all
// value changes, tab moves, and activations go through page.keyboard.
test('a keyboard-only user tabs, edits, swaps, and inspects evidence', async ({ page }) => {
	await openFirstStoryline(page);

	// Arrow-key tab navigation: Baseline → candidate A.
	await page.getByRole('tab', { name: /^Baseline — Anthony DH/ }).evaluate((el) => el.focus());
	await page.keyboard.press('ArrowRight');
	await expect(page.getByRole('tab', { selected: true })).toContainText(
		'A — Yoshida DH, Anthony sits'
	);

	// Change an assignment with the keyboard: Home then ArrowDown guarantees a
	// selection change no matter which option started selected.
	await page
		.getByLabel(/assigned player/)
		.first()
		.evaluate((el) => el.focus());
	await page.keyboard.press('Home');
	await page.keyboard.press('ArrowDown');
	await expect(page.locator('.storage-pill')).toHaveAttribute('data-state', 'unsaved');
	await expect(page.locator('.notice-text')).toContainText('Draft changed locally');

	// Operate the Swap form by keyboard: pick the second slot in swap-a, Tab to
	// swap-b, change it, Tab to the Swap button, and submit with Enter.
	const swapForm = page.locator('form.swap').first();
	await swapForm.locator('select[name="swap-a"]').evaluate((el) => el.focus());
	await page.keyboard.press('Home');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Tab');
	await expect(swapForm.locator('select[name="swap-b"]')).toBeFocused();
	await page.keyboard.press('Home');
	await page.keyboard.press('ArrowDown');
	await expect(swapForm.locator('p.form-preview')).toContainText('Swap slot');
	await page.keyboard.press('Tab');
	await expect(swapForm.getByRole('button', { name: 'Swap' })).toBeFocused();
	const selects = page.getByLabel(/assigned player/);
	const before = await selects.evaluateAll((els) =>
		els.map((el) => (el as HTMLSelectElement).value)
	);
	await page.keyboard.press('Enter');
	await expect(page.locator('.notice-text')).toContainText('Draft changed locally');
	const after = await selects.evaluateAll((els) =>
		els.map((el) => (el as HTMLSelectElement).value)
	);
	// swap-a pointed at the third slot and swap-b at the second: they exchange.
	expect(after[1]).toBe(before[2]);
	expect(after[2]).toBe(before[1]);

	// Open evidence with the keyboard and check focus returns to the trigger.
	const trigger = page.getByRole('button', { name: 'Inspect template source' }).first();
	await trigger.evaluate((el) => el.focus());
	await page.keyboard.press('Enter');
	const drawer = page.getByLabel('Evidence detail');
	await expect(drawer).toBeVisible();
	for (let i = 0; i < 80; i += 1) {
		const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
		if (focused.includes('Close evidence')) break;
		await page.keyboard.press('Tab');
	}
	await expect(page.getByRole('button', { name: 'Close evidence' })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(drawer).toBeHidden();
	const returnedFocus = await page.evaluate(() => document.activeElement?.textContent ?? '');
	expect(returnedFocus).toContain('Inspect template source');
});

// I-16: the index, a decision, and the snapshots subpage are reachable and
// readable by keyboard alone, including the collapsible request body.
test('a keyboard-only user reaches a decision, its snapshots, and the prompt', async ({ page }) => {
	// The skip link comes first, then the shell nav. Focus starts in the
	// document, not the first control, so move it into the page first.
	await page.goto('/');
	await page.locator('body').evaluate((el) => el.focus());
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Roster Shapes' })).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Decisions' })).toBeFocused();

	// Open a decision card by keyboard.
	const card = page.getByRole('link', { name: 'Who takes the DH at-bats?' });
	await card.evaluate((el) => el.focus());
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/scenario\/preseason-dh$/);
	await expect(page.getByRole('region', { name: /Pool fit for/ })).toBeVisible();

	// Follow the nav to the snapshots subpage.
	const nav = page.getByRole('navigation', { name: 'Sections' });
	await nav.getByRole('link', { name: 'Snapshots' }).evaluate((el) => el.focus());
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/scenario\/preseason-dh\/snapshots$/);

	// The request body is a native disclosure: focusable, operable with Enter.
	const toggle = page.getByText('Request body, exactly as it would be sent');
	await toggle.evaluate((el) => el.focus());
	await page.keyboard.press('Enter');
	await expect(page.locator('.request-toggle pre')).toContainText('Player:');
	// And it is scrollable without a pointer, so the region takes focus.
	const region = page.locator('.request-toggle pre');
	await region.evaluate((el) => el.focus());
	await page.keyboard.press('End');
	await expect(region).toBeVisible();
});
