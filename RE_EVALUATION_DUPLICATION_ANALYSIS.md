# Re-Evaluation: Remaining Duplication Between HTTP and MCP

After implementing shared utilities for MCP tools, this document analyzes what duplication still exists between HTTP endpoints and MCP tools.

## Current State

### ✅ **What We've Unified (MCP Tools)**
- **Metadata Generation**: All MCP tools now use `buildMetadata()`
- **Error Handling**: All MCP tools now use `handleMCPError()`
- **Parameter Schemas**: All MCP tools use shared Zod schemas from `common-params.ts`

### ❌ **What's Still Duplicated**

## 1. **Data Fetching Logic** (CRITICAL - High Priority)

**HTTP Endpoints:**
```typescript
// src/config/functionalDataFetchers.ts
case "getScripture": {
  // Direct call to ZipResourceFetcher2
  scriptures = await zipFetcher.getScripture(
    compatibleRef as any,
    language,
    organization,
    requestedResource,
  );
  // Manual transformation and formatting
  return { scripture: [...], metadata: {...} };
}
```

**MCP Tools:**
```typescript
// src/tools/fetchScripture.ts
const result = await fetchScripture({
  reference: args.reference,
  language: args.language,
  organization: args.organization,
  // ... options
});
// Uses core service (scripture-service.ts)
```

**The Problem:**
- HTTP endpoints call `ZipResourceFetcher2` directly via `functionalDataFetchers`
- MCP tools call core services (`scripture-service.ts`, `translation-notes-service.ts`, etc.)
- **Result**: Two different code paths for the same data

**Solution (Already Proposed):**
- Make HTTP endpoints use core services instead of calling `ZipResourceFetcher2` directly
- This is covered in `ARCHITECTURE_ANALYSIS_AND_PROPOSAL.md`

---

## 2. **Parameter Parsing & Validation** (High Priority)

**HTTP Endpoints:**
```typescript
// src/config/RouteGenerator.ts
private parseParameters(request, paramConfigs) {
  // Parse from query string or POST body
  // Handle type conversion (string, boolean, number, array)
  // Apply defaults
}

private validateParameters(params, paramConfigs) {
  // Check required parameters
  // Validate patterns, min/max, enums
  // Return array of error messages
}
```

**MCP Tools:**
```typescript
// MCP SDK handles parsing automatically
// Zod schemas handle validation automatically
// Errors thrown as exceptions
```

**The Problem:**
- HTTP has custom parsing/validation logic in `RouteGenerator`
- MCP uses Zod schemas (automatic via MCP SDK)
- **Result**: Different validation logic, different error formats

**Solution:**
- Could generate Zod schemas from `EndpointConfig.params`
- Or convert Zod schemas to `EndpointConfig.params` format
- Use shared validation logic

---

## 3. **Error Response Formatting** (Medium Priority)

**HTTP Endpoints:**
```typescript
// src/config/RouteGenerator.ts
private generateErrorResponse(statusCode, message, details, responseTime) {
  return {
    statusCode,
    body: JSON.stringify({
      error: message,
      details,
      timestamp: new Date().toISOString(),
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Response-Time": `${responseTime}ms`,
    },
  };
}
```

**MCP Tools:**
```typescript
// src/utils/mcp-error-handler.ts
return {
  content: [{ type: "text", text: JSON.stringify({...}) }],
  isError: true,
};
```

**The Problem:**
- HTTP returns HTTP response format (statusCode, body, headers)
- MCP returns MCP protocol format (content array, isError flag)
- **Result**: Different error response structures

**Solution:**
- This is **intentional** - different protocols need different formats
- But we could share the error message construction logic
- Could create `buildErrorDetails()` utility

---

## 4. **Response Formatting** (Medium Priority)

**HTTP Endpoints:**
```typescript
// src/services/ResponseFormatter.ts
public format(data, format, params, metadata) {
  switch (format) {
    case "text": return this.formatTextResponse(...);
    case "md": return this.formatMarkdownResponse(...);
    default: return this.formatJsonResponse(...);
  }
}
```

**MCP Tools:**
```typescript
// MCP tools return structured objects
return {
  content: [{ type: "text", text: scriptureText }],
  isError: false,
};
// Or structured data:
return {
  verseNotes: [...],
  contextNotes: [...],
  metadata: {...},
};
```

**The Problem:**
- HTTP uses `ResponseFormatter` service for text/md/json formats
- MCP tools return raw data or simple text content
- **Result**: Different formatting approaches

**Solution:**
- MCP tools could use `ResponseFormatter` for text/markdown formats
- Or create MCP-specific formatter that wraps `ResponseFormatter`

---

## 5. **Reference Parsing** (Low Priority - Already Mostly Shared)

**HTTP Endpoints:**
```typescript
// src/config/functionalDataFetchers.ts
const reference = parseReference(normalizedRefStr);
```

