/**
 * Test script to verify SDK tools accept and pass language/organization parameters
 */

import { TranslationHelpsClient } from "@translation-helps/mcp-client";

async function testSDKParameters() {
  console.log("🧪 Testing SDK Parameter Passing\n");

  const client = new TranslationHelpsClient({
    serverUrl: "https://translation-helps-mcp-945.pages.dev/api/mcp",
  });

  try {
    await client.connect();
    console.log("✅ Connected to MCP server\n");

    // Test 1: Default parameters (should use "en" and "unfoldingWord")
    console.log(
      'Test 1: Using default parameters (should use "en" and "unfoldingWord")',
    );
    try {
      const result1 = await client.fetchScripture({
        reference: "John 3:16",
        // No language or organization specified
      });
      console.log("✅ Default params test passed");
      console.log(`   Response length: ${result1.length} chars\n`);
    } catch (error) {
      console.log("❌ Default params test failed:", error.message);
    }

    // Test 2: Custom language parameter
    console.log('Test 2: Using custom language parameter (language="es")');
    try {
      const result2 = await client.fetchScripture({
        reference: "John 3:16",
        language: "es",
        // No organization specified (should default to "unfoldingWord")
      });
      console.log("✅ Custom language test passed");
      console.log(`   Response length: ${result2.length} chars\n`);
    } catch (error) {
      console.log("❌ Custom language test failed:", error.message);
    }

    // Test 3: Custom organization parameter
    console.log(
      'Test 3: Using custom organization parameter (organization="testOrg")',
    );
    try {
      const result3 = await client.fetchScripture({
        reference: "John 3:16",
        organization: "testOrg",
        // No language specified (should default to "en")
      });
      console.log("✅ Custom organization test passed");
      console.log(`   Response length: ${result3.length} chars\n`);
    } catch (error) {
      console.log("❌ Custom organization test failed:", error.message);
    }

    // Test 4: Both custom parameters
    console.log(
      'Test 4: Using both custom parameters (language="es", organization="testOrg")',
    );
    try {
      const result4 = await client.fetchScripture({
        reference: "John 3:16",
        language: "es",
        organization: "testOrg",
      });
      console.log("✅ Both custom params test passed");
      console.log(`   Response length: ${result4.length} chars\n`);
    } catch (error) {
      console.log("❌ Both custom params test failed:", error.message);
    }

    // Test 5: Test with fetchTranslationNotes
    console.log("Test 5: Testing fetchTranslationNotes with custom parameters");
    try {
      const result5 = await client.fetchTranslationNotes({
        reference: "John 3:16",
        language: "es",
        organization: "unfoldingWord",
      });
      console.log("✅ fetchTranslationNotes test passed");
      console.log(`   Response type: ${typeof result5}\n`);
    } catch (error) {
      console.log("❌ fetchTranslationNotes test failed:", error.message);
    }

    // Test 6: Test with fetchTranslationWord
    console.log("Test 6: Testing fetchTranslationWord with custom parameters");
    try {
      const result6 = await client.fetchTranslationWord({
        term: "love",
        language: "es",
        organization: "unfoldingWord",
      });
      console.log("✅ fetchTranslationWord test passed");
      console.log(`   Response type: ${typeof result6}\n`);
    } catch (error) {
      console.log("❌ fetchTranslationWord test failed:", error.message);
    }

    console.log("✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testSDKParameters();
