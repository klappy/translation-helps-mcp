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
			// Enable static fallback for client-side routing
			fallback: 'index.html'
		})
		// Disabled prerendering to let fallback handle all routes
	},
	extensions: ['.svelte', '.svx']
};

export default config;
