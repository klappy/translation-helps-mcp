# V2 API Finalization Plan

## Overview

Replace V1 entirely with the V2 architecture, making it the new standard API with a major version bump.

---

## Phase 1: Endpoint Organization (2-3 days)

### 1.1 Three-Tier Classification System

#### Core Endpoints (Stable, Essential)

These are the foundation endpoints that LLMs should use first:

- `fetch-scripture`
- `translation-notes`
- `translation-questions`
- `translation-words`
- `list-translation-words`
- `fetch-translation-academy`
- `translation-word-links`
- `browse-translation-words`
- `browse-translation-academy`

#### Extended Endpoints (Stable, Advanced)

Production-ready but for advanced use cases:

- `get-languages`
- `get-available-books`
- `resource-catalog`
- `language-coverage`

#### Experimental/Lab Endpoints (Beta, Testing)

New features, testing, may change:

- `resource-recommendations`
- `extract-references`
- `simple-languages`
- `benchmark-endpoints`
- `test-endpoints`

### 1.2 Implementation Steps

1. **Update MCP Configuration**

   ```javascript
   // src/config/endpoints/index.ts
   export const coreEndpoints = [...];
   export const extendedEndpoints = [...];
   export const experimentalEndpoints = [...];
   ```

2. **Add Category Metadata**

   ```javascript
   endpoint.metadata = {
     stability: "core" | "extended" | "experimental",
     version: "2.0.0",
     deprecationWarning: null,
     llmGuidance: {
       core: "Essential, always available",
       extended: "Advanced features, use when needed",
       experimental: "Beta - may change, use with caution",
     },
   };
   ```

3. **Update `/api/mcp-config` Response**
   ```json
   {
     "success": true,
     "data": {
       "core": [...],
       "extended": [...],
       "experimental": [...]
     },
     "metadata": {
       "guidance": {
         "core": "Essential endpoints for basic Bible translation tasks",
         "extended": "Advanced features for specialized workflows",
         "experimental": "Beta features - subject to change"
       }
     }
   }
   ```

---

## Phase 2: Restore X-Ray Trace (1 day)

### 2.1 Add Base64 Trace to V2

```typescript
// ui/src/lib/simpleEndpoint.ts
if (trace) {
  // Existing headers
  traceHeaders["X-Trace-Id"] = trace.traceId || "unknown";

  // Add base64 encoded full trace
  const fullTrace = {
    traceId: trace.traceId,
    mainEndpoint: config.name,
    startTime: startTime,
    totalDuration: Date.now() - startTime,
    apiCalls: trace.apiCalls || [],
    cacheStats: trace.cacheStats || {},
  };

  traceHeaders["X-XRay-Trace"] = Buffer.from(
    JSON.stringify(fullTrace),
  ).toString("base64");
}
```

### 2.2 Benefits

- Complete debugging information
- Backward compatibility with V1 tooling
- No performance impact (already have the data)

---

## Phase 3: Verify MCP-Tools Page (30 min)

### 3.1 Good News - Already Compatible!

- Already uses dynamic `/api/mcp-config` ✓
- Already expects paths without /v2/ ✓
- Already categorizes endpoints ✓
- Will automatically work when v2 becomes main API ✓

### 3.2 Just Need to Verify

1. **Test After V2 Migration**

   ```bash
   # After moving v2 to root, verify:
   curl http://localhost:8174/api/mcp-config
   # Should show all endpoints without /v2/ in paths
   ```

2. **Visual Verification**
   - Core tab shows scripture & translation helps ✓
   - Extended tab shows discovery endpoints ✓
   - Experimental tab shows beta features ✓

3. **Quick Functionality Test**
   ```bash
   # Test that endpoints work at new locations
   curl "http://localhost:8174/api/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord"
   # Should return scripture (not 404)
   ```

---

## Phase 4: Direct V1 Replacement (1 day)

### 4.1 Direct Replacement - No Archive Needed

```
Action Plan:
1. Move /api/v2/* → /api/*
2. Delete all old v1 code
3. Major version bump to 6.0.0
4. Update docs to reflect new reality
```

### 4.2 Implementation Steps

