/**
 * Example: How to use the functional approach in endpoints
 *
 * This shows how much simpler and cleaner the functional approach is.
 */

import { EdgeXRayTracer } from "../functions/edge-xray.js";
import { DCSApiClient } from "../services/DCSApiClient.js";
import { ZipResourceFetcher2 } from "../services/ZipResourceFetcher2.js";
import type { EndpointConfig } from "./EndpointConfig.js";
import {
  createDCSFetcher,
  createDataFetcher,
  createEndpointHandler,
  createFallbackFetcher,
  createZIPFetcher,
} from "./functionalDataFetchers.js";

// Example 1: Simple endpoint using the functional approach
export const createFetchScriptureEndpoint = () => {
  const config: EndpointConfig = {
    name: "fetch-scripture",
    path: "/fetch-scripture",
    title: "Fetch Scripture",
    description: "Retrieve scripture text using ZIP caching",
    category: "core",

    params: {
      reference: { type: "string", required: true },
      language: { type: "string", default: "en" },
      organization: { type: "string", default: "unfoldingWord" },
      resource: { type: "string", default: "ult" },
    },

    dataSource: {
      type: "zip-cached",
      cacheTtl: 3600,
      zipConfig: {
        fetchMethod: "getScripture",
        resourceType: "ult",
        warmCache: true,
        zipCacheTtl: 86400,
      },
    },

    enabled: true,
    tags: ["scripture", "zip-cached"],
  } as EndpointConfig;

  // Create dependencies
  const dcsClient = new DCSApiClient();
  let zipFetcher: ZipResourceFetcher2 | null = null;

  const getZipFetcher = () => {
    if (!zipFetcher) {
      const tracer = new EdgeXRayTracer("zip-fetcher", "functional");
      zipFetcher = new ZipResourceFetcher2(tracer);
    }
    return zipFetcher;
  };

  // Create the data fetcher
  const fetcher = createDataFetcher({ dcsClient, getZipFetcher });

  // Return the handler
  return createEndpointHandler(config, fetcher);
};

// Example 2: Custom fetcher with fallback (ZIP → API)
export const createRobustScriptureEndpoint = () => {
  const config: EndpointConfig = {
    name: "fetch-scripture-robust",
    path: "/fetch-scripture-robust",
    title: "Fetch Scripture with Fallback",
    description: "Try ZIP first, fall back to API if needed",
    category: "core",

    params: {
      reference: { type: "string", required: true },
      language: { type: "string", default: "en" },
    },

    dataSource: {
      type: "zip-cached", // Primary
      cacheTtl: 3600,
      zipConfig: {
        fetchMethod: "getScripture",
        resourceType: "ult",
      },
    },

    enabled: true,
  } as EndpointConfig;

  // Create both fetchers
  const dcsClient = new DCSApiClient();
  let zipFetcher: ZipResourceFetcher2 | null = null;

  const getZipFetcher = () => {
    if (!zipFetcher) {
      const tracer = new EdgeXRayTracer("zip-fetcher", "functional");
      zipFetcher = new ZipResourceFetcher2(tracer);
    }
    return zipFetcher;
  };

  // Create API fallback config
  const apiConfig = {
    ...config.dataSource,
    type: "dcs-api" as const,
    dcsEndpoint: "/api/v1/repos/{organization}/{language}_ult/contents/{book}/{chapter}.usfm",
  };

  // Create composed fetcher
  const zipDataFetcher = createZIPFetcher(getZipFetcher);
  const apiDataFetcher = createDCSFetcher(dcsClient);

  const robustFetcher = createFallbackFetcher(
    (cfg, params, ctx) => zipDataFetcher(config.dataSource, params, ctx),
    (cfg, params, ctx) => apiDataFetcher(apiConfig, params, ctx)
  );

  return createEndpointHandler(config, robustFetcher);
};

// Example 3: How to use in a SvelteKit endpoint
export async function GET({ request, platform }: any) {
  const handler = createFetchScriptureEndpoint();
  return handler(request, platform);
}

// Example 4: Composing multiple data sources (functional hybrid)
export const createHybridEndpoint = () => {
  // This demonstrates how to combine multiple data sources functionally
  const fetchScriptureData = createZIPFetcher(
    () => new ZipResourceFetcher2(new EdgeXRayTracer("hybrid", "scripture"))
  );

  const fetchMetadata = createDCSFetcher(new DCSApiClient());

  // Compose them
  const hybridFetcher = async (config: any, params: any, context: any) => {
    // Fetch both in parallel
    const [scriptureData, metadata] = await Promise.all([
      fetchScriptureData(config, params, context),
      fetchMetadata(
        { ...config, dcsEndpoint: "/api/v1/repos/{organization}/{language}_ult" },
        params,
        context
      ),
    ]);

    // Combine results
    return {
      scripture: scriptureData,
      metadata: metadata,
      _hybrid: true,
    };
  };

  return hybridFetcher;
};
