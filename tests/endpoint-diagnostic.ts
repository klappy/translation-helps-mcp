/**
 * Endpoint Diagnostic Tool
 *
 * Shows exactly what each endpoint returns vs what it should return
 * Run with: npx tsx tests/endpoint-diagnostic.ts
 */

const BASE_URL = "http://localhost:8176";

// Color codes for terminal output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

async function testEndpoint(
  name: string,
  endpoint: string,
  params: Record<string, string>,
) {
  console.log(
    `\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`${colors.blue}Testing: ${name}${colors.reset}`);
  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`,
  );

  const url = new URL(`${BASE_URL}/api/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  console.log(`URL: ${url.toString()}`);
  console.log(`Params:`, params);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    console.log(
      `\nStatus: ${response.ok ? colors.green : colors.red}${response.status}${colors.reset}`,
    );
    console.log(`\nResponse:`, JSON.stringify(data, null, 2));

    // Analyze the response
    console.log(`\n${colors.yellow}Analysis:${colors.reset}`);

    if (endpoint.includes("scripture")) {
      const hasText = data.data?.text || data.text;
      console.log(
        `- Has scripture text: ${hasText ? colors.green + "✓" : colors.red + "✗"} ${colors.reset}`,
      );
      if (hasText) {
        console.log(`- Text length: ${hasText.length} characters`);
        console.log(`- First 100 chars: "${hasText.substring(0, 100)}..."`);
      }
    }

    if (endpoint.includes("notes")) {
      const notes = data.data?.notes || data.notes || data.data || [];
      console.log(
        `- Has notes: ${notes.length > 0 ? colors.green + "✓" : colors.red + "✗"} ${colors.reset}`,
      );
      console.log(`- Number of notes: ${notes.length}`);
      if (notes[0]) {
        console.log(`- First note structure:`, Object.keys(notes[0]));
      }
    }

    if (endpoint.includes("words")) {
      const words = data.data?.words || data.words || data.data || [];
      const definition = data.data?.definition || data.definition;
      console.log(
        `- Has words/definition: ${words.length > 0 || definition ? colors.green + "✓" : colors.red + "✗"} ${colors.reset}`,
      );
      if (Array.isArray(words)) {
        console.log(`- Number of words: ${words.length}`);
      }
      if (definition) {
        console.log(`- Definition length: ${definition.length} characters`);
      }
    }
  } catch (error) {
    console.log(`${colors.red}ERROR: ${error}${colors.reset}`);
  }
}

async function runDiagnostics() {
  console.log(`${colors.yellow}🔍 ENDPOINT DIAGNOSTIC REPORT${colors.reset}`);
  console.log(`Running at: ${new Date().toISOString()}`);

  // Test scripture endpoints
  await testEndpoint("Fetch Scripture (ULT)", "fetch-scripture", {
    reference: "John 3:16",
    language: "en",
    version: "ult",
  });

  await testEndpoint("Fetch UST Scripture", "fetch-ust-scripture", {
    reference: "Titus 1:1",
    language: "en",
  });

  await testEndpoint("Fetch Scripture Range", "fetch-scripture", {
    reference: "John 3:16-17",
    language: "en",
    version: "ult",
  });

  // Test with organization parameter
  await testEndpoint(
    "Translation Notes (with org)",
    "fetch-translation-notes",
    {
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
    },
  );

  await testEndpoint(
    "Translation Notes (without org)",
    "fetch-translation-notes",
    {
      reference: "John 3:16",
      language: "en",
    },
  );

  // Test translation words with different params
  await testEndpoint(
    "Get Translation Word (word param)",
    "get-translation-word",
    {
      word: "love",
      language: "en",
    },
  );

  await testEndpoint(
    "Get Translation Word (term param)",
    "get-translation-word",
    {
      term: "love",
      language: "en",
    },
  );

  await testEndpoint("Browse Translation Words", "browse-translation-words", {
    language: "en",
    category: "kt",
  });

  // Test context aggregation
  await testEndpoint("Get Context", "get-context", {
    reference: "John 3:16",
    language: "en",
  });

  // Test error handling
  await testEndpoint("Invalid Reference", "fetch-scripture", {
    reference: "NotABook 99:99",
    language: "en",
  });

  await testEndpoint(
    "Missing Parameters",
    "fetch-scripture",
    { language: "en" }, // Missing reference
  );

  console.log(
    `\n${colors.yellow}═══════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`${colors.yellow}DIAGNOSTIC COMPLETE${colors.reset}`);
  console.log(
    `${colors.yellow}═══════════════════════════════════════════════════════${colors.reset}\n`,
  );
}

// Run the diagnostics
runDiagnostics().catch(console.error);
