# Cache Architecture

This document describes the pluggable cache provider system in the Translation Helps MCP project.

## Overview

The cache system uses a **pluggable provider architecture** where different cache implementations can be:

- Added or removed dynamically
- Reordered to change priority
- Enabled or disabled at runtime
- Configured per environment

## Core Concepts

### Cache Provider Interface

All cache providers implement a common interface:

```typescript
interface CacheProvider {
  name: string; // Unique identifier
  priority: number; // Default ordering (higher = first)
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  isAvailable(): Promise<boolean>;
}
```

### Cache Chain

The `CacheChain` manages an ordered list of providers and handles the fallback logic:

1. **Read Path**: Tries each provider in order until data is found
2. **Write Path**: Writes to all providers in parallel (fire-and-forget)
3. **Cache Warming**: When data is found in a later provider, it's written back to earlier providers

## Available Providers

### 1. Memory Cache Provider

**Priority**: 100 (Highest)  
**Environment**: All  
**Availability**: Always available

- Fastest cache tier
- In-process memory storage
- Ephemeral (lost on restart)
- Ideal for frequently accessed data

### 2. File System Cache Provider

**Priority**: 75  
**Environment**: Node.js only  
**Availability**: Requires file system access

- Persistent local storage
- Stores data in `~/.translation-helps-mcp/cache/data/`
- Offline capable
- Ideal for offline scenarios and large datasets

### 3. Cloudflare KV Cache Provider

**Priority**: 50  
**Environment**: Cloudflare Workers only  
**Availability**: Requires KV namespace binding

- Persistent distributed storage
- Available only in Cloudflare Workers
- Network-dependent
- Ideal for serverless deployments

### 4. Door43 Provider

**Priority**: 0 (Lowest - always last)  
**Environment**: All  
**Availability**: Requires network connection

- Upstream data source
- Read-only (cannot write)
- Always last in chain
- Fetches from Door43 Content Service

## Default Configurations

### Cloudflare Workers Environment

```typescript
["memory", "kv", "door43"];
```

- Memory for speed
- KV for persistence across requests
- Door43 as upstream source

### Node.js Environment (Online)

```typescript
["memory", "fs", "door43"];
```

- Memory for speed
- File system for offline capability
- Door43 as upstream source

### Node.js Environment (Offline)

```typescript
["memory", "fs"];
```

- Memory for speed
- File system only (no network access)
- Door43 automatically skipped

## Configuration

### Static Configuration

```typescript
const cacheChain = new CacheChain({
  enabledProviders: ["memory", "fs"],
  order: ["memory", "fs", "door43"],
  alwaysIncludeDoor43: true,
  skipUnavailable: true,
});
```

### Dynamic Configuration

```typescript
// Add a provider
await cacheChain.addProvider(new CustomProvider(), position);

// Remove a provider
cacheChain.removeProvider("kv");

// Reorder providers
cacheChain.reorderProviders(["fs", "memory", "door43"]);

// Reconfigure entire chain
await cacheChain.configure({
  enabledProviders: ["memory", "fs"],
  order: ["fs", "memory"],
  alwaysIncludeDoor43: false,
});
```

## How It Works

### Read Flow

```
1. Application requests data via cacheChain.get(key)
2. Chain tries Memory provider → not found
3. Chain tries FS provider → found!
4. Data returned to application
5. Data written back to Memory provider (cache warming)
```

### Write Flow

```
1. Application stores data via cacheChain.set(key, value)
2. Chain writes to Memory provider (parallel)
3. Chain writes to FS provider (parallel)
4. Chain writes to KV provider (parallel, if available)
5. All writes are fire-and-forget
```

### Offline Flow

```
1. Network detector checks Door43 availability
2. Door43 provider reports unavailable
3. Chain automatically skips Door43 (if skipUnavailable: true)
4. Only Memory and FS providers used
5. Application works completely offline
```

## Creating Custom Providers

```typescript
import { BaseCacheProvider } from "./cache-provider.js";

export class CustomProvider extends BaseCacheProvider {
  name = "custom";
  priority = 60;

  async get(key: string): Promise<unknown> {
    // Implement get logic
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    // Implement set logic
  }

  async has(key: string): Promise<boolean> {
    // Implement has logic
  }

  async delete(key: string): Promise<void> {
    // Implement delete logic
  }

  async clear(): Promise<void> {
    // Implement clear logic
  }

  async isAvailable(): Promise<boolean> {
    // Check if provider can be used
    return true;
  }
}

// Add to chain
cacheChain.addProvider(new CustomProvider());
```

## Performance Characteristics

| Provider | Speed               | Persistence | Offline | Size Limit     |
| -------- | ------------------- | ----------- | ------- | -------------- |
| Memory   | Fastest (< 1ms)     | No          | Yes     | RAM limit      |
| FS       | Fast (1-10ms)       | Yes         | Yes     | Disk space     |
| KV       | Medium (10-50ms)    | Yes         | No      | 25MB per value |
| Door43   | Slowest (100-500ms) | N/A         | No      | N/A            |

## Best Practices

### When to Use Which Provider

**Memory Cache:**

- Frequently accessed data
- Small datasets
- Short-term caching
- All environments

**File System Cache:**

- Offline scenarios
- Large datasets
- Long-term storage
- Node.js applications

**Cloudflare KV Cache:**

- Serverless deployments
- Distributed systems
- Persistent storage across requests
- Cloudflare Workers only

**Door43 Provider:**

- Always last in chain
- Fresh data source
- Fallback when local caches miss

### Configuration Tips

1. **Cloudflare Workers**: Use Memory + KV
2. **Node.js Server**: Use Memory + FS
3. **Offline Client**: Use Memory + FS only
4. **Development**: Use Memory only for faster iteration

## CLI Integration

The CLI provides commands to manage cache providers:

```bash
# Show active providers
th-cli cache providers

# Configure providers interactively
th-cli cache configure

# Enable a provider
th-cli cache enable fs

# Disable a provider
th-cli cache disable kv

# Reorder providers
th-cli cache reorder fs,memory,door43
```

## Implementation Details

### File System Cache Structure

```
~/.translation-helps-mcp/cache/
├── data/                    # Hashed cache entries
│   ├── abc123...json
│   ├── def456...json
│   └── ...
├── resources/               # Downloaded resources
│   ├── en/
│   │   ├── ult.zip
│   │   ├── tn.zip
│   │   └── ...
│   └── [other-langs]/
├── metadata.json            # Download tracking
├── index.json               # Fast lookups
├── imports/                 # Manual imports
└── exports/                 # Export packages
```

### Key Generation

Cache keys are versioned and typed:

```
v{version}:{type}:{key}

Examples:
- v7.3.0:fileContent:en_ult_01-GEN.usfm
- v7.3.0:organizations:unfoldingWord
```

### TTL Management

Each cache type has a defined TTL:

```typescript
{
  apiResponse: 600,      // 10 minutes
  organizations: 3600,   // 1 hour
  languages: 3600,       // 1 hour
  resources: 300,        // 5 minutes
  fileContent: 1800,     // 30 minutes
  metadata: 900,         // 15 minutes
  deduplication: 60,     // 1 minute
}
```

## Future Enhancements

- **Redis Provider**: For distributed caching
- **IndexedDB Provider**: For browser applications
- **SQLite Provider**: For mobile applications
- **S3 Provider**: For cloud storage
- **Auto-sync**: Background resource updates
- **Compression**: Automatic compression of large values
