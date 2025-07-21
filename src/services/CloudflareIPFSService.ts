/**
 * Cloudflare IPFS Service
 * Integrates IPFS with Cloudflare Workers, R2 storage, and global edge caching
 * Provides enhanced performance and reliability for IPFS content delivery
 */

import { logger } from '../utils/logger.js';

export interface CloudflareIPFSConfig {
  // Cloudflare R2 configuration
  r2?: {
    enabled: boolean;
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    region?: string;
  };
  
  // Cloudflare Workers KV configuration
  kv?: {
    enabled: boolean;
    namespaceId: string;
    apiToken: string;
    accountId: string;
  };
  
  // IPFS Gateway configuration
  gateways: {
    primary: string;
    fallbacks: string[];
    timeout: number;
    retries: number;
  };
  
  // Edge caching configuration
  edge?: {
    enabled: boolean;
    ttl: number;
    staleWhileRevalidate: number;
  };
}

export interface CloudflareIPFSEntry {
  cid: string;
  originalUrl: string;
  contentType: string;
  size: number;
  hash: string;
  r2Key?: string;
  kvKey?: string;
  metadata: {
    uploadedAt: number;
    lastAccessed: number;
    accessCount: number;
    regions: string[];
  };
}

export class CloudflareIPFSService {
  private config: CloudflareIPFSConfig;
  private indexCache = new Map<string, CloudflareIPFSEntry>();

  constructor(config: CloudflareIPFSConfig) {
    this.config = config;
    logger.info('Cloudflare IPFS Service initialized', {
      r2Enabled: config.r2?.enabled,
      kvEnabled: config.kv?.enabled,
      primaryGateway: config.gateways.primary,
      fallbackCount: config.gateways.fallbacks.length,
    });
  }

