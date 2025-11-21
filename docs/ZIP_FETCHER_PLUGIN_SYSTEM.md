# ZIP Fetcher Plugin System

## Overview

The Translation Helps MCP project now has a **configurable ZIP fetcher plugin system** that allows you to swap between different ZIP storage implementations (R2 vs FS) via a single configuration file.

## Architecture

### Plugin Interface

All ZIP fetcher providers implement the `ZipFetcherProvider` interface:

```typescript
interface ZipFetcherProvider {
  name: string; // "r2" or "fs"

  getRawUSFMContent(...): Promise<string | null>;
  getMarkdownContent(...): Promise<unknown>;
  isAvailable(): Promise<boolean>;
}
```

### Available Providers

1. **R2 ZIP Fetcher Provider** (`r2`)
   - Uses Cloudflare R2/Cache API
   - For Cloudflare Workers environments
   - Fast, distributed storage

2. **File System ZIP Fetcher Provider** (`fs`)
   - Uses local file system
   - For Node.js/CLI environments
   - Persistent, offline-capable storage
   - Stores ZIPs at `~/.translation-helps-mcp/cache/zips/`

### Factory Pattern

The `ZipFetcherFactory` creates the appropriate provider based on configuration:

```typescript
import { ZipFetcherFactory } from "./services/zip-fetcher-provider.js";

// Auto-detect based on environment
const fetcher = ZipFetcherFactory.create("auto", cacheDir, tracer);

// Explicitly use FS
const fetcher = ZipFetcherFactory.create("fs", cacheDir, tracer);

// Explicitly use R2
const fetcher = ZipFetcherFactory.create("r2", undefined, tracer);
```

## Configuration

### CLI Configuration

The CLI configuration file (`~/.translation-helps-cli/config.json`) includes:

```json
{
  "cacheProviders": ["memory", "fs"],
  "cacheProvidersOrder": ["memory", "fs", "door43"],
  "zipFetcherProvider": "fs",
  "cachePath": "~/.translation-helps-mcp/cache"
}
```

**Configuration Options:**

- `zipFetcherProvider`: `"r2"` | `"fs"` | `"auto"`
  - `"r2"`: Use Cloudflare R2/Cache API (Cloudflare Workers)
  - `"fs"`: Use local file system (Node.js/CLI)
  - `"auto"`: Auto-detect based on environment

### Environment Variables

You can also override via environment variables:

```bash
# Force FS provider
USE_FS_CACHE=true npm run cli:start

# Custom cache path
CACHE_PATH=/custom/path npm run cli:start
```

## Usage in Code

### Current Implementation

Currently, tools use hardcoded environment detection:

```typescript
// ❌ OLD WAY (hardcoded)
const useLocalStorage = process.env.USE_FS_CACHE === "true" || ...;
if (useLocalStorage) {
  zipFetcher = new LocalZipFetcher(cacheDir, tracer);
} else {
  zipFetcher = new ZipResourceFetcher2(tracer);
}
```

### New Plugin-Based Approach

Tools should use the factory:

```typescript
// ✅ NEW WAY (configurable)
import { ZipFetcherFactory } from "../services/zip-fetcher-provider.js";

// Get provider from config (CLI) or environment
const providerName = config?.zipFetcherProvider || process.env.ZIP_FETCHER_PROVIDER || "auto";
const zipFetcher = ZipFetcherFactory.create(providerName, cacheDir, tracer);

// Use the provider
const usfmContent = await zipFetcher.getRawUSFMContent(...);
const markdownContent = await zipFetcher.getMarkdownContent(...);
```

## Integration Status

### ✅ Completed

- [x] ZIP Fetcher Provider interface created
- [x] R2 ZIP Fetcher Provider implemented
- [x] FS ZIP Fetcher Provider implemented
- [x] ZIP Fetcher Factory created
- [x] CLI config updated with `zipFetcherProvider` field
- [x] Default set to `"fs"` for CLI

### ⚠️ Partially Implemented

- [ ] `LocalZipFetcher.getMarkdownContent()` - Currently falls back to R2
- [ ] Tools updated to use factory (currently using hardcoded detection)

### 📋 Tools That Need Updates

1. `src/tools/getTranslationWord.ts` - Currently uses hardcoded detection
2. `src/tools/fetchTranslationAcademy.ts` - Currently uses `ZipResourceFetcher2` directly
3. `src/functions/scripture-service.ts` - Currently uses hardcoded detection

## Migration Guide

### For Tool Implementations

**Before:**

```typescript
const useLocalStorage = typeof process !== "undefined" && ...;
let zipFetcher: ZipResourceFetcher2 | LocalZipFetcher;
if (useLocalStorage) {
  zipFetcher = new LocalZipFetcher(cacheDir, tracer);
} else {
  zipFetcher = new ZipResourceFetcher2(tracer);
}
```

**After:**

```typescript
import { ZipFetcherFactory } from "../services/zip-fetcher-provider.js";

// Get provider from config or environment
const providerName =
  (args as any).zipFetcherProvider ||
  process.env.ZIP_FETCHER_PROVIDER ||
  "auto";

const zipFetcher = ZipFetcherFactory.create(providerName, cacheDir, tracer);
```

### For Configuration Files

**CLI Config (`~/.translation-helps-cli/config.json`):**

```json
{
  "zipFetcherProvider": "fs"
}
```

**Environment Variables:**

```bash
ZIP_FETCHER_PROVIDER=fs npm run cli:start
```

## Benefits

1. **Single Configuration Point**: Configure cache behavior in one place
2. **Easy Swapping**: Change from R2 to FS (or vice versa) via config
3. **Environment-Agnostic**: Same code works in CLI, Workers, and other environments
4. **Testable**: Easy to mock providers for testing
5. **Extensible**: Easy to add new providers (e.g., S3, Redis)

## Future Enhancements

- [ ] Add S3 ZIP Fetcher Provider
- [ ] Add Redis ZIP Fetcher Provider
- [ ] Add IndexedDB ZIP Fetcher Provider (for browsers)
- [ ] Implement `getMarkdownContent` in `LocalZipFetcher`
- [ ] Add provider health checks and automatic fallback
- [ ] Add metrics and monitoring per provider

## Example: Switching Providers

### CLI (Default: FS)

```json
// ~/.translation-helps-cli/config.json
{
  "zipFetcherProvider": "fs"
}
```

ZIPs stored at: `~/.translation-helps-mcp/cache/zips/`

### Cloudflare Workers (Default: R2)

```typescript
// No config needed - auto-detects R2 in Workers environment
const fetcher = ZipFetcherFactory.create("auto");
```

ZIPs stored in: Cloudflare R2 bucket

### Override via Environment

```bash
# Force R2 even in Node.js (for testing)
ZIP_FETCHER_PROVIDER=r2 npm run cli:start

# Force FS even in Workers (for local dev)
ZIP_FETCHER_PROVIDER=fs npm run dev
```

## Related Documentation

- [Cache Architecture](./CACHE_ARCHITECTURE.md) - General cache provider system
- [Offline Architecture](./OFFLINE_ARCHITECTURE.md) - Offline-first design
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Setup and usage
