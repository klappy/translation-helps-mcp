/**
 * IPFS Cache Service
 * Provides persistent archival and caching layer for all external file fetches
 * Supports both local IPFS nodes and Cloudflare IPFS integration
 */

import { logger } from "../utils/logger.js";
import { unifiedCache } from "../functions/unified-cache.js";

export interface IPFSConfig {
  // Local IPFS configuration
  localNode?: {
    enabled: boolean;
    apiUrl: string; // e.g., "http://localhost:5001"
    gatewayUrl: string; // e.g., "http://localhost:8080"
    timeout?: number;
  };
  
  // Cloudflare IPFS configuration
  cloudflare?: {
    enabled: boolean;
    gatewayUrl: string; // e.g., "https://cloudflare-ipfs.com"
    apiToken?: string; // For Cloudflare Web3 API if available
    timeout?: number;
  };
  
  // Pinning services for persistence
  pinning?: {
    pinata?: {
      enabled: boolean;
      apiKey: string;
      secretKey: string;
    };
    web3Storage?: {
      enabled: boolean;
      token: string;
    };
  };
  
  // Cache behavior
  cache?: {
    localMemoryEnabled: boolean;
    persistenceLevel: 'memory' | 'local' | 'distributed' | 'permanent';
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };
}

export interface IPFSCacheEntry {
  cid: string;
  originalUrl: string;
  contentType: string;
  size: number;
  hash: string; // SHA-256 hash for verification
  metadata: {
    fetchedAt: number;
    lastAccessed: number;
    accessCount: number;
    source: 'local' | 'cloudflare' | 'pinata' | 'web3storage';
    compressed?: boolean;
    encrypted?: boolean;
  };
}

export interface IPFSFetchResult {
  content: ArrayBuffer | string;
  fromCache: boolean;
  cacheEntry?: IPFSCacheEntry;
  source: 'original' | 'ipfs-local' | 'ipfs-cloudflare' | 'ipfs-pinning';
  metadata: {
    contentType: string;
    size: number;
    fetchTime: number;
  };
}

export class IPFSCacheService {
  private config: IPFSConfig;
  private indexCache = new Map<string, IPFSCacheEntry>();
  
  constructor(config: IPFSConfig) {
    this.config = {
      cache: {
        localMemoryEnabled: true,
        persistenceLevel: 'distributed',
        compressionEnabled: true,
        encryptionEnabled: false,
        ...config.cache,
      },
      ...config,
    };
    
    logger.info("IPFS Cache Service initialized", {
      localEnabled: this.config.localNode?.enabled,
      cloudflareEnabled: this.config.cloudflare?.enabled,
      persistenceLevel: this.config.cache?.persistenceLevel,
    });
  }

