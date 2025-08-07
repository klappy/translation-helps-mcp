#!/usr/bin/env node

/**
 * Direct test of ZIP approach with ingredients
 */

async function testZipFetch() {
  console.log("🔍 Testing ZIP-based scripture fetch with ingredients...\n");

  // 1. Fetch catalog
  const catalogUrl =
    "https://git.door43.org/api/v1/catalog/search?lang=en&owner=unfoldingWord&type=text&subject=Bible,Aligned%20Bible";

  console.log("📖 Fetching catalog:", catalogUrl);
  const catalogResponse = await fetch(catalogUrl);
  const catalogData = await catalogResponse.json();

  console.log(`✅ Found ${catalogData.data.length} Bible resources`);

  // 2. Find ULT
  const ult = catalogData.data.find((r) => r.name === "en_ult");
  if (!ult) {
    console.error("❌ ULT not found!");
    return;
  }

  console.log("\n📚 ULT Resource:");
  console.log(`  Name: ${ult.name}`);
  console.log(`  Repo:`, ult.repo);
  console.log(`  Owner: ${ult.owner}`);
  console.log(`  Ingredients: ${ult.ingredients?.length || 0} files`);

  // 3. Find John ingredient
  const johnIngredient = ult.ingredients?.find(
    (i) =>
      i.identifier === "jhn" ||
      i.identifier === "John" ||
      i.identifier === "john",
  );

  if (!johnIngredient) {
    console.error("❌ John ingredient not found!");
    console.log(
      "Available identifiers:",
      ult.ingredients?.slice(0, 5).map((i) => i.identifier),
    );
    return;
  }

  console.log("\n📄 John Ingredient:");
  console.log(`  Identifier: ${johnIngredient.identifier}`);
  console.log(`  Path: ${johnIngredient.path}`);
  console.log(`  Title: ${johnIngredient.title}`);

  // 4. Download ZIP
  const zipUrl = `https://git.door43.org/${ult.owner}/${ult.name}/archive/master.zip`;
  console.log("\n⬇️  Downloading ZIP:", zipUrl);

  const zipResponse = await fetch(zipUrl);
  if (!zipResponse.ok) {
    console.error("❌ ZIP download failed:", zipResponse.status);
    return;
  }

  const zipBuffer = await zipResponse.arrayBuffer();
  console.log(
    `✅ Downloaded ZIP: ${(zipBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`,
  );

  // 5. Extract John using fflate
  const { unzipSync } = await import("fflate");
  const unzipped = unzipSync(new Uint8Array(zipBuffer));

  console.log("\n📦 ZIP Contents (first 10 files):");
  const files = Object.keys(unzipped);
  files.slice(0, 10).forEach((f) => console.log(`  - ${f}`));

  // 6. Find John file
  const cleanPath = johnIngredient.path.replace(/^\.\//, "");
  const possiblePaths = [
    cleanPath,
    `./${cleanPath}`,
    `en_ult/${cleanPath}`,
    `${ult.name}/${cleanPath}`,
    `en_ult-master/${cleanPath}`,
  ];

  console.log("\n🔍 Looking for John file...");
  let johnContent = null;
  for (const path of possiblePaths) {
    console.log(`  Trying: ${path}`);
    if (unzipped[path]) {
      const decoder = new TextDecoder("utf-8");
      johnContent = decoder.decode(unzipped[path]);
      console.log(`  ✅ Found!`);
      break;
    }
  }

  if (!johnContent) {
    console.error("❌ John file not found in ZIP!");
    return;
  }

  // 7. Extract John 3:16
  console.log("\n📖 Extracting John 3:16...");

  const chapterMatch = johnContent.match(/\\c\s+3\b/);
  if (!chapterMatch) {
    console.error("❌ Chapter 3 not found!");
    return;
  }

  const chapterStart = chapterMatch.index + chapterMatch[0].length;
  const nextChapter = johnContent.substring(chapterStart).match(/\\c\s+\d+/);
  const chapterEnd = nextChapter
    ? chapterStart + nextChapter.index
    : johnContent.length;
  const chapter3 = johnContent.substring(chapterStart, chapterEnd);

  const verseMatch = chapter3.match(/\\v\s+16\b/);
  if (!verseMatch) {
    console.error("❌ Verse 16 not found!");
    return;
  }

  const verseStart = verseMatch.index + verseMatch[0].length;
  const nextVerse = chapter3.substring(verseStart).match(/\\v\s+\d+/);
  const verseEnd = nextVerse ? verseStart + nextVerse.index : chapter3.length;

  let verse16 = chapter3.substring(verseStart, verseEnd);

  // Clean USFM
  verse16 = verse16
    .replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, "$1")
    .replace(/\\zaln-[se]\|[^\\]+\\*/g, "")
    .replace(/\\[a-z]+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  console.log("\n✅ SUCCESS! John 3:16 (ULT):");
  console.log(`"${verse16}"`);

  console.log("\n🎉 ZIP + Ingredients approach WORKS!");
}

testZipFetch().catch(console.error);
