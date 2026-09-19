import { defineConfig, devices } from '@playwright/test';

// Journey and end-to-end tests run against a fresh production build in Chromium (DECISIONS D-16).
export default defineConfig({
	testDir: 'tests',
	testMatch: ['integration/**/*.spec.ts', 'e2e/**/*.spec.ts'],
	reporter: [['list']],
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'bun run build && bun run preview --port 4173 --strictPort',
		port: 4173,
		reuseExistingServer: false
	}
});
