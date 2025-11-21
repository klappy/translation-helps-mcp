#!/usr/bin/env node

/**
 * Test MCP Server Connection
 * Tests if the MCP server can receive and respond to tool calls
 */

import { spawn } from "child_process";
import { resolve } from "path";

console.log("🧪 Testing MCP Server Connection...\n");

// Start the MCP server
const serverPath = resolve("./src/index.ts");
const server = spawn("npx", ["tsx", serverPath], {
  stdio: ["pipe", "pipe", "inherit"],
  shell: true,
});

let responseData = "";

server.stdout.on("data", (data) => {
  responseData += data.toString();
  console.log("📦 Server Output:", data.toString());
});

server.on("error", (error) => {
  console.error("❌ Server Error:", error);
  process.exit(1);
});

// Give server time to initialize
setTimeout(() => {
  console.log("\n📨 Sending ListTools request...");

  const listToolsRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  };

  server.stdin.write(JSON.stringify(listToolsRequest) + "\n");

  // Wait for response
  setTimeout(() => {
    console.log("\n✅ Test complete!");
    console.log("Response data received:", responseData ? "YES" : "NO");

    server.kill();
    process.exit(0);
  }, 2000);
}, 2000);
