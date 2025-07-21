/**
 * IPFS Configuration
 * Centralized configuration for IPFS caching and archival settings
 */

import { IPFSConfig } from '../services/IPFSCacheService.js';
import { CloudflareIPFSConfig } from '../services/CloudflareIPFSService.js';

/**
 * Default IPFS configuration
 */
export const defaultIPFSConfig: IPFSConfig = {
  localNode: {
    enabled: process.env.IPFS_LOCAL_ENABLED === 'true',
    apiUrl: process.env.IPFS_API_URL || 'http://localhost:5001',
    gatewayUrl: process.env.IPFS_GATEWAY_URL || 'http://localhost:8080',
    timeout: parseInt(process.env.IPFS_TIMEOUT || '30000'),
  },
  
  cloudflare: {
    enabled: process.env.IPFS_CLOUDFLARE_ENABLED === 'true',
    gatewayUrl: process.env.IPFS_CLOUDFLARE_GATEWAY || 'https://cloudflare-ipfs.com',
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    timeout: parseInt(process.env.IPFS_CLOUDFLARE_TIMEOUT || '30000'),
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
    localMemoryEnabled: process.env.IPFS_MEMORY_CACHE !== 'false',
    persistenceLevel: (process.env.IPFS_PERSISTENCE_LEVEL as any) || 'distributed',
    compressionEnabled: process.env.IPFS_COMPRESSION !== 'false',
    encryptionEnabled: process.env.IPFS_ENCRYPTION === 'true',
  },
};

/**
 * Cloudflare-specific IPFS configuration
 */
export const defaultCloudflareIPFSConfig: CloudflareIPFSConfig = {
  r2: {
    enabled: process.env.CLOUDFLARE_R2_ENABLED === 'true',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'ipfs-cache',
    region: process.env.CLOUDFLARE_R2_REGION || 'auto',
  },
  
  kv: {
    enabled: process.env.CLOUDFLARE_KV_ENABLED === 'true',
    namespaceId: process.env.CLOUDFLARE_KV_NAMESPACE_ID || '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  },
  
  gateways: {
    primary: process.env.IPFS_PRIMARY_GATEWAY || 'https://ipfs.io',
    fallbacks: [
      'https://gateway.ipfs.io',
      'https://cloudflare-ipfs.com',
      'https://dweb.link',
      'https://nftstorage.link',
    ],
    timeout: parseInt(process.env.IPFS_GATEWAY_TIMEOUT || '15000'),
    retries: parseInt(process.env.IPFS_GATEWAY_RETRIES || '3'),
  },
  
  edge: {
    enabled: process.env.CLOUDFLARE_EDGE_CACHE === 'true',
    ttl: parseInt(process.env.CLOUDFLARE_EDGE_TTL || '3600'), // 1 hour
    staleWhileRevalidate: parseInt(process.env.CLOUDFLARE_EDGE_SWR || '86400'), // 24 hours
  },
};

/**
 * Content type mappings for optimal caching strategies
 */
export const contentTypeCacheConfig = {
  // Scripture and content files - long-term caching
  'text/plain': { ttl: 86400, persistenceLevel: 'permanent' as const },
  'application/json': { ttl: 3600, persistenceLevel: 'distributed' as const },
  'text/html': { ttl: 1800, persistenceLevel: 'local' as const },
  
  // Binary files - permanent archival
  'application/pdf': { ttl: 604800, persistenceLevel: 'permanent' as const }, // 1 week
  'image/jpeg': { ttl: 604800, persistenceLevel: 'permanent' as const },
  'image/png': { ttl: 604800, persistenceLevel: 'permanent' as const },
  'audio/mpeg': { ttl: 604800, persistenceLevel: 'permanent' as const },
  'video/mp4': { ttl: 604800, persistenceLevel: 'permanent' as const },
  
  // Default fallback
  'default': { ttl: 3600, persistenceLevel: 'distributed' as const },
};

/**
 * URL patterns that should be archived permanently
 */
export const permanentArchivalPatterns = [
  // Scripture texts
  /.*\.(usfm|txt)$/i,
  
  // Translation resources
  /.*translation.*\.(json|md)$/i,
  
  // Audio/video content
  /.*\.(mp3|mp4|wav|m4a|ogg)$/i,
  
  // Images
  /.*\.(jpg|jpeg|png|gif|svg|webp)$/i,
  
  // Documents
  /.*\.(pdf|doc|docx)$/i,
];

/**
 * URL patterns that should prefer IPFS over original source
 */
export const preferIPFSPatterns = [
  // Large files that benefit from distributed delivery
  /.*\.(mp3|mp4|wav|m4a|ogg|pdf)$/i,
  
  // Frequently accessed content
  /.*\/popular\/.*$/i,
  /.*\/featured\/.*$/i,
];

/**
 * Get cache configuration for a specific content type
 */
export function getCacheConfigForContentType(contentType: string) {
  return contentTypeCacheConfig[contentType as keyof typeof contentTypeCacheConfig] 
    || contentTypeCacheConfig.default;
}

/**
 * Check if URL should be permanently archived
 */
export function shouldArchivePermanently(url: string): boolean {
  return permanentArchivalPatterns.some(pattern => pattern.test(url));
}

/**
 * Check if URL should prefer IPFS delivery
 */
export function shouldPreferIPFS(url: string): boolean {
  return preferIPFSPatterns.some(pattern => pattern.test(url));
}

/**
 * Environment-based configuration override
 */
export function getEnvironmentIPFSConfig(): Partial<IPFSConfig> {
  const config: Partial<IPFSConfig> = {};
  
  // Development environment - local IPFS only
  if (process.env.NODE_ENV === 'development') {
    config.localNode = { ...defaultIPFSConfig.localNode, enabled: true };
    config.cloudflare = { ...defaultIPFSConfig.cloudflare, enabled: false };
    config.cache = { 
      ...defaultIPFSConfig.cache, 
      persistenceLevel: 'local',
      compressionEnabled: false 
    };
  }
  
  // Production environment - full configuration
  if (process.env.NODE_ENV === 'production') {
    config.cache = {
      ...defaultIPFSConfig.cache,
      persistenceLevel: 'permanent',
      compressionEnabled: true,
    };
  }
  
  // Test environment - memory only
  if (process.env.NODE_ENV === 'test') {
    config.localNode = { ...defaultIPFSConfig.localNode, enabled: false };
    config.cloudflare = { ...defaultIPFSConfig.cloudflare, enabled: false };
    config.cache = {
      ...defaultIPFSConfig.cache,
      persistenceLevel: 'memory',
      localMemoryEnabled: true,
    };
  }
  
  return config;
}