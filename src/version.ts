import { logger } from "./utils/logger.js";
/**
 * SINGLE SOURCE OF TRUTH FOR VERSION INFORMATION
 *
 * This file centralizes version management across the entire codebase.
 * Platform-agnostic: works in Node.js and Cloudflare Workers
 */

let cachedVersion: string | null = null;

/**
 * Get the project version
 * This is the SINGLE SOURCE OF TRUTH for version information
 * Platform-agnostic: works in Node.js and Cloudflare Workers
 */
export function getVersion(): string {
  // Return cached version if already loaded
  if (cachedVersion) {
    return cachedVersion;
  }

<<<<<<< Updated upstream
  // Avoid require() to satisfy ESM + lint; rely on env or fallback below
=======
  // Try to read package.json dynamically (Node.js environments)
  if (typeof process !== "undefined" && typeof require !== "undefined") {
    try {
      // Try to require package.json from parent directory
      const packageJson = require("../package.json");
      if (packageJson.version && typeof packageJson.version === "string") {
        cachedVersion = packageJson.version;
        return packageJson.version;
      }
    } catch (error) {
      // If require fails, continue to other methods
      logger.warn("Could not load package.json dynamically", { error: String(error) });
    }
  }
>>>>>>> Stashed changes

  // Fallback to environment variable if set during build
  if (typeof process !== "undefined" && process.env?.APP_VERSION) {
    cachedVersion = process.env.APP_VERSION;
    return process.env.APP_VERSION;
  }

  // Final fallback for edge cases (Cloudflare Workers, etc.)
  cachedVersion = "5.1.0";
  return cachedVersion;
}

/**
 * Reset the cached version (useful for testing)
 */
export function resetVersionCache(): void {
  cachedVersion = null;
}
