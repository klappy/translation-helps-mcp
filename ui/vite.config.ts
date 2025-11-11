import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 8174,
		host: true,
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
		}
	},
	preview: {
		port: 8175
	},
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/lib/server/**']
	}
});
