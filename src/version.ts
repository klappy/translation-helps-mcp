/**
 * SINGLE SOURCE OF TRUTH FOR VERSION INFORMATION
 *
 * This file centralizes version management across the entire codebase.
 * Platform-agnostic: works in Node.js and Cloudflare Workers
 */

// Import version from package.json at build time
// This works in both Node.js and Cloudflare Workers environments
import packageJson from "../package.json";

let cachedVersion: string | null = null;

/**
 * Get the project version from package.json
 * This is the SINGLE SOURCE OF TRUTH for version information
 * Platform-agnostic: works in Node.js and Cloudflare Workers
 */
export function getVersion(): string {
  // Return cached version if already loaded
  if (cachedVersion) {
    return cachedVersion;
  }

  // Get version from imported package.json (build-time resolution)
  if (packageJson.version && typeof packageJson.version === "string") {
    cachedVersion = packageJson.version;
    return packageJson.version;
  }

  // Fallback to environment variable if set during build
  if (typeof process !== "undefined" && process.env?.APP_VERSION) {
    cachedVersion = process.env.APP_VERSION;
    return process.env.APP_VERSION;
  }

  // Final fallback for edge cases
  cachedVersion = "4.4.0";
  return cachedVersion;
}

/**
 * Reset the cached version (useful for testing)
 */
export function resetVersionCache(): void {
  cachedVersion = null;
}
