# Duplication Summary & Recommendations

## Executive Summary

After implementing shared utilities for MCP tools, we've eliminated **~50% of boilerplate code** in MCP tools. However, **significant duplication still exists** between HTTP endpoints and MCP tools, primarily because HTTP endpoints bypass core services and call `ZipResourceFetcher2` directly.

## Key Finding: The Critical Path Duplication

### The Problem

```
HTTP Endpoints:                    MCP Tools:
RouteGenerator                     Tool Handler
  ↓                                  ↓
functionalDataFetchers          Core Service
  ↓                                  ↓
ZipResourceFetcher2 (direct)    ZipResourceFetcher2 (via service)
  ↓                                  ↓
Manual transformation            Pre-transformed data
```

**HTTP endpoints have ~150 lines of duplicate logic** that MCP tools don't need because they use core services.

## Specific Duplications Found

### 1. **Scripture Data Transformation** (~50 lines)

**Location**: `src/config/functionalDataFetchers.ts` lines 209-261

**What's Duplicated:**

- Translation → resource field mapping
- Deduplication logic (filtering duplicate resources)
- Primary scripture selection (prefer ULT)
- Reference string normalization
- Chapter range detection

**Impact**: HTTP manually transforms data that the service already handles

**Fix**: Make HTTP use `fetchScripture()` service instead of `ZipResourceFetcher2` directly

---

### 2. **Cache Status Detection** (~25 lines)

**Location**: `src/config/functionalDataFetchers.ts` lines 263-285

**What's Duplicated:**

- X-ray trace inspection
- Cache hit/miss detection
- KV cache status checking

**Impact**: HTTP manually detects cache status that service already provides in metadata

**Fix**: Use `result.metadata.cached` from service instead of manual inspection

---

### 3. **Error Detection & Classification** (~40 lines)

**Location**: `src/config/functionalDataFetchers.ts` lines 291-350

**What's Duplicated:**

- Server error counting
- Catalog validation
- Error message construction
- Status code determination (400 vs 503)

**Impact**: HTTP has complex error detection that service should handle

**Fix**: Service should classify errors and return appropriate error types

---

### 4. **Parameter Parsing** (~60 lines)

**Location**: `src/config/RouteGenerator.ts` lines 530-589

**What's Duplicated:**

- Type conversion (string → boolean, number, array)
- Default value application
- Required parameter checking

**Impact**: HTTP has manual parsing while MCP uses Zod (automatic)

**Fix**: Generate HTTP parsing from Zod schemas OR generate Zod from endpoint configs

---

## Quantified Impact

### Lines of Duplicate Code

| Category                | Lines          | Location                  | Priority |
| ----------------------- | -------------- | ------------------------- | -------- |
| Data Transformation     | ~50            | functionalDataFetchers.ts | Critical |
| Cache Detection         | ~25            | functionalDataFetchers.ts | Critical |
| Error Classification    | ~40            | functionalDataFetchers.ts | Critical |
| Parameter Parsing       | ~60            | RouteGenerator.ts         | High     |
| Reference Normalization | ~25            | functionalDataFetchers.ts | Critical |
| **TOTAL**               | **~200 lines** |                           |          |

### Per Resource Type

Each resource type (scripture, notes, questions, etc.) has similar duplication patterns:

- **Scripture**: ~150 lines of duplicate logic
- **Translation Notes**: ~30 lines (less because simpler transformation)
- **Translation Questions**: ~30 lines
- **Translation Word Links**: ~20 lines

**Estimated Total Duplication**: ~250-300 lines across all resource types

---

## Recommended Solution: Phase 1 (Critical)

### Make HTTP Endpoints Use Core Services

**Current (HTTP):**

```typescript
// functionalDataFetchers.ts
case "getScripture": {
  scriptures = await zipFetcher.getScripture(...);
  // 150 lines of transformation, normalization, error detection
  return normalized.map(...);
}
```

**Proposed (HTTP):**

```typescript
// functionalDataFetchers.ts
case "getScripture": {
  const { fetchScripture } = await import("../functions/scripture-service.js");
  const result = await fetchScripture({
    reference: params.reference,
    language: params.language,
    organization: params.organization,
    resource: params.resource,
    format: params.format,
    includeVerseNumbers: params.includeVerseNumbers,
    includeAlignment: params.includeAlignment,
  });
  // Transform to HTTP response format (simple mapping)
  return transformServiceResultToHTTPFormat(result);
}
```

