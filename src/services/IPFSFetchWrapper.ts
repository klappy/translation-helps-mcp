/**
 * IPFS-Enhanced Fetch Wrapper
 * Drop-in replacement for fetch() with IPFS caching and archival capabilities
 */

import { IPFSCacheService, IPFSConfig, IPFSFetchResult } from './IPFSCacheService.js';
import { logger } from '../utils/logger.js';

export interface IPFSFetchOptions extends RequestInit {
  // IPFS-specific options
  ipfs?: {
    enabled?: boolean;
    forceRefresh?: boolean;
    preferIPFS?: boolean;
    archiveForever?: boolean;
    fallbackToOriginal?: boolean;
  };
  
  // Enhanced caching options
  cache?: {
    ttl?: number;
    staleWhileRevalidate?: boolean;
    maxAge?: number;
  };
}

export interface IPFSFetchResponse extends Response {
  ipfsMetadata?: {
    fromCache: boolean;
    source: 'original' | 'ipfs-local' | 'ipfs-cloudflare' | 'ipfs-pinning';
    cid?: string;
    cacheEntry?: any;
    fetchTime: number;
  };
}

export class IPFSFetchWrapper {
  private ipfsService: IPFSCacheService;
  private defaultConfig: IPFSConfig;

  constructor(config?: Partial<IPFSConfig>) {
    this.defaultConfig = {
      localNode: {
        enabled: process.env.IPFS_LOCAL_ENABLED === 'true',
        apiUrl: process.env.IPFS_API_URL || 'http://localhost:5001',
        gatewayUrl: process.env.IPFS_GATEWAY_URL || 'http://localhost:8080',
        timeout: 30000,
      },
      cloudflare: {
        enabled: process.env.IPFS_CLOUDFLARE_ENABLED === 'true',
        gatewayUrl: process.env.IPFS_CLOUDFLARE_GATEWAY || 'https://cloudflare-ipfs.com',
        timeout: 30000,
      },
      pinning: {
        pinata: {
          enabled: process.env.PINATA_ENABLED === 'true',
          apiKey: process.env.PINATA_API_KEY || '',
          secretKey: process.env.PINATA_SECRET_KEY || '',
        },
        web3Storage: {
          enabled: process.env.WEB3_STORAGE_ENABLED === 'true',
          token: process.env.WEB3_STORAGE_TOKEN || '',
        },
      },
      cache: {
        localMemoryEnabled: true,
        persistenceLevel: 'distributed',
        compressionEnabled: true,
        encryptionEnabled: false,
      },
      ...config,
    };

    this.ipfsService = new IPFSCacheService(this.defaultConfig);
    
    logger.info('IPFS Fetch Wrapper initialized', {
      localEnabled: this.defaultConfig.localNode?.enabled,
      cloudflareEnabled: this.defaultConfig.cloudflare?.enabled,
    });
  }

  /**
   * Enhanced fetch with IPFS caching
   */
  async fetch(url: string | URL, options: IPFSFetchOptions = {}): Promise<IPFSFetchResponse> {
    const urlString = url.toString();
    const ipfsOptions = options.ipfs || {};
    
    // Check if IPFS is enabled for this request
    const ipfsEnabled = ipfsOptions.enabled !== false && this.isIPFSEligible(urlString, options);
    
    if (!ipfsEnabled) {
      logger.debug('IPFS disabled for request, using standard fetch', { url: urlString });
      return this.standardFetch(urlString, options);
    }

    try {
      logger.debug('Attempting IPFS-enhanced fetch', { 
        url: urlString, 
        forceRefresh: ipfsOptions.forceRefresh,
        preferIPFS: ipfsOptions.preferIPFS 
      });

      const result = await this.ipfsService.fetchWithIPFS(urlString, {
        forceRefresh: ipfsOptions.forceRefresh,
        preferIPFS: ipfsOptions.preferIPFS,
        archiveForever: ipfsOptions.archiveForever,
        contentType: this.getExpectedContentType(options.headers),
      });

      return this.buildIPFSResponse(result, urlString);

    } catch (error) {
      logger.error('IPFS fetch failed', { 
        url: urlString, 
        error: error instanceof Error ? error.message : String(error) 
      });

      // Fallback to standard fetch if enabled
      if (ipfsOptions.fallbackToOriginal !== false) {
        logger.info('Falling back to standard fetch', { url: urlString });
        return this.standardFetch(urlString, options);
      }

      throw error;
    }
  }

