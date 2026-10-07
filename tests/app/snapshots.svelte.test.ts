import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SnapshotsPage from '../../src/lib/app/SnapshotsPage.svelte';
import { getStoryline } from '../../src/lib/storylines/registry';

// D-47, D-58: the page shows the prompt and the roster and invents nothing. Jev
// is asked from CI, so the page has no key field, no acknowledgment and no ask
// button, and it shows only recorded answers.
describe('SnapshotsPage', () => {
	const story = getStoryline('offseason-infield')!;

	it('shows the prompt, the roster, and the engine fit before anything is asked', async () => {
		await render(SnapshotsPage, { props: { story } });

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Snapshots: the prompt and its answers');
		await expect.element(page.getByLabelText(/Provider key/)).not.toBeInTheDocument();
		await expect.element(page.getByRole('checkbox')).not.toBeInTheDocument();
		await expect.element(page.getByText(/Recorded answers only/)).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Classify this player' }))
			.not.toBeInTheDocument();
		await expect.element(page.getByText(/No answers recorded yet/)).toBeVisible();

		// D-57: the roster diagram opens by criterion, placed by the rule baseline,
		// beside the Jev call with its questions and no invented answer.
		await expect
			.element(
				page.getByRole('list', { name: /Roster by profile criterion, placed by Rule baseline/ })
			)
			.toBeVisible();
		const call = page.getByRole('article', { name: /^Jev call for / });
		await expect.element(call.getByText('not requested')).toBeVisible();
		await expect.element(call.getByText('evidence_sufficient')).toBeVisible();
		await expect.element(call.getByText(/^Which single profile label/)).toBeVisible();
		await expect.element(call.getByText('No answer yet.')).toBeVisible();
		await expect.element(page.getByText(/^Engine total 52\.69416 runs/)).toBeVisible();
		await expect
			.element(page.getByText(/\+1\.991 against the lineup this scenario used/))
			.toBeVisible();
		await expect.element(page.getByText('Request body, exactly as it would be sent')).toBeVisible();
	});

	it('keeps the engine fit as the scenario changes and never calls the provider', async () => {
		await render(SnapshotsPage, { props: { story } });

		await page.getByRole('button', { name: /No Contreras trade/ }).click();
		await expect.element(page.getByText(/^Engine total 52\.50346 runs/)).toBeVisible();
		// Candidate B's lineup gives up 5.7853 runs; the sign is shown, not implied.
		await expect
			.element(page.getByText(/\+5\.785 against the lineup this scenario used/))
			.toBeVisible();
		// Still nothing recorded, and the roster analysis follows the scenario.
		await expect.element(page.getByText(/No answers recorded yet/)).toBeVisible();
		await expect.element(page.getByText(/2 benched/)).toBeVisible();
	});

	it('shows the rule baseline with fired rules and the pool summary without a provider', async () => {
		await render(SnapshotsPage, { props: { story } });

		await expect.element(page.getByRole('heading', { name: 'Rule baseline' })).toBeVisible();
		await expect.element(page.getByText(/Version rule-baseline-v1/)).toBeVisible();
		await expect
			.element(page.getByRole('table', { name: /Baseline labels against the analyst label/ }))
			.toBeVisible();
		await expect.element(page.getByText(/of \d+ labeled players matched/)).toBeVisible();
		await expect.element(page.getByText(/Diamond cut: median 2026 season R\/PA/)).toBeVisible();
		await expect
			.element(page.getByText(/Recorded interpretations \(D-55\): a Square "full workload"/))
			.toBeVisible();
		await expect.element(page.getByText(/no held-out split at this sample size/)).toBeVisible();
	});
});

describe('SnapshotsPage diagram modes', () => {
	const story = getStoryline('wild-card-roster')!;

	it('switches the roster diagram between lanes and the packed board, with Jev disabled until answered', async () => {
		await render(SnapshotsPage, { props: { story } });

		await expect.element(page.getByRole('button', { name: 'Jev', exact: true })).toBeDisabled();
		await page.getByRole('button', { name: 'Analyst', exact: true }).click();
		await expect.element(page.getByRole('list', { name: /placed by Analyst/ })).toBeVisible();
		await page.getByRole('button', { name: 'Packed' }).click();
		await expect.element(page.getByRole('group', { name: /^Roster board for/ })).toBeVisible();
		await page.getByRole('button', { name: 'Mark disagreements' }).click();
		await expect
			.element(page.getByText(/Red ring: Jev, the rule baseline, and the analyst disagree/))
			.toBeVisible();
	});
});
