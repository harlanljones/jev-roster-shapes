import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { openPowerVacuum } from './storyline';

const require = createRequire(import.meta.url);
const axeCorePath = require.resolve('axe-core/axe.min.js');

// Probe: can this environment run the FULL axe rule set? RS-07 recorded that a
// full run hangs headless Chromium (color-contrast blocks the main thread).
// Generous timeout so a hang reads as a timeout failure, not a suite hang.
test.setTimeout(120_000);

test('the workspace passes the full axe rule set', async ({ page }) => {
	await openPowerVacuum(page);
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
