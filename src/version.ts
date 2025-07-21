/**
 * SINGLE SOURCE OF TRUTH FOR VERSION INFORMATION
 *
 * This file centralizes version management across the entire codebase.
 * NO FALLBACKS. NO HARDCODED VERSIONS. ONLY PACKAGE.JSON.
 */

import fs from "node:fs";
import path from "node:path";

let cachedVersion: string | null = null;

/**
 * Get the project version from package.json
 * This is the SINGLE SOURCE OF TRUTH for version information
 * FAILS LOUDLY if package.json cannot be read - NO FALLBACKS!
 */
export function getVersion(): string {
  // Return cached version if already loaded
  if (cachedVersion) {
    return cachedVersion;
  }

  // Try to read from ROOT package.json (works in all contexts)
  const rootPackageJsonPath = path.resolve(process.cwd(), "package.json");

  if (fs.existsSync(rootPackageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, "utf8"));
      if (packageJson.version && typeof packageJson.version === "string") {
        cachedVersion = packageJson.version;
        return packageJson.version;
      }
    } catch (error) {
      throw new Error(
        `Failed to parse package.json at ${rootPackageJsonPath}: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  // If root doesn't work, try parent directory (for UI context)
  const parentPackageJsonPath = path.resolve(process.cwd(), "../package.json");

  if (fs.existsSync(parentPackageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(parentPackageJsonPath, "utf8"));
      if (packageJson.version && typeof packageJson.version === "string") {
        cachedVersion = packageJson.version;
        return packageJson.version;
      }
    } catch (error) {
      throw new Error(
        `Failed to parse package.json at ${parentPackageJsonPath}: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  // NO FALLBACKS! If we can't find package.json, the system is broken!
  throw new Error(
    `FATAL: Cannot find package.json in either ${rootPackageJsonPath} or ${parentPackageJsonPath}. Version must come from package.json - NO FALLBACKS ALLOWED!`
  );
}

/**
 * Reset the cached version (useful for testing)
 */
export function resetVersionCache(): void {
  cachedVersion = null;
}
