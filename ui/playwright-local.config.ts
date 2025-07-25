import { defineConfig } from '@playwright/test';

export default defineConfig({
	use: {
		baseURL: 'http://localhost:8174'
	},
	testDir: 'e2e',
	timeout: 30000,
	fullyParallel: true,
	reporter: 'list',
	workers: 1
});