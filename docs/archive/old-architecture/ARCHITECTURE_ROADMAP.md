# Translation Helps MCP - Architecture Roadmap

## Vision: From Complex to Simple

This document outlines our journey from the current complex architecture to a simple, maintainable, and antifragile system.

## Current State (December 2024)

### The Problem

- **RouteGenerator.ts**: ~1500 lines of abstraction
- **ResponseFormatter.ts**: ~500 lines of formatting logic
- **ZipResourceFetcher2.ts**: ~1200 lines of caching complexity
- **Total complexity**: ~3200 lines for what should be simple REST endpoints

### Architecture Diagram

```
Request → RouteGenerator → DataFetcher → Transformations → ResponseFormatter → Response
           (1500 lines)    (Complex)     (Scattered)       (500 lines)
```

## Future State: KISS Architecture

### The Goal

- Each endpoint: 50-100 lines max
- Direct handlers (like health endpoint)
- Simple resource service
- Clear separation of concerns
- No "magic" abstractions

### Target Architecture

```
Request → Simple Handler → Resource Service → Response
          (50 lines)       (Shared logic)     (Direct)
```

## Migration Strategy

### Phase 1: Stop the Bleeding ✅ (COMPLETED)

- [x] Fix critical bugs (empty cache, duplicates)
- [x] Remove diagnostic data from response bodies
- [x] Add contract tests for fetch-scripture
- [x] Stabilize existing system

### Phase 2: Add Safety Net 🚧 (IN PROGRESS)

- [x] Contract tests for golden standard endpoint
- [ ] Response validator middleware
- [ ] Cache validator (never cache empty)
- [ ] Circuit breaker for external failures
- [ ] Monitoring/alerting for violations

### Phase 3: Extract Core Services 📋 (PLANNED)

1. **Create ScriptureService**
   - Extract ZIP fetching logic
   - Simple interface: `getScripture(ref, lang) → Promise<Scripture[]>`
   - Keep existing caching logic
   - ~200 lines total

2. **Create TranslationHelpsService**
   - Extract notes/words/academy fetching
   - Unified interface for all help types
   - ~300 lines total

3. **Create SimpleCacheService**
   - Memory + KV caching
   - Simple get/set interface
   - TTL support
   - ~150 lines total

### Phase 4: Migrate Endpoints One by One 🔄

Order of migration (easiest to hardest):

1. `/api/health` - Already simple ✅
2. `/api/get-languages` - Minimal logic
3. `/api/fetch-scripture` - Our golden standard
4. `/api/fetch-translation-notes`
5. `/api/fetch-translation-words`
6. `/api/fetch-translation-academy`
7. (Continue with remaining endpoints)

### Phase 5: Delete the Old System 🗑️

Once all endpoints are migrated:

- Delete RouteGenerator.ts
- Delete ResponseFormatter.ts
- Delete complex abstractions
- Keep only simple, direct code

## Implementation Template

### Example: Migrated fetch-scripture endpoint

```typescript
// ui/src/routes/api/fetch-scripture/+server.ts
import { ScriptureService } from "$lib/services/scripture";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const scriptureService = new ScriptureService();

export const GET: RequestHandler = async ({ url, request }) => {
  // 1. Parse parameters
  const reference = url.searchParams.get("reference");
  const language = url.searchParams.get("language") || "en";
  const organization = url.searchParams.get("organization") || "unfoldingWord";

  // 2. Validate
  if (!reference) {
    return json(
      {
        error: "Reference parameter is required",
        status: 400,
      },
      {
        status: 400,
        headers: { "X-Error": "Missing reference" },
      },
    );
  }

  // 3. Fetch data
  try {
    const scripture = await scriptureService.getScripture({
      reference,
      language,
      organization,
    });

    // 4. Return clean response
    return json(
      {
        scripture,
        language,
        organization,
        citation: reference,
        metadata: {
          sourceCount: scripture.length,
          resources: scripture.map((s) => s.resource),
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type": "scripture",
        },
      },
    );
  } catch (error) {
    return json(
      {
        error: error.message,
        status: 500,
      },
      {
        status: 500,
      },
    );
  }
};

// Total lines: ~50 ✅
```

## Success Metrics

### Code Metrics

- [ ] Average endpoint size: <100 lines
- [ ] Total architecture code: <1000 lines (vs current 3200+)
- [ ] Test coverage: >90%
- [ ] Response time: <500ms p99

### Quality Metrics

- [ ] Zero diagnostic data in response bodies
- [ ] All endpoints follow same pattern
- [ ] New developer can understand in <30 minutes
- [ ] Can add new endpoint in <1 hour

## Principles

### KISS (Keep It Simple, Stupid)

- No abstractions unless they simplify
- Direct code > clever code
- Explicit > implicit

### DRY (Don't Repeat Yourself)

- Shared services for common logic
- But not at the cost of complexity
- Some duplication is OK for clarity

### Antifragile

- Each endpoint can fail independently
- Graceful degradation
- Circuit breakers for external deps
- Cache failures don't break functionality

## Timeline Estimate

Assuming 1 developer working part-time:

- Phase 2 (Safety Net): 1 week
- Phase 3 (Extract Services): 2 weeks
- Phase 4 (Migrate Endpoints): 4 weeks (2-3 endpoints/week)
- Phase 5 (Cleanup): 1 week

**Total: ~8 weeks to complete architecture**

## Risks & Mitigations

### Risk: Breaking existing functionality

**Mitigation**: Contract tests, gradual migration, feature flags

### Risk: Performance regression

**Mitigation**: Keep existing caching, benchmark each migration

### Risk: Scope creep

**Mitigation**: Strict adherence to simplicity, reject "nice to have" features

## Next Steps

1. Complete Phase 2 safety net
2. Create ScriptureService with existing ZIP logic
3. Migrate first simple endpoint as proof of concept
4. Iterate based on learnings

---

_"The best architecture is the one that ships and doesn't break. But the second best is the one that's simple enough to understand."_
