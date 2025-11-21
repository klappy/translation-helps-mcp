/**
 * Cache Chain Manager
 *
 * Manages an ordered chain of cache providers with configurable fallback.
 * Supports dynamic addition, removal, and reordering of providers at runtime.
 */

import type { CacheProvider, CacheStats } from "./cache-provider.js";
import { logger } from "../../utils/logger.js";
import { MemoryCacheProvider } from "./memory-cache-provider.js";
import { FSCacheProvider } from "./fs-cache-provider.js";
import { Door43Provider } from "./door43-provider.js";

/**
 * Configuration for the cache chain
 */
export interface CacheChainConfig {
  /**
   * Custom provider instances (overrides default providers)
   */
  providers?: CacheProvider[];

  /**
   * Names of providers to enable (e.g., ['memory', 'fs', 'kv'])
   */
  enabledProviders?: string[];

  /**
   * Custom order for providers (by name)
   * Example: ['memory', 'fs', 'door43']
   */
  order?: string[];

  /**
   * Always include Door43 provider as last in chain
   * @default true
   */
  alwaysIncludeDoor43?: boolean;

  /**
   * Skip unavailable providers automatically
   * @default true
   */
  skipUnavailable?: boolean;
}

/**
 * Cache Chain Manager
 */
export class CacheChain {
  private providers: CacheProvider[] = [];
  private providerMap: Map<string, CacheProvider> = new Map();
  private config: Required<CacheChainConfig>;

  constructor(config: CacheChainConfig = {}) {
    this.config = {
      providers: config.providers,
      enabledProviders: config.enabledProviders,
      order: config.order,
      alwaysIncludeDoor43: config.alwaysIncludeDoor43 ?? true,
      skipUnavailable: config.skipUnavailable ?? true,
    };

    this.initializeProviders();
  }

  /**
   * Initialize providers based on configuration
   */
  private async initializeProviders(): Promise<void> {
    if (this.config.providers && this.config.providers.length > 0) {
      // Use custom providers
      this.providers = [...this.config.providers];
    } else {
      // Create default providers
      const defaultProviders: CacheProvider[] = [];

      // Always add memory provider
      defaultProviders.push(new MemoryCacheProvider());

      // Add optional providers based on environment
      // Note: KV and FS providers will be added by environment-specific initialization
      // For now, just add them and let isAvailable() handle whether they work
      defaultProviders.push(new FSCacheProvider());

      this.providers = defaultProviders;
    }

    // Build provider map
    for (const provider of this.providers) {
      this.providerMap.set(provider.name, provider);
    }

    // Filter by enabled providers if specified
    if (this.config.enabledProviders) {
      this.providers = this.providers.filter((p) =>
        this.config.enabledProviders!.includes(p.name),
      );
    }

    // Apply custom order if specified
    if (this.config.order) {
      this.applyOrder(this.config.order);
    } else {
      // Sort by priority (highest first)
      this.providers.sort((a, b) => b.priority - a.priority);
    }

    // Add Door43 provider if configured
    if (this.config.alwaysIncludeDoor43) {
      const door43 = new Door43Provider();
      // Remove any existing Door43 provider first
      this.providers = this.providers.filter((p) => p.name !== "door43");
      // Add to end
      this.providers.push(door43);
      this.providerMap.set("door43", door43);
    }

    // Filter unavailable providers if configured
    if (this.config.skipUnavailable) {
      await this.filterUnavailable();
    }

    logger.info(
      `🔗 Cache chain initialized with ${this.providers.length} providers: ${this.providers.map((p) => p.name).join(" → ")}`,
    );
  }

  /**
   * Filter out unavailable providers
   */
  private async filterUnavailable(): Promise<void> {
    const availabilityChecks = await Promise.all(
      this.providers.map(async (provider) => ({
        provider,
        available: await provider.isAvailable(),
      })),
    );

    const before = this.providers.length;
    this.providers = availabilityChecks
      .filter((check) => check.available)
      .map((check) => check.provider);

    const removed = before - this.providers.length;
    if (removed > 0) {
      logger.info(`🚫 Filtered out ${removed} unavailable providers`);
    }
  }

  /**
   * Apply custom provider order
   */
  private applyOrder(order: string[]): void {
    const ordered: CacheProvider[] = [];
    const remaining = [...this.providers];

    // Add providers in specified order
    for (const name of order) {
      const provider = remaining.find((p) => p.name === name);
      if (provider) {
        ordered.push(provider);
        remaining.splice(remaining.indexOf(provider), 1);
      }
    }

    // Add any remaining providers at the end (sorted by priority)
    remaining.sort((a, b) => b.priority - a.priority);
    ordered.push(...remaining);

    this.providers = ordered;
  }

