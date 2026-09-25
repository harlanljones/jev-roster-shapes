import { expect, test, type Page } from '@playwright/test';
import { openFirstStoryline } from './storyline';

// Pointer drag-and-drop (D-20, D-33) covers the same Swap/Move commit path as
// the keyboard forms. Native HTML5 DnD is simulated with dispatched DragEvents
// carrying a DataTransfer, because this environment has no pointer to drag
// with; the app receives the same event sequence a real drag would produce.
async function dragRow(page: Page, from: number, to: number): Promise<void> {
	const card = page.locator('.template-card').first();
	const rows = card.locator('tbody tr');
	await rows.nth(from).evaluate((el) => {
		el.dispatchEvent(
			new DragEvent('dragstart', {
				bubbles: true,
				cancelable: true,
				dataTransfer: new DataTransfer()
			})
		);
	});
	await rows.nth(to).evaluate((el) => {
		el.dispatchEvent(
			new DragEvent('dragover', {
				bubbles: true,
				cancelable: true,
				dataTransfer: new DataTransfer()
			})
		);
	});
}

async function dropOn(page: Page, target: number): Promise<void> {
	await page
		.locator('.template-card')
		.first()
		.locator('tbody tr')
		.nth(target)
		.evaluate((el) => {
			el.dispatchEvent(
				new DragEvent('drop', {
					bubbles: true,
					cancelable: true,
					dataTransfer: new DataTransfer()
				})
			);
		});
}

test('dragging an assigned row onto an occupied slot swaps with a live preview', async ({
	page
}) => {
	await openFirstStoryline(page);
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();
	const card = page.locator('.template-card').first();
	const selects = page.getByLabel(/assigned player/);
	const before = await selects.evaluateAll((els) =>
		els.map((el) => (el as HTMLSelectElement).value)
	);

	await dragRow(page, 0, 1);
	await expect(card.locator('p.drop-preview')).toContainText('Drop to swap');
	await dropOn(page, 1);

	await expect(page.locator('.notice-text')).toContainText('Draft changed locally');
	const after = await selects.evaluateAll((els) =>
		els.map((el) => (el as HTMLSelectElement).value)
	);
	expect(after[0]).toBe(before[1]);
	expect(after[1]).toBe(before[0]);
});

test('dragging an assigned row onto an Unassigned slot moves with a live preview', async ({
	page
}) => {
	await openFirstStoryline(page);
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();
	const card = page.locator('.template-card').first();
	const selects = page.getByLabel(/assigned player/);

	await selects.first().evaluate((el) => {
		const select = el as HTMLSelectElement;
		select.value = '';
		select.dispatchEvent(new Event('change', { bubbles: true }));
	});

	await dragRow(page, 1, 0);
	await expect(card.locator('p.drop-preview')).toContainText('Drop to move');
	const before = await selects.evaluateAll((els) =>
		els.map((el) => (el as HTMLSelectElement).value)
	);
	await dropOn(page, 0);

	await expect(page.locator('.notice-text')).toContainText('Draft changed locally');
	const after = await selects.evaluateAll((els) =>
		els.map((el) => (el as HTMLSelectElement).value)
	);
	expect(after[0]).toBe(before[1]);
	expect(after[1]).toBe('');
});

test('dragging an Unassigned row starts no drag and changes nothing', async ({ page }) => {
	await openFirstStoryline(page);
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();
	const card = page.locator('.template-card').first();
	const selects = page.getByLabel(/assigned player/);

	await selects.first().evaluate((el) => {
		const select = el as HTMLSelectElement;
		select.value = '';
		select.dispatchEvent(new Event('change', { bubbles: true }));
	});
	await expect(page.locator('.notice-text')).toContainText('Draft changed locally');

	await dragRow(page, 0, 1);
	await expect(card.locator('p.drop-preview')).toBeHidden();
});
