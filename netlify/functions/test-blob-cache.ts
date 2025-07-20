/**
 * Test Blob Cache Endpoint
 * GET /api/test-blob-cache
 * Tests Netlify Blobs storage and enhanced caching functionality
 */

import { Handler } from "@netlify/functions";
import {
  corsHeaders,
  errorResponse,
  withConservativeCache,
  buildTransformedCacheKey,
} from "./_shared/utils";
import { cache } from "./_shared/cache";

export const handler: Handler = async (event, context) => {
  console.log("Testing Netlify Blobs and enhanced caching...");

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }

  if (event.httpMethod !== "GET") {
    return errorResponse(405, "Method not allowed", "METHOD_NOT_ALLOWED");
  }

  const startTime = Date.now();
  const testId = event.queryStringParameters?.test || "default";

  // Fix Request construction for production
  const protocol = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers.host || "translation-helps-mcp.netlify.app";
  const path = event.path || "/.netlify/functions/test-blob-cache";

  const request = new Request(`${protocol}://${host}${path}`, {
    method: event.httpMethod,
    headers: event.headers as Record<string, string>,
  });

  try {
    // Test 1: Basic Netlify Blobs operations
    console.log("🧪 Test 1: Basic Netlify Blobs operations...");
    const basicTestKey = `test-blob-${testId}`;
    const basicTestData = {
      message: "Hello from Netlify Blobs!",
      timestamp: new Date().toISOString(),
      testId: testId,
    };

    // Direct cache operations
    await cache.set(basicTestKey, basicTestData, "fileContent");
    const retrievedData = await cache.get(basicTestKey, "fileContent");
    const cacheStats = cache.getStats();

    // Test 2: Enhanced caching helper
    console.log("🧪 Test 2: Enhanced caching helper...");
    const helperCacheKey = buildTransformedCacheKey("test-operation", {
      testId,
      timestamp: Date.now(),
    });

    const cacheResult = await withConservativeCache(
      request,
      helperCacheKey,
      async () => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          computedValue: Math.random() * 1000,
          processed: true,
          testId: testId,
          generatedAt: new Date().toISOString(),
        };
      },
      {
        cacheType: "transformedResponse",
        bypassCache: event.queryStringParameters?.bypass === "true",
      }
    );

    // Test 3: Cache info retrieval
    console.log("🧪 Test 3: Cache info retrieval...");
    const cacheInfo = await cache.getWithCacheInfo(basicTestKey, "fileContent");

    // Compile test results
    const testResults = {
      success: true,
      tests: {
        basicBlobs: {
          passed: !!retrievedData && retrievedData.message === basicTestData.message,
          data: retrievedData,
          original: basicTestData,
        },
        enhancedCaching: {
          passed: !!cacheResult.data,
          cached: cacheResult.cached,
          data: cacheResult.data,
          cacheInfo: cacheResult.cacheInfo,
        },
        cacheInfoRetrieval: {
          passed: !!cacheInfo.value && cacheInfo.cached,
          info: cacheInfo,
        },
      },
      metadata: {
        testId: testId,
        responseTime: Date.now() - startTime,
        cacheStats: cacheStats,
        netlifyBlobsEnabled: cacheStats.netlifyBlobsEnabled,
        appVersion: cacheStats.appVersion,
        allTestsPassed: true, // Will be calculated below
      },
    };

    // Calculate overall test status
    testResults.metadata.allTestsPassed =
      testResults.tests.basicBlobs.passed &&
      testResults.tests.enhancedCaching.passed &&
      testResults.tests.cacheInfoRetrieval.passed;

    // Log results
    console.log("📊 BLOB CACHE TEST RESULTS:", {
      testId: testId,
      allPassed: testResults.metadata.allTestsPassed,
      netlifyBlobsEnabled: cacheStats.netlifyBlobsEnabled,
      cacheStatus: cacheStats.status,
      responseTime: testResults.metadata.responseTime,
    });

    // Clean up test data (optional)
    if (event.queryStringParameters?.cleanup !== "false") {
      await cache.delete(basicTestKey, "fileContent");
      console.log("🧹 Cleaned up test data");
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        ...cacheResult.cacheHeaders,
        "X-Test-Status": testResults.metadata.allTestsPassed ? "PASSED" : "FAILED",
        "X-Netlify-Blobs": cacheStats.netlifyBlobsEnabled ? "ENABLED" : "DISABLED",
        "X-Cache-Version": cacheStats.appVersion || "unknown",
      },
      body: JSON.stringify(testResults, null, 2),
    };
  } catch (error) {
    console.error("❌ Blob cache test failed:", error);

    const errorResult = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        type: error instanceof Error ? error.name : "UnknownError",
      },
      metadata: {
        testId: testId,
        responseTime: Date.now() - startTime,
        cacheStats: cache.getStats(),
      },
    };

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        "X-Test-Status": "ERROR",
        "X-Error-Type": errorResult.error.type,
      },
      body: JSON.stringify(errorResult, null, 2),
    };
  }
};
