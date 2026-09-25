import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DecisionsPage from '../../src/lib/app/DecisionsPage.svelte';
import { todayIso } from '../../src/lib/app/season-timeline';

// D-46: the index is the timeline with today marked plus one card per decision.
describe('DecisionsPage', () => {
	it('marks today on the timeline and links each decision to its own page', async () => {
		await render(DecisionsPage, { props: { today: '2026-09-25' } });

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Five roster decisions on one season timeline');
		await expect
			.element(page.getByText(/Today is September 25 · Boston 85–74 on the timeline/))
			.toBeVisible();
		await expect
			.element(page.getByRole('img', { name: /today, September 25, 85–74/ }))
			.toBeVisible();

		const links = page.getByRole('link');
		await expect
			.element(links.filter({ hasText: 'Who takes the DH at-bats?' }))
			.toHaveAttribute('href', '/scenario/preseason-dh');
		await expect
			.element(links.filter({ hasText: 'The lineup going into October' }))
			.toHaveAttribute('href', '/scenario/october-lineup');
		// Five timeline pins plus five decision cards, and nothing else links out.
		expect(
			page.getByRole('navigation', { name: 'Season timeline' }).getByRole('link').elements()
		).toHaveLength(5);
		expect(links.elements()).toHaveLength(10);
	});

	it('says so when today falls outside the season window', async () => {
		await render(DecisionsPage, { props: { today: '2026-11-02' } });

		await expect
			.element(page.getByText(/outside the February–October window this timeline covers/))
			.toBeVisible();
		// The timeline uses the same date the lede does, not the viewer's today.
		await expect
			.element(page.getByText(/Today is November 2 · Boston 85–74 on the timeline/))
			.toBeVisible();
		expect.element(page.getByRole('img', { name: /past the end of this timeline window/ }));
	});

	it('defaults to the viewer own today when no date is supplied', () => {
		// Late evening UTC can already be tomorrow in the viewer own timezone.
		expect(todayIso(new Date('2026-09-25T23:30:00Z'))).toMatch(/^2026-09-2[45]$/);
	});
});
