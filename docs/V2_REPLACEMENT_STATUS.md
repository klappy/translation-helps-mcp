# V2 Replacement Status

## Summary

We're replacing V1 entirely with V2 architecture (no deprecation period). This will be v6.0.0 - a major version bump with breaking changes.

## What's Done ✅

1. **Endpoint Categorization** - Already built into the system
   - All endpoints have `category: "core" | "extended" | "experimental"`
   - `/api/mcp-config` returns them organized by category

2. **X-Ray Tracing** - Fully implemented
   - `X-Cache-Status`: "hit" | "miss" | "partial"
   - `X-XRay-Trace`: Base64 encoded full trace data
   - Complete performance visibility

3. **MCP-Tools Compatibility** - Already compatible!
   - Dynamically loads from `/api/mcp-config`
   - Expects paths without `/v2/`
   - Will work automatically when v2 becomes main API

4. **V2 Architecture** - Complete
   - ZIP-based data flow
   - Real DCS data only (no mock fallbacks)
   - Consistent format support (json/md/text)
   - Self-discoverable API

## What's Next 🚀

### Day 1: Direct V1 Replacement

```bash
# Move v2 endpoints to root
for file in ui/src/routes/api/v2/*; do
  git mv "$file" "ui/src/routes/api/"
done

# Remove ALL old v1 endpoints
git rm -rf ui/src/routes/api/fetch-*
git rm -rf ui/src/routes/api/browse-*
git rm -rf ui/src/routes/api/get-*
# ... etc (see full list in V2_FINALIZATION_PLAN.md)
```

### Day 2: Major Version Bump

```bash
npm version major -m "feat!: V2 architecture replaces V1

BREAKING CHANGE: Complete API overhaul
- All endpoints moved from /api/v2/* to /api/*
- Old v1 endpoints removed completely
- Self-discoverable via /api/mcp-config
- ZIP-based architecture for performance"
```

### Day 3: Final Testing

- Verify all endpoints work at new locations
- Test MCP-Tools page functionality
- Run visual tests
- Deploy v6.0.0 🎉

## The Beauty of Self-Discovery

No migration guide needed. Users just:

```bash
curl http://your-server/api/mcp-config
```

The API tells them everything else.
