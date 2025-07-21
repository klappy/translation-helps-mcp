import { getVersion as getServerVersion } from '../../../src/version.js';

/**
 * Get version from ROOT package.json (SINGLE SOURCE OF TRUTH)
 * This is a static value for browser environments
 */
export function getVersion(): string {
	// In browser environment, we need to use a static fallback
	// since we can't read files dynamically in the browser
	try {
		// Try to use server version during build time
		return getServerVersion();
	} catch {
		// Browser fallback - this should match the FALLBACK_VERSION in src/version.ts
		return '4.3.0';
	}
}

export const VERSION = getVersion();

// Helper function to get version with 'v' prefix for display
export const getDisplayVersion = () => `v${VERSION}`;

// Helper function to get version for cache keys
export const getCacheVersion = () => VERSION;

// Helper function to get version for API headers
export const getApiVersion = () => VERSION;

// Export default for convenience
export default VERSION;
