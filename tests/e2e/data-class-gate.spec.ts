import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// D-28 / D-36: restricted bundles are hard-blocked; public bundles open only
// after an explicit per-bundle acknowledgment; labels stay truthful.
const spikePath = new URL('../../spikes/mlb-public/redsox-observed-2025.json', import.meta.url);

function restrictedBuffer(): Buffer {
	const bundle = JSON.parse(readFileSync(spikePath, 'utf8')) as { dataClass: string };
	bundle.dataClass = 'restricted';
	return Buffer.from(JSON.stringify(bundle));
}

test('a public bundle asks for acknowledgment, then opens with public labels', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();
	const heading = page.getByRole('heading', { level: 1 });
	await expect(heading).toHaveText('synthetic-comparison-v1');

	await page.locator('input[type="file"]').setInputFiles({
		name: 'redsox-observed-2025.json',
		mimeType: 'application/json',
		buffer: readFileSync(spikePath)
	});
	await expect(page.locator('.notice-text')).toContainText('uses public data');
	// The open comparison is untouched until acknowledgment.
	await expect(heading).toHaveText('synthetic-comparison-v1');

	await page.getByRole('button', { name: 'Open public bundle' }).dispatchEvent('click');
	await expect(heading).toHaveText('mlbam-bos-observed-2025-spike');
	await expect(page).toHaveTitle('Roster Shapes · Public-data comparison');
	await expect(page.locator('.data-class-banner')).toContainText('Public data');
	await expect(page.locator('.notice-text')).toContainText('Imported');
	// Real source data renders: an MLB player from the spike bundle.
	await expect(page.getByRole('option', { name: 'Ceddanne Rafaela' }).first()).toBeAttached();
});

test('declining the acknowledgment keeps the current comparison', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();

	await page.locator('input[type="file"]').setInputFiles({
		name: 'redsox-observed-2025.json',
		mimeType: 'application/json',
		buffer: readFileSync(spikePath)
	});
	await expect(page.getByRole('button', { name: 'Open public bundle' })).toBeVisible();
	await page.getByRole('button', { name: 'Keep current comparison' }).dispatchEvent('click');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('synthetic-comparison-v1');
	await expect(page.locator('.notice-text')).toContainText('declined');
});

test('a restricted bundle is blocked without touching the open comparison', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();
	const heading = page.getByRole('heading', { level: 1 });

	await page.locator('input[type="file"]').setInputFiles({
		name: 'restricted.json',
		mimeType: 'application/json',
		buffer: restrictedBuffer()
	});
	await expect(page.locator('.storage-pill')).toHaveAttribute('data-state', 'failed');
	await expect(page.locator('.notice-text')).toContainText('marked restricted');
	await expect(heading).toHaveText('synthetic-comparison-v1');
	await expect(page.getByRole('button', { name: 'Open public bundle' })).toBeHidden();
});

test('an acknowledged public bundle re-imports without asking again', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('tablist', { name: 'Comparison scenarios' })).toBeVisible();

	const input = page.locator('input[type="file"]');
	await input.setInputFiles({
		name: 'redsox-observed-2025.json',
		mimeType: 'application/json',
		buffer: readFileSync(spikePath)
	});
	await page.getByRole('button', { name: 'Open public bundle' }).dispatchEvent('click');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('mlbam-bos-observed-2025-spike');

	await input.setInputFiles({
		name: 'redsox-observed-2025.json',
		mimeType: 'application/json',
		buffer: readFileSync(spikePath)
	});
	// Identical content re-imported hits the duplicate-ID path (savedAt differs),
	// but must not ask for public acknowledgment twice in one session.
	await expect(page.locator('.notice-text')).toContainText('already exists');
	await expect(page.getByRole('button', { name: 'Open public bundle' })).toBeHidden();
	await page.getByRole('button', { name: 'Replace as new revision' }).dispatchEvent('click');
	await expect(page.locator('.notice-text')).toContainText('Imported');
	await expect(page.getByRole('button', { name: 'Open public bundle' })).toBeHidden();
});
