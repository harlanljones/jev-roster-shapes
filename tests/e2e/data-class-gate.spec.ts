import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openFirstStoryline } from './storyline';

// D-36 / D-40: each storyline opens behind a per-bundle public acknowledgment;
// restricted bundles are hard-blocked; labels stay truthful.
const bundlePath = new URL('../../src/lib/storylines/offseason-infield.json', import.meta.url);

function restrictedBuffer(): Buffer {
	const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as { dataClass: string };
	bundle.dataClass = 'restricted';
	return Buffer.from(JSON.stringify(bundle));
}

test('a decision card asks for acknowledgment, then opens with public labels', async ({ page }) => {
	// D-46: the index lists every decision (at `/decisions` since D-49), and
	// the acknowledgment lives on the decision's own page.
	await page.goto('/decisions');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Five roster decisions');
	await page.getByRole('link', { name: 'How do you replace Bregman?' }).dispatchEvent('click');
	await expect(page).toHaveURL(/\/scenario\/offseason-infield$/);
	await expect(page.getByRole('button', { name: 'Open workspace' })).toBeVisible();

	await page.getByRole('button', { name: 'Open workspace' }).dispatchEvent('click');
	await expect(page.getByRole('button', { name: 'Open public scenario' })).toBeVisible();

	await page.getByRole('button', { name: 'Open public scenario' }).dispatchEvent('click');
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'mlbam-bos-2026-offseason-infield'
	);
	await expect(page).toHaveTitle('Roster Shapes · Public-data comparison');
	await expect(page.locator('.data-class-banner')).toContainText('Public data');
	await expect(page.locator('.notice-text')).toContainText(
		'Opened mlbam-bos-2026-offseason-infield for local review'
	);
	// Real source data renders: an MLB player from the storyline bundle.
	await expect(page.getByRole('option', { name: 'Ceddanne Rafaela' }).first()).toBeAttached();
});

test('declining the acknowledgment keeps you on the decision page', async ({ page }) => {
	await page.goto('/scenario/offseason-infield');
	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'How do you replace Bregman?'
	);

	await page.getByRole('button', { name: 'Open workspace' }).dispatchEvent('click');
	await expect(page.getByRole('button', { name: 'Open public scenario' })).toBeVisible();
	await page.getByRole('button', { name: 'Keep browsing' }).dispatchEvent('click');
	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'How do you replace Bregman?'
	);
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeHidden();
});

test('a restricted bundle is blocked without touching the open comparison', async ({ page }) => {
	await openFirstStoryline(page);
	const heading = page.getByRole('heading', { level: 1 });

	await page.locator('input[type="file"]').setInputFiles({
		name: 'restricted.json',
		mimeType: 'application/json',
		buffer: restrictedBuffer()
	});
	await expect(page.locator('.storage-pill')).toHaveAttribute('data-state', 'failed');
	await expect(page.locator('.notice-text')).toContainText('marked restricted');
	await expect(heading).toHaveText('mlbam-bos-2026-offseason-infield');
});

test('an opened public bundle re-imports without asking again', async ({ page }) => {
	await openFirstStoryline(page);

	// Save first so the re-import hits the duplicate-ID path.
	await page.getByRole('button', { name: 'Save draft' }).dispatchEvent('click');
	await expect(page.locator('.storage-pill')).toHaveAttribute('data-state', 'saved');

	const input = page.locator('input[type="file"]');
	await input.setInputFiles({
		name: 'offseason-infield.json',
		mimeType: 'application/json',
		buffer: readFileSync(bundlePath)
	});
	// Identical content re-imported hits the duplicate-ID path (savedAt differs),
	// but must not ask for public acknowledgment twice in one session.
	await expect(page.locator('.notice-text')).toContainText('already exists');
	await expect(page.getByRole('button', { name: 'Open public bundle' })).toBeHidden();
	await page.getByRole('button', { name: 'Replace as new revision' }).dispatchEvent('click');
	await expect(page.locator('.notice-text')).toContainText('Imported');
	await expect(page.getByRole('button', { name: 'Open public bundle' })).toBeHidden();
});
