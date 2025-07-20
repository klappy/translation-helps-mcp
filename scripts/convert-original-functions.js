#!/usr/bin/env node

/**
 * Convert Original Netlify Functions to Platform-Agnostic Handlers
 *
 * This script reads the original Netlify functions from git history
 * and converts them to platform-agnostic handlers automatically.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Functions to convert
const functions = [
  "fetch-scripture",
  "fetch-resources",
  "fetch-translation-notes",
  "fetch-translation-questions",
  "fetch-translation-words",
  "fetch-translation-word-links",
  "get-context",
  "extract-references",
  "browse-translation-words",
  "get-words-for-reference",
  "list-available-resources",
  "health",
];

// Template for platform-agnostic handler
function createHandlerTemplate(functionName, originalCode) {
  // Extract the business logic by removing Netlify-specific wrapper
  const businessLogic = originalCode
    // Remove Netlify imports
    .replace(/import.*from "@netlify\/functions".*\n/g, "")
    // Remove handler export wrapper
    .replace(
      /export const handler: Handler = async \(\s*event: HandlerEvent,\s*context: HandlerContext\s*\): Promise<HandlerResponse> => \{/,
      ""
    )
    // Remove the final closing brace and semicolon
    .replace(/\};\s*$/, "")
    // Replace event.httpMethod with request.method
    .replace(/event\.httpMethod/g, "request.method")
    // Replace event.queryStringParameters with request.queryStringParameters
    .replace(/event\.queryStringParameters/g, "request.queryStringParameters")
    // Replace event.body with request.body
    .replace(/event\.body/g, "request.body")
    // Replace timedResponse with simple response
    .replace(/return timedResponse\(([\s\S]*?)\);/g, (match, responseContent) => {
      return `return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': result.metadata?.cached ? 'max-age=300' : 'no-cache',
      },
      body: JSON.stringify(${responseContent.split(",")[0].trim()})
    };`;
    })
    // Replace errorResponse with simple error response
    .replace(
      /return errorResponse\(\s*(\d+),\s*([^,]+),\s*([^)]+)\s*\);/g,
      (match, status, message, code) => {
        return `return {
      statusCode: ${status},
      body: JSON.stringify({
        error: ${message},
        code: ${code}
      })
    };`;
      }
    );

  const handlerName =
    functionName
      .split("-")
      .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join("") + "Handler";

  return `/**
 * Platform-agnostic ${functionName} Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { PlatformHandler, PlatformRequest, PlatformResponse } from '../platform-adapter';
${extractImports(originalCode)}

export const ${handlerName}: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
${businessLogic}
};`;
}

function extractImports(originalCode) {
  const imports = [];
  const lines = originalCode.split("\n");

  for (const line of lines) {
    if (line.includes('from "./_shared/')) {
      // Convert relative imports to the new structure
      const newImport = line.replace('from "./_shared/', 'from "../');
      imports.push(newImport);
    }
  }

  return imports.join("\n");
}

// Convert each function
for (const functionName of functions) {
  try {
    console.log(`Converting ${functionName}...`);

    // Get original function from git history
    const originalCode = execSync(`git show 90a754c:netlify/functions/${functionName}.ts`, {
      encoding: "utf8",
    });

    // Create platform-agnostic handler
    const handlerCode = createHandlerTemplate(functionName, originalCode);

    // Write to handlers directory
    const handlerPath = path.join(__dirname, `../src/functions/handlers/${functionName}.ts`);
    fs.writeFileSync(handlerPath, handlerCode);

    console.log(`✅ Created ${handlerPath}`);
  } catch (error) {
    console.error(`❌ Error converting ${functionName}:`, error.message);
  }
}

console.log("\n🚀 All functions converted! Running generator...\n");

// Regenerate the platform wrappers
execSync("node scripts/generate-platform-functions.js", { stdio: "inherit" });
