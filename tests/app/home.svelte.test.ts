import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LibraryPage from '../../src/lib/app/LibraryPage.svelte';

// D-40, D-43, D-50: a decision opens on its one diagram, the board.
// Opening the workspace asks for the D-36 public acknowledgment, then hands
// the bundle over.
describe('LibraryPage', () => {
	it('paints the board and opens a storyline after acknowledgment', async () => {
		const onOpen = vi.fn();
		await render(LibraryPage, { props: { onOpen } });

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('How do you replace Bregman?');
		const timeline = page.getByRole('navigation', { name: 'Season timeline' });
		await expect.element(timeline).toBeVisible();
		await expect
			.element(timeline.getByRole('link', { name: /Offseason IF/ }))
			.toHaveAttribute('aria-current', 'page');
		expect(timeline.getByRole('link').elements()).toHaveLength(8);
		await expect.element(page.getByRole('group', { name: /Roster board for/ })).toBeVisible();
		await expect.element(page.getByText('Public data', { exact: true })).toBeVisible();

		await page.getByRole('button', { name: 'Open workspace' }).click();
		await page.getByRole('button', { name: 'Open public scenario' }).click();
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onOpen.mock.calls[0]?.[0]).toMatchObject({
			bundleId: 'mlbam-bos-2026-offseason-infield'
		});
	});

	it('keeps browsing when the acknowledgment is declined', async () => {
		const onOpen = vi.fn();
		await render(LibraryPage, { props: { onOpen, activeSlug: 'wild-card-roster' } });

		await page.getByRole('button', { name: 'Open workspace' }).click();
		await expect.element(page.getByRole('button', { name: 'Open public scenario' })).toBeVisible();
		await page.getByRole('button', { name: 'Keep browsing' }).click();

		expect(onOpen).not.toHaveBeenCalled();
		await expect
			.element(page.getByRole('button', { name: 'Open public scenario' }))
			.not.toBeInTheDocument();
	});
});