  /**
   * Get a value from the cache chain
   * Tries each provider in order until found
   */
  async get(key: string): Promise<unknown> {
    for (const provider of this.providers) {
      try {
        const value = await provider.get(key);
        if (value !== null && value !== undefined) {
          // Found in this provider
          // Optionally write back to earlier providers (cache warming)
          this.warmCache(key, value, provider);
          return value;
        }
      } catch (error) {
        logger.error(`Error in provider ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue to next provider
      }
    }

    return null;
  }

  /**
   * Warm earlier caches with a value found in a later provider
   */
  private async warmCache(
    key: string,
    value: unknown,
    foundProvider: CacheProvider,
  ): Promise<void> {
    const foundIndex = this.providers.indexOf(foundProvider);
    if (foundIndex <= 0) return; // Already in first provider

    // Write to all earlier providers (fire-and-forget)
    for (let i = 0; i < foundIndex; i++) {
      const provider = this.providers[i];
      provider.set(key, value).catch((error) => {
        logger.error(`Error warming cache in ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }

  /**
   * Set a value in all available providers
   * Writes happen in parallel (fire-and-forget)
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const setPromises = this.providers.map((provider) =>
      provider.set(key, value, ttl).catch((error) => {
        logger.error(`Error setting in provider ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }),
    );

    // Fire-and-forget, but wait for at least one to succeed
    await Promise.race([...setPromises, Promise.resolve()]);
  }

  /**
   * Check if a key exists in any provider
   */
  async has(key: string): Promise<boolean> {
    for (const provider of this.providers) {
      try {
        const exists = await provider.has(key);
        if (exists) {
          return true;
        }
      } catch (error) {
        logger.error(`Error checking provider ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue to next provider
      }
    }

    return false;
  }

  /**
   * Delete a key from all providers
   */
  async delete(key: string): Promise<void> {
    const deletePromises = this.providers.map((provider) =>
      provider.delete(key).catch((error) => {
        logger.error(`Error deleting from provider ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }),
    );

    await Promise.allSettled(deletePromises);
  }

  /**
   * Clear all providers
   */
  async clear(): Promise<void> {
    const clearPromises = this.providers.map((provider) =>
      provider.clear().catch((error) => {
        logger.error(`Error clearing provider ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }),
    );

    await Promise.allSettled(clearPromises);
  }

  /**
   * Add a provider to the chain
   */
  async addProvider(provider: CacheProvider, position?: number): Promise<void> {
    // Remove if already exists
    this.removeProvider(provider.name);

    // Add to map
    this.providerMap.set(provider.name, provider);

    // Check availability if configured
    if (this.config.skipUnavailable) {
      const available = await provider.isAvailable();
      if (!available) {
        logger.warn(`⚠️ Provider ${provider.name} is not available, skipping`);
        return;
      }
    }

    // Add at position or end
    if (position !== undefined && position >= 0) {
      this.providers.splice(position, 0, provider);
    } else {
      // Add before Door43 if it exists, otherwise at end
      const door43Index = this.providers.findIndex((p) => p.name === "door43");
      if (door43Index >= 0) {
        this.providers.splice(door43Index, 0, provider);
      } else {
        this.providers.push(provider);
      }
    }

    logger.info(`✅ Added provider ${provider.name} to cache chain`);
  }

  /**
   * Remove a provider from the chain
   */
  removeProvider(name: string): void {
    const index = this.providers.findIndex((p) => p.name === name);
    if (index >= 0) {
      this.providers.splice(index, 1);
      this.providerMap.delete(name);
      logger.info(`🗑️ Removed provider ${name} from cache chain`);
    }
  }

  /**
   * Reorder providers
   */
  reorderProviders(order: string[]): void {
    this.applyOrder(order);
    logger.info(
      `🔄 Reordered cache chain: ${this.providers.map((p) => p.name).join(" → ")}`,
    );
  }

  /**
   * Get list of active providers
   */
  getActiveProviders(): string[] {
    return this.providers.map((p) => p.name);
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): CacheProvider | undefined {
    return this.providerMap.get(name);
  }

  /**
   * Reconfigure the cache chain
   */
  async configure(config: CacheChainConfig): Promise<void> {
    this.config = {
      ...this.config,
      ...config,
    };

    await this.initializeProviders();
  }

  /**
   * Get statistics for all providers
   */
  async getStats(): Promise<CacheStats[]> {
    const statsPromises = this.providers.map(async (provider) => {
      try {
        return await provider.getStats();
      } catch (error) {
        logger.error(`Error getting stats from ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          provider: provider.name,
          available: false,
        };
      }
    });

    return await Promise.all(statsPromises);
  }
}