  /**
   * Fetch content with IPFS caching and archival
   */
  async fetchWithIPFS(
    url: string,
    options: {
      forceRefresh?: boolean;
      preferIPFS?: boolean;
      archiveForever?: boolean;
      contentType?: string;
    } = {}
  ): Promise<IPFSFetchResult> {
    const startTime = Date.now();
    const urlHash = await this.hashUrl(url);
    
    try {
      // 1. Check local memory cache first
      if (this.config.cache?.localMemoryEnabled && !options.forceRefresh) {
        const cached = await this.getFromMemoryCache(urlHash);
        if (cached) {
          logger.debug("Content served from memory cache", { url, cid: cached.cid });
          return await this.buildResult(cached, 'ipfs-local', startTime);
        }
      }

      // 2. Check IPFS cache (local node first, then Cloudflare)
      if (!options.forceRefresh) {
        const ipfsResult = await this.fetchFromIPFS(urlHash, options.preferIPFS);
        if (ipfsResult) {
          logger.debug("Content served from IPFS", { url, source: ipfsResult.source });
          return ipfsResult;
        }
      }

      // 3. Fetch from original source
      logger.debug("Fetching from original source", { url });
      const originalContent = await this.fetchFromOriginal(url, options.contentType);
      
      // 4. Store in IPFS for future use
      const cacheEntry = await this.storeInIPFS(
        url,
        originalContent.content,
        originalContent.metadata.contentType,
        options.archiveForever
      );

      // 5. Update memory cache
      if (this.config.cache?.localMemoryEnabled && cacheEntry) {
        this.indexCache.set(urlHash, cacheEntry);
        await unifiedCache.set(`ipfs:${urlHash}`, cacheEntry, 'fileContent');
      }

      return {
        content: originalContent.content,
        fromCache: false,
        cacheEntry,
        source: 'original',
        metadata: originalContent.metadata,
      };

    } catch (error) {
      logger.error("IPFS fetch failed", { url, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Store content in IPFS with appropriate persistence level
   */
  private async storeInIPFS(
    originalUrl: string,
    content: ArrayBuffer | string,
    contentType: string,
    permanent: boolean = false
  ): Promise<IPFSCacheEntry | null> {
    const contentBuffer = content instanceof ArrayBuffer ? content : new TextEncoder().encode(content);
    const hash = await this.computeHash(contentBuffer);
    
    try {
      // Try local node first
      if (this.config.localNode?.enabled) {
        const cid = await this.addToLocalIPFS(contentBuffer, contentType);
        if (cid) {
          const entry: IPFSCacheEntry = {
            cid,
            originalUrl,
            contentType,
            size: contentBuffer.byteLength,
            hash,
            metadata: {
              fetchedAt: Date.now(),
              lastAccessed: Date.now(),
              accessCount: 1,
              source: 'local',
              compressed: this.config.cache?.compressionEnabled,
            },
          };

          // Pin permanently if requested
          if (permanent || this.config.cache?.persistenceLevel === 'permanent') {
            await this.pinToServices(cid, entry);
          }

          return entry;
        }
      }

      // Fallback to Cloudflare IPFS
      if (this.config.cloudflare?.enabled) {
        const cid = await this.addToCloudflareIPFS(contentBuffer, contentType);
        if (cid) {
          return {
            cid,
            originalUrl,
            contentType,
            size: contentBuffer.byteLength,
            hash,
            metadata: {
              fetchedAt: Date.now(),
              lastAccessed: Date.now(),
              accessCount: 1,
              source: 'cloudflare',
            },
          };
        }
      }

      logger.warn("Failed to store content in any IPFS service", { originalUrl });
      return null;

    } catch (error) {
      logger.error("Error storing content in IPFS", { 
        originalUrl, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Add content to local IPFS node
   */
  private async addToLocalIPFS(content: ArrayBuffer, contentType: string): Promise<string | null> {
    if (!this.config.localNode?.enabled) return null;

    try {
      const formData = new FormData();
      formData.append('file', new Blob([content], { type: contentType }));

      const response = await fetch(`${this.config.localNode.apiUrl}/api/v0/add`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(this.config.localNode.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`IPFS add failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.debug("Content added to local IPFS", { cid: result.Hash, size: result.Size });
      return result.Hash;

    } catch (error) {
      logger.error("Failed to add content to local IPFS", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Add content to Cloudflare IPFS (via gateway upload if supported)
   */
  private async addToCloudflareIPFS(content: ArrayBuffer, contentType: string): Promise<string | null> {
    // Note: Direct uploads to Cloudflare IPFS may require Web3 API or other methods
    // This is a placeholder for the actual implementation
    logger.warn("Cloudflare IPFS upload not yet implemented");
    return null;
  }

  /**
   * Fetch content from IPFS
   */
  private async fetchFromIPFS(urlHash: string, preferIPFS: boolean = false): Promise<IPFSFetchResult | null> {
    const startTime = Date.now();
    
    // Check if we have a CID for this URL
    const cacheEntry = this.indexCache.get(urlHash) || await this.getCacheEntry(urlHash);
    if (!cacheEntry) return null;

    // Try local IPFS first if available
    if (this.config.localNode?.enabled) {
      const content = await this.fetchFromLocalIPFS(cacheEntry.cid);
      if (content) {
        cacheEntry.metadata.lastAccessed = Date.now();
        cacheEntry.metadata.accessCount++;
        return await this.buildResult(cacheEntry, 'ipfs-local', startTime, content);
      }
    }

    // Try Cloudflare IPFS gateway
    if (this.config.cloudflare?.enabled) {
      const content = await this.fetchFromCloudflareIPFS(cacheEntry.cid);
      if (content) {
        cacheEntry.metadata.lastAccessed = Date.now();
        cacheEntry.metadata.accessCount++;
        return await this.buildResult(cacheEntry, 'ipfs-cloudflare', startTime, content);
      }
    }

    return null;
  }

  /**
   * Fetch content from local IPFS node
   */
  private async fetchFromLocalIPFS(cid: string): Promise<ArrayBuffer | null> {
    if (!this.config.localNode?.enabled) return null;

    try {
      const response = await fetch(`${this.config.localNode.gatewayUrl}/ipfs/${cid}`, {
        signal: AbortSignal.timeout(this.config.localNode.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText}`);
      }

      return await response.arrayBuffer();

    } catch (error) {
      logger.error("Failed to fetch from local IPFS", { cid, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Fetch content from Cloudflare IPFS gateway
   */
  private async fetchFromCloudflareIPFS(cid: string): Promise<ArrayBuffer | null> {
    if (!this.config.cloudflare?.enabled) return null;

    try {
      const response = await fetch(`${this.config.cloudflare.gatewayUrl}/ipfs/${cid}`, {
        signal: AbortSignal.timeout(this.config.cloudflare.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`Cloudflare IPFS fetch failed: ${response.status} ${response.statusText}`);
      }

      return await response.arrayBuffer();

    } catch (error) {
      logger.error("Failed to fetch from Cloudflare IPFS", { cid, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Fetch from original source
   */
  private async fetchFromOriginal(url: string, expectedContentType?: string): Promise<{
    content: ArrayBuffer;
    metadata: { contentType: string; size: number; fetchTime: number };
  }> {
    const startTime = Date.now();
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const content = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || expectedContentType || 'application/octet-stream';

    return {
      content,
      metadata: {
        contentType,
        size: content.byteLength,
        fetchTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Pin content to external pinning services for permanent storage
   */
  private async pinToServices(cid: string, entry: IPFSCacheEntry): Promise<void> {
    const promises: Promise<void>[] = [];

    // Pin to Pinata
    if (this.config.pinning?.pinata?.enabled) {
      promises.push(this.pinToPinata(cid, entry));
    }

    // Pin to Web3.Storage
    if (this.config.pinning?.web3Storage?.enabled) {
      promises.push(this.pinToWeb3Storage(cid, entry));
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  /**
   * Pin to Pinata
   */
  private async pinToPinata(cid: string, entry: IPFSCacheEntry): Promise<void> {
    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.config.pinning!.pinata!.apiKey,
          'pinata_secret_api_key': this.config.pinning!.pinata!.secretKey,
        },
        body: JSON.stringify({
          hashToPin: cid,
          pinataMetadata: {
            name: `cached-${entry.originalUrl}`,
            keyvalues: {
              originalUrl: entry.originalUrl,
              contentType: entry.contentType,
              cachedAt: new Date().toISOString(),
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Pinata pin failed: ${response.status}`);
      }

      logger.info("Content pinned to Pinata", { cid, originalUrl: entry.originalUrl });

    } catch (error) {
      logger.error("Failed to pin to Pinata", { cid, error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Pin to Web3.Storage
   */
  private async pinToWeb3Storage(cid: string, entry: IPFSCacheEntry): Promise<void> {
    // Placeholder for Web3.Storage pinning implementation
    logger.info("Web3.Storage pinning not yet implemented", { cid });
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

  private async getFromMemoryCache(urlHash: string): Promise<IPFSCacheEntry | null> {
    const cached = this.indexCache.get(urlHash);
    if (cached) return cached;

    const unifiedCached = await unifiedCache.get(`ipfs:${urlHash}`, 'fileContent');
    if (unifiedCached) {
      this.indexCache.set(urlHash, unifiedCached);
      return unifiedCached;
    }

    return null;
  }

  private async getCacheEntry(urlHash: string): Promise<IPFSCacheEntry | null> {
    // In a production system, this would query a persistent index
    // For now, return null to force fetching from original source
    return null;
  }

  private async buildResult(
    cacheEntry: IPFSCacheEntry,
    source: 'ipfs-local' | 'ipfs-cloudflare',
    startTime: number,
    content?: ArrayBuffer
  ): Promise<IPFSFetchResult> {
    // If content not provided, fetch it
    const finalContent = content || (source === 'ipfs-local' 
      ? await this.fetchFromLocalIPFS(cacheEntry.cid)
      : await this.fetchFromCloudflareIPFS(cacheEntry.cid));

    if (!finalContent) {
      throw new Error('Failed to fetch content from IPFS');
    }

    return {
      content: finalContent,
      fromCache: true,
      cacheEntry,
      source,
      metadata: {
        contentType: cacheEntry.contentType,
        size: cacheEntry.size,
        fetchTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      indexSize: this.indexCache.size,
      localNodeEnabled: this.config.localNode?.enabled,
      cloudflareEnabled: this.config.cloudflare?.enabled,
      persistenceLevel: this.config.cache?.persistenceLevel,
      memoryEnabled: this.config.cache?.localMemoryEnabled,
    };
  }

  /**
   * Clear memory cache
   */
  clearMemoryCache(): void {
    this.indexCache.clear();
    logger.info("IPFS memory cache cleared");
  }
}