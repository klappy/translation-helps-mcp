/**
 * Quick MCP Server Test
 * Tests the fetch_translation_word_links tool via stdio
 */

import { spawn } from "child_process";

console.log("🧪 Testing MCP Server - Translation Word Links\n");

// Start the MCP server
const mcp = spawn("node", ["src/index.ts"], {
  stdio: ["pipe", "pipe", "pipe"],
});

let responseBuffer = "";
let requestId = 1;

mcp.stdout.on("data", (data) => {
  responseBuffer += data.toString();

  // Try to parse complete JSON-RPC messages
  const lines = responseBuffer.split("\n");
  responseBuffer = lines.pop() || ""; // Keep incomplete line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const response = JSON.parse(line);

      if (response.id === 1) {
        console.log("✅ Tools List Response:");
        console.log(`   Total tools: ${response.result?.tools?.length || 0}`);
        response.result?.tools?.forEach((tool, i) => {
          console.log(`   ${i + 1}. ${tool.name}`);
        });
        console.log("");

        // Now call the fetch_translation_word_links tool
        sendToolCall();
      } else if (response.id === 2) {
        console.log("✅ fetch_translation_word_links Response:\n");
        console.log(JSON.stringify(response.result, null, 2));
        console.log("\n📊 Checking for extracted fields:");

        const links = response.result?.content?.[0]?.text
          ? JSON.parse(response.result.content[0].text).translationWordLinks
          : response.result?.translationWordLinks;

        if (links && links.length > 0) {
          const firstLink = links[0];
          console.log(`   ✅ category: ${firstLink.category || "MISSING"}`);
          console.log(`   ✅ word: ${firstLink.word || "MISSING"}`);
          console.log(`   ✅ path: ${firstLink.path || "MISSING"}`);
          console.log(`   ✅ rcLink: ${firstLink.rcLink || "MISSING"}`);

          if (firstLink.category && firstLink.word && firstLink.path) {
            console.log("\n🎉 SUCCESS! All extracted fields present!");
          } else {
            console.log("\n❌ ERROR! Missing extracted fields!");
          }
        }

        mcp.kill();
        process.exit(0);
      }
    } catch (err) {
      // Ignore parse errors for incomplete messages
    }
  }
});

mcp.stderr.on("data", (data) => {
  console.error("MCP Server Error:", data.toString());
});

mcp.on("close", (code) => {
  console.log(`\nMCP server exited with code ${code}`);
});

// Wait a bit for server to start, then send list tools request
setTimeout(() => {
  console.log("📤 Sending tools/list request...\n");

  const listRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  };

  mcp.stdin.write(JSON.stringify(listRequest) + "\n");
}, 500);

function sendToolCall() {
  console.log("📤 Sending fetch_translation_word_links call...\n");

  const callRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "fetch_translation_word_links",
      arguments: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      },
    },
  };

  mcp.stdin.write(JSON.stringify(callRequest) + "\n");
}

// Timeout after 30 seconds
setTimeout(() => {
  console.log("❌ Test timeout!");
  mcp.kill();
  process.exit(1);
}, 30000);
