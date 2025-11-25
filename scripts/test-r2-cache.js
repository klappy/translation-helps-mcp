#!/usr/bin/env node

/**
 * Test R2 Cache Availability and Performance
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:8787";

async function testR2Cache() {
  console.log("🧪 Testing R2 Cache Configuration\n");
  console.log("=".repeat(60));

  // Test if R2 is configured by checking health endpoint
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const health = await healthResponse.json();
    console.log(`✅ Server version: ${health.version}`);
    console.log(`   Status: ${health.status}`);

    // Try to fetch a known resource through the API that should use caching
    console.log("\n📦 Testing ZIP fetch performance (should use cache)...");

    // First fetch - potentially cache miss
    console.log("\n1️⃣ First fetch (potential cache miss):");
    const start1 = Date.now();
    const response1 = await fetch(
      `${BASE_URL}/api/fetch-scripture?reference=John 3:16&language=en&organization=unfoldingWord`,
    );
    const time1 = Date.now() - start1;
    const data1 = await response1.json();
    console.log(`   Time: ${time1}ms`);
    console.log(`   Status: ${response1.status}`);
    console.log(`   Has data: ${data1.scripture?.length > 0 ? "Yes" : "No"}`);

    // Second fetch - should be cached
    console.log("\n2️⃣ Second fetch (should hit cache):");
    const start2 = Date.now();
    const response2 = await fetch(
      `${BASE_URL}/api/fetch-scripture?reference=John 3:16&language=en&organization=unfoldingWord`,
    );
    const time2 = Date.now() - start2;
    const data2 = await response2.json();
    console.log(`   Time: ${time2}ms`);
    console.log(`   Status: ${response2.status}`);
    console.log(`   Has data: ${data2.scripture?.length > 0 ? "Yes" : "No"}`);

    // Calculate improvement
    if (time1 > time2) {
      const improvement = (((time1 - time2) / time1) * 100).toFixed(1);
      console.log(`\n📊 Cache Performance:`);
      console.log(`   First fetch:  ${time1}ms`);
      console.log(`   Second fetch: ${time2}ms`);
      console.log(`   Improvement:  ${improvement}%`);

      if (improvement > 50) {
        console.log(
          `\n✅ Cache appears to be working! (${improvement}% faster)`,
        );
      } else {
        console.log(
          `\n⚠️ Cache might be working but improvement is small (${improvement}%)`,
        );
      }
    } else {
      console.log(
        `\n⚠️ Second fetch was not faster - cache may not be working`,
      );
    }

    // Test direct ZIP URL patterns
    console.log("\n🔍 Testing direct ZIP cache endpoints...");

    const zipUrls = [
      "https://git.door43.org/unfoldingWord/en_tw/archive/master.zip",
      "https://git.door43.org/unfoldingWord/en_tn/archive/master.zip",
    ];

    for (const url of zipUrls) {
      const name = url.split("/")[4];
      console.log(`\n   Testing ${name}:`);

      // Note: We can't directly access R2, but we can see if repeated fetches
      // of the same resource get faster (indicating some form of caching)
      const times = [];
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        // Use HEAD request to avoid downloading full ZIP
        const response = await fetch(url, { method: "HEAD" });
        const time = Date.now() - start;
        times.push(time);
        console.log(`      Attempt ${i + 1}: ${time}ms (${response.status})`);

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Check if times are decreasing (indicating CDN/cache warming)
      const avgFirst = times[0];
      const avgLast = times[times.length - 1];
      if (avgLast < avgFirst * 0.8) {
        console.log(
          `      ✅ Shows caching behavior (${((1 - avgLast / avgFirst) * 100).toFixed(1)}% improvement)`,
        );
      } else {
        console.log(`      ⚠️ No clear caching pattern`);
      }
    }
  } catch (error) {
    console.error(`❌ Error testing R2 cache: ${error.message}`);
  }
}

// Run test
testR2Cache()
  .then(() => {
    console.log("\n✨ R2 cache test complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error(`💥 Test failed: ${error.message}`);
    process.exit(1);
  });
