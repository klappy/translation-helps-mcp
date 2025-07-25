/**
 * Endpoint Registry
 * 
 * Central registry for managing and validating endpoint configurations.
 * Prevents duplicate paths and ensures configuration consistency.
 */

import type { EndpointConfig, ParamConfig } from './EndpointConfig';
import { logger } from '../utils/logger';

/**
 * Registry for all endpoint configurations
 */
class EndpointRegistryManager {
  private endpoints: Map<string, EndpointConfig> = new Map();
  private pathIndex: Map<string, string> = new Map(); // path -> name mapping

  /**
   * Register a new endpoint configuration
   */
  register(config: EndpointConfig): void {
    // Validate configuration
    this.validateConfig(config);

    // Check for duplicate names
    if (this.endpoints.has(config.name)) {
      throw new Error(`Endpoint '${config.name}' is already registered`);
    }

    // Check for duplicate paths
    if (this.pathIndex.has(config.path)) {
      const existingName = this.pathIndex.get(config.path);
      throw new Error(
        `Path '${config.path}' is already used by endpoint '${existingName}'`
      );
    }

    // Register the endpoint
    this.endpoints.set(config.name, config);
    this.pathIndex.set(config.path, config.name);

    logger.debug(`Registered endpoint: ${config.name} at ${config.path}`);
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
  getByCategory(category: 'core' | 'experimental'): EndpointConfig[] {
    return this.getAll().filter(endpoint => endpoint.category === category);
  }

  /**
   * Validate endpoint configuration
   */
  private validateConfig(config: EndpointConfig): void {
    // Validate required fields
    if (!config.name) {
      throw new Error('Endpoint name is required');
    }
    if (!config.path) {
      throw new Error('Endpoint path is required');
    }
    if (!config.category) {
      throw new Error('Endpoint category is required');
    }
    if (!config.responseShape) {
      throw new Error('Response shape is required');
    }

    // Validate path format
    if (!config.path.startsWith('/')) {
      throw new Error(`Path must start with '/' but got: ${config.path}`);
    }

    // Validate parameters
    this.validateParams(config.params);

    // Validate examples
    if (!config.examples || config.examples.length === 0) {
      throw new Error('At least one example is required');
    }

    // Validate data source
    if (config.dataSource.type === 'dcs' && !config.dataSource.resource) {
      throw new Error('DCS resource identifier is required for DCS data sources');
    }
  }

  /**
   * Validate parameter configurations
   */
  private validateParams(params: Record<string, ParamConfig | undefined>): void {
    for (const [name, param] of Object.entries(params)) {
      if (!param) continue;

      // Validate param type
      const validTypes = ['string', 'number', 'boolean', 'array'];
      if (!validTypes.includes(param.type)) {
        throw new Error(`Invalid parameter type '${param.type}' for param '${name}'`);
      }

      // Validate default value type matches declared type
      if (param.default !== undefined) {
        const defaultType = Array.isArray(param.default) ? 'array' : typeof param.default;
        if (defaultType !== param.type) {
          throw new Error(
            `Default value type '${defaultType}' doesn't match declared type '${param.type}' for param '${name}'`
          );
        }
      }

      // Validate enum values
      if (param.validation?.enum && param.type !== 'string') {
        throw new Error(`Enum validation is only supported for string parameters`);
      }
    }
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.endpoints.clear();
    this.pathIndex.clear();
  }
}

// Export singleton instance
export const EndpointRegistry = new EndpointRegistryManager();

// Export types
export type { EndpointConfig, ParamConfig } from './EndpointConfig';
export type { ResourceShape } from './EndpointConfig';