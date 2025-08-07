# Linting Fixes Needed for Commit

## Overview

We're trying to commit the KV caching implementation but there are numerous linting errors blocking us. Here's what needs to be fixed:

## Files with Errors

### 1. src/functions/kv-cache.ts

- Replace all `any` types with proper types (`unknown`, `ArrayBuffer | string`, etc.)
- The `get` method in the interface needs to return `Promise<unknown>`
- The memoryCache Map needs typed values

### 2. src/services/ZipResourceFetcher2.ts

- Escape regex special characters properly (backslashes in regex patterns)
- Replace `any[]` return types with `unknown[]` or proper types
- Fix the `ingredient.path as string` type assertion

### 3. ui/src/routes/api/test-zip-scripture/+server.ts

- Fix any platform type issues
- Ensure proper error handling without exposing stack traces

### 4. Handler Files (already partially fixed)

- src/functions/handlers/fetch-translation-word-links.ts
- src/functions/handlers/get-context-catalog.ts
- src/functions/handlers/get-translation-word-fixed.ts
- src/functions/handlers/get-translation-word.ts

## Common Issues to Fix

1. **Replace `any` types**: Use `unknown`, specific types, or generic constraints
2. **Escape regex patterns**: Backslashes need to be escaped in regex strings
3. **Remove unused variables**: Comment out or remove variables that aren't used
4. **Catch blocks**: Use `catch {}` instead of `catch (err)` if error isn't used
5. **Type assertions**: Avoid `as string` - use proper type guards or validation

## Quick Fix Commands

```bash
# Auto-fix what can be fixed
npm run lint:fix

# Check specific files
npm run lint -- src/functions/kv-cache.ts
npm run lint -- src/services/ZipResourceFetcher2.ts

# Build to verify
npm run build
```

## Files to Commit Once Fixed

```bash
git add \
  src/functions/kv-cache.ts \
  src/services/ZipResourceFetcher2.ts \
  wrangler.toml \
  docs/KV_CACHE_SETUP.md \
  ui/src/routes/api/test-zip-scripture/+server.ts \
  src/functions/handlers/*.ts

git commit -m "feat: Add Cloudflare KV caching for persistent storage

- Created CloudflareKVCache class with two-tier caching
- Integrated KV cache into ZipResourceFetcher2
- Set up actual KV namespaces for production and preview
- Added comprehensive KV setup documentation
- Falls back gracefully to memory-only when KV unavailable

KV namespace IDs:
- Production: 116847d7b0714a9c8d2882335b05d35a
- Preview: 550f39aa441a453aaf682eddbb97a618"
```

## Note

The core functionality is working - these are just TypeScript/ESLint strictness issues. The caching logic itself is solid.
