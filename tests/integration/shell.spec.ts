import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';

const require = createRequire(import.meta.url);
const axeCorePath = require.resolve('axe-core/axe.min.js');

// D-46: the season index lists every decision, each decision is its own page,
// and the snapshots subpage hangs off the decision it explains. D-49: `/` opens
// on the current decision and the index lives at `/decisions`.
test('`/` opens on the Wild Card decision', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/scenario\/wild-card-roster$/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'Who plays first against the Yankees?'
	);
	await expect(
		page
			.getByRole('navigation', { name: 'Season timeline' })
			.getByRole('link', { name: /Wild Card/ })
	).toHaveAttribute('aria-current', 'page');
});

test('the index opens on the timeline with today marked and one card per decision', async ({
	page
}) => {
	await page.goto('/decisions');

	await expect(page).toHaveTitle(/Roster Shapes/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Eight roster decisions');
	const timeline = page.getByRole('navigation', { name: 'Season timeline' });
	await expect(timeline).toBeVisible();
	// Today's date is on the timeline, both in the text equivalent and the SVG.
	const today = new Date();
	const longToday = today.toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric'
	});
	await expect(page.locator('.today-note')).toContainText(`Today is ${longToday}`);
	await expect(page.getByRole('img', { name: /today, / })).toBeVisible();

	const decisionDates = page.locator('.decisions .when');
	await expect(decisionDates.nth(5)).toHaveText('October 1 · 87–75');
	await expect(decisionDates.nth(6)).toHaveText('November 6 · 87–75');
	await expect(decisionDates.nth(7)).toHaveText('December 7 · 87–75');

	// One card per decision, each an addressable page.
	await expect(page.getByRole('link', { name: 'How do you replace Bregman?' })).toHaveAttribute(
		'href',
		'/scenario/offseason-infield'
	);
	await expect(
		page.getByRole('link', { name: 'Who plays first against the Yankees?' })
	).toHaveAttribute('href', '/scenario/wild-card-roster');

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

test('a decision page centers on the board and links to its diagram subpages', async ({ page }) => {
	await page.goto('/scenario/offseason-infield');

	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'How do you replace Bregman?'
	);
	// D-50: one diagram, the board, with every piece a labeled button.
	const board = page.getByRole('group', { name: /Roster board for Baseline/ });
	await expect(board).toBeVisible();
	await expect(board.getByRole('button', { name: /^C: Carlos Narváez/ })).toBeVisible();
	await expect(board.getByRole('button', { name: /^Off the field: Triston Casas/ })).toBeVisible();
	const readout = page.getByRole('definition').first();
	await expect(readout).toContainText('445.0 runs');
	// The supplementary diagrams moved to subpages.
	await expect(page.getByRole('group', { name: /Roster case for/ })).toHaveCount(0);
	await expect(page.getByRole('region', { name: /Pool fit for/ })).toHaveCount(0);
	const diagrams = page.getByRole('navigation', { name: 'Decision diagrams' });
	await expect(diagrams.getByRole('link', { name: 'Board' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(diagrams.getByRole('link', { name: 'Snapshots' })).toHaveAttribute(
		'href',
		'/scenario/offseason-infield/snapshots'
	);

	// Picking a scenario puts it in the query, and the subpage links carry it.
	await page.getByRole('button', { name: /^A — / }).dispatchEvent('click');
	await expect(page).toHaveURL(/\?scenario=/);
	await expect(page.getByRole('group', { name: /Roster board for A — / })).toBeVisible();
	const engineHref = await diagrams.getByRole('link', { name: 'Engine fit' }).getAttribute('href');
	expect(engineHref).toMatch(/^\/scenario\/offseason-infield\/engine\?scenario=/);
});

test("each diagram subpage draws its diagram for the board's scenario", async ({ page }) => {
	await page.goto('/scenario/offseason-infield/case');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('The fitted case');
	await expect(page.getByRole('group', { name: /Roster case for Baseline/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /^C: Carlos Narváez/ })).toBeVisible();

	// The engine's pool fit, with the hand-derived baseline numbers.
	await page.goto('/scenario/offseason-infield/engine');
	const fit = page.getByRole('region', { name: /Pool fit for Baseline/ });
	await expect(fit).toBeVisible();
	await expect(fit.getByText('52.69416', { exact: false }).first()).toBeVisible();
	await expect(fit).toContainText('Δ +1.991');
	await expect(page.getByRole('columnheader', { name: 'Left on the table' })).toBeVisible();

	await page.goto('/scenario/offseason-infield/slots');
	await expect(
		page.getByRole('img', { name: /hindsight best nine packed into the bin/ })
	).toBeVisible();

	await page.goto('/scenario/offseason-infield/interactions');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('How the pieces interact');
	await expect(
		page.getByRole('navigation', { name: 'Decision diagrams' }).getByRole('link', {
			name: 'Interactions'
		})
	).toHaveAttribute('aria-current', 'page');

	// An unknown scenario id falls back to the baseline instead of failing.
	await page.goto('/scenario/offseason-infield/engine?scenario=nope');
	await expect(page.getByRole('region', { name: /Pool fit for Baseline/ })).toBeVisible();
});

test('the shell nav names the sections and marks the current one', async ({ page }) => {
	await page.goto('/scenario/deadline');
	await expect(page).toHaveURL(/\/scenario\/deadline$/);

	const nav = page.getByRole('navigation', { name: 'Sections' });
	await expect(nav.getByRole('link', { name: 'Decisions' })).toHaveAttribute('href', '/decisions');
	await expect(nav.getByRole('link', { name: 'Deadline', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(nav.getByRole('link', { name: 'Snapshots' })).toHaveCount(0);
	await expect(
		page.getByRole('navigation', { name: 'Decision diagrams' }).getByRole('link', {
			name: 'Snapshots'
		})
	).toHaveAttribute('href', '/scenario/deadline/snapshots');
	// The timeline pin for this decision is current too, and the other four are not.
	const pins = page.getByRole('navigation', { name: 'Season timeline' });
	await expect(pins.getByRole('link', { name: /Deadline/ })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(pins.getByRole('link', { name: /July run/ })).not.toHaveAttribute(
		'aria-current',
		'page'
	);
});
