import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: adapter({
			// Ensure all routes are pre-rendered as static HTML
			precompress: false,
			fallback: 'index.html'
		}),
		// Pre-render all routes to static HTML
		prerender: {
			entries: ['*', '/chat', '/test', '/about', '/api']
		}
	},
	extensions: ['.svelte', '.svx']
};

export default config;
