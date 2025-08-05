/**
 * Endpoint Configurations Index
 *
 * Central registry and initialization point for all endpoint configurations.
 * Automatically registers configurations and provides utilities for
 * endpoint management.
 */

import { endpointRegistry } from "../EndpointRegistry.js";
import { SCRIPTURE_ENDPOINTS } from "./ScriptureEndpoints.js";
import { TRANSLATION_HELPS_ENDPOINTS } from "./TranslationHelpsEndpoints.js";

/**
 * Register all scripture endpoints
 */
function registerScriptureEndpoints(): void {
  console.log("📖 Registering Scripture endpoints...");

  for (const config of SCRIPTURE_ENDPOINTS) {
    try {
      endpointRegistry.register(config);
      console.log(`✅ Registered: ${config.name} (${config.path})`);
    } catch (error) {
      console.error(`❌ Failed to register ${config.name}:`, error);
      throw error;
    }
  }

  console.log(
    `📖 Scripture endpoints registered: ${SCRIPTURE_ENDPOINTS.length} total`,
  );
}

/**
 * Register all translation helps endpoints
 */
function registerTranslationHelpsEndpoints(): void {
  console.log("📚 Registering Translation Helps endpoints...");

  for (const config of TRANSLATION_HELPS_ENDPOINTS) {
    try {
      endpointRegistry.register(config);
      console.log(`✅ Registered: ${config.name} (${config.path})`);
    } catch (error) {
      console.error(`❌ Failed to register ${config.name}:`, error);
      throw error;
    }
  }

  console.log(
    `📚 Translation Helps endpoints registered: ${TRANSLATION_HELPS_ENDPOINTS.length} total`,
  );
}

/**
 * Initialize all endpoint configurations
 */
export function initializeAllEndpoints(): void {
  console.log("🏗️ Initializing all endpoint configurations...");

  try {
    // Register all endpoint categories
    registerScriptureEndpoints();
    registerTranslationHelpsEndpoints();

    // Print registry stats
    const stats = endpointRegistry.getStats();
    console.log("📊 Registry Statistics:", {
      totalEndpoints: stats.totalEndpoints,
      enabledEndpoints: stats.enabledEndpoints,
      categories: stats.categories,
      dataSourceTypes: stats.dataSourceTypes,
    });

    console.log("✅ All endpoints initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize endpoints:", error);
    throw error;
  }
}

/**
 * Validate all registered configurations
 */
export function validateAllEndpoints(): void {
  console.log("🔍 Validating all endpoint configurations...");

  const validationResult = endpointRegistry.validateAll();

  if (validationResult.errors.length > 0) {
    console.error("❌ Configuration errors found:");
    validationResult.errors.forEach((error) => {
      console.error(`  - ${error.endpoint}.${error.field}: ${error.message}`);
    });
    throw new Error(
      `Found ${validationResult.errors.length} configuration errors`,
    );
  }

  if (validationResult.warnings.length > 0) {
    console.warn("⚠️ Configuration warnings:");
    validationResult.warnings.forEach((warning) => {
      console.warn(
        `  - ${warning.endpoint}.${warning.field}: ${warning.message}`,
      );
    });
  }

  console.log(
    `✅ All configurations valid! (${validationResult.warnings.length} warnings)`,
  );
}

/**
 * Get all endpoints by category
 */
export function getEndpointsByCategory(
  category: "core" | "extended" | "experimental",
) {
  return endpointRegistry.getByCategory(category);
}

/**
 * Get endpoint configuration by name
 */
export function getEndpointConfig(name: string) {
  return endpointRegistry.get(name);
}

/**
 * Check if endpoint is registered and enabled
 */
export function isEndpointAvailable(name: string): boolean {
  const config = endpointRegistry.get(name);
  return config !== undefined && config.enabled;
}

/**
 * Export all endpoint arrays for direct access
 */
export { SCRIPTURE_ENDPOINTS, TRANSLATION_HELPS_ENDPOINTS };

/**
 * Export registry utilities
 */
export { endpointRegistry };

// Auto-initialize when this module is imported
// (Can be disabled by setting NODE_ENV to 'test')
// TEMPORARILY DISABLED: Causing issues in SvelteKit/Cloudflare environment
// if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
//   initializeAllEndpoints();
//   validateAllEndpoints();
// }
