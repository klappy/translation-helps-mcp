/**
 * Unified scripture handler: delegate to RouteGenerator (mirrors questions)
 */

import { routeGenerator } from "../../config/RouteGenerator.js";
import {
  endpointRegistry,
  initializeAllEndpoints,
} from "../../config/endpoints/index.js";
import type { PlatformHandler } from "../platform-adapter";

try {
  initializeAllEndpoints();
} catch {
  // already initialized
}

const scriptureConfig = endpointRegistry.get("fetch-scripture");
if (!scriptureConfig) {
  throw new Error("fetch-scripture endpoint configuration not found");
}
if (!scriptureConfig.enabled) {
  throw new Error("fetch-scripture endpoint is disabled");
}

const scriptureGenerated = routeGenerator.generateHandler(scriptureConfig);

export const fetchScriptureHandler: PlatformHandler =
  scriptureGenerated.handler;
