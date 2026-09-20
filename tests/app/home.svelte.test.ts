import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HomePage from '../../src/lib/app/HomePage.svelte';

describe('HomePage', () => {
	it('opens the synthetic sample workspace by default', async () => {
		await render(HomePage);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('synthetic-comparison-v1');
	});
});
