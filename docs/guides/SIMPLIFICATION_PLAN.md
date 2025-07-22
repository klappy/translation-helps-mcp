# Netlify Deployment Simplification Plan

**Problem:** We have a complex, duplicated setup with 30+ functions when we should have maybe 5.

**Solution:** Start fresh with modern SvelteKit + Netlify best practices.

## Current Mess vs. Simple Future

### What We Have Now (Complex):

```
netlify/functions/
├── fetch-scripture.ts           ← DUPLICATE
├── mcp-fetch-scripture.ts       ← DUPLICATE
├── fetch-translation-notes.ts   ← DUPLICATE
├── mcp-fetch-translation-notes.ts ← DUPLICATE
├── [28 more duplicated functions...]
└── _shared/
    ├── [16 over-engineered service files...]
```

### What We Should Have (Simple):

```
src/routes/api/
├── scripture/+server.ts         ← ONE function, works for everyone
├── translation-notes/+server.ts ← ONE function, works for everyone
├── translation-words/+server.ts ← ONE function, works for everyone
├── chat/+server.ts             ← ONE function for chat
└── health/+server.ts           ← ONE function for health

ui/                             ← SvelteKit app with proper routing
```

## The Modern Way (2024/2025)

### 1. SvelteKit API Routes

Instead of separate Netlify Functions, use SvelteKit's native API routes. These automatically become Netlify Functions when deployed.

### 2. Single Function per Endpoint

No more duplicating everything for MCP. One function handles both REST and MCP calls.

### 3. Proper SvelteKit Adapter Configuration

```js
// svelte.config.js
import adapter from "@sveltejs/adapter-netlify";

export default {
  kit: {
    adapter: adapter({
      // Let SvelteKit handle everything automatically
    }),
  },
};
```

### 4. Simplified Build Process

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "ui/build"

[build.environment]
  NODE_VERSION = "20"
```

## Step-by-Step Migration Plan

### Phase 1: Create New SvelteKit API Structure

1. Move all logic into `ui/src/routes/api/` using SvelteKit's native API routes
2. Each route handles both REST and MCP requests in one place
3. Use shared utilities from `ui/src/lib/server/`

### Phase 2: Eliminate Duplication

1. Delete all `mcp-*` functions (they become unnecessary)
2. Delete over-engineered `_shared/` services
3. Consolidate into simple, focused modules

### Phase 3: Simplify Build

1. Single build command: `npm run build` (in ui directory)
2. Let SvelteKit adapter handle Netlify deployment automatically
3. Remove complex multi-step build process

### Phase 4: Update Configuration

1. Simplified `netlify.toml`
2. Proper SvelteKit routing with fallback
3. Remove manual function configuration

## Expected Benefits

- **90% fewer files** (5 API routes vs 30+ functions)
- **One build command** instead of complex multi-step process
- **Automatic Netlify integration** via SvelteKit adapter
- **Better performance** (SvelteKit bundles efficiently)
- **Easier maintenance** (no duplication)
- **Proper SPA routing** (SvelteKit handles this correctly)

## Implementation Notes

1. **Keep existing functionality** - Everything should work the same for users
2. **MCP compatibility** - API routes can detect and respond to MCP calls
3. **Shared utilities** - Move reusable code to `ui/src/lib/server/`
4. **Environment variables** - Use SvelteKit's native env handling
5. **Caching** - Use SvelteKit's native cache headers

This follows the "first principles" approach:

- **Simple**: Fewer moving parts
- **Standard**: Using SvelteKit as designed
- **Modern**: Following 2024/2025 best practices
- **Maintainable**: No duplication or over-engineering