  /**
   * Batch fetch multiple URLs with IPFS caching
   */
  async fetchBatch(
    urls: Array<{ url: string; options?: IPFSFetchOptions }>,
    parallelLimit: number = 5
  ): Promise<Array<{ url: string; response?: IPFSFetchResponse; error?: Error }>> {
    const results: Array<{ url: string; response?: IPFSFetchResponse; error?: Error }> = [];
    
    // Process URLs in batches to avoid overwhelming the system
    for (let i = 0; i < urls.length; i += parallelLimit) {
      const batch = urls.slice(i, i + parallelLimit);
      
      const batchPromises = batch.map(async ({ url, options = {} }) => {
        try {
          const response = await this.fetch(url, options);
          return { url, response };
        } catch (error) {
          return { url, error: error instanceof Error ? error : new Error(String(error)) };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Preload content into IPFS cache
   */
  async preload(urls: string[], options: { archiveForever?: boolean } = {}): Promise<void> {
    logger.info('Preloading content into IPFS cache', { count: urls.length });
    
    const batchResults = await this.fetchBatch(
      urls.map(url => ({
        url,
        options: {
          ipfs: {
            enabled: true,
            archiveForever: options.archiveForever,
            fallbackToOriginal: true,
          },
        },
      }))
    );

    const successful = batchResults.filter(r => r.response && !r.error).length;
    const failed = batchResults.filter(r => r.error).length;

    logger.info('Preload completed', { successful, failed, total: urls.length });
  }

  /**
   * Standard fetch without IPFS
   */
  private async standardFetch(url: string, options: IPFSFetchOptions): Promise<IPFSFetchResponse> {
    const { ipfs, cache, ...fetchOptions } = options;
    
    const response = await fetch(url, fetchOptions) as IPFSFetchResponse;
    
    // Add metadata indicating this was not cached
    response.ipfsMetadata = {
      fromCache: false,
      source: 'original',
      fetchTime: 0,
    };

    return response;
  }

  /**
   * Build Response object from IPFS result
   */
  private buildIPFSResponse(result: IPFSFetchResult, url: string): IPFSFetchResponse {
    const content = result.content;
    const body = content instanceof ArrayBuffer ? content : new TextEncoder().encode(content);
    
    const response = new Response(body, {
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'Content-Type': result.metadata.contentType,
        'Content-Length': result.metadata.size.toString(),
        'X-IPFS-Cache': result.fromCache ? 'HIT' : 'MISS',
        'X-IPFS-Source': result.source,
        'X-IPFS-CID': result.cacheEntry?.cid || '',
        'Cache-Control': result.fromCache ? 'max-age=3600' : 'no-cache',
      }),
    }) as IPFSFetchResponse;

    // Add IPFS metadata
    response.ipfsMetadata = {
      fromCache: result.fromCache,
      source: result.source,
      cid: result.cacheEntry?.cid,
      cacheEntry: result.cacheEntry,
      fetchTime: result.metadata.fetchTime,
    };

    return response;
  }

  /**
   * Determine if a URL is eligible for IPFS caching
   */
  private isIPFSEligible(url: string, options: IPFSFetchOptions): boolean {
    // Skip non-GET requests
    if (options.method && options.method.toUpperCase() !== 'GET') {
      return false;
    }

    // Skip requests with auth headers (potential security risk)
    if (options.headers) {
      const headers = new Headers(options.headers);
      if (headers.has('Authorization') || headers.has('Cookie')) {
        return false;
      }
    }

    // Skip localhost and private IPs
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'localhost' || 
          urlObj.hostname.startsWith('127.') ||
          urlObj.hostname.startsWith('192.168.') ||
          urlObj.hostname.startsWith('10.') ||
          urlObj.hostname.includes('::1')) {
        return false;
      }
    } catch {
      return false;
    }

    // Skip URLs that are likely dynamic
    if (url.includes('?t=') || url.includes('?timestamp=') || url.includes('?v=')) {
      return false;
    }

    return true;
  }

  /**
   * Extract expected content type from headers
   */
  private getExpectedContentType(headers?: HeadersInit): string | undefined {
    if (!headers) return undefined;
    
    const headersObj = new Headers(headers);
    return headersObj.get('Accept') || undefined;
  }

  /**
   * Get IPFS service statistics
   */
  getStats() {
    return this.ipfsService.getStats();
  }

  /**
   * Clear IPFS memory cache
   */
  clearCache(): void {
    this.ipfsService.clearMemoryCache();
  }

  /**
   * Update IPFS configuration
   */
  updateConfig(config: Partial<IPFSConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    this.ipfsService = new IPFSCacheService(this.defaultConfig);
    logger.info('IPFS configuration updated');
  }
}

// Create singleton instance for easy use
export const ipfsFetch = new IPFSFetchWrapper();

// Export convenience function that matches fetch API
export async function fetchWithIPFS(
  url: string | URL, 
  options?: IPFSFetchOptions
): Promise<IPFSFetchResponse> {
  return ipfsFetch.fetch(url, options);
}

// Export batch fetch function
export async function fetchBatchWithIPFS(
  urls: Array<{ url: string; options?: IPFSFetchOptions }>,
  parallelLimit?: number
): Promise<Array<{ url: string; response?: IPFSFetchResponse; error?: Error }>> {
  return ipfsFetch.fetchBatch(urls, parallelLimit);
}