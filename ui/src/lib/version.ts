import fs from 'fs';
import path from 'path';

/**
 * Get version from ROOT package.json (SINGLE SOURCE OF TRUTH)
 * This reads from the main project package.json, not the UI package.json
 */
export function getVersion(): string {
	try {
		// Go up two levels: ui/src/lib -> ui -> root
		const packageJsonPath = path.join(process.cwd(), '..', 'package.json');
		if (fs.existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
			return packageJson.version;
		}
	} catch {
		console.warn('Failed to read version from ROOT package.json, using fallback');
	}
	return '4.2.0'; // Only as absolute fallback
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
