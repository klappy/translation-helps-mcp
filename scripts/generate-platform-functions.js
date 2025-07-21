#!/usr/bin/env node

/**
 * Generate Platform-Specific Function Wrappers
 *
 * This script automatically creates:
 * 1. Netlify function wrappers in netlify/functions/
 * 2. SvelteKit API route wrappers in ui/src/routes/api/
 *
 * From the shared handlers in src/functions/handlers/
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define the functions to generate
// Currently implemented handlers (Phase 1)
const functions = [
  { name: "get-languages", handler: "getLanguagesHandler" },
  { name: "fetch-scripture", handler: "fetchScriptureHandler" },
  // Note: health endpoint uses custom detailed implementation in ui/src/routes/api/health/+server.ts
];

// TODO: Add these handlers in Phase 2
const todoFunctions = [
  { name: "fetch-resources", handler: "fetchResourcesHandler" },
  { name: "fetch-translation-notes", handler: "fetchTranslationNotesHandler" },
  { name: "fetch-translation-questions", handler: "fetchTranslationQuestionsHandler" },
  { name: "fetch-translation-words", handler: "fetchTranslationWordsHandler" },
  { name: "fetch-translation-word-links", handler: "fetchTranslationWordLinksHandler" },
  { name: "get-context", handler: "getContextHandler" },
  { name: "extract-references", handler: "extractReferencesHandler" },
  { name: "browse-translation-words", handler: "browseTranslationWordsHandler" },
  { name: "get-words-for-reference", handler: "getWordsForReferenceHandler" },
  { name: "list-available-resources", handler: "listAvailableResourcesHandler" },
];

// Template for Netlify functions
const netlifyTemplate = (functionName, handlerName) => `/**
 * Netlify Function Wrapper for ${functionName}
 * Auto-generated from shared handler with Netlify Blobs caching
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { ${handlerName} } from '../../src/functions/handlers/${functionName}';
import { NetlifyCacheAdapter } from '../../src/functions/caches/netlify-cache';

const cache = new NetlifyCacheAdapter();
export const handler = createNetlifyHandler(${handlerName}, cache);
`;

// Template for SvelteKit API routes
const svelteKitTemplate = (functionName, handlerName) => `/**
 * SvelteKit API Route for ${functionName}
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { ${handlerName} } from '$lib/../../../src/functions/handlers/${functionName}';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(${handlerName}, cache);
export const POST = createSvelteKitHandler(${handlerName}, cache);
export const OPTIONS = createSvelteKitHandler(${handlerName}, cache);
`;

// Create directories
const netlifyDir = path.join(__dirname, "../netlify/functions");
const svelteKitDir = path.join(__dirname, "../ui/src/routes/api");

if (!fs.existsSync(netlifyDir)) {
  fs.mkdirSync(netlifyDir, { recursive: true });
}

if (!fs.existsSync(svelteKitDir)) {
  fs.mkdirSync(svelteKitDir, { recursive: true });
}

// Generate functions
functions.forEach(({ name, handler }) => {
  // Generate Netlify function
  const netlifyPath = path.join(netlifyDir, `${name}.ts`);
  fs.writeFileSync(netlifyPath, netlifyTemplate(name, handler));
  console.log(`Generated Netlify function: ${netlifyPath}`);

  // Generate SvelteKit API route
  const svelteKitRouteDir = path.join(svelteKitDir, name);
  if (!fs.existsSync(svelteKitRouteDir)) {
    fs.mkdirSync(svelteKitRouteDir, { recursive: true });
  }

  const svelteKitPath = path.join(svelteKitRouteDir, "+server.ts");
  fs.writeFileSync(svelteKitPath, svelteKitTemplate(name, handler));
  console.log(`Generated SvelteKit route: ${svelteKitPath}`);
});

console.log("\\n✅ All platform-specific wrappers generated!");
console.log("\\n📦 Architecture:");
console.log("   src/functions/handlers/    → Shared business logic");
console.log("   netlify/functions/         → Netlify wrappers");
console.log("   ui/src/routes/api/         → SvelteKit wrappers");
console.log("\\n🚀 Both platforms now use the same core logic!");
