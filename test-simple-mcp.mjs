#!/usr/bin/env node
/**
 * Simple MCP Test - Just verify tools/list works
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  const serverPath = path.resolve(__dirname, "src", "index.ts");

  console.log("🔌 Connecting to MCP server...\n");

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", serverPath],
  });

  const client = new Client(
    { name: "test", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
    console.log("✅ Connected\n");

    const tools = await client.listTools();
    console.log(`✅ Got ${tools.tools.length} tools:\n`);

    tools.tools.forEach((t) => console.log(`  - ${t.name}`));

    console.log("\n✅ MCP Server basic communication works!");

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

test();
