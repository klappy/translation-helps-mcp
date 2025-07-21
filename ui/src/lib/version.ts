import { getVersion as getServerVersion } from '../../../src/version.js';

/**
 * Get version from ROOT package.json (SINGLE SOURCE OF TRUTH)
 * NO FALLBACKS - if this fails, the build should fail!
 */
export function getVersion(): string {
	// During build time, this MUST work or the build fails
	// NO browser fallbacks - the version is baked in at build time
	return getServerVersion();
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
