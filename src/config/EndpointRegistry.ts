/**
 * Endpoint Configuration Registry
 *
 * Central registry for managing and validating all endpoint configurations.
 * Prevents duplicate paths, validates required fields, and provides type safety.
 */

import { logger } from "../utils/logger.js";
import type {
  ConfigValidationError,
  ConfigValidationResult,
  DataSourceConfig,
  EndpointConfig,
  EndpointRegistry,
  ParamConfig,
  ResponseShape,
} from "./EndpointConfig.js";

/**
 * Global endpoint registry instance
 */
class ConfigurationRegistry {
  private registry: EndpointRegistry;
  private initialized = false;

  constructor() {
    this.registry = {
      endpoints: {},
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      defaults: {
        organization: "unfoldingWord",
        language: "en",
        cacheTtl: 3600, // 1 hour
      },
    };
  }

  /**
   * Initialize the registry with default configurations
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn("Registry already initialized");
      return;
    }

    logger.info("Initializing endpoint configuration registry...");

    // Registry is now ready for endpoint registration
    this.initialized = true;

    logger.info("Endpoint registry initialized");
  }

  /**
   * Register a new endpoint configuration
   */
  register(config: EndpointConfig): void {
    if (!this.initialized) {
      throw new Error("Registry must be initialized before registering endpoints");
    }

    // Validate the configuration
    const validationResult = this.validateConfig(config);
    if (!validationResult.valid) {
      const errorMessages = validationResult.errors.map((err) => err.message).join(", ");
      throw new Error(`Invalid endpoint configuration for '${config.name}': ${errorMessages}`);
    }

    // Check for duplicate paths
    const existingEndpoint = Object.values(this.registry.endpoints).find(
      (endpoint) => endpoint.path === config.path && endpoint.name !== config.name
    );

    if (existingEndpoint) {
      throw new Error(
        `Duplicate path '${config.path}' found. Already used by endpoint '${existingEndpoint.name}'`
      );
    }

    // Check for duplicate names (allow re-registration of same endpoint)
    const existing = this.registry.endpoints[config.name];
    if (existing) {
      if (existing.path !== config.path) {
        throw new Error(
          `Endpoint with name '${config.name}' already exists with different path '${existing.path}' vs '${config.path}'`
        );
      }
      // Same name and path - skip re-registration
      logger.info(`Skipping re-registration`, { name: config.name, path: config.path });
      return;
    }

    // Register the endpoint
    this.registry.endpoints[config.name] = config;
    this.registry.lastUpdated = new Date().toISOString();

    logger.info(`Registered endpoint`, { name: config.name, path: config.path });
  }

  /**
   * Unregister an endpoint configuration
   */
  unregister(name: string): boolean {
    if (!this.registry.endpoints[name]) {
      return false;
    }

    delete this.registry.endpoints[name];
    this.registry.lastUpdated = new Date().toISOString();

    logger.info(`Unregistered endpoint`, { name });
    return true;
  }

  /**
   * Get an endpoint configuration by name
   */
  get(name: string): EndpointConfig | undefined {
    return this.registry.endpoints[name];
  }

  /**
   * Get all endpoint configurations
   */
  getAll(): Record<string, EndpointConfig> {
    return { ...this.registry.endpoints };
  }

  /**
   * Get endpoints by category
   */
  getByCategory(category: "core" | "extended" | "experimental"): EndpointConfig[] {
    return Object.values(this.registry.endpoints).filter(
      (endpoint) => endpoint.category === category
    );
  }

  /**
   * Get endpoints by tag
   */
  getByTag(tag: string): EndpointConfig[] {
    return Object.values(this.registry.endpoints).filter(
      (endpoint) => endpoint.tags && endpoint.tags.includes(tag)
    );
  }

  /**
   * Get enabled endpoints only
   */
  getEnabled(): EndpointConfig[] {
    return Object.values(this.registry.endpoints).filter((endpoint) => endpoint.enabled);
  }

  /**
   * Get all endpoint paths
   */
  getPaths(): string[] {
    return Object.values(this.registry.endpoints).map((endpoint) => endpoint.path);
  }

  /**
   * Check if a path is already registered
   */
  isPathRegistered(path: string): boolean {
    return Object.values(this.registry.endpoints).some((endpoint) => endpoint.path === path);
  }

  /**
   * Get registry metadata
   */
  getMetadata(): Omit<EndpointRegistry, "endpoints"> {
    return {
      version: this.registry.version,
      lastUpdated: this.registry.lastUpdated,
      defaults: { ...this.registry.defaults },
    };
  }

  /**
   * Validate an endpoint configuration
   */
  validateConfig(config: EndpointConfig): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationError[] = [];

