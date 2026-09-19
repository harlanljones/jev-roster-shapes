import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HomePage from '../../src/lib/app/HomePage.svelte';

describe('HomePage', () => {
	it('shows an explicit empty workspace', async () => {
		await render(HomePage);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('No comparison open');
	});
});
