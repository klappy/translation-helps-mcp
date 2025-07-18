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
			// Enable server-side rendering for development
			precompress: false
		}),
		// Enable prerendering for Netlify dev compatibility
		prerender: {
			entries: ['*']
		}
	},
	extensions: ['.svelte', '.svx']
};

export default config;