    // Validate required fields
    if (!config.name || typeof config.name !== "string") {
      errors.push({
        endpoint: config.name || "unknown",
        field: "name",
        message: "Name is required and must be a string",
        severity: "error",
      });
    }

    if (!config.path || typeof config.path !== "string") {
      errors.push({
        endpoint: config.name,
        field: "path",
        message: "Path is required and must be a string",
        severity: "error",
      });
    } else if (!config.path.startsWith("/")) {
      errors.push({
        endpoint: config.name,
        field: "path",
        message: 'Path must start with "/"',
        severity: "error",
      });
    }

    if (!["core", "extended", "experimental"].includes(config.category)) {
      errors.push({
        endpoint: config.name,
        field: "category",
        message: 'Category must be "core", "extended", or "experimental"',
        severity: "error",
      });
    }

    if (!config.title || typeof config.title !== "string") {
      errors.push({
        endpoint: config.name,
        field: "title",
        message: "Title is required and must be a string",
        severity: "error",
      });
    }

    if (!config.description || typeof config.description !== "string") {
      errors.push({
        endpoint: config.name,
        field: "description",
        message: "Description is required and must be a string",
        severity: "error",
      });
    }

    // Validate parameters
    if (config.params && typeof config.params === "object") {
      for (const [paramName, paramConfig] of Object.entries(config.params)) {
        const paramErrors = this.validateParamConfig(paramName, paramConfig, config.name);
        errors.push(...paramErrors.filter((err) => err.severity === "error"));
        warnings.push(...paramErrors.filter((err) => err.severity === "warning"));
      }
    }

    // Validate data source
    if (!config.dataSource) {
      errors.push({
        endpoint: config.name,
        field: "dataSource",
        message: "Data source configuration is required",
        severity: "error",
      });
    } else {
      const dataSourceErrors = this.validateDataSourceConfig(config.dataSource, config.name);
      errors.push(...dataSourceErrors.filter((err) => err.severity === "error"));
      warnings.push(...dataSourceErrors.filter((err) => err.severity === "warning"));
    }

    // Validate response shape
    if (!config.responseShape) {
      errors.push({
        endpoint: config.name,
        field: "responseShape",
        message: "Response shape is required",
        severity: "error",
      });
    } else {
      const shapeErrors = this.validateResponseShape(config.responseShape, config.name);
      errors.push(...shapeErrors.filter((err) => err.severity === "error"));
      warnings.push(...shapeErrors.filter((err) => err.severity === "warning"));
    }

    // Validate examples
    if (!config.examples || !Array.isArray(config.examples)) {
      warnings.push({
        endpoint: config.name,
        field: "examples",
        message: "Examples array is recommended for testing and UI generation",
        severity: "warning",
      });
    } else if (config.examples.length === 0) {
      warnings.push({
        endpoint: config.name,
        field: "examples",
        message: "At least one example is recommended",
        severity: "warning",
      });
    }

    // Validate enabled flag
    if (typeof config.enabled !== "boolean") {
      errors.push({
        endpoint: config.name,
        field: "enabled",
        message: "Enabled flag must be a boolean",
        severity: "error",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate parameter configuration
   */
  private validateParamConfig(
    paramName: string,
    paramConfig: ParamConfig,
    endpointName: string
  ): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!["string", "boolean", "number", "array"].includes(paramConfig.type)) {
      errors.push({
        endpoint: endpointName,
        field: `params.${paramName}.type`,
        message: "Parameter type must be string, boolean, number, or array",
        severity: "error",
      });
    }

    if (typeof paramConfig.required !== "boolean") {
      errors.push({
        endpoint: endpointName,
        field: `params.${paramName}.required`,
        message: "Parameter required flag must be a boolean",
        severity: "error",
      });
    }

    if (!paramConfig.description || typeof paramConfig.description !== "string") {
      errors.push({
        endpoint: endpointName,
        field: `params.${paramName}.description`,
        message: "Parameter description is required and must be a string",
        severity: "error",
      });
    }

    if (paramConfig.type === "array" && !paramConfig.arrayDelimiter) {
      errors.push({
        endpoint: endpointName,
        field: `params.${paramName}.arrayDelimiter`,
        message: "Array parameters must specify an arrayDelimiter",
        severity: "warning",
      });
    }

    return errors;
  }

  /**
   * Validate data source configuration
   */
  private validateDataSourceConfig(
    dataSource: DataSourceConfig,
    endpointName: string
  ): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!["dcs-api", "computed", "hybrid", "zip-cached"].includes(dataSource.type)) {
      errors.push({
        endpoint: endpointName,
        field: "dataSource.type",
        message: "Data source type must be dcs-api, computed, hybrid, or zip-cached",
        severity: "error",
      });
    }

