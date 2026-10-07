import { expect, test, type Page } from '@playwright/test';

// D-47, D-58: the snapshots subpage shows the exact prompt and only the answers
// CI recorded. It has no key field, acknowledgment or ask button, and it never
// calls the provider or the old proxy. Classification is advisory: the engine
// numbers beside it do not move.

async function openSnapshots(page: Page, slug = 'offseason-infield'): Promise<void> {
	await page.goto(`/scenario/${slug}/snapshots`);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Snapshots');
}

test('the snapshots page shows the prompt, the roster, and the engine fit with the recorded answers', async ({
	page
}) => {
	await openSnapshots(page);

	// No key field or ask button exists (D-58), and no output is invented.
	await expect(page.getByLabel('Provider key (session only)')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Classify this player' })).toHaveCount(0);
	await expect(page.getByRole('table', { name: /Validated provider answers/ })).toBeVisible();

	// The exact request that would be sent is inspectable.
	await page.getByText('Request body, exactly as it would be sent').click();
	const body = page.locator('.request-toggle pre');
	await expect(body).toContainText('Player: Caleb Durbin (mlbam-702332)');
	await expect(body).toContainText('Eligible fielding positions: 2B, 3B');
	await expect(body).toContainText('"model": "jev-latest"');
	await expect(body).toContainText('"Star"');
	await expect(body).toContainText('Do not estimate plate appearances');

	// The roster beside it (D-57): by criterion, and the engine's best nine per context.
	await expect(
		page.getByRole('list', { name: /Roster by profile criterion, placed by Rule baseline/ })
	).toBeVisible();
	const fitTable = page.getByRole('table', { name: /The engine's best nine/ });
	await expect(fitTable).toContainText('Left-starter context');
	await expect(fitTable).toContainText('Right-starter context');
	await expect(fitTable).toContainText('Roman Anthony');
	await expect(page.locator('.fit-note')).toContainText('Engine total 52.69416 runs');
	await expect(page.locator('.fit-note')).toContainText(
		'+1.991 against the lineup this scenario used'
	);

	// The decision's own numbers are the workspace's, and stay there.
	await expect(page.getByRole('link', { name: /How do you replace Bregman/ })).toBeVisible();
});

test('the page never calls the provider and has nothing to enter or acknowledge', async ({
	page
}) => {
	const calls: string[] = [];
	page.on('request', (request) => {
		if (/api\.typesafe\.ai|\/api\/jev/.test(request.url())) calls.push(request.url());
	});
	await openSnapshots(page);

	await expect(page.getByRole('checkbox')).toHaveCount(0);
	await expect(page.getByRole('button', { name: /^Classify/ })).toHaveCount(0);
	await expect(page.locator('.state[data-status="recorded"]')).toContainText(
		'Recorded answers only'
	);
	await page.getByLabel('Player', { exact: true }).selectOption({ index: 1 });
	expect(calls).toEqual([]);
});
