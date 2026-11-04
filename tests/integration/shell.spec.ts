import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';

const require = createRequire(import.meta.url);
const axeCorePath = require.resolve('axe-core/axe.min.js');

// D-60: the current decision follows the viewer's calendar, not the build date
// or UTC. Exercise both sides of a pin's local-midnight boundary. D-63: `/` is now
// the overview, and the current decision is its primary action rather than a redirect.
test.describe('calendar-selected homepage', () => {
	test.use({ timezoneId: 'America/New_York' });

	for (const [instant, slug] of [
		['2026-10-16T16:00:00Z', 'winter-infield'],
		['2026-11-06T04:59:00Z', 'winter-infield'],
		['2026-11-06T05:00:00Z', 'winter-bat'],
		['2026-12-07T17:00:00Z', 'winter-duran']
	] as const) {
		test(`opens ${slug} at ${instant}`, async ({ page }) => {
			await page.clock.setFixedTime(new Date(instant));
			await page.goto('/');
			const open = page.getByRole('link', { name: 'Open the current decision' }).first();
			await expect(open).toHaveAttribute('href', `/decisions/${slug}`);
			await open.click();
			await expect(page).toHaveURL(new RegExp(`/decisions/${slug}$`));
			await expect(
				page
					.getByRole('navigation', { name: 'Season timeline' })
					.locator(`a[href="/decisions/${slug}"]`)
			).toHaveAttribute('aria-current', 'page');
		});
	}
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
		'/decisions/offseason-infield'
	);
	await expect(
		page.getByRole('link', { name: 'Who plays first against the Yankees?' })
	).toHaveAttribute('href', '/decisions/wild-card-roster');

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

test('a decision page leads with the Jev call beside the board and links to its subpages', async ({
	page
}) => {
	await page.goto('/decisions/offseason-infield');

	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'How do you replace Bregman?'
	);
	// D-50: one diagram, the board, with every piece a labeled button.
	const board = page.getByRole('group', { name: /Roster board for Baseline/ });
	await expect(board).toBeVisible();
	await expect(board.getByRole('button', { name: /^C: Carlos Narváez/ })).toBeVisible();
	await expect(board.getByRole('button', { name: /^Off the field: Triston Casas/ })).toBeVisible();
	// The board readout, scoped: the Jev call's state list (D-60) precedes it.
	const readout = page.locator('dl[aria-label="Board readout"]');
	await expect(readout).toContainText('445.0 runs');
	// The supplementary diagrams are tabs of the detail page (D-63).
	await expect(page.getByRole('group', { name: /Roster case for/ })).toHaveCount(0);
	await expect(page.getByRole('region', { name: /Pool fit for/ })).toHaveCount(0);
	const decision = page.getByRole('navigation', { name: 'This decision' });
	await expect(decision.getByRole('link', { name: 'Board' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(decision.getByRole('link', { name: 'Snapshots' })).toHaveAttribute(
		'href',
		'/decisions/offseason-infield/snapshots'
	);
	await expect(decision.getByRole('link', { name: 'Workspace' })).toHaveAttribute(
		'href',
		'/decisions/offseason-infield/compare'
	);

	// Picking a scenario puts it in the query, and the links to the diagrams carry it.
	await page.getByRole('button', { name: /^A — / }).dispatchEvent('click');
	await expect(page).toHaveURL(/\?scenario=/);
	await expect(page.getByRole('group', { name: /Roster board for A — / })).toBeVisible();
	const diagramsHref = await decision.getByRole('link', { name: 'Diagrams' }).getAttribute('href');
	expect(diagramsHref).toMatch(/^\/decisions\/offseason-infield\/detail\?view=case&scenario=/);
	const engineHref = await page.getByRole('link', { name: /Engine pool fit/ }).getAttribute('href');
	expect(engineHref).toMatch(/^\/decisions\/offseason-infield\/detail\?view=engine&scenario=/);
});

test("each diagram tab draws its diagram for the board's scenario", async ({ page }) => {
	await page.goto('/decisions/offseason-infield/detail?view=case');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('The fitted case');
	await expect(page.getByRole('group', { name: /Roster case for Baseline/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /^C: Carlos Narváez/ })).toBeVisible();

	// The engine's pool fit, with the hand-derived baseline numbers.
	await page.goto('/decisions/offseason-infield/detail?view=engine');
	const fit = page.getByRole('region', { name: /Pool fit for Baseline/ });
	await expect(fit).toBeVisible();
	await expect(fit.getByText('52.694', { exact: false }).first()).toBeVisible();
	await expect(fit).toContainText('Δ +1.991');
	await expect(page.getByRole('columnheader', { name: 'Left on the table' })).toBeVisible();

	await page.goto('/decisions/offseason-infield/detail?view=slots');
	await expect(
		page.getByRole('img', { name: /hindsight best nine packed into the bin/ })
	).toBeVisible();

	await page.goto('/decisions/offseason-infield/detail?view=interactions');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('How the pieces interact');
	await expect(
		page.getByRole('navigation', { name: 'Diagram' }).getByRole('link', {
			name: 'Interactions'
		})
	).toHaveAttribute('aria-current', 'true');

	// An unknown scenario id falls back to the baseline instead of failing.
	await page.goto('/decisions/offseason-infield/detail?view=engine&scenario=nope');
	await expect(page.getByRole('region', { name: /Pool fit for Baseline/ })).toBeVisible();
});

test('the shell nav names the sections and marks the current one', async ({ page }) => {
	await page.goto('/decisions/deadline');
	await expect(page).toHaveURL(/\/decisions\/deadline$/);

	const nav = page.getByRole('navigation', { name: 'Sections' });
	await expect(nav.getByRole('link', { name: 'Decisions' })).toHaveAttribute('href', '/decisions');
	await expect(nav.getByRole('link', { name: 'Deadline', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(nav.getByRole('link', { name: 'Snapshots' })).toHaveCount(0);
	await expect(
		page.getByRole('navigation', { name: 'This decision' }).getByRole('link', {
			name: 'Snapshots'
		})
	).toHaveAttribute('href', '/decisions/deadline/snapshots');
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

	// On a subpage the board link marks the section, not the page (DecisionNav owns 'page').
	await page.goto('/decisions/deadline/snapshots');
	await expect(nav.getByRole('link', { name: 'Deadline', exact: true })).toHaveAttribute(
		'aria-current',
		'true'
	);
});

// D-63: every old URL keeps working, carrying the scenario pick where it had one.
test('old decision and player URLs redirect to their new homes', async ({ page }) => {
	for (const [from, to] of [
		['/scenario/offseason-infield', /\/decisions\/offseason-infield$/],
		[
			'/scenario/offseason-infield?scenario=cand-a',
			/\/decisions\/offseason-infield\?scenario=cand-a$/
		],
		['/scenario/offseason-infield/engine', /\/decisions\/offseason-infield\/detail\?view=engine$/],
		['/scenario/offseason-infield/snapshots', /\/decisions\/offseason-infield\/snapshots$/],
		['/player/668939', /\/players\/668939$/]
	] as const) {
		await page.goto(from);
		await expect(page).toHaveURL(to);
	}
});

// D-61: the framework credit appears on every route, as the page's one contentinfo landmark.
test('every page carries the Taylor Wyman credit in the site footer', async ({ page }) => {
	for (const path of [
		'/',
		'/decisions',
		'/decisions/deadline',
		'/decisions/deadline/detail?view=engine',
		'/players/668939',
		'/method'
	]) {
		await page.goto(path);
		const footer = page.getByRole('contentinfo');
		await expect(footer).toHaveCount(1);
		await expect(footer).toContainText('Taylor Wyman');
		await expect(footer.getByRole('link', { name: '@taylormetrics' })).toHaveAttribute(
			'href',
			'https://www.tiktok.com/@taylormetrics'
		);
		await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
	}
});

// Review fixes on the D-63 release (2026-11-04).
test('unknown decision and player URLs show the branded 404 page', async ({ page }) => {
	for (const path of ['/decisions/nope', '/decisions/nope/snapshots', '/players/123']) {
		await page.goto(path);
		await expect(page.getByRole('heading', { name: 'This cutout is empty' })).toBeVisible();
	}
});

test('every prerendered page carries the social tags without running script', async ({
	request
}) => {
	for (const path of ['/', '/decisions', '/method']) {
		const html = await (await request.get(path)).text();
		expect(html).toContain('property="og:image"');
		expect(html).toContain('name="twitter:card"');
	}
});

test('the board numbers decisions and steps through them in date order', async ({ page }) => {
	await page.goto('/decisions/winter-duran');
	const sequence = page.getByRole('navigation', { name: 'Decisions in order' });
	await expect(sequence).toContainText('Decision 8 of 8 · December 7');
	await expect(sequence.getByRole('link')).toHaveCount(1);
	await expect(sequence.getByRole('link')).toHaveAttribute('href', '/decisions/winter-bat');

	await page.goto('/');
	await expect(page.getByText('Jan 14 to Dec 7, 2026')).toBeVisible();
});

test('the scenario pick survives a trip into the workspace and back', async ({ page }) => {
	await page.goto('/decisions/offseason-infield?scenario=cand-a');
	await page.getByRole('button', { name: 'Open workspace' }).click();
	await page.getByRole('button', { name: 'Open public scenario' }).click();
	await expect(page).toHaveURL(/\/decisions\/offseason-infield\/compare\?scenario=cand-a$/);
	await page.getByRole('button', { name: '← Storylines' }).click();
	await expect(page).toHaveURL(/\/decisions\/offseason-infield\?scenario=cand-a$/);
});

test('the open phone menu keeps keyboard focus inside it', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.getByRole('button', { name: 'Open menu' }).click();
	for (let i = 0; i < 6; i += 1) {
		await page.keyboard.press('Tab');
		// The page behind the overlay is inert, so focus never lands under it.
		const underOverlay = await page.evaluate(
			() => !!document.activeElement?.closest('main, footer')
		);
		expect(underOverlay).toBe(false);
	}
});