1. **Move V2 to Root**

   ```bash
   # Move all v2 endpoints to be the primary API
   for file in ui/src/routes/api/v2/*; do
     git mv "$file" "ui/src/routes/api/"
   done
   git commit -m "feat!: V2 becomes the primary API"
   ```

2. **Clean Up Old Code**

   ```bash
   # Remove ALL old v1 endpoints (there are many!)
   git rm -rf ui/src/routes/api/fetch-scripture
   git rm -rf ui/src/routes/api/fetch-translation-*
   git rm -rf ui/src/routes/api/fetch-ult-scripture
   git rm -rf ui/src/routes/api/fetch-ust-scripture
   git rm -rf ui/src/routes/api/browse-translation-*
   git rm -rf ui/src/routes/api/get-*
   git rm -rf ui/src/routes/api/resource-*
   git rm -rf ui/src/routes/api/language-coverage
   git rm -rf ui/src/routes/api/list-available-resources
   git rm -rf ui/src/routes/api/extract-references
   git rm -rf ui/src/routes/api/chat*
   git rm -rf ui/src/routes/api/test-*
   git rm -rf ui/src/routes/api/benchmark-*
   git rm -rf src/lib/mockData
   git commit -m "feat!: Remove ALL v1 endpoints"
   ```

3. **Major Version Bump**

   ```bash
   # This is a breaking change - v6.0.0
   npm version major -m "feat!: V2 architecture replaces V1

   BREAKING CHANGE: Complete API overhaul
   - All endpoints moved from /api/v2/* to /api/*
   - Old v1 endpoints removed completely
   - Self-discoverable via /api/mcp-config
   - ZIP-based architecture for performance
   - Real DCS data only (no mock fallbacks)"
   ```

4. **Simple Announcement**

   ````markdown
   # Translation Helps API v6.0.0

   ## What Changed?

   Everything. But discovery makes it simple.

   ## How to Migrate?

   ```bash
   curl http://your-server/api/mcp-config
   ```

   The API tells you everything else.
   ````

   ```

   ```

### 4.3 Story Documentation

```markdown
# The Translation Helps Journey

## Chapter 1: The Beginning

- Started with individual file fetches
- Mock data for development
- Hardcoded book mappings

## Chapter 2: The Realization

- Performance issues with multiple API calls
- Mock data hiding real problems
- Inconsistent patterns across endpoints

## Chapter 3: The Transformation

- ZIP-based architecture (90% fewer calls)
- Real data only policy
- Self-discoverable endpoints

## Chapter 4: The Future

- GraphQL exploration
- WebSocket subscriptions
- AI-powered translation suggestions
```

---

## Timeline & Priorities

### Week 1

- [x] Day 1: Endpoint categorization (already done!)
- [x] Day 2: Add X-Ray trace to V2 (completed!)
- [x] Day 3: Verify MCP-Tools compatibility (confirmed!)

### Week 2

- [ ] Day 1: Direct v1 replacement (move v2 to root, delete old)
- [ ] Day 2: Major version bump & documentation update
- [ ] Day 3: Final testing and verification
- [ ] Day 4-5: Deploy v6.0.0

---

## Success Criteria

1. **Clear Organization**
   - LLMs understand which endpoints to use
   - Developers can easily find appropriate tools
   - Beta features clearly marked

2. **Feature Parity**
   - X-Ray traces available in V2
   - All V1 functionality preserved
   - Better performance maintained

3. **Effortless Transition**
   - Self-discovery eliminates migration complexity
   - API itself is the documentation
   - "Migration" is just updating the URL

4. **Clean Codebase**
   - No dead code in main branch
   - Clear separation of current vs legacy
   - Documentation reflects current state

---

## Risk Mitigation

1. **Breaking Changes**
   - Clear communication about major version
   - Self-discovery eliminates confusion
   - Point users to /api/mcp-config (instant understanding)

2. **LLM Confusion**
   - Clear metadata about stability
   - Explicit guidance in responses
   - Version indicators in all outputs

3. **Lost History**
   - Archive branch preserves code
   - Story documentation captures journey
   - Lessons learned documented

---

## Next Steps

1. Review and approve this plan
2. Create implementation tickets
3. Assign phase owners
4. Begin Phase 1 implementation

**Estimated Total Time: 5-7 days** (accelerated by removing deprecation period)
