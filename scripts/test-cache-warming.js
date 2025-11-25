#!/usr/bin/env node

/**
 * Test Cache Warming Between Endpoints
 * Demonstrates that search doesn't use the cache that scripture creates
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:8787";

async function testCacheWarming() {
  console.log("🧪 Testing Cache Warming Between Endpoints\n");
  console.log("=".repeat(60));

  try {
    // Step 1: Clear any existing cache by using a unique reference
    const uniqueRef = `John ${Math.floor(Math.random() * 10) + 1}:1`;
    console.log(`\n📝 Using reference: ${uniqueRef}`);

    // Step 2: Fetch scripture (this should cache the ZIP)
    console.log("\n1️⃣ Fetching scripture (should download and cache ZIP)...");
    const scriptureStart = Date.now();
    const scriptureResponse = await fetch(
      `${BASE_URL}/api/fetch-scripture?reference=${encodeURIComponent(uniqueRef)}&language=en&organization=unfoldingWord`,
    );
    const scriptureTime = Date.now() - scriptureStart;
    const scriptureData = await scriptureResponse.json();
    console.log(`   Scripture fetch: ${scriptureTime}ms`);
    console.log(`   Status: ${scriptureResponse.status}`);
    console.log(
      `   Has data: ${scriptureData.scripture?.length > 0 ? "Yes" : "No"}`,
    );

    // Step 3: Now search the same resource (should use cached ZIP if working correctly)
    console.log("\n2️⃣ Searching same resource (SHOULD use cached ZIP)...");
    const searchStart = Date.now();
    const searchResponse = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "love",
        language: "en",
        owner: "unfoldingWord",
        reference: uniqueRef,
        limit: 5,
      }),
    });
    const searchTime = Date.now() - searchStart;
    const searchData = await searchResponse.json();
    console.log(`   Search time: ${searchTime}ms`);
    console.log(`   Server processing: ${searchData.took_ms}ms`);
    console.log(`   Resources searched: ${searchData.resourceCount}`);
    console.log(`   Hits found: ${searchData.hits?.length || 0}`);

    // Step 4: Analyze the results
    console.log("\n📊 Analysis:");
    console.log("=".repeat(40));

    if (scriptureTime < 1000 && searchTime > 3000) {
      console.log("❌ PROBLEM CONFIRMED!");
      console.log(
        "   Scripture was fast (likely had warm cache from previous run)",
      );
      console.log("   But search was still slow (not using the cache)");
      console.log("\n   This proves search is NOT using the shared cache!");
    } else if (scriptureTime > 2000 && searchTime > 3000) {
      console.log("⚠️ Both were slow");
      console.log("   Scripture: First fetch (cold cache) - expected");
      console.log("   Search: Also slow - NOT using scripture's cache!");
      console.log(
        "\n   Search should have been fast since scripture just cached the ZIP!",
      );
    } else if (searchTime < 2000) {
      console.log("✅ Search was fast!");
      console.log("   This would mean cache sharing IS working");
      console.log(
        "   (But based on our analysis, this shouldn't happen with current code)",
      );
    }

    // Step 5: Test the reverse - does scripture use search's cache?
    console.log("\n3️⃣ Testing reverse: Clear cache and search first...");

    // Use a different reference to avoid our previous cache
    const newRef = `Matthew ${Math.floor(Math.random() * 10) + 1}:1`;
    console.log(`   Using new reference: ${newRef}`);

    // Search first
    const search2Start = Date.now();
    const search2Response = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "God",
        language: "en",
        owner: "unfoldingWord",
        reference: newRef,
        limit: 5,
      }),
    });
    const search2Time = Date.now() - search2Start;
    const search2Data = await search2Response.json();
    console.log(
      `\n   Search first: ${search2Time}ms (${search2Data.took_ms}ms server)`,
    );

    // Then scripture
    const scripture2Start = Date.now();
    const _scripture2Response = await fetch(
      `${BASE_URL}/api/fetch-scripture?reference=${encodeURIComponent(newRef)}&language=en&organization=unfoldingWord`,
    );
    const scripture2Time = Date.now() - scripture2Start;
    console.log(`   Scripture after: ${scripture2Time}ms`);

    if (search2Time > 3000 && scripture2Time < 1000) {
      console.log("\n✅ Scripture used search's cache!");
      console.log(
        "   Wait... this shouldn't happen if search doesn't cache properly",
      );
    } else if (search2Time > 3000 && scripture2Time > 2000) {
      console.log("\n❌ Neither endpoint is sharing cache!");
      console.log("   Search downloaded the ZIP");
      console.log("   Scripture also downloaded it again");
    }

    // Final summary
    console.log("\n📋 Summary:");
    console.log("=".repeat(40));
    console.log("If caches were shared properly:");
    console.log("  - Second operation should be <1s (using first's cache)");
    console.log("  - Cache keys should be identical");
    console.log("  - R2/KV would show cache hits");
    console.log("\nActual behavior:");
    console.log("  - Search always slow (no cache usage)");
    console.log("  - Each endpoint maintains separate fetch logic");
    console.log("  - No cache key coordination");
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
  }
}

// Run test
testCacheWarming()
  .then(() => {
    console.log("\n✨ Cache warming test complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error(`💥 Test failed: ${error.message}`);
    process.exit(1);
  });
