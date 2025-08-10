// Direct debug script - no imports, just fetch
async function debugTitus() {
  console.log("🔍 Direct DCS Debug for Titus 1:1\n");

  // 1. Fetch catalog
  console.log("1️⃣ Fetching catalog...");
  const catalogUrl =
    "https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Questions&lang=en&owner=unfoldingWord&metadataType=rc&includeMetadata=true";

  const catalogResponse = await fetch(catalogUrl);
  const catalog = await catalogResponse.json();

  console.log("Catalog results:", catalog.data?.length || 0);

  if (catalog.data && catalog.data.length > 0) {
    const resource = catalog.data[0];
    console.log("\nResource:", resource.name);
    console.log("Ingredients count:", resource.ingredients?.length || 0);

    // Find TIT ingredient
    console.log("\n🔍 Looking for Titus ingredient...");
    resource.ingredients?.forEach((ing) => {
      if (ing.identifier?.toLowerCase().includes("tit")) {
        console.log("  Found:", ing.identifier, "->", ing.path);
      }
    });

    const titIngredient = resource.ingredients?.find(
      (ing) => ing.identifier?.toLowerCase() === "tit",
    );

    if (titIngredient) {
      console.log("\n✅ Titus ingredient found:", titIngredient);

      // 2. Fetch TSV
      console.log("\n2️⃣ Fetching TSV file...");
      const tsvUrl = `https://git.door43.org/${resource.full_name}/raw/branch/${resource.default_branch || "master"}/${titIngredient.path}`;
      console.log("URL:", tsvUrl);

      const tsvResponse = await fetch(tsvUrl);
      const tsvText = await tsvResponse.text();

      console.log("TSV size:", tsvText.length, "bytes");

      // 3. Parse for Titus 1:1
      console.log("\n3️⃣ Parsing for Titus 1:1...");
      const lines = tsvText.split("\n");
      const questions = [];

      for (const line of lines) {
        if (line.startsWith("1:1\t")) {
          const cols = line.split("\t");
          questions.push({
            reference: cols[0],
            id: cols[1],
            tags: cols[2],
            quote: cols[3],
            occurrence: cols[4],
            question: cols[5],
            response: cols[6],
          });
        }
      }

      console.log("\n📋 Titus 1:1 Questions:", questions.length);
      questions.forEach((q, i) => {
        console.log(`\nQ${i + 1}: ${q.question}`);
        console.log(`A: ${q.response}`);
      });
    } else {
      console.log("\n❌ No Titus ingredient found!");
      console.log(
        "All identifiers:",
        resource.ingredients?.map((i) => i.identifier),
      );
    }
  }
}

debugTitus().catch(console.error);
