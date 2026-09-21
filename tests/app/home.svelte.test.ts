import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LibraryPage from '../../src/lib/app/LibraryPage.svelte';

// D-40: the web servers open on the library — the roster-and-shapes graphic
// plus five storyline cards. Opening a card asks for the D-36 public
// acknowledgment once per storyline, then hands the bundle to the workspace.
describe('LibraryPage', () => {
	it('paints the roster graphic and opens a storyline after acknowledgment', async () => {
		const onOpen = vi.fn();
		await render(LibraryPage, { props: { onOpen } });

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Five 2026 storylines');
		await expect
			.element(page.getByRole('group', { name: 'Choose the storyline roster' }))
			.toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Power vacuum' })).toBeVisible();
		await expect.element(page.getByText('Public data', { exact: true })).toBeVisible();

		await page.getByRole('button', { name: 'Open storyline: Power vacuum' }).click();
		await expect.element(page.getByRole('button', { name: 'Open public bundle' })).toBeVisible();

		await page.getByRole('button', { name: 'Open public bundle' }).click();
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onOpen.mock.calls[0]?.[0]).toMatchObject({
			bundleId: 'mlbam-bos-2026-power-vacuum'
		});
	});

	it('keeps browsing when the acknowledgment is declined', async () => {
		const onOpen = vi.fn();
		await render(LibraryPage, { props: { onOpen } });

		await page.getByRole('button', { name: 'Open storyline: Lefty hole' }).click();
		await expect.element(page.getByRole('button', { name: 'Open public bundle' })).toBeVisible();
		await page.getByRole('button', { name: 'Keep browsing' }).click();

		expect(onOpen).not.toHaveBeenCalled();
		await expect
			.element(page.getByRole('button', { name: 'Open public bundle' }))
			.not.toBeVisible();
	});
});
