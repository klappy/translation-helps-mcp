#!/usr/bin/env node

/**
 * Script to add format support to all v2 endpoints
 * This ensures consistent format handling across all endpoints
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const V2_ENDPOINTS_DIR = path.join(__dirname, "../ui/src/routes/api/v2");

// Get all +server.ts files from subdirectories
const subdirs = fs.readdirSync(V2_ENDPOINTS_DIR).filter((item) => {
  const itemPath = path.join(V2_ENDPOINTS_DIR, item);
  return fs.statSync(itemPath).isDirectory();
});

let updatedCount = 0;

for (const subdir of subdirs) {
  const serverFile = path.join(V2_ENDPOINTS_DIR, subdir, "+server.ts");

  // Skip if file doesn't exist
  if (!fs.existsSync(serverFile)) {
    continue;
  }

  let content = fs.readFileSync(serverFile, "utf8");

  // Skip if already has format support
  if (content.includes("supportsFormats")) {
    console.log(`✅ ${subdir} - already has format support`);
    continue;
  }

  // Look for createSimpleEndpoint calls
  const endpointPattern =
    /export const GET = createSimpleEndpoint\({[\s\S]*?\n}\);/g;
  const matches = content.match(endpointPattern);

  if (!matches) {
    console.log(`⏭️  ${subdir} - no createSimpleEndpoint found`);
    continue;
  }

  // Add supportsFormats before the closing brace
  const originalContent = content;
  content = content.replace(
    /(export const GET = createSimpleEndpoint\({[\s\S]*?)(}\);)/g,
    (match, p1, p2) => {
      // Check if there's already a trailing comma
      const needsComma = !p1.trim().endsWith(",");
      const addition = needsComma
        ? ",\n\n\t// Enable format support\n\tsupportsFormats: true"
        : "\n\n\t// Enable format support\n\tsupportsFormats: true";
      return p1 + addition + "\n" + p2;
    },
  );

  if (content !== originalContent) {
    fs.writeFileSync(serverFile, content);
    console.log(`✨ ${subdir} - added format support`);
    updatedCount++;
  } else {
    console.log(`❓ ${subdir} - couldn't add format support`);
  }
}

console.log(`\n✅ Updated ${updatedCount} endpoints with format support`);
