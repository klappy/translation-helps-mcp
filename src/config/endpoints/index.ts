/**
 * Endpoint Configurations Index
 *
 * Central registry and initialization point for all endpoint configurations.
 * Automatically registers configurations and provides utilities for
 * endpoint management.
 */

import { logger } from "../../utils/logger.js";
import { endpointRegistry } from "../EndpointRegistry.js";
import { CONTEXT_ENDPOINTS } from "./ContextEndpoints.js";
import { DISCOVERY_ENDPOINTS } from "./DiscoveryEndpoints.js";
import { ExperimentalEndpoints } from "./ExperimentalEndpoints.js";
import { SCRIPTURE_ENDPOINTS } from "./ScriptureEndpoints.js";
import { TRANSLATION_HELPS_ENDPOINTS } from "./TranslationHelpsEndpoints.js";

/**
 * Register all scripture endpoints
 */
function registerScriptureEndpoints(): void {
  logger.info("Registering Scripture endpoints...");

  for (const config of SCRIPTURE_ENDPOINTS) {
    try {
      endpointRegistry.register(config);
      logger.info(`Registered endpoint`, {
        name: config.name,
        path: config.path,
      });
    } catch (error) {
      logger.error(`Failed to register endpoint`, {
        name: config.name,
        error: String(error),
      });
      throw error;
    }
  }

  logger.info(`Scripture endpoints registered`, {
    count: SCRIPTURE_ENDPOINTS.length,
  });
}

/**
 * Register all translation helps endpoints
 */
function registerTranslationHelpsEndpoints(): void {
  logger.info("Registering Translation Helps endpoints...");

  for (const config of TRANSLATION_HELPS_ENDPOINTS) {
    try {
      endpointRegistry.register(config);
      logger.info(`Registered endpoint`, {
        name: config.name,
        path: config.path,
      });
    } catch (error) {
      logger.error(`Failed to register endpoint`, {
        name: config.name,
        error: String(error),
      });
      throw error;
    }
  }

  logger.info(`Translation Helps endpoints registered`, {
    count: TRANSLATION_HELPS_ENDPOINTS.length,
  });
}

/**
 * Register all discovery endpoints
 */
function registerDiscoveryEndpoints(): void {
  logger.info("Registering Discovery endpoints...");

  for (const config of DISCOVERY_ENDPOINTS) {
    try {
      endpointRegistry.register(config);
      logger.info(`Registered endpoint`, {
        name: config.name,
        path: config.path,
      });
    } catch (error) {
      logger.error(`Failed to register endpoint`, {
        name: config.name,
        error: String(error),
      });
      throw error;
    }
  }

  logger.info(`Discovery endpoints registered`, {
    count: DISCOVERY_ENDPOINTS.length,
  });
}

/**
 * Register all context endpoints (Extended tier)
 */
function registerContextEndpoints(): void {
  logger.info("Registering Context endpoints (Extended tier)...");

  for (const config of CONTEXT_ENDPOINTS) {
    try {
      endpointRegistry.register(config);
      logger.info(`Registered endpoint`, {
        name: config.name,
        path: config.path,
        category: config.category,
      });
    } catch (error) {
      logger.error(`Failed to register endpoint`, {
        name: config.name,
        error: String(error),
      });
      throw error;
    }
  }

  logger.info(`Context endpoints registered`, {
    count: CONTEXT_ENDPOINTS.length,
  });
}

/**
 * Register all experimental endpoints
 */
function registerExperimentalEndpoints(): void {
  logger.info("Registering Experimental endpoints...");

  for (const config of ExperimentalEndpoints) {
    try {
      endpointRegistry.register(config);
      logger.info(`Registered endpoint`, {
        name: config.name,
        path: config.path,
        experimental: true,
      });
    } catch (error) {
      logger.error(`Failed to register endpoint`, {
        name: config.name,
        error: String(error),
      });
      throw error;
    }
  }

  logger.info(`Experimental endpoints registered`, {
    count: ExperimentalEndpoints.length,
  });
}

/**
 * Initialize all endpoint configurations
 */
export function initializeAllEndpoints(): void {
  logger.info("Initializing all endpoint configurations...");

  try {
    // Register Core tier endpoints ONLY
    registerScriptureEndpoints();
    registerTranslationHelpsEndpoints();
    registerDiscoveryEndpoints();

    // Extended and Experimental endpoints removed - only core tools supported

    // Print registry stats
    const stats = endpointRegistry.getStats();
    logger.info("Registry Statistics", {
      totalEndpoints: stats.totalEndpoints,
      enabledEndpoints: stats.enabledEndpoints,
      categories: stats.categories,
      dataSourceTypes: stats.dataSourceTypes,
    });

    logger.info("All endpoints initialized successfully!");
  } catch (error) {
    logger.error("Failed to initialize endpoints", { error: String(error) });
    throw error;
  }
}

/**
 * Validate all registered configurations
 */
export function validateAllEndpoints(): void {
  logger.info("Validating all endpoint configurations...");

  const validationResult = endpointRegistry.validateAll();

  if (validationResult.errors.length > 0) {
    logger.error("Configuration errors found:");
    validationResult.errors.forEach((error) => {
      logger.error(`validation error`, {
        field: `${error.endpoint}.${error.field}`,
        message: error.message,
      });
    });
    throw new Error(
      `Found ${validationResult.errors.length} configuration errors`,
    );
  }

  if (validationResult.warnings.length > 0) {
    logger.warn("Configuration warnings:");
    validationResult.warnings.forEach((warning) => {
      logger.warn(`validation warning`, {
        field: `${warning.endpoint}.${warning.field}`,
        message: warning.message,
      });
    });
  }

  logger.info(`All configurations valid!`, {
    warnings: validationResult.warnings.length,
  });
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
export {
  CONTEXT_ENDPOINTS,
  DISCOVERY_ENDPOINTS,
  ExperimentalEndpoints,
  SCRIPTURE_ENDPOINTS,
  TRANSLATION_HELPS_ENDPOINTS,
};

/**
 * Export registry utilities
 */
export { endpointRegistry };

// Auto-initialize when this module is imported
// (Can be disabled by setting NODE_ENV to 'test')
if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
  initializeAllEndpoints();
  validateAllEndpoints();
}
