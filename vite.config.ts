import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static single-page app (DECISIONS D-13): unmatched paths fall back to the client shell.
			adapter: adapter({ fallback: '200.html' })
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				// Svelte component tests run in a real browser (DECISIONS D-16).
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['tests/**/*.svelte.test.ts']
				}
			},
			{
				// Contracts, fixtures, engine, and persistence logic run in Node.
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['tests/**/*.test.ts'],
					exclude: ['tests/**/*.svelte.test.ts', 'tests/integration/**', 'tests/e2e/**']
				}
			}
		]
	}
});