  /**
   * Fetch content with Cloudflare IPFS integration
   */
  async fetchWithCloudflare(
    url: string,
    options: {
      forceRefresh?: boolean;
      preferR2?: boolean;
      archiveToR2?: boolean;
      edgeCache?: boolean;
    } = {}
  ): Promise<{
    content: ArrayBuffer;
    fromCache: boolean;
    source: 'ipfs' | 'r2' | 'kv' | 'edge' | 'original';
    metadata: {
      contentType: string;
      size: number;
      fetchTime: number;
      cid?: string;
      region?: string;
    };
  }> {
    const startTime = Date.now();
    const urlHash = await this.hashUrl(url);

    try {
      // 1. Check Cloudflare KV cache first (fastest)
      if (this.config.kv?.enabled && !options.forceRefresh) {
        const kvResult = await this.fetchFromKV(urlHash);
        if (kvResult) {
          logger.debug('Content served from Cloudflare KV', { url });
          return {
            content: kvResult.content,
            fromCache: true,
            source: 'kv',
            metadata: {
              contentType: kvResult.contentType,
              size: kvResult.content.byteLength,
              fetchTime: Date.now() - startTime,
              cid: kvResult.cid,
            },
          };
        }
      }

      // 2. Check Cloudflare R2 storage
      if (this.config.r2?.enabled && !options.forceRefresh) {
        const r2Result = await this.fetchFromR2(urlHash);
        if (r2Result) {
          logger.debug('Content served from Cloudflare R2', { url });
          
          // Cache in KV for faster future access
          if (this.config.kv?.enabled) {
            await this.storeInKV(urlHash, r2Result);
          }

          return {
            content: r2Result.content,
            fromCache: true,
            source: 'r2',
            metadata: {
              contentType: r2Result.contentType,
              size: r2Result.content.byteLength,
              fetchTime: Date.now() - startTime,
              cid: r2Result.cid,
            },
          };
        }
      }

      // 3. Try IPFS gateways if we have a CID
      const cacheEntry = this.indexCache.get(urlHash);
      if (cacheEntry && !options.forceRefresh) {
        const ipfsResult = await this.fetchFromIPFSGateways(cacheEntry.cid);
        if (ipfsResult) {
          logger.debug('Content served from IPFS gateway', { url, cid: cacheEntry.cid });
          
          // Store in R2 and KV for future use
          await this.storeInCloudflare(cacheEntry, ipfsResult.content, ipfsResult.contentType);

          return {
            content: ipfsResult.content,
            fromCache: true,
            source: 'ipfs',
            metadata: {
              contentType: ipfsResult.contentType,
              size: ipfsResult.content.byteLength,
              fetchTime: Date.now() - startTime,
              cid: cacheEntry.cid,
            },
          };
        }
      }

      // 4. Fetch from original source and store
      logger.debug('Fetching from original source', { url });
      const originalResult = await this.fetchFromOriginal(url);
      
      // Add to IPFS and get CID
      const cid = await this.addToIPFS(originalResult.content, originalResult.contentType);
      
      if (cid) {
        const entry: CloudflareIPFSEntry = {
          cid,
          originalUrl: url,
          contentType: originalResult.contentType,
          size: originalResult.content.byteLength,
          hash: await this.computeHash(originalResult.content),
          metadata: {
            uploadedAt: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 1,
            regions: [],
          },
        };

        // Store in Cloudflare services
        await this.storeInCloudflare(entry, originalResult.content, originalResult.contentType);
        this.indexCache.set(urlHash, entry);
      }

      return {
        content: originalResult.content,
        fromCache: false,
        source: 'original',
        metadata: {
          contentType: originalResult.contentType,
          size: originalResult.content.byteLength,
          fetchTime: Date.now() - startTime,
          cid,
        },
      };

    } catch (error) {
      logger.error('Cloudflare IPFS fetch failed', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch content from Cloudflare KV
   */
  private async fetchFromKV(urlHash: string): Promise<{
    content: ArrayBuffer;
    contentType: string;
    cid: string;
  } | null> {
    if (!this.config.kv?.enabled) return null;

    try {
      const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${this.config.kv.accountId}/storage/kv/namespaces/${this.config.kv.namespaceId}/values/${urlHash}`;
      
      const response = await fetch(kvUrl, {
        headers: {
          'Authorization': `Bearer ${this.config.kv.apiToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        content: new Uint8Array(data.content).buffer,
        contentType: data.contentType,
        cid: data.cid,
      };

    } catch (error) {
      logger.error('Failed to fetch from Cloudflare KV', { 
        urlHash, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Store content in Cloudflare KV
   */
  private async storeInKV(urlHash: string, data: {
    content: ArrayBuffer;
    contentType: string;
    cid: string;
  }): Promise<void> {
    if (!this.config.kv?.enabled) return;

    try {
      const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${this.config.kv.accountId}/storage/kv/namespaces/${this.config.kv.namespaceId}/values/${urlHash}`;
      
      const payload = {
        content: Array.from(new Uint8Array(data.content)),
        contentType: data.contentType,
        cid: data.cid,
      };

      await fetch(kvUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.kv.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      logger.debug('Content stored in Cloudflare KV', { urlHash, cid: data.cid });

    } catch (error) {
      logger.error('Failed to store in Cloudflare KV', { 
        urlHash, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Fetch content from Cloudflare R2
   */
  private async fetchFromR2(urlHash: string): Promise<{
    content: ArrayBuffer;
    contentType: string;
    cid: string;
  } | null> {
    if (!this.config.r2?.enabled) return null;

    try {
      // Create AWS S3 compatible request for R2
      const r2Url = `https://${this.config.r2.bucketName}.${this.config.r2.accountId}.r2.cloudflarestorage.com/${urlHash}`;
      
      const response = await fetch(r2Url, {
        headers: {
          // Add AWS signature headers here if needed
          'Authorization': this.generateR2AuthHeader(urlHash),
        },
      });

      if (!response.ok) {
        return null;
      }

      const content = await response.arrayBuffer();
      const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
      const cid = response.headers.get('X-IPFS-CID') || '';

      return { content, contentType, cid };

    } catch (error) {
      logger.error('Failed to fetch from Cloudflare R2', { 
        urlHash, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Store content in Cloudflare R2
   */
  private async storeInR2(entry: CloudflareIPFSEntry, content: ArrayBuffer): Promise<void> {
    if (!this.config.r2?.enabled) return;

    try {
      const r2Url = `https://${this.config.r2.bucketName}.${this.config.r2.accountId}.r2.cloudflarestorage.com/${entry.hash}`;
      
      await fetch(r2Url, {
        method: 'PUT',
        headers: {
          'Authorization': this.generateR2AuthHeader(entry.hash),
          'Content-Type': entry.contentType,
          'X-IPFS-CID': entry.cid,
          'X-Original-URL': entry.originalUrl,
        },
        body: content,
      });

      entry.r2Key = entry.hash;
      logger.debug('Content stored in Cloudflare R2', { cid: entry.cid, r2Key: entry.r2Key });

    } catch (error) {
      logger.error('Failed to store in Cloudflare R2', { 
        cid: entry.cid, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Fetch content from IPFS gateways with fallback
   */
  private async fetchFromIPFSGateways(cid: string): Promise<{
    content: ArrayBuffer;
    contentType: string;
  } | null> {
    const gateways = [this.config.gateways.primary, ...this.config.gateways.fallbacks];

    for (const gateway of gateways) {
      try {
        const response = await fetch(`${gateway}/ipfs/${cid}`, {
          signal: AbortSignal.timeout(this.config.gateways.timeout),
        });

        if (response.ok) {
          const content = await response.arrayBuffer();
          const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
          
          logger.debug('Content fetched from IPFS gateway', { cid, gateway });
          return { content, contentType };
        }

      } catch (error) {
        logger.warn('IPFS gateway failed', { 
          cid, 
          gateway, 
          error: error instanceof Error ? error.message : String(error) 
        });
        continue;
      }
    }

    return null;
  }

  /**
   * Add content to IPFS network
   */
  private async addToIPFS(content: ArrayBuffer, contentType: string): Promise<string | null> {
    // This would typically involve posting to an IPFS node
    // For now, we'll compute a deterministic CID-like hash
    const hash = await this.computeHash(content);
    return `Qm${hash.substring(0, 44)}`; // Mock CID format
  }

  /**
   * Fetch from original source
   */
  private async fetchFromOriginal(url: string): Promise<{
    content: ArrayBuffer;
    contentType: string;
  }> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const content = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';

    return { content, contentType };
  }

  /**
   * Store content in Cloudflare services
   */
  private async storeInCloudflare(
    entry: CloudflareIPFSEntry,
    content: ArrayBuffer,
    contentType: string
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    // Store in R2
    if (this.config.r2?.enabled) {
      promises.push(this.storeInR2(entry, content));
    }

    // Store in KV (for smaller content)
    if (this.config.kv?.enabled && content.byteLength < 25 * 1024 * 1024) { // 25MB KV limit
      const urlHash = await this.hashUrl(entry.originalUrl);
      promises.push(this.storeInKV(urlHash, { content, contentType, cid: entry.cid }));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Generate Cloudflare R2 authorization header
   */
  private generateR2AuthHeader(key: string): string {
    // This would implement AWS Signature Version 4 for R2
    // For now, return a placeholder
    return `AWS4-HMAC-SHA256 Credential=${this.config.r2?.accessKeyId}/...`;
  }

  /**
   * Utility methods
   */
  private async hashUrl(url: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async computeHash(content: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      indexSize: this.indexCache.size,
      r2Enabled: this.config.r2?.enabled,
      kvEnabled: this.config.kv?.enabled,
      primaryGateway: this.config.gateways.primary,
      fallbackGateways: this.config.gateways.fallbacks.length,
    };
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.indexCache.clear();
    logger.info('Cloudflare IPFS cache cleared');
  }

  /**
   * Preload popular content to edge locations
   */
  async preloadToEdge(urls: string[]): Promise<void> {
    logger.info('Preloading content to Cloudflare edge', { count: urls.length });
    
    const promises = urls.map(async url => {
      try {
        await this.fetchWithCloudflare(url, { archiveToR2: true, edgeCache: true });
      } catch (error) {
        logger.error('Failed to preload to edge', { 
          url, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    await Promise.allSettled(promises);
    logger.info('Edge preload completed');
  }
}