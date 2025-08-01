#!/usr/bin/env node

import fs from "fs";
import path from "path";

/**
 * Sync version from root package.json to ui/package.json and ui/src/lib/version.ts
 * This ensures we have a SINGLE SOURCE OF TRUTH for versioning
 * Works when run from either root directory or ui directory (for Cloudflare builds)
 */

const currentDir = process.cwd();
console.log(`🔧 Running sync-version from: ${currentDir}`);

// Detect if we're running from UI directory or root directory
const isInUiDir = currentDir.endsWith("/ui") || currentDir.endsWith("\\ui");
const rootDir = isInUiDir ? path.dirname(currentDir) : currentDir;

console.log(`📁 Detected root directory: ${rootDir}`);
console.log(`📁 Running from UI dir: ${isInUiDir}`);

const rootPackagePath = path.join(rootDir, "package.json");
const uiPackagePath = path.join(rootDir, "ui", "package.json");
const uiVersionPath = path.join(rootDir, "ui", "src", "lib", "version.ts");

// Verify paths exist before proceeding
console.log(`🔍 Checking paths:`);
console.log(`   Root package.json: ${rootPackagePath}`);
console.log(`   UI package.json: ${uiPackagePath}`);
console.log(`   UI version.ts: ${uiVersionPath}`);

try {
  // Verify root package.json exists
  if (!fs.existsSync(rootPackagePath)) {
    throw new Error(`Root package.json not found at: ${rootPackagePath}`);
  }

  // Read root package.json
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf8"));
  const version = rootPackage.version;

  console.log(`📦 Syncing version ${version} from root to UI files...`);

  // Update UI package.json (only if it exists)
  if (fs.existsSync(uiPackagePath)) {
    const uiPackage = JSON.parse(fs.readFileSync(uiPackagePath, "utf8"));
    uiPackage.version = version;
    fs.writeFileSync(uiPackagePath, JSON.stringify(uiPackage, null, "\t") + "\n");
    console.log(`✅ UI package.json version synced to ${version}`);
  } else {
    console.log(`⚠️  UI package.json not found at ${uiPackagePath}, skipping`);
  }

  // Ensure UI version.ts directory exists
  const versionDir = path.dirname(uiVersionPath);
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
    console.log(`📁 Created directory: ${versionDir}`);
  }

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

  console.log(`🎉 Version sync completed successfully!`);
} catch (error) {
  console.error("❌ Failed to sync versions:", error.message);
  console.error("📊 Debug info:");
  console.error(`   Current working directory: ${currentDir}`);
  console.error(`   Calculated root directory: ${rootDir}`);
  console.error(`   Is in UI directory: ${isInUiDir}`);
  console.error(`   Root package path: ${rootPackagePath}`);
  console.error(`   UI package path: ${uiPackagePath}`);
  console.error(`   UI version path: ${uiVersionPath}`);
  process.exit(1);
}
