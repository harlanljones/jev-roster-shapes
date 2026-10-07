import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SnapshotsPage from '../../src/lib/app/SnapshotsPage.svelte';
import { getStoryline } from '../../src/lib/storylines/registry';

// D-58: a request CI has not asked shows as not recorded. Nothing is invented:
// no probability, no cost, no agreement, and the Jev lane stays unavailable.
vi.mock('../../src/lib/app/jev-results', () => ({
	jevRecordFor: () => null,
	recordedCount: 0
}));

describe('SnapshotsPage with no recorded answers', () => {
	const story = getStoryline('offseason-infield')!;

	it('says nothing was recorded and invents no output', async () => {
		await render(SnapshotsPage, { props: { story } });

		await expect.element(page.getByText(/No answers recorded yet/)).toBeVisible();
		await expect.element(page.getByText(/No recorded answer for/)).toBeVisible();
		const call = page.getByRole('article', { name: /^Jev call for / });
		await expect.element(call.getByText('not requested')).toBeVisible();
		await expect.element(call.getByText('No answer yet.')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Jev', exact: true })).toBeDisabled();
	});
});