**Benefits:**

- ✅ Eliminates ~150 lines of duplicate transformation logic
- ✅ Single source of truth for data fetching
- ✅ Consistent behavior between HTTP and MCP
- ✅ Easier to maintain (fix once, works everywhere)
- ✅ Service already handles all the complex logic

**Implementation Steps:**

1. Update `functionalDataFetchers.ts` to import and call core services
2. Create simple transformation functions to convert service results to HTTP format
3. Remove duplicate transformation/normalization logic
4. Test that HTTP endpoints still work correctly

---

## Recommended Solution: Phase 2 (High Priority)

### Unify Parameter Validation

**Option A: Generate Zod from Endpoint Configs**

```typescript
// Generate Zod schema from EndpointConfig.params
function generateZodSchema(config: EndpointConfig): z.ZodObject<any> {
  const shape: z.ZodRawShape = {};
  for (const [name, param] of Object.entries(config.params)) {
    shape[name] = convertParamConfigToZod(param);
  }
  return z.object(shape);
}
```

**Option B: Generate Endpoint Config from Zod**

```typescript
// Generate EndpointConfig.params from Zod schema
function generateEndpointParams(
  schema: z.ZodObject<any>,
): Record<string, ParamConfig> {
  const params: Record<string, ParamConfig> = {};
  for (const [name, field] of Object.entries(schema.shape)) {
    params[name] = convertZodToParamConfig(field);
  }
  return params;
}
```

**Benefits:**

- ✅ Single source of truth for parameters
- ✅ Consistent validation across HTTP and MCP
- ✅ Automatic synchronization

---

## Remaining Intentional Differences

These are **not** duplications - they're intentional protocol differences:

1. **Error Response Format**
   - HTTP: `{ statusCode, body, headers }`
   - MCP: `{ content: [{ type: "text", text: "..." }], isError: true }`
   - **Status**: Intentional - different protocols need different formats

2. **Response Formatting**
   - HTTP: Uses `ResponseFormatter` service for text/md/json
   - MCP: Returns structured data or simple text content
   - **Status**: Intentional - MCP protocol has different needs

3. **Performance Tracking**
   - HTTP: Records to `performanceMonitor`
   - MCP: Currently doesn't track (could add)
   - **Status**: Could be unified, but low priority

---

## Implementation Priority

### Phase 1: Critical (Do First) ⚡

**Make HTTP use core services**

- **Impact**: Eliminates ~150 lines per resource type
- **Effort**: Medium (need to test thoroughly)
- **Risk**: Low (core services are already tested)

### Phase 2: High Priority (Do Next) 📋

**Unify parameter validation**

- **Impact**: Eliminates ~60 lines, prevents future mismatches
- **Effort**: Medium (need schema converter)
- **Risk**: Low (validation logic is straightforward)

### Phase 3: Medium Priority (Nice to Have) ✨

**Share error message construction**

- **Impact**: Eliminates ~10-20 lines of repeated patterns
- **Effort**: Low (simple utility function)
- **Risk**: Very Low

---

## Expected Outcomes

### After Phase 1 (HTTP uses core services):

- ✅ **~150 lines eliminated** per resource type
- ✅ **Single code path** for data fetching
- ✅ **Consistent behavior** between HTTP and MCP
- ✅ **Easier maintenance** - fix once, works everywhere
- ✅ **No more parameter mismatches** - both use same service interface

### After Phase 2 (Unified validation):

- ✅ **~60 lines eliminated** from RouteGenerator
- ✅ **Automatic synchronization** of parameters
- ✅ **Type safety** across both systems
- ✅ **Prevents future mismatches**

### Total Impact:

- **~250-300 lines of duplicate code eliminated**
- **Single source of truth** for all data operations
- **Consistent behavior** across HTTP and MCP
- **Easier to maintain** and extend

---

## Conclusion

**The biggest remaining duplication is HTTP endpoints bypassing core services.**

By making HTTP endpoints use the same core services as MCP tools, we would:

1. Eliminate ~150 lines of duplicate transformation logic per resource type
2. Create a single source of truth for data fetching
3. Ensure consistent behavior between HTTP and MCP
4. Make the codebase significantly easier to maintain

**This single change would eliminate ~70% of remaining duplication.**
