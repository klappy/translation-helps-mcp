/**
 * Check what resources are available for es-419 and how they map
 */

async function checkES419Resources() {
  console.log("🔍 Checking es-419 Resources and Mapping\n");

  const baseUrl = "https://git.door43.org/api/v1/catalog/search";

  // Get Bible resources
  const params = new URLSearchParams({
    lang: "es-419",
    owner: "es-419_gl",
    type: "text",
    stage: "prod",
    subject: "Bible,Aligned Bible",
    metadataType: "rc",
    includeMetadata: "true",
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await response.json();

  console.log(`Found ${data.data?.length || 0} Bible resources:\n`);

  if (data.data && data.data.length > 0) {
    data.data.forEach((resource, idx) => {
      console.log(`Resource ${idx + 1}:`);
      console.log(`  Name: ${resource.name}`);
      console.log(`  Title: ${resource.title || "N/A"}`);
      console.log(`  Type: ${resource.type || "N/A"}`);
      console.log(`  Owner: ${resource.owner || "N/A"}`);

      if (resource.ingredients && resource.ingredients.length > 0) {
        console.log(`  Ingredients: ${resource.ingredients.length} files`);
        // Check if Esther is in ingredients
        const esther = resource.ingredients.find(
          (ing) =>
            ing.identifier?.toLowerCase() === "est" ||
            ing.identifier?.toLowerCase() === "esther",
        );
        if (esther) {
          console.log(
            `  ✅ Esther found: ${esther.identifier} -> ${esther.path}`,
          );
        } else {
          console.log(`  ⚠️  Esther not found in ingredients`);
          console.log(
            `     Available books: ${resource.ingredients
              .slice(0, 5)
              .map((i) => i.identifier)
              .join(", ")}...`,
          );
        }
      } else {
        console.log(`  ⚠️  No ingredients found`);
      }
      console.log("");
    });
  }

  // Compare with English
  console.log("\n📊 Comparison with English:\n");
  const enParams = new URLSearchParams({
    lang: "en",
    owner: "unfoldingWord",
    type: "text",
    stage: "prod",
    subject: "Bible,Aligned Bible",
    metadataType: "rc",
    includeMetadata: "true",
  });

  const enResponse = await fetch(`${baseUrl}?${enParams.toString()}`);
  const enData = await enResponse.json();

  console.log(`English resources: ${enData.data?.length || 0}`);
  if (enData.data && enData.data.length > 0) {
    console.log(`Resource names: ${enData.data.map((r) => r.name).join(", ")}`);
  }
}

checkES419Resources();
