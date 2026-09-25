import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SnapshotsPage from '../../src/lib/app/SnapshotsPage.svelte';
import { getStoryline } from '../../src/lib/storylines/registry';

// D-47: with no key configured the page shows the prompt and the roster and
// invents nothing. A call only happens after a person supplies a key and
// acknowledges external processing.
describe('SnapshotsPage', () => {
	const story = getStoryline('offseason-infield')!;

	it('shows the prompt, the roster, and the engine fit with no provider configured', async () => {
		await render(SnapshotsPage, { props: { story } });

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Snapshots: the prompt and its answers');
		await expect.element(page.getByText(/No key is set, so nothing has been sent/)).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Classify this player' })).toBeDisabled();
		await expect.element(page.getByText(/No answers yet/)).toBeVisible();

		await expect.element(page.getByRole('group', { name: /Roster case for/ })).toBeVisible();
		await expect.element(page.getByText(/^Engine total 52\.69416 runs/)).toBeVisible();
		await expect
			.element(page.getByText(/\+1\.991 against the lineup this scenario used/))
			.toBeVisible();
		await expect.element(page.getByText('Request body, exactly as it would be sent')).toBeVisible();
	});

	it('keeps the engine fit as the scenario changes and never calls the provider on its own', async () => {
		await render(SnapshotsPage, { props: { story } });

		await page.getByRole('button', { name: /No Contreras trade/ }).click();
		await expect.element(page.getByText(/^Engine total 52\.50346 runs/)).toBeVisible();
		// Candidate B's lineup gives up 5.7853 runs; the sign is shown, not implied.
		await expect
			.element(page.getByText(/\+5\.785 against the lineup this scenario used/))
			.toBeVisible();
		// Still nothing asked, and the roster analysis follows the scenario.
		await expect.element(page.getByText(/No answers yet/)).toBeVisible();
		await expect.element(page.getByText(/2 benched/)).toBeVisible();
	});
});