**MCP Tools:**
```typescript
// src/tools/fetchTranslationWordLinks.ts
const reference = parseReference(args.reference);
```

**Status:**
- ✅ Both use `parseReference()` from `parsers/referenceParser.ts`
- ⚠️ But HTTP also uses `functions/reference-parser.ts` in some places
- **Minor**: Could consolidate to single parser

---

## 6. **Performance Tracking** (Low Priority)

**HTTP Endpoints:**
```typescript
// src/config/RouteGenerator.ts
performanceMonitor.recordMetrics({
  endpoint: config.name,
  method: request.method,
  responseTime,
  statusCode,
  contentSize,
  cacheHit,
  compressed,
});
```

**MCP Tools:**
```typescript
// Currently no performance tracking
// Metadata includes responseTime, but not recorded to performanceMonitor
```

**The Problem:**
- HTTP tracks metrics via `performanceMonitor`
- MCP tools don't track metrics
- **Result**: No visibility into MCP tool performance

**Solution:**
- Add `performanceMonitor.recordMetrics()` calls to MCP tools
- Or create shared wrapper that tracks automatically

---

## 7. **Response Transformation** (Medium Priority)

**HTTP Endpoints:**
```typescript
// src/config/functionalDataFetchers.ts
// Manual transformation of ZipResourceFetcher2 results
scriptures = await zipFetcher.getScripture(...);
return {
  scripture: scriptures.map(s => ({
    text: s.text,
    translation: s.translation,
    // ... transform
  })),
  metadata: {...}
};
```

**MCP Tools:**
```typescript
// Core services handle transformation
const result = await fetchScripture(...);
// Service already returns transformed data
```

**The Problem:**
- HTTP endpoints manually transform `ZipResourceFetcher2` results
- MCP tools get pre-transformed data from core services
- **Result**: HTTP has transformation logic that MCP doesn't need

**Solution:**
- If HTTP uses core services, transformation happens once in the service
- Eliminates duplicate transformation logic

---

## Summary: Remaining Duplication

### Critical (Must Fix)
1. **Data Fetching Logic** - HTTP bypasses core services, calls `ZipResourceFetcher2` directly
   - **Impact**: Two code paths, different behavior, harder to maintain
   - **Solution**: Make HTTP use core services (already proposed)

### High Priority (Should Fix)
2. **Parameter Parsing/Validation** - Different validation systems
   - **Impact**: Inconsistent validation, different error messages
   - **Solution**: Generate Zod schemas from endpoint configs or vice versa

### Medium Priority (Nice to Have)
3. **Response Formatting** - Different formatting approaches
   - **Impact**: Inconsistent output formats
   - **Solution**: Share formatting logic where possible

4. **Response Transformation** - HTTP manually transforms, MCP gets pre-transformed
   - **Impact**: Duplicate transformation logic
   - **Solution**: Resolved if HTTP uses core services

### Low Priority (Optional)
5. **Performance Tracking** - MCP tools don't track metrics
   - **Impact**: No visibility into MCP performance
   - **Solution**: Add performance tracking to MCP tools

6. **Error Response Details** - Different error structures (but intentional)
   - **Impact**: Minor - different protocols need different formats
   - **Solution**: Share error message construction logic

---

## Recommended Next Steps

### Phase 1: Critical Fix (Highest Impact)
**Make HTTP endpoints use core services:**
1. Update `functionalDataFetchers.ts` to call core services instead of `ZipResourceFetcher2` directly
2. Remove duplicate transformation logic from HTTP endpoints
3. **Result**: Single code path for data fetching

### Phase 2: Parameter Validation Unification
**Create shared validation layer:**
1. Generate Zod schemas from `EndpointConfig.params` OR
2. Generate `EndpointConfig.params` from Zod schemas
3. Use shared validation logic for both HTTP and MCP
4. **Result**: Consistent validation across both systems

### Phase 3: Response Formatting Sharing
**Share formatting logic:**
1. Create MCP-specific wrapper for `ResponseFormatter`
2. Use shared formatter for text/markdown formats in MCP tools
3. **Result**: Consistent formatting

### Phase 4: Performance Tracking
**Add metrics to MCP tools:**
1. Create wrapper that automatically tracks performance
2. Add to all MCP tool handlers
3. **Result**: Full observability

---

## Key Insight

**The biggest remaining duplication is the data fetching path:**

```
HTTP: RouteGenerator → functionalDataFetchers → ZipResourceFetcher2 (direct)
MCP:  Tool Handler → Core Service → ZipResourceFetcher2 (via service)
```

**If we fix this (make HTTP use core services), we eliminate:**
- Duplicate data fetching logic
- Duplicate transformation logic
- Different parameter handling
- Different error handling in data layer

**This single change would eliminate ~70% of remaining duplication.**

