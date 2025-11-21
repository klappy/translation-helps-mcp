#!/usr/bin/env node
/**
 * Direct MCP Tool Testing Script
 *
 * Tests each MCP tool in isolation to verify they return correct data
 * from Door43 before involving the AI.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🧪 Testing MCP Tools Directly\n");
console.log("=".repeat(60));

async function testMCPTools() {
  const serverPath = path.resolve(__dirname, "src", "index.ts");

  console.log(`\n🔌 Connecting to MCP server at: ${serverPath}\n`);

  // Create transport
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", serverPath],
    env: {
      ...process.env,
      USE_FS_CACHE: "true",
      NODE_ENV: "development",
    },
  });

  // Create client
  const client = new Client(
    {
      name: "mcp-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  try {
    await client.connect(transport);
    console.log("✅ Connected to MCP server\n");

    // List available tools
    console.log("📋 Listing available tools...\n");
    const toolsList = await client.listTools();

    console.log(`Found ${toolsList.tools.length} tools:\n`);
    toolsList.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("\n🧪 TEST 1: fetch_scripture for Romans 1:1\n");

    const scriptureResult = await client.callTool("fetch_scripture", {
      reference: "Romans 1:1",
      language: "en",
    });

    console.log("📖 Scripture Response:");
    if (scriptureResult.content && scriptureResult.content[0]) {
      const text = scriptureResult.content[0].text;
      console.log(`✅ SUCCESS: Got scripture text`);
      console.log(`Length: ${text.length} characters`);
      console.log(`Preview: "${text.substring(0, 100)}..."\n`);
    } else {
      console.log("❌ FAILED: No scripture text returned");
      console.log(`Response:`, JSON.stringify(scriptureResult, null, 2));
    }

    console.log("=".repeat(60));
    console.log("\n🧪 TEST 2: fetch_translation_notes for Romans 1:1\n");

    const notesResult = await client.callTool("fetch_translation_notes", {
      reference: "Romans 1:1",
      language: "en",
    });

    console.log("📝 Translation Notes Response:");
    if (notesResult.content && notesResult.content[0]) {
      const data = JSON.parse(notesResult.content[0].text);
      console.log(`✅ SUCCESS: Got translation notes`);
      console.log(`Total notes: ${data.items?.length || 0}`);
      if (data.items && data.items.length > 0) {
        console.log(`\nFirst note:`);
        console.log(`  Quote: "${data.items[0].Quote}"`);
        console.log(`  Note: "${data.items[0].Note.substring(0, 80)}..."`);
      }
      console.log();
    } else {
      console.log("❌ FAILED: No notes returned");
    }

    console.log("=".repeat(60));
    console.log("\n🧪 TEST 3: fetch_translation_questions for Romans 1:1\n");

    const questionsResult = await client.callTool(
      "fetch_translation_questions",
      {
        reference: "Romans 1:1",
        language: "en",
      },
    );

    console.log("❓ Translation Questions Response:");
    if (questionsResult.content && questionsResult.content[0]) {
      const data = JSON.parse(questionsResult.content[0].text);
      console.log(`✅ SUCCESS: Got translation questions`);
      console.log(`Total questions: ${data.items?.length || 0}`);
      if (data.items && data.items.length > 0) {
        console.log(`\nFirst question:`);
        console.log(`  Q: "${data.items[0].Question}"`);
        console.log(`  A: "${data.items[0].Response}"`);
      }
      console.log();
    } else {
      console.log("❌ FAILED: No questions returned");
    }

    console.log("=".repeat(60));
    console.log("\n🧪 TEST 4: fetch_translation_word_links for Romans 1:1\n");

    const wordLinksResult = await client.callTool(
      "fetch_translation_word_links",
      {
        reference: "Romans 1:1",
        language: "en",
      },
    );

    console.log("🔗 Translation Word Links Response:");
    if (wordLinksResult.content && wordLinksResult.content[0]) {
      const data = JSON.parse(wordLinksResult.content[0].text);
      console.log(`✅ SUCCESS: Got word links`);
      console.log(`Total links: ${data.links?.length || 0}`);
      if (data.links && data.links.length > 0) {
        console.log(`\nFirst few terms:`);
        data.links.slice(0, 3).forEach((link) => {
          console.log(`  - ${link.term || link.id}`);
        });
      }
      console.log();
    } else {
      console.log("❌ FAILED: No word links returned");
    }

    console.log("=".repeat(60));
    console.log("\n🧪 TEST 5: fetch_translation_academy for Romans 1:1\n");

    const academyResult = await client.callTool("fetch_translation_academy", {
      reference: "Romans 1:1",
      language: "en",
    });

    console.log("🎓 Translation Academy Response:");
    if (academyResult.content && academyResult.content[0]) {
      const data = JSON.parse(academyResult.content[0].text);
      console.log(`✅ SUCCESS: Got academy articles`);
      console.log(`Total articles: ${Array.isArray(data) ? data.length : 0}`);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`\nFirst article:`);
        console.log(`  Title: ${data[0].title || data[0].moduleId}`);
        console.log(`  Module: ${data[0].moduleId}`);
      }
      console.log();
    } else {
      console.log("❌ FAILED: No academy articles returned");
    }

    console.log("=".repeat(60));
    console.log("\n📊 TEST SUMMARY\n");

    const results = {
      scripture: scriptureResult.content?.[0]?.text ? "✅ PASS" : "❌ FAIL",
      notes: notesResult.content?.[0]?.text ? "✅ PASS" : "❌ FAIL",
      questions: questionsResult.content?.[0]?.text ? "✅ PASS" : "❌ FAIL",
      wordLinks: wordLinksResult.content?.[0]?.text ? "✅ PASS" : "❌ FAIL",
      academy: academyResult.content?.[0]?.text ? "✅ PASS" : "❌ FAIL",
    };

    Object.entries(results).forEach(([test, result]) => {
      console.log(`  ${test.padEnd(15)}: ${result}`);
    });

    const passCount = Object.values(results).filter((r) =>
      r.includes("PASS"),
    ).length;
    const totalCount = Object.values(results).length;

    console.log(`\n  Total: ${passCount}/${totalCount} tests passed`);

    if (passCount === totalCount) {
      console.log("\n✅ ALL TESTS PASSED - MCP server is working correctly!");
      console.log("\nYou can now test with the AI using:");
      console.log("  npm run cli:start\n");
    } else {
      console.log("\n❌ SOME TESTS FAILED - Check the logs above for errors");
    }

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error testing MCP server:", error);
    process.exit(1);
  }
}

testMCPTools();
