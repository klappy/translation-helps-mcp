/**
 * Browser usage example for Translation Helps MCP Client
 *
 * This example shows how to use the SDK in a browser environment.
 * Works with bundlers like Vite, Webpack, Parcel, etc.
 */

import { TranslationHelpsClient } from "../src/index.js";

// The SDK is fully browser-compatible!
// It uses standard Web APIs: fetch, AbortController
// No Node.js dependencies required

async function initBrowserApp() {
  // Create client instance
  const mcpClient = new TranslationHelpsClient({
    serverUrl: "https://translation-helps-mcp-945.pages.dev/api/mcp",
  });

  try {
    // Connect to server
    console.log("Connecting to MCP server...");
    await mcpClient.connect();
    console.log("✅ Connected!\n");

    // Get available tools and prompts
    const tools = await mcpClient.listTools();
    const prompts = await mcpClient.listPrompts();
    console.log(`Available tools: ${tools.map((t) => t.name).join(", ")}`);
    console.log(
      `Available prompts: ${prompts.map((p) => p.name).join(", ")}\n`,
    );

    // Example: Fetch scripture (works in browser!)
    const scripture = await mcpClient.fetchScripture({
      reference: "John 3:16",
      language: "en",
    });
    console.log("Scripture:", scripture);

    // Example: Use in a React/Vue/Svelte component
    // You can use the client in any frontend framework
    return { mcpClient, tools, prompts };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// For browser usage, you might want to expose it globally or use it in a component
if (typeof window !== "undefined") {
  // Browser environment
  (window as any).initTranslationHelps = initBrowserApp;
}

// For module usage
export { initBrowserApp };
