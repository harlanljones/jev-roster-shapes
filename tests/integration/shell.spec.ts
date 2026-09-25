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
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('How do you replace Bregman?');
	await expect(page.getByRole('navigation', { name: 'Season timeline' })).toBeVisible();
	// The case (D-43) exposes every lineup piece as a labeled button, and the
	// same pieces as a table.
	await expect(page.getByRole('group', { name: /Roster case for/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /^C: Carlos Narváez/ })).toBeVisible();
	await page.getByText('The case as a table').click();
	await expect(page.locator('.case-table table')).toBeVisible();
	// The other three diagrams render from the same pool.
	await expect(
		page.getByRole('group', { name: 'Interaction map of the player pool' })
	).toBeVisible();
	await expect(page.getByRole('img', { name: /tightest fit packed into the bin/ })).toBeVisible();
	await expect(page.getByRole('img', { name: /tightest fit slot by slot/ })).toBeVisible();

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
	await page.goto('/scenario/deadline');
	await expect(page).toHaveURL(/\/scenario\/deadline$/);
	await expect(page.getByRole('link', { name: /^Deadline/ })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(page.getByRole('heading', { name: /Rutschman in, Mayer out/ })).toBeVisible();
});
