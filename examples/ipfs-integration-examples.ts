/**
 * IPFS Integration Examples
 * Demonstrates how to integrate IPFS caching into existing services
 */

import { fetchWithIPFS, IPFSFetchOptions } from '../src/services/IPFSFetchWrapper.js';
import { IPFSCacheService } from '../src/services/IPFSCacheService.js';
import { CloudflareIPFSService } from '../src/services/CloudflareIPFSService.js';
import { 
  defaultIPFSConfig, 
  defaultCloudflareIPFSConfig,
  shouldArchivePermanently,
  shouldPreferIPFS,
  getCacheConfigForContentType 
} from '../src/config/ipfs.config.js';

/**
 * Example 1: Enhanced DCS API Client with IPFS caching
 */
export class IPFSEnhancedDCSApiClient {
  private ipfsService: IPFSCacheService;

  constructor() {
    this.ipfsService = new IPFSCacheService(defaultIPFSConfig);
  }

  /**
   * Fetch file content with IPFS caching
   */
  async getFileContent(url: string, options: {
    language?: string;
    resourceType?: string;
    forceRefresh?: boolean;
  } = {}): Promise<{
    content: string;
    fromCache: boolean;
    source: string;
    cid?: string;
  }> {
    const ipfsOptions: IPFSFetchOptions = {
      ipfs: {
        enabled: true,
        forceRefresh: options.forceRefresh,
        preferIPFS: shouldPreferIPFS(url),
        archiveForever: shouldArchivePermanently(url),
        fallbackToOriginal: true,
      },
    };

    try {
      const response = await fetchWithIPFS(url, ipfsOptions);
      const content = await response.text();

      return {
        content,
        fromCache: response.ipfsMetadata?.fromCache || false,
        source: response.ipfsMetadata?.source || 'original',
        cid: response.ipfsMetadata?.cid,
      };

    } catch (error) {
      console.error('Failed to fetch with IPFS:', error);
      throw error;
    }
  }

  /**
   * Batch fetch multiple files with IPFS optimization
   */
  async batchGetFileContent(urls: string[]): Promise<Array<{
    url: string;
    content?: string;
    fromCache?: boolean;
    source?: string;
    error?: string;
  }>> {
    const batchOptions = urls.map(url => ({
      url,
      options: {
        ipfs: {
          enabled: true,
          preferIPFS: shouldPreferIPFS(url),
          archiveForever: shouldArchivePermanently(url),
          fallbackToOriginal: true,
        },
      } as IPFSFetchOptions,
    }));

    const results = await this.ipfsService.fetchBatch(batchOptions);
    
    return Promise.all(results.map(async result => {
      if (result.error) {
        return {
          url: result.url,
          error: result.error.message,
        };
      }

      if (result.response) {
        const content = await result.response.text();
        return {
          url: result.url,
          content,
          fromCache: result.response.ipfsMetadata?.fromCache,
          source: result.response.ipfsMetadata?.source,
        };
      }

      return { url: result.url, error: 'No response received' };
    }));
  }
}

/**
 * Example 2: Resource Aggregator with IPFS preloading
 */
export class IPFSEnhancedResourceAggregator {
  private ipfsService: IPFSCacheService;
  private cloudflareService?: CloudflareIPFSService;

  constructor(enableCloudflare: boolean = false) {
    this.ipfsService = new IPFSCacheService(defaultIPFSConfig);
    
    if (enableCloudflare) {
      this.cloudflareService = new CloudflareIPFSService(defaultCloudflareIPFSConfig);
    }
  }

  /**
   * Preload popular scripture passages
   */
  async preloadPopularContent(): Promise<void> {
    const popularUrls = [
      'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/01-GEN/01.usfm',
      'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/40-MAT/01.usfm',
      'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/43-JHN/01.usfm',
      'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/45-ROM/01.usfm',
      'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/19-PSA/023.usfm',
    ];

    console.log('Preloading popular content to IPFS...');
    await this.ipfsService.preload(popularUrls, { archiveForever: true });

    // Also preload to Cloudflare edge if available
    if (this.cloudflareService) {
      await this.cloudflareService.preloadToEdge(popularUrls);
    }

    console.log('Preloading completed');
  }

