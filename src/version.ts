/**
 * SINGLE SOURCE OF TRUTH FOR VERSION INFORMATION
 *
 * This file centralizes version management across the entire codebase.
 * All other files should import getVersion() from this file instead of
 * having their own hardcoded fallbacks.
 */

import fs from "node:fs";
import path from "node:path";

// The ONLY hardcoded fallback in the entire codebase
const FALLBACK_VERSION = "4.3.0";

let cachedVersion: string | null = null;

/**
 * Get the project version from package.json
 * This is the SINGLE SOURCE OF TRUTH for version information
 */
export function getVersion(): string {
  // Return cached version if already loaded
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Try to read from ROOT package.json (works in all contexts)
    const rootPackageJsonPath = path.resolve(process.cwd(), "package.json");

    if (fs.existsSync(rootPackageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, "utf8"));
      if (packageJson.version && typeof packageJson.version === "string") {
        cachedVersion = packageJson.version;
        return packageJson.version;
      }
    }

    // If root doesn't work, try parent directory (for UI context)
    const parentPackageJsonPath = path.resolve(process.cwd(), "../package.json");

    if (fs.existsSync(parentPackageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(parentPackageJsonPath, "utf8"));
      if (packageJson.version && typeof packageJson.version === "string") {
        cachedVersion = packageJson.version;
        return packageJson.version;
      }
    }

    // If both fail, use fallback
    console.warn("Failed to read version from package.json files, using fallback");
    cachedVersion = FALLBACK_VERSION;
    return cachedVersion;
  } catch (error) {
    console.warn("Error reading version from package.json, using fallback:", error);
    cachedVersion = FALLBACK_VERSION;
    return cachedVersion;
  }
}

/**
 * Reset the cached version (useful for testing)
 */
export function resetVersionCache(): void {
  cachedVersion = null;
}
