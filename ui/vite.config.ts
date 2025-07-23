import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		// Configure file watching to include parent src directory
		watch: {
			usePolling: true,
			ignored: [
				'**/node_modules/**',
				'**/.git/**',
				'**/build/**',
				'**/.svelte-kit/**',
				'**/tests/**'
			]
		},
		// Monitor changes in parent src directory
		fs: {
			allow: ['..'],
			strict: false
		},
		proxy: {
			'/.netlify/functions': {
				target: 'http://localhost:8888',
				changeOrigin: true,
				secure: false
			}
		}
	},
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
