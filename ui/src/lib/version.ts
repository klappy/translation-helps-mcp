/**
 * Version utility - Single source of truth for app version
 * Reads from package.json to ensure consistency across the application
 */

// Import package.json to get the version
import packageJson from '../../package.json';

export const VERSION = packageJson.version;

// Helper function to get version with 'v' prefix for display
export const getDisplayVersion = () => `v${VERSION}`;

// Helper function to get version for cache keys
export const getCacheVersion = () => VERSION;

// Helper function to get version for API headers
export const getApiVersion = () => VERSION;

// Export default for convenience
export default VERSION;
