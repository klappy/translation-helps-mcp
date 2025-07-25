/**
 * Endpoint Registry
 *
 * Central registry for all endpoint configurations.
 * Validates configurations and prevents duplicate paths.
 */

import { EndpointConfig } from "./EndpointConfig";

export class EndpointRegistry {
  private static instance: EndpointRegistry;
  private endpoints: Map<string, EndpointConfig> = new Map();
  private pathIndex: Map<string, string> = new Map(); // path -> name mapping

  private constructor() {}

  static getInstance(): EndpointRegistry {
    if (!EndpointRegistry.instance) {
      EndpointRegistry.instance = new EndpointRegistry();
    }
    return EndpointRegistry.instance;
  }

  /**
   * Register a new endpoint configuration
   */
  register(config: EndpointConfig): void {
    // Validate required fields
    if (!config.name || !config.path) {
      throw new Error("Endpoint config must have name and path");
    }

    // Check for duplicate names
    if (this.endpoints.has(config.name)) {
      throw new Error(`Endpoint ${config.name} already registered`);
    }

    // Check for duplicate paths
    if (this.pathIndex.has(config.path)) {
      const existingName = this.pathIndex.get(config.path);
      throw new Error(`Path ${config.path} already registered by ${existingName}`);
    }

    // Validate parameters
    for (const [paramName, paramConfig] of Object.entries(config.params)) {
      if (!paramConfig.name || paramConfig.name !== paramName) {
        throw new Error(`Parameter ${paramName} has invalid configuration`);
      }
    }

    // Register the endpoint
    this.endpoints.set(config.name, config);
    this.pathIndex.set(config.path, config.name);
  }

  /**
   * Get endpoint configuration by name
   */
  get(name: string): EndpointConfig | undefined {
    return this.endpoints.get(name);
  }

  /**
   * Get endpoint configuration by path
   */
  getByPath(path: string): EndpointConfig | undefined {
    const name = this.pathIndex.get(path);
    return name ? this.endpoints.get(name) : undefined;
  }

  /**
   * Get all registered endpoints
   */
  getAll(): EndpointConfig[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Get endpoints by category
   */
  getByCategory(category: "core" | "experimental"): EndpointConfig[] {
    return this.getAll().filter((config) => config.category === category);
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.endpoints.clear();
    this.pathIndex.clear();
  }

  /**
   * Export all configurations for documentation
   */
  exportForDocs(): Record<string, any> {
    const result: Record<string, any> = {
      core: [],
      experimental: [],
    };

    for (const config of this.getAll()) {
      const exportedConfig = {
        name: config.name,
        path: config.path,
        description: config.description,
        params: Object.entries(config.params).map(([name, param]) => ({
          name,
          type: param.type,
          required: param.required,
          default: param.default,
          description: param.description,
          examples: param.examples,
        })),
        response: {
          type: config.responseShape.type,
          fields: config.responseShape.fields,
          example: config.examples[0]?.response,
        },
      };

      result[config.category].push(exportedConfig);
    }

    return result;
  }

  /**
   * Validate all registered endpoints have unique paths and valid configs
   */
  validate(): string[] {
    const errors: string[] = [];

    for (const [name, config] of this.endpoints) {
      // Check required fields
      if (!config.description) {
        errors.push(`${name}: missing description`);
      }

      // Check parameters have examples
      for (const [paramName, param] of Object.entries(config.params)) {
        if (!param.examples || param.examples.length === 0) {
          errors.push(`${name}.${paramName}: missing examples`);
        }
      }

      // Check has at least one example
      if (!config.examples || config.examples.length === 0) {
        errors.push(`${name}: missing examples`);
      }

      // Check performance targets for core endpoints
      if (config.category === "core" && !config.performance) {
        errors.push(`${name}: core endpoint missing performance targets`);
      }
    }

    return errors;
  }
}

// Export singleton instance
export const endpointRegistry = EndpointRegistry.getInstance();