  /**
   * Fetch scripture with intelligent caching
   */
  async fetchScripture(reference: string, language: string = 'en'): Promise<{
    content: string;
    metadata: {
      cached: boolean;
      source: string;
      cid?: string;
      fetchTime: number;
    };
  }> {
    const url = this.buildScriptureUrl(reference, language);
    const startTime = Date.now();

    const cacheConfig = getCacheConfigForContentType('text/plain');
    const ipfsOptions: IPFSFetchOptions = {
      ipfs: {
        enabled: true,
        preferIPFS: true, // Scripture benefits from distributed delivery
        archiveForever: cacheConfig.persistenceLevel === 'permanent',
        fallbackToOriginal: true,
      },
    };

    try {
      const response = await fetchWithIPFS(url, ipfsOptions);
      const content = await response.text();

      return {
        content,
        metadata: {
          cached: response.ipfsMetadata?.fromCache || false,
          source: response.ipfsMetadata?.source || 'original',
          cid: response.ipfsMetadata?.cid,
          fetchTime: Date.now() - startTime,
        },
      };

    } catch (error) {
      console.error(`Failed to fetch scripture ${reference}:`, error);
      throw error;
    }
  }

  private buildScriptureUrl(reference: string, language: string): string {
    // Simplified URL building - in practice, this would be more complex
    return `https://git.door43.org/unfoldingWord/${language}_ult/raw/branch/master/${reference}.usfm`;
  }
}

/**
 * Example 3: Migration script to move existing cache to IPFS
 */
export class IPFSMigrationService {
  private ipfsService: IPFSCacheService;

  constructor() {
    this.ipfsService = new IPFSCacheService(defaultIPFSConfig);
  }

  /**
   * Migrate existing cached content to IPFS
   */
  async migrateExistingCache(cacheEntries: Array<{
    url: string;
    content: string | ArrayBuffer;
    contentType: string;
  }>): Promise<{
    migrated: number;
    failed: number;
    cids: string[];
  }> {
    console.log(`Migrating ${cacheEntries.length} cache entries to IPFS...`);
    
    const results = {
      migrated: 0,
      failed: 0,
      cids: [] as string[],
    };

    for (const entry of cacheEntries) {
      try {
        const result = await this.ipfsService.fetchWithIPFS(entry.url, {
          archiveForever: shouldArchivePermanently(entry.url),
        });

        if (result.cacheEntry?.cid) {
          results.cids.push(result.cacheEntry.cid);
          results.migrated++;
        }

      } catch (error) {
        console.error(`Failed to migrate ${entry.url}:`, error);
        results.failed++;
      }
    }

    console.log(`Migration completed: ${results.migrated} migrated, ${results.failed} failed`);
    return results;
  }
}

/**
 * Example 4: Monitoring and analytics for IPFS usage
 */
export class IPFSAnalyticsService {
  private ipfsService: IPFSCacheService;
  private cloudflareService?: CloudflareIPFSService;

  constructor(enableCloudflare: boolean = false) {
    this.ipfsService = new IPFSCacheService(defaultIPFSConfig);
    
    if (enableCloudflare) {
      this.cloudflareService = new CloudflareIPFSService(defaultCloudflareIPFSConfig);
    }
  }

  /**
   * Get comprehensive IPFS usage statistics
   */
  getUsageStats() {
    const stats = {
      ipfs: this.ipfsService.getStats(),
      cloudflare: this.cloudflareService?.getStats(),
      timestamp: new Date().toISOString(),
    };

    return stats;
  }

  /**
   * Monitor IPFS performance over time
   */
  async monitorPerformance(urls: string[], duration: number = 60000): Promise<{
    averageResponseTime: number;
    cacheHitRate: number;
    sourcesUsed: Record<string, number>;
  }> {
    const startTime = Date.now();
    const endTime = startTime + duration;
    const results: Array<{
      responseTime: number;
      fromCache: boolean;
      source: string;
    }> = [];

    console.log(`Monitoring IPFS performance for ${duration / 1000} seconds...`);

    while (Date.now() < endTime) {
      for (const url of urls) {
        const reqStart = Date.now();
        
        try {
          const response = await fetchWithIPFS(url, {
            ipfs: { enabled: true, fallbackToOriginal: true },
          });

          results.push({
            responseTime: Date.now() - reqStart,
            fromCache: response.ipfsMetadata?.fromCache || false,
            source: response.ipfsMetadata?.source || 'original',
          });

        } catch (error) {
          console.error(`Monitoring error for ${url}:`, error);
        }

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate statistics
    const totalRequests = results.length;
    const cacheHits = results.filter(r => r.fromCache).length;
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests;
    const cacheHitRate = (cacheHits / totalRequests) * 100;

    const sourcesUsed = results.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      averageResponseTime,
      cacheHitRate,
      sourcesUsed,
    };
  }
}

/**
 * Example 5: Health check for IPFS services
 */
export class IPFSHealthCheck {
  private ipfsService: IPFSCacheService;

  constructor() {
    this.ipfsService = new IPFSCacheService(defaultIPFSConfig);
  }

  /**
   * Comprehensive health check for all IPFS services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      localNode: { status: string; responseTime?: number; error?: string };
      cloudflareGateway: { status: string; responseTime?: number; error?: string };
      pinningServices: { status: string; available: string[] };
    };
    recommendations: string[];
  }> {
    const results = {
      status: 'healthy' as const,
      services: {
        localNode: { status: 'unknown' },
        cloudflareGateway: { status: 'unknown' },
        pinningServices: { status: 'unknown', available: [] as string[] },
      },
      recommendations: [] as string[],
    };

    // Test local IPFS node
    if (defaultIPFSConfig.localNode?.enabled) {
      try {
        const start = Date.now();
        const response = await fetch(`${defaultIPFSConfig.localNode.apiUrl}/api/v0/version`, {
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          results.services.localNode = {
            status: 'healthy',
            responseTime: Date.now() - start,
          };
        } else {
          results.services.localNode = {
            status: 'unhealthy',
            error: `HTTP ${response.status}`,
          };
        }

      } catch (error) {
        results.services.localNode = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error),
        };
        results.recommendations.push('Consider checking local IPFS node configuration');
      }
    } else {
      results.services.localNode = { status: 'disabled' };
    }

    // Test Cloudflare gateway
    try {
      const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'; // IPFS logo
      const start = Date.now();
      const response = await fetch(`${defaultCloudflareIPFSConfig.gateways.primary}/ipfs/${testCid}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        results.services.cloudflareGateway = {
          status: 'healthy',
          responseTime: Date.now() - start,
        };
      } else {
        results.services.cloudflareGateway = {
          status: 'degraded',
          error: `HTTP ${response.status}`,
        };
      }

    } catch (error) {
      results.services.cloudflareGateway = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      };
      results.recommendations.push('Cloudflare IPFS gateway is not responding');
    }

    // Check pinning services
    const availablePinningServices = [];
    
    if (defaultIPFSConfig.pinning?.pinata?.enabled && defaultIPFSConfig.pinning.pinata.apiKey) {
      availablePinningServices.push('pinata');
    }
    
    if (defaultIPFSConfig.pinning?.web3Storage?.enabled && defaultIPFSConfig.pinning.web3Storage.token) {
      availablePinningServices.push('web3storage');
    }

    results.services.pinningServices = {
      status: availablePinningServices.length > 0 ? 'healthy' : 'degraded',
      available: availablePinningServices,
    };

    if (availablePinningServices.length === 0) {
      results.recommendations.push('Consider configuring at least one pinning service for redundancy');
    }

    // Determine overall status
    const unhealthyServices = Object.values(results.services).filter(s => s.status === 'unhealthy').length;
    const degradedServices = Object.values(results.services).filter(s => s.status === 'degraded').length;

    if (unhealthyServices > 0) {
      results.status = 'unhealthy';
    } else if (degradedServices > 0) {
      results.status = 'degraded';
    }

    return results;
  }
}

// Export example usage
export const exampleUsage = {
  // Basic usage
  async basicExample() {
    const response = await fetchWithIPFS('https://example.com/file.txt', {
      ipfs: {
        enabled: true,
        preferIPFS: true,
        fallbackToOriginal: true,
      },
    });
    
    console.log('Content:', await response.text());
    console.log('From cache:', response.ipfsMetadata?.fromCache);
    console.log('Source:', response.ipfsMetadata?.source);
  },

  // Advanced usage with resource aggregator
  async advancedExample() {
    const aggregator = new IPFSEnhancedResourceAggregator(true);
    
    // Preload popular content
    await aggregator.preloadPopularContent();
    
    // Fetch scripture with caching
    const scripture = await aggregator.fetchScripture('GEN.1', 'en');
    console.log('Scripture fetched from:', scripture.metadata.source);
  },

  // Health monitoring
  async healthCheckExample() {
    const healthCheck = new IPFSHealthCheck();
    const status = await healthCheck.healthCheck();
    
    console.log('IPFS Health Status:', status.status);
    console.log('Recommendations:', status.recommendations);
  },
};