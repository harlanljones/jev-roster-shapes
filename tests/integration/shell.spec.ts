import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';

const require = createRequire(import.meta.url);
const axeCorePath = require.resolve('axe-core/axe.min.js');

// D-46: `/` is the season index, every decision is its own page, and the
// snapshots subpage hangs off the decision it explains.
test('the index opens on the timeline with today marked and one card per decision', async ({
	page
}) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/Roster Shapes/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Five roster decisions');
	const timeline = page.getByRole('navigation', { name: 'Season timeline' });
	await expect(timeline).toBeVisible();
	// Today's date is on the timeline, both in the text equivalent and the SVG.
	const today = new Date();
	const longToday = today.toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC'
	});
	await expect(page.locator('.today-note')).toContainText(`Today is ${longToday}`);
	await expect(page.getByRole('img', { name: /today, / })).toBeVisible();
	// One card per decision, each an addressable page.
	await expect(page.getByRole('link', { name: 'Who takes the DH at-bats?' })).toHaveAttribute(
		'href',
		'/scenario/preseason-dh'
	);
	await expect(page.getByRole('link', { name: 'The lineup going into October' })).toHaveAttribute(
		'href',
		'/scenario/october-lineup'
	);

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

test('a decision page shows the case, the engine pool fit, and a way to its snapshots', async ({
	page
}) => {
	await page.goto('/scenario/preseason-second');

	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'Who plays second, and who faces lefties?'
	);
	// The case (D-43) exposes every lineup piece as a labeled button.
	await expect(page.getByRole('group', { name: /Roster case for/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /^C: Carlos Narváez/ })).toBeVisible();
	await expect(
		page.getByRole('img', { name: /hindsight best nine packed into the bin/ })
	).toBeVisible();

	// The engine's pool fit, with the hand-derived baseline numbers.
	const fit = page.getByRole('region', { name: /Pool fit for/ });
	await expect(fit).toBeVisible();
	await expect(fit.getByText('52.69416', { exact: false }).first()).toBeVisible();
	await expect(fit).toContainText('Δ +1.011');
	await expect(page.getByRole('columnheader', { name: 'Left on the table' })).toBeVisible();

	await expect(
		page.getByRole('link', { name: /Snapshots: the Jev prompt and its answers/ })
	).toHaveAttribute('href', '/scenario/preseason-second/snapshots');
});

test('the shell nav names the sections and marks the current one', async ({ page }) => {
	await page.goto('/scenario/deadline-catcher');
	await expect(page).toHaveURL(/\/scenario\/deadline-catcher$/);

	const nav = page.getByRole('navigation', { name: 'Sections' });
	await expect(nav.getByRole('link', { name: 'Decisions' })).toHaveAttribute('href', '/');
	await expect(nav.getByRole('link', { name: 'Deadline C', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(nav.getByRole('link', { name: 'Snapshots' })).toHaveAttribute(
		'href',
		'/scenario/deadline-catcher/snapshots'
	);
	// The timeline pin for this decision is current too, and the other four are not.
	const pins = page.getByRole('navigation', { name: 'Season timeline' });
	await expect(pins.getByRole('link', { name: /Deadline C/ })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(pins.getByRole('link', { name: /July run/ })).not.toHaveAttribute(
		'aria-current',
		'page'
	);
});
