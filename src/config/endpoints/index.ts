/**
 * Endpoint Configuration Index
 *
 * Registers all endpoint configurations with the registry
 */

import { endpointRegistry } from "../EndpointRegistry";
import { ContextEndpoints } from "./ContextEndpoints";
import { DiscoveryEndpoints } from "./DiscoveryEndpoints";
import { ScriptureEndpoints } from "./ScriptureEndpoints";
import { TranslationHelpsEndpoints } from "./TranslationHelpsEndpoints";

// Register all core endpoints
function registerCoreEndpoints() {
  // Scripture endpoints
  ScriptureEndpoints.forEach((config) => {
    endpointRegistry.register(config);
  });

  // Translation helps endpoints
  TranslationHelpsEndpoints.forEach((config) => {
    endpointRegistry.register(config);
  });

  // Discovery endpoints
  DiscoveryEndpoints.forEach((config) => {
    endpointRegistry.register(config);
  });

  // Context endpoints
  ContextEndpoints.forEach((config) => {
    endpointRegistry.register(config);
  });
}

// Register experimental endpoints
function registerExperimentalEndpoints() {
  // Experimental endpoints will be registered here
  // For now, this is empty as we're focusing on core
}

// Initialize all endpoints
export function initializeEndpoints() {
  registerCoreEndpoints();
  registerExperimentalEndpoints();

  // Validate all registered endpoints
  const errors = endpointRegistry.validate();
  if (errors.length > 0) {
    console.warn("Endpoint configuration warnings:", errors);
  }
}

// Export the registry for use
export { endpointRegistry };
