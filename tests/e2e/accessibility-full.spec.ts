import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { openFirstStoryline } from './storyline';

const require = createRequire(import.meta.url);
const axeCorePath = require.resolve('axe-core/axe.min.js');

// Probe: can this environment run the FULL axe rule set? RS-07 recorded that a
// full run hangs headless Chromium (color-contrast blocks the main thread).
// Generous timeout so a hang reads as a timeout failure, not a suite hang.
test.setTimeout(120_000);

test('the workspace passes the full axe rule set', async ({ page }) => {
	await openFirstStoryline(page);
	await page.addScriptTag({ path: axeCorePath });
	const audit = await page.evaluate(() =>
		(
			window as unknown as {
				axe: { run: (d: Document) => Promise<{ violations: unknown[] }> };
			}
		).axe.run(document)
	);
	expect(audit.violations).toEqual([]);
});

// D-63: the page map. Every route is audited in both themes (D-62 adds dark mode).
const PAGES = [
	['the overview', '/'],
	['the season index', '/decisions'],
	['a decision board', '/decisions/offseason-infield'],
	['a late-season decision board', '/decisions/winter-infield'],
	['the last decision board', '/decisions/winter-duran'],
	['the fitted case tab', '/decisions/offseason-infield/detail?view=case'],
	['the engine pool fit tab', '/decisions/offseason-infield/detail?view=engine'],
	['the interactions tab', '/decisions/offseason-infield/detail?view=interactions'],
	['the slot by slot tab', '/decisions/offseason-infield/detail?view=slots'],
	['the snapshots page', '/decisions/offseason-infield/snapshots'],
	['the workspace gate', '/decisions/offseason-infield/compare'],
	['a player page', '/players/668939'],
	['the method page', '/method'],
	['the privacy page', '/privacy'],
	['the terms page', '/terms'],
	['the not-found page', '/decisions/nope']
] as const;

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`${colorScheme} theme`, () => {
		test.use({ colorScheme });
		for (const [name, path] of PAGES) {
			test(`${name} passes the full axe rule set`, async ({ page }) => {
				await page.goto(path);
				// Sections below the first screen wait at opacity 0 to rise in on scroll, and axe
				// skips what it cannot see; show them all so their contrast is audited too.
				await page.evaluate(() => {
					for (const node of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
						node.dataset.reveal = 'shown';
					}
				});
				await page.waitForTimeout(600);
				await page.addScriptTag({ path: axeCorePath });
				const audit = await page.evaluate(() =>
					(
						window as unknown as {
							axe: {
								run: (d: Document) => Promise<{ violations: { id: string; nodes: unknown[] }[] }>;
							};
						}
					).axe.run(document)
				);
				expect(audit.violations.map(({ id }) => id)).toEqual([]);
			});
		}
	});
}
