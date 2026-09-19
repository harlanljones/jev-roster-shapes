import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the production shell labels synthetic data and has no axe violations', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle('Roster Shapes');
	await expect(page.getByText('Synthetic demo data')).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('No comparison open');

	const audit = await new AxeBuilder({ page }).analyze();
	expect(audit.violations).toEqual([]);
});
