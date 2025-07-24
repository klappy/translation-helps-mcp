#!/usr/bin/env node

/**
 * Simple script to clear the unified cache for testing purposes
 */

import { unifiedCache } from "../src/functions/unified-cache.js";

async function clearCache() {
  try {
    console.log("🧹 Clearing unified cache...");
    await unifiedCache.clear();
    console.log("✅ Cache cleared successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    process.exit(1);
  }
}

clearCache();
