import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LibraryPage from '../../src/lib/app/LibraryPage.svelte';

// D-40, D-43, D-50: a decision opens on its one diagram, the board.
// D-63: the workspace has its own URL, whose gate asks for the D-36 public acknowledgment.
describe('LibraryPage', () => {
	it('paints the board and links to its workspace', async () => {
		await render(LibraryPage, { props: {} });

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

		await expect
			.element(page.getByRole('link', { name: 'Open workspace' }))
			.toHaveAttribute('href', '/decisions/offseason-infield/compare');
	});
});
