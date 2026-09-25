import { expect, test, type Page } from '@playwright/test';

// D-47: the snapshots subpage shows the exact prompt and, only when a key is
// configured and acknowledged, the provider's answers. Classification is
// advisory: this journey also asserts the engine numbers beside it do not move.
const STUB_URL = 'https://api.typesafe.ai/v1/systemone';

interface StubOptions {
	status?: number;
	body?: unknown;
}

async function stubProvider(page: Page, options: StubOptions = {}): Promise<void> {
	let calls = 0;
	await page.route(`${STUB_URL}**`, async (route) => {
		calls += 1;
		await route.fulfill({
			status: options.status ?? 200,
			contentType: 'application/json',
			body: JSON.stringify(
				options.body ?? {
					model: 'jev-1.13.0',
					answers: {
						profile: {
							type: 'choice',
							choice: 'Star',
							probabilities: {
								Square: 0.02,
								Rectangle: 0.03,
								Circle: 0.05,
								Pentagon: 0.02,
								Octagon: 0.05,
								Diamond: 0.02,
								Star: 0.71,
								Funky: 0.05,
								Unclassified: 0.05
							},
							confidence: 0.64
						},
						evidence_sufficient: { type: 'noul', noul: 0.82 }
					},
					usage: { input_tokens: 412, output_tokens: 96 }
				}
			)
		});
	});
	await page.exposeFunction('jevStubCalls', () => calls);
}

/**
 * Tick the acknowledgment. The click is dispatched rather than trusted: this
 * environment's headless Chromium produces no animation frames, so Playwright's
 * actionability wait hangs (see workspace-journey.spec.ts; keyboard.spec.ts uses
 * real key presses).
 */
async function acknowledge(page: Page): Promise<void> {
	await page.locator('.ack input[type="checkbox"]').evaluate((input: HTMLInputElement) => {
		input.checked = true;
		input.dispatchEvent(new Event('change', { bubbles: true }));
	});
}

async function openSnapshots(page: Page, slug = 'preseason-dh'): Promise<void> {
	await page.goto(`/scenario/${slug}/snapshots`);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Snapshots');
}

test('the snapshots page shows the prompt, the roster, and the engine fit with no key set', async ({
	page
}) => {
	await openSnapshots(page);

	// Nothing configured: the state is explicit and no output is invented.
	await expect(page.locator('.state[data-status="not-configured"]')).toContainText(
		'No key is set, so nothing has been sent'
	);
	await expect(page.getByRole('button', { name: 'Classify this player' })).toBeDisabled();
	await expect(page.locator('.state[data-status="none"]')).toContainText('No answers yet');

	// The exact request that would be sent is inspectable.
	await page.getByText('Request body, exactly as it would be sent').click();
	const body = page.locator('.request-toggle pre');
	await expect(body).toContainText('Player: Caleb Durbin (mlbam-702332)');
	await expect(body).toContainText('Eligible fielding positions: 2B, 3B');
	await expect(body).toContainText('"model": "jev-latest"');
	await expect(body).toContainText('"Star"');
	await expect(body).toContainText('Do not estimate plate appearances');

	// The roster beside it: the case, and the engine's best nine per context.
	await expect(page.getByRole('group', { name: /Roster case for/ })).toBeVisible();
	const fitTable = page.getByRole('table', { name: /The engine's best nine/ });
	await expect(fitTable).toContainText('Left-starter context');
	await expect(fitTable).toContainText('Right-starter context');
	await expect(fitTable).toContainText('Roman Anthony');
	await expect(page.locator('.fit-note')).toContainText('Engine total 51.68311 runs');
	await expect(page.locator('.fit-note')).toContainText('0 against the lineup this scenario used');

	// The decision's own numbers are the workspace's, and stay there.
	await expect(page.getByRole('link', { name: /Who takes the DH at-bats/ })).toBeVisible();
});

test('a live answer is shown, validated, and leaves every engine number alone', async ({
	page
}) => {
	await stubProvider(page);
	await openSnapshots(page);

	await page.getByLabel('Provider key (session only)').fill('test-key');
	await expect(page.getByRole('checkbox')).toBeVisible();
	await acknowledge(page);
	await expect(page.locator('.state[data-status="ready"]')).toBeVisible();

	const engineTotal = await page.locator('.fit-note').textContent();
	await page.getByRole('button', { name: 'Classify this player' }).dispatchEvent('click');

	// The answer arrives with its distribution, confidence, and the analyst label.
	const answers = page.getByRole('table', { name: /Validated provider answers/ });
	await expect(answers).toBeVisible();
	await expect(answers.getByRole('rowheader', { name: 'Caleb Durbin' })).toBeVisible();
	await expect(answers).toContainText('Star');
	await expect(answers).toContainText('0.64');
	await expect(answers).toContainText('0.82');
	await expect(answers).toContainText('current · jev-1.13.0');
	await expect(page.locator('.cost')).toContainText('412 input tokens');
	await expect(page.locator('.cost')).toContainText('0.000017');
	// The request really went to the documented endpoint, once.
	expect(
		await page.evaluate(() => (window as never as { jevStubCalls: () => number }).jevStubCalls())
	).toBe(1);

	// The engine's numbers are unchanged by the model's opinion.
	expect(await page.locator('.fit-note').textContent()).toBe(engineTotal);
});

test('a provider failure is visible and changes nothing else', async ({ page }) => {
	await stubProvider(page, { status: 401, body: { message: 'bad key' } });
	await openSnapshots(page);

	await page.getByLabel('Provider key (session only)').fill('wrong-key');
	await acknowledge(page);
	await page.getByRole('button', { name: 'Classify this player' }).dispatchEvent('click');

	await expect(page.locator('.answers')).toBeVisible();
	await expect(page.locator('.answers')).toContainText('UNAUTHORIZED');
	await expect(page.locator('.answers')).toContainText('HTTP 401');
	// No answer, and the roster analysis is untouched.
	await expect(page.locator('.answers')).toContainText('unavailable');
	await expect(page.locator('.fit-note')).toContainText('51.68311');
});

test('an invalid response is reported instead of being shown as an answer', async ({ page }) => {
	await stubProvider(page, {
		body: {
			model: 'jev-1.13.0',
			answers: {
				profile: { type: 'choice', choice: 'Trapezoid', probabilities: { Star: 1 }, confidence: 1 },
				evidence_sufficient: { type: 'noul', noul: 0.5 }
			},
			usage: { input_tokens: 10, output_tokens: 5 }
		}
	});
	await openSnapshots(page);
	await page.getByLabel('Provider key (session only)').fill('test-key');
	await acknowledge(page);
	await page.getByRole('button', { name: 'Classify this player' }).dispatchEvent('click');

	await expect(page.locator('.answers')).toContainText('invalid-response');
	await expect(page.locator('.answers')).toContainText('UNKNOWN_CHOICE');
	await expect(page.locator('.answers')).toContainText('MISSING_PROBABILITY');
	// The label the provider invented is quoted in the reason but never rendered
	// as an answer: the model-label cell stays empty.
	const row = page.locator('.answers tbody tr').first();
	await expect(row.locator('td').first()).toHaveText('—');
	await expect(row.locator('td').nth(2)).toHaveText('unavailable');
});
