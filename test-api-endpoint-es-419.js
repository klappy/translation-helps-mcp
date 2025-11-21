/**
 * Test the API endpoint directly to see the actual error
 */

async function testAPIEndpoint() {
  console.log("🧪 Testing API Endpoint Directly\n");
  console.log(
    'Parameters: language="es-419", organization="es-419_gl", reference="Est 1:1"\n',
  );

  const baseUrl = "https://translation-helps-mcp-945.pages.dev/api";

  // Test the fetch-scripture endpoint
  const params = new URLSearchParams({
    reference: "Est 1:1",
    language: "es-419",
    organization: "es-419_gl",
    format: "json",
  });

  try {
    console.log(`Calling: ${baseUrl}/fetch-scripture?${params.toString()}`);
    const response = await fetch(
      `${baseUrl}/fetch-scripture?${params.toString()}`,
    );

    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log(`\nResponse body (first 1000 chars):`);
    console.log(text.substring(0, 1000));

    // Try to parse as JSON
    try {
      const json = JSON.parse(text);
      console.log(`\nParsed JSON:`, JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(`\nResponse is not valid JSON`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

testAPIEndpoint();