    if (dataSource.type === "dcs-api" && !dataSource.dcsEndpoint) {
      errors.push({
        endpoint: endpointName,
        field: "dataSource.dcsEndpoint",
        message: "DCS API endpoints must specify a dcsEndpoint",
        severity: "error",
      });
    }

    if (
      dataSource.cacheTtl &&
      (typeof dataSource.cacheTtl !== "number" || dataSource.cacheTtl < 0)
    ) {
      errors.push({
        endpoint: endpointName,
        field: "dataSource.cacheTtl",
        message: "Cache TTL must be a positive number",
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Validate response shape configuration
   */
  private validateResponseShape(
    responseShape: ResponseShape,
    endpointName: string
  ): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!responseShape.dataType) {
      errors.push({
        endpoint: endpointName,
        field: "responseShape.dataType",
        message: "Response shape data type is required",
        severity: "error",
      });
    }

    if (!responseShape.structure) {
      errors.push({
        endpoint: endpointName,
        field: "responseShape.structure",
        message: "Response shape structure is required",
        severity: "error",
      });
    } else {
      if (!Array.isArray(responseShape.structure.required)) {
        errors.push({
          endpoint: endpointName,
          field: "responseShape.structure.required",
          message: "Response shape required fields must be an array",
          severity: "error",
        });
      }
    }

    if (!responseShape.performance) {
      errors.push({
        endpoint: endpointName,
        field: "responseShape.performance",
        message: "Response shape performance expectations are required",
        severity: "error",
      });
    } else {
      if (
        typeof responseShape.performance.maxResponseTime !== "number" ||
        responseShape.performance.maxResponseTime <= 0
      ) {
        errors.push({
          endpoint: endpointName,
          field: "responseShape.performance.maxResponseTime",
          message: "Max response time must be a positive number",
          severity: "error",
        });
      }

      if (typeof responseShape.performance.cacheable !== "boolean") {
        errors.push({
          endpoint: endpointName,
          field: "responseShape.performance.cacheable",
          message: "Cacheable flag must be a boolean",
          severity: "error",
        });
      }
    }

    return errors;
  }

  /**
   * Validate all registered configurations
   */
  validateAll(): ConfigValidationResult {
    const allErrors: ConfigValidationError[] = [];
    const allWarnings: ConfigValidationError[] = [];

    for (const [, config] of Object.entries(this.registry.endpoints)) {
      const result = this.validateConfig(config);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalEndpoints: number;
    enabledEndpoints: number;
    categories: Record<string, number>;
    dataSourceTypes: Record<string, number>;
  } {
    const endpoints = Object.values(this.registry.endpoints);

    const categories = endpoints.reduce(
      (acc, endpoint) => {
        acc[endpoint.category] = (acc[endpoint.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const dataSourceTypes = endpoints.reduce(
      (acc, endpoint) => {
        acc[endpoint.dataSource.type] = (acc[endpoint.dataSource.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalEndpoints: endpoints.length,
      enabledEndpoints: endpoints.filter((e) => e.enabled).length,
      categories,
      dataSourceTypes,
    };
  }

  /**
   * Export registry to JSON
   */
  export(): EndpointRegistry {
    return JSON.parse(JSON.stringify(this.registry));
  }

  /**
   * Import registry from JSON
   */
  import(registryData: EndpointRegistry): void {
    // Validate the imported data
    if (!registryData.endpoints || typeof registryData.endpoints !== "object") {
      throw new Error("Invalid registry data: endpoints object is required");
    }

    // Clear existing registry
    this.registry.endpoints = {};

    // Import endpoints one by one with validation
    for (const [, config] of Object.entries(registryData.endpoints)) {
      try {
        this.register(config);
      } catch (error) {
        logger.error(`Failed to import endpoint`, { error: String(error) });
        throw error;
      }
    }

    // Update metadata
    this.registry.version = registryData.version || this.registry.version;
    this.registry.lastUpdated = new Date().toISOString();
    this.registry.defaults = {
      ...this.registry.defaults,
      ...registryData.defaults,
    };

    logger.info(`Imported endpoints`, { count: Object.keys(registryData.endpoints).length });
  }
}

// Global registry instance
export const endpointRegistry = new ConfigurationRegistry();

// Initialize on import
endpointRegistry.initialize();

// Export utility functions
export const registerEndpoint = (config: EndpointConfig) => endpointRegistry.register(config);
export const getEndpoint = (name: string) => endpointRegistry.get(name);
export const getAllEndpoints = () => endpointRegistry.getAll();
export const getEndpointsByCategory = (category: "core" | "extended" | "experimental") =>
  endpointRegistry.getByCategory(category);
export const validateEndpointConfig = (config: EndpointConfig) =>
  endpointRegistry.validateConfig(config);
export const getRegistryStats = () => endpointRegistry.getStats();

// Type exports
export type { ConfigurationRegistry };
