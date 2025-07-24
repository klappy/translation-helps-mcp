import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// Cloudflare Pages configuration with Functions support
			routes: {
				include: ['/*'],
				exclude: ['/build/*', '/_app/*']
			}
		})
	}
};

export default config;
