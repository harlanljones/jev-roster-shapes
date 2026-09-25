import { expect, type Page } from '@playwright/test';

// D-40: every workspace journey starts from the library. Open the first
// 2026 storyline (offseason-infield) through its D-36 public acknowledgment.
// DOM events stand in for trusted input; see workspace-journey.spec.ts.
export async function openFirstStoryline(page: Page): Promise<void> {
	await page.goto('/scenario/offseason-infield');
	await page.getByRole('button', { name: 'Open workspace' }).dispatchEvent('click');
	await page.getByRole('button', { name: 'Open public scenario' }).dispatchEvent('click');
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'mlbam-bos-2026-offseason-infield'
	);
}
