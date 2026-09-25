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

const PAGES = [
	['the season index', '/decisions'],
	['the Wild Card decision `/` opens on', '/'],
	['a decision page with the engine pool fit', '/scenario/offseason-infield'],
	['the snapshots subpage', '/scenario/offseason-infield/snapshots']
] as const;

for (const [name, path] of PAGES) {
	test(`${name} passes the full axe rule set`, async ({ page }) => {
		await page.goto(path);
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
