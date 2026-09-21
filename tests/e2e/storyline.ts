import { expect, type Page } from '@playwright/test';

// D-40: every workspace journey starts from the library. Open the first
// 2026 storyline (power-vacuum) through its D-36 public acknowledgment.
// DOM events stand in for trusted input; see workspace-journey.spec.ts.
export async function openPowerVacuum(page: Page): Promise<void> {
	await page.goto('/');
	await page.getByRole('button', { name: 'Open storyline: Power vacuum' }).dispatchEvent('click');
	await page.getByRole('button', { name: 'Open public bundle' }).dispatchEvent('click');
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('mlbam-bos-2026-power-vacuum');
}
