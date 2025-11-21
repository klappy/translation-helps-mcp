/**
 * Test the Door43 catalog API directly to see if es-419 resources exist
 */

async function testCatalogES419() {
  console.log("🧪 Testing Door43 Catalog API for es-419 resources\n");
  console.log('Parameters: language="es-419", organization="es-419_gl"\n');

  const baseUrl = "https://git.door43.org/api/v1/catalog/search";

  // Test 1: Search for Bible resources
  console.log("Test 1: Searching for Bible resources");
  const bibleParams = new URLSearchParams({
    lang: "es-419",
    owner: "es-419_gl",
    type: "text",
    stage: "prod",
    subject: "Bible,Aligned Bible",
    metadataType: "rc",
    includeMetadata: "true",
  });

  try {
    const response1 = await fetch(`${baseUrl}?${bibleParams.toString()}`);
    const data1 = await response1.json();
    console.log(`Status: ${response1.status}`);
    console.log(`Resources found: ${data1.data?.length || 0}`);
    if (data1.data && data1.data.length > 0) {
      console.log(`First resource: ${data1.data[0].name}`);
      console.log(`Has ingredients: ${!!data1.data[0].ingredients}`);
    }
    console.log("");
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 2: Search for Translation Notes
  console.log("Test 2: Searching for Translation Notes");
  const tnParams = new URLSearchParams({
    lang: "es-419",
    owner: "es-419_gl",
    subject: "TSV Translation Notes",
    metadataType: "rc",
    includeMetadata: "true",
  });

  try {
    const response2 = await fetch(`${baseUrl}?${tnParams.toString()}`);
    const data2 = await response2.json();
    console.log(`Status: ${response2.status}`);
    console.log(`Resources found: ${data2.data?.length || 0}`);
    if (data2.data && data2.data.length > 0) {
      console.log(`First resource: ${data2.data[0].name}`);
    }
    console.log("");
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 3: Compare with English (should work)
  console.log("Test 3: Comparing with English (en/unfoldingWord)");
  const enParams = new URLSearchParams({
    lang: "en",
    owner: "unfoldingWord",
    type: "text",
    stage: "prod",
    subject: "Bible,Aligned Bible",
    metadataType: "rc",
    includeMetadata: "true",
  });

  try {
    const response3 = await fetch(`${baseUrl}?${enParams.toString()}`);
    const data3 = await response3.json();
    console.log(`Status: ${response3.status}`);
    console.log(`Resources found: ${data3.data?.length || 0}`);
    if (data3.data && data3.data.length > 0) {
      console.log(`First resource: ${data3.data[0].name}`);
    }
    console.log("");
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 4: Try different organization format (maybe it's "es-419_gl" vs something else)
  console.log("Test 4: Testing alternative organization formats");
  const altParams = new URLSearchParams({
    lang: "es-419",
    type: "text",
    stage: "prod",
    subject: "Bible,Aligned Bible",
    metadataType: "rc",
    includeMetadata: "true",
  });

  try {
    const response4 = await fetch(`${baseUrl}?${altParams.toString()}`);
    const data4 = await response4.json();
    console.log(`Status: ${response4.status}`);
    console.log(`Resources found: ${data4.data?.length || 0}`);
    if (data4.data && data4.data.length > 0) {
      console.log("Available organizations for es-419:");
      const orgs = [...new Set(data4.data.map((r) => r.owner))];
      console.log(orgs.join(", "));
    }
    console.log("");
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }
}

testCatalogES419();
