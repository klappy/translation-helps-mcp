# Cloudflare KV Cache Setup Guide

## Overview

Translation Helps MCP uses a two-tier caching system:

1. **Memory Cache** - Fast, ephemeral, lost on cold starts
2. **Cloudflare KV** - Persistent, distributed, survives restarts

Currently, we're only using memory cache. This guide explains how to enable KV caching for persistent storage.

## Why KV Cache?

Without KV, every cold start means:

- Re-downloading 10MB+ ZIP files
- Re-fetching catalog data
- 5-10 second response times

With KV enabled:

- ZIP files persist between deployments
- Sub-second responses after initial cache
- Global edge distribution

## Setup Instructions

### 1. Create KV Namespace

```bash
# Login to Cloudflare (one-time)
npx wrangler login

# Create the KV namespace (Wrangler v4+ syntax)
npx wrangler kv namespace create "TRANSLATION_HELPS_CACHE"
```

This will output something like:

```
🌍  Creating namespace with title "translation-helps-mcp-TRANSLATION_HELPS_CACHE"
✨  Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "TRANSLATION_HELPS_CACHE", id = "a1b2c3d4e5f6..." }
```

### 2. Update wrangler.toml

Replace the placeholder in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "TRANSLATION_HELPS_CACHE"
id = "a1b2c3d4e5f6..."  # Use your actual ID from step 1
```

### 3. Create Preview Namespace (Optional)

For development/preview deployments:

```bash
npx wrangler kv namespace create "TRANSLATION_HELPS_CACHE" --preview
```

Add the preview_id to your config:

```toml
[[kv_namespaces]]
binding = "TRANSLATION_HELPS_CACHE"
id = "a1b2c3d4e5f6..."
preview_id = "preview123..."  # Add this line
```

### 4. Deploy

```bash
npm run deploy
```

## Verification

After deployment, check the logs for:

- `🚀 CloudflareKVCache initialized with KV namespace` - KV is working
- `⚠️ CloudflareKVCache running in memory-only mode` - KV not configured

## Cache Behavior

### What Gets Cached

- **ZIP Files**: 30-day TTL (10MB+ repository archives)
- **Catalog Data**: 1-hour TTL
- **Transformed Responses**: 30-minute TTL

### Cache Keys

- ZIP files: `zip:organization/repository`
- Catalog: `catalog:lang:owner:type`
- Resources: `resource:lang:org:name:ref`

### Manual Cache Management

```bash
# List all keys
npx wrangler kv:key list --binding=TRANSLATION_HELPS_CACHE

# Delete a specific key
npx wrangler kv:key delete "zip:unfoldingWord/en_ult" --binding=TRANSLATION_HELPS_CACHE

# Clear all keys (careful!)
npx wrangler kv:key list --binding=TRANSLATION_HELPS_CACHE | \
  jq -r '.[].name' | \
  xargs -I {} npx wrangler kv:key delete {} --binding=TRANSLATION_HELPS_CACHE
```

## Monitoring

Check cache performance:

1. Look for `X-Cache-Status` headers
2. Monitor X-ray traces for cache hits
3. Check Cloudflare dashboard for KV analytics

## Cost Considerations

- **Free Tier**: 100,000 reads/day, 1,000 writes/day, 1GB storage
- **Our Usage**: ~1,000 reads/day, ~100 writes/day, ~500MB storage
- **Well within free tier** for typical usage

## Troubleshooting

### KV Not Available in Dev

Local development doesn't have KV access. The cache falls back to memory-only mode.

### KV Not Available in Production

1. Check wrangler.toml has correct namespace ID
2. Verify deployment includes KV bindings
3. Check Cloudflare dashboard for namespace existence

### Cache Misses After Setup

Normal on first deployment. Cache warms up with usage.

## Implementation Details

The caching system is implemented in:

- `src/functions/kv-cache.ts` - Two-tier cache manager
- `src/services/ZipResourceFetcher2.ts` - Uses KV cache for ZIPs
- `wrangler.toml` - KV namespace configuration

The system gracefully falls back to memory-only if KV is unavailable.
