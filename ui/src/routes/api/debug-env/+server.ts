import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Debug endpoint to check environment variable availability
 * WARNING: This should only be used for debugging and removed before production!
 */
export const GET: RequestHandler = async ({ platform }) => {
	const envSources = {
		// Check if platform exists
		platformExists: !!platform,
		platformEnvExists: !!(platform as any)?.env,

		// Check for OPENAI_API_KEY in different locations
		hasOpenAIKey: {
			platformEnv: !!(platform as any)?.env?.OPENAI_API_KEY,
			processEnv: !!process.env.OPENAI_API_KEY,
			importMetaEnv: !!import.meta.env.VITE_OPENAI_API_KEY
		},

		// Check what env vars are available (names only, not values)
		availableEnvVars: {
			platformEnv: platform ? Object.keys((platform as any).env || {}) : [],
			// Don't expose process.env keys in production
			processEnv:
				process.env.NODE_ENV === 'development' ? Object.keys(process.env) : ['hidden in production']
		},

		// Platform info
		platformInfo: {
			type: platform ? 'cloudflare-pages' : 'unknown',
			hasKV: !!(platform as any)?.env?.TRANSLATION_HELPS_CACHE
		}
	};

	return json({
		debug: 'Environment Debug Info',
		timestamp: new Date().toISOString(),
		...envSources
	});
};
