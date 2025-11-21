#!/usr/bin/env node
/**
 * Test scripture fetching only
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  const serverPath = path.resolve(__dirname, "src", "index.ts");

  console.log("🧪 Testing Scripture Fetching\n");

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", serverPath],
    env: {
      ...process.env,
      USE_FS_CACHE: "true",
    },
  });

  const client = new Client(
    { name: "test", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    console.log("🔌 Connecting...");
    await client.connect(transport);
    console.log("✅ Connected\n");

    console.log("📖 Fetching Romans 1:1...");
    console.log("⏰ Timeout: 30 seconds\n");

    const timeoutPromise = new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error("Timeout after 30 seconds")), 30000);
    });

    const fetchPromise = client.callTool("fetch_scripture", {
      reference: "Romans 1:1",
      language: "en",
    });

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if (result.content && result.content[0]) {
      const text = result.content[0].text;
      console.log("✅ SUCCESS!\n");
      console.log("Scripture text:");
      console.log(`"${text}"\n`);
      console.log(`Length: ${text.length} characters`);
    } else {
      console.log("❌ FAILED: No text in response");
      console.log("Response structure:", JSON.stringify(result, null, 2));
    }

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nThis could mean:");
    console.error("  1. Scripture service is hanging during download");
    console.error("  2. Network issue connecting to Door43");
    console.error("  3. USFM parsing is stuck");
    console.error("\nCheck the server logs above for clues.");
    process.exit(1);
  }
}

test();
