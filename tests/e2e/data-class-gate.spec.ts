import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openPowerVacuum } from './storyline';

// D-36 / D-40: each storyline opens behind a per-bundle public acknowledgment;
// restricted bundles are hard-blocked; labels stay truthful.
const bundlePath = new URL('../../src/lib/storylines/power-vacuum.json', import.meta.url);

function restrictedBuffer(): Buffer {
	const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as { dataClass: string };
	bundle.dataClass = 'restricted';
	return Buffer.from(JSON.stringify(bundle));
}

test('a storyline card asks for acknowledgment, then opens with public labels', async ({
	page
}) => {
	await page.goto('/');
	const heading = page.getByRole('heading', { level: 1 });
	// First paint is the case for the first storyline, with five storyline links.
	await expect(heading).toHaveText('Who carries the lineup without Devers and Bregman?');
	await expect(page.getByRole('navigation', { name: 'Choose scenario' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Open workspace' })).toBeVisible();

	await page.getByRole('button', { name: 'Open workspace' }).dispatchEvent('click');
	await expect(page.getByRole('button', { name: 'Open public scenario' })).toBeVisible();

	await page.getByRole('button', { name: 'Open public scenario' }).dispatchEvent('click');
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();
	await expect(heading).toHaveText('mlbam-bos-2026-power-vacuum');
	await expect(page).toHaveTitle('Roster Shapes · Public-data comparison');
	await expect(page.locator('.data-class-banner')).toContainText('Public data');
	await expect(page.locator('.notice-text')).toContainText(
		'Opened mlbam-bos-2026-power-vacuum for local review'
	);
	// Real source data renders: an MLB player from the storyline bundle.
	await expect(page.getByRole('option', { name: 'Ceddanne Rafaela' }).first()).toBeAttached();
});

test('declining the acknowledgment keeps browsing the library', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Who carries the lineup without Devers and Bregman?'
	);

	await page.getByRole('link', { name: /Lefty hole/ }).click();
	await expect(page.getByRole('button', { name: 'Open workspace' })).toBeVisible();
	await page.getByRole('button', { name: 'Open workspace' }).dispatchEvent('click');
	await expect(page.getByRole('button', { name: 'Open public scenario' })).toBeVisible();
	await page.getByRole('button', { name: 'Keep browsing' }).dispatchEvent('click');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'No Refsnyder, no Romy: who faces lefties?'
	);
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeHidden();
});

test('a restricted bundle is blocked without touching the open comparison', async ({ page }) => {
	await openPowerVacuum(page);
	const heading = page.getByRole('heading', { level: 1 });

	await page.locator('input[type="file"]').setInputFiles({
		name: 'restricted.json',
		mimeType: 'application/json',
		buffer: restrictedBuffer()
	});
	await expect(page.locator('.storage-pill')).toHaveAttribute('data-state', 'failed');
	await expect(page.locator('.notice-text')).toContainText('marked restricted');
	await expect(heading).toHaveText('mlbam-bos-2026-power-vacuum');
});

test('an opened public bundle re-imports without asking again', async ({ page }) => {
	await openPowerVacuum(page);

	// Save first so the re-import hits the duplicate-ID path.
	await page.getByRole('button', { name: 'Save draft' }).dispatchEvent('click');
	await expect(page.locator('.storage-pill')).toHaveAttribute('data-state', 'saved');

	const input = page.locator('input[type="file"]');
	await input.setInputFiles({
		name: 'power-vacuum.json',
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
