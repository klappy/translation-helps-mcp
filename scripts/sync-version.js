#!/usr/bin/env node

import fs from "fs";
import path from "path";

/**
 * Sync version from root package.json to ui/package.json and ui/src/lib/version.ts
 * This ensures we have a SINGLE SOURCE OF TRUTH for versioning
 */

const rootDir = process.cwd();
const rootPackagePath = path.join(rootDir, "package.json");
const uiPackagePath = path.join(rootDir, "ui", "package.json");
const uiVersionPath = path.join(rootDir, "ui", "src", "lib", "version.ts");

try {
  // Read root package.json
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf8"));
  const version = rootPackage.version;

  console.log(`📦 Syncing version ${version} from root to UI files...`);

  // Update UI package.json
  const uiPackage = JSON.parse(fs.readFileSync(uiPackagePath, "utf8"));
  uiPackage.version = version;
  fs.writeFileSync(uiPackagePath, JSON.stringify(uiPackage, null, "\t") + "\n");
  console.log(`✅ UI package.json version synced to ${version}`);

  // Update UI version.ts file
  const versionFileContent = `/**
 * Static version information for the UI
 * This file is generated/updated during build time by scripts/sync-version.js
 * DO NOT import server-side modules here!
 */

// This version is populated by the build script from package.json
export const VERSION = '${version}';

// Helper function to get version with 'v' prefix for display
export const getDisplayVersion = () => \`v\${VERSION}\`;

// Helper function to get version for cache keys
export const getCacheVersion = () => VERSION;

// Helper function to get version for API headers
export const getApiVersion = () => VERSION;

// Export default for convenience
export default VERSION;
`;

  fs.writeFileSync(uiVersionPath, versionFileContent);
  console.log(`✅ UI version.ts file synced to ${version}`);
} catch (error) {
  console.error("❌ Failed to sync versions:", error.message);
  process.exit(1);
}
