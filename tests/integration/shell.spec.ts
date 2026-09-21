import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';

const require = createRequire(import.meta.url);
const axeCorePath = require.resolve('axe-core/axe.min.js');

test('the production shell opens on the public storyline library with no axe violations', async ({
	page
}) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/Roster Shapes/);
	await expect(page.getByText('Public data', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'One roster. Five ways to see the shape.'
	);
	await expect(page.getByRole('navigation', { name: 'Choose scenario' })).toBeVisible();
	// The interactive graphic exposes every position lane as a labeled button
	// with a table equivalent.
	await expect(page.getByRole('button', { name: /C:/ })).toBeVisible();
	await expect(page.locator('.depth-chart table')).toBeVisible();

	// DOM-level audit (see workspace-journey.spec.ts for why the rule set is
	// pinned instead of running every axe rule).
	const auditRules = [
		'button-name',
		'select-name',
		'label',
		'aria-valid-attr',
		'aria-valid-attr-value',
		'aria-roles',
		'html-has-lang',
		'html-lang-valid',
		'image-alt',
		'link-name',
		'list',
		'listitem',
		'duplicate-id',
		'duplicate-id-aria',
		'heading-order',
		'empty-heading',
		'th-has-data-cells',
		'td-headers-attr',
		'definition-list'
	];
	await page.addScriptTag({ path: axeCorePath });
	const audit = await page.evaluate(
		(rules) =>
			(
				window as unknown as {
					axe: { run: (d: Document, o: object) => Promise<{ violations: { id: string }[] }> };
				}
			).axe.run(document, { runOnly: { type: 'rule', values: rules } }),
		auditRules
	);
	expect(audit.violations).toEqual([]);
});

test('scenario links resolve to addressable storyline pages', async ({ page }) => {
	await page.goto('/scenario/lefty-hole');
	await expect(page).toHaveURL(/\/scenario\/lefty-hole$/);
	await expect(page.getByRole('link', { name: /Lefty hole/ })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(page.getByRole('heading', { name: /No Refsnyder, no Romy/ })).toBeVisible();
});
