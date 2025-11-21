/**
 * Debug test to see raw error responses from server
 */

import { TranslationHelpsClient } from "@translation-helps/mcp-client";

async function testES419Debug() {
  console.log("🧪 Debug Test: Checking raw server responses\n");
  console.log(
    'Parameters: language="es-419", organization="es-419_gl", reference="Est 1:1"\n',
  );

  const client = new TranslationHelpsClient({
    serverUrl: "https://translation-helps-mcp-945.pages.dev/api/mcp",
  });

  try {
    await client.connect();
    console.log("✅ Connected to MCP server\n");

    // Test fetchScripture with raw response inspection
    console.log("Test: fetchScripture - inspecting raw response");
    try {
      // Call the tool directly to see raw response
      const rawResponse = await client.callTool("fetch_scripture", {
        reference: "Est 1:1",
        language: "es-419",
        organization: "es-419_gl",
      });

      console.log("Raw response structure:");
      console.log(JSON.stringify(rawResponse, null, 2));

      if (rawResponse.content && rawResponse.content[0]?.text) {
        const text = rawResponse.content[0].text;
        console.log("\nResponse text (first 500 chars):");
        console.log(text.substring(0, 500));
      }
    } catch (error) {
      console.log("Error:", error.message);
      console.log("Stack:", error.stack);
    }

    // Also test with English to compare
    console.log("\n\nComparison: Testing with English (en/unfoldingWord)");
    try {
      const rawResponseEN = await client.callTool("fetch_scripture", {
        reference: "Est 1:1",
        language: "en",
        organization: "unfoldingWord",
      });

      console.log("English response structure:");
      console.log(JSON.stringify(rawResponseEN, null, 2));

      if (rawResponseEN.content && rawResponseEN.content[0]?.text) {
        const text = rawResponseEN.content[0].text;
        console.log("\nEnglish response text (first 500 chars):");
        console.log(text.substring(0, 500));
      }
    } catch (error) {
      console.log("Error:", error.message);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testES419Debug();
