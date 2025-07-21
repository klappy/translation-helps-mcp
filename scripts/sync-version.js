#!/usr/bin/env node

import fs from "fs";
import path from "path";

/**
 * Sync version from root package.json to ui/package.json
 * This ensures we have a SINGLE SOURCE OF TRUTH for versioning
 */

const rootDir = process.cwd();
const rootPackagePath = path.join(rootDir, "package.json");
const uiPackagePath = path.join(rootDir, "ui", "package.json");

try {
  // Read root package.json
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf8"));
  const version = rootPackage.version;

  console.log(`📦 Syncing version ${version} from root to UI package.json...`);

  // Read UI package.json
  const uiPackage = JSON.parse(fs.readFileSync(uiPackagePath, "utf8"));

  // Update UI package version
  uiPackage.version = version;

  // Write back to UI package.json
  fs.writeFileSync(uiPackagePath, JSON.stringify(uiPackage, null, "\t") + "\n");

  console.log(`✅ UI package.json version synced to ${version}`);
} catch (error) {
  console.error("❌ Failed to sync versions:", error.message);
  process.exit(1);
}
