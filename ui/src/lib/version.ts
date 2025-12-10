/**
 * Static version information for the UI
 * This file is generated/updated during build time by scripts/sync-version.js
 * DO NOT import server-side modules here!
 */

// This version is populated by the build script from package.json
export const VERSION = '7.19.10';

// Helper function to get version with 'v' prefix for display
export const getDisplayVersion = () => `v${VERSION}`;

// Helper function to get version for cache keys
export const getCacheVersion = () => VERSION;

// Helper function to get version for API headers
export const getApiVersion = () => VERSION;

// Export default for convenience
export default VERSION;
