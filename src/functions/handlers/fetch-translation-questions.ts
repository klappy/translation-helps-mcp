/**
 * Unified, config-driven handler for Translation Questions
 * Mirrors scripture by delegating to RouteGenerator with ZIP-cached data source
 */

import { routeGenerator } from "../../config/RouteGenerator.js";
import {
  endpointRegistry,
  initializeAllEndpoints,
} from "../../config/endpoints/index.js";
import type { PlatformHandler } from "../platform-adapter";

// Initialize endpoint registry once
try {
  initializeAllEndpoints();
} catch {
  // no-op; endpoints may already be initialized
}

// Resolve endpoint config and generate the platform-agnostic handler
const tqConfig = endpointRegistry.get("fetch-translation-questions");
if (!tqConfig) {
  throw new Error(
    "fetch-translation-questions endpoint configuration not found",
  );
}
if (!tqConfig.enabled) {
  throw new Error("fetch-translation-questions endpoint is disabled");
}

const generated = routeGenerator.generateHandler(tqConfig);

export const fetchTranslationQuestionsHandler: PlatformHandler =
  generated.handler;
