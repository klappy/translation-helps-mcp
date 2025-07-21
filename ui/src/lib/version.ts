/**
 * Get version from ROOT package.json (SINGLE SOURCE OF TRUTH)
 * This is a static value for browser environments
 */
export function getVersion(): string {
	// In browser environment, always use static version
	// This prevents Node.js fs/path imports from running in browser
	return '4.2.0';
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
