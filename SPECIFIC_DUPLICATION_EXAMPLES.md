# Specific Duplication Examples: HTTP vs MCP

This document shows concrete examples of code duplication between HTTP endpoints and MCP tools.

## Example 1: Scripture Fetching - Data Transformation

### HTTP Endpoint (functionalDataFetchers.ts)

```typescript
// Lines 209-226: Manual transformation
let normalized = scriptures.map((s) => ({
  text: s.text,
  resource: s.translation, // Rename translation -> resource
  actualOrganization:
    s.actualOrganization || String(params.organization || "unfoldingWord"),
}));

// Lines 220-226: Deduplication logic
const seenResources = new Set<string>();
normalized = normalized.filter((s) => {
  if (seenResources.has(s.resource)) return false;
  seenResources.add(s.resource);
  return true;
});

// Lines 232-235: Primary selection logic
const primary =
  normalized.find((s) => s.resource.toUpperCase().includes("ULT")) ||
  normalized[0];
```

### MCP Tool (fetchScripture.ts)

```typescript
// Lines 58-68: Calls core service
const result = await fetchScripture({
  reference: args.reference,
  language: args.language,
  organization: args.organization,
  // ... options
});

// Lines 71-76: Simple extraction
const scriptureText =
  result.scripture?.text || result.scriptures?.[0]?.text || "";
const translation =
  result.scripture?.translation || result.scriptures?.[0]?.translation || "ULT";
```

### The Duplication

- **HTTP**: Manually transforms `translation` → `resource`, deduplicates, selects primary
- **MCP**: Gets pre-transformed data from service
- **Problem**: HTTP has ~50 lines of transformation logic that the service should handle

---

## Example 2: Scripture Fetching - Reference Normalization

### HTTP Endpoint (functionalDataFetchers.ts)

```typescript
// Lines 239-261: Complex reference normalization
const isChapterRange = reference.verseEnd && !reference.verse;
const normalizeInput = {
  book: reference.bookName || reference.book,
  chapter: reference.chapter,
  verse: reference.verse,
  endChapter: isChapterRange ? reference.verseEnd : undefined,
  endVerse: isChapterRange ? undefined : reference.verseEnd,
  originalText: reference.original || "",
  isValid: true,
};
const referenceStr = normalizeReferenceNew(
  normalizeInput as unknown as ParsedReference,
);
```

### MCP Tool (fetchScripture.ts)

```typescript
// No reference normalization needed - service handles it
const result = await fetchScripture({
  reference: args.reference, // Service parses and normalizes internally
  // ...
});
```

### The Duplication

- **HTTP**: Manual reference normalization with chapter range detection
- **MCP**: Service handles normalization internally
- **Problem**: HTTP has normalization logic that should be in the service

---

## Example 3: Scripture Fetching - Cache Status Detection

### HTTP Endpoint (functionalDataFetchers.ts)

```typescript
// Lines 263-285: Manual cache status detection
let cacheWarm = false;
try {
  const xray = zipFetcher.getTrace() as { cacheStats?: { hits?: number } };
  const hits = xray?.cacheStats?.hits || 0;
  const hadKvZipHits = Array.isArray(xray?.apiCalls)
    ? xray.apiCalls.some(
        (c) =>
          Boolean(c?.cached) &&
          String(c?.url || "").includes("internal://kv/zip/"),
      )
    : false;
  cacheWarm = hits > 0 || hadKvZipHits;
} catch {
  // ignore trace inspection failures
}
```

### MCP Tool (fetchScripture.ts)

```typescript
// Service returns cache status in metadata
const metadata = buildMetadata({
  startTime,
  data: result,
  serviceMetadata: result.metadata, // Includes cached: boolean
  // ...
});
```

### The Duplication

- **HTTP**: Manually inspects X-ray trace to determine cache status
- **MCP**: Gets cache status from service metadata
- **Problem**: HTTP has manual cache detection that service already provides

---

## Example 4: Error Handling - Status Code Propagation

### HTTP Endpoint (RouteGenerator.ts)

```typescript
// Lines 446-465: Error handling with status codes
const status = (error as any)?.status as number | undefined;
if (status && status >= 400 && status < 600) {
  return this.generateErrorResponse(
    status,
    error instanceof Error ? error.message : String(error),
    { endpoint: config.name, traceId },
    responseTime,
  );
}
return this.generateErrorResponse(
  500,
  "Internal server error",
  {
    message: error instanceof Error ? error.message : "Unknown error",
    endpoint: config.name,
    traceId,
  },
  responseTime,
);
```

### MCP Tool (fetchScripture.ts)

```typescript
// Lines 109-119: Simple error handling
catch (error) {
  return handleMCPError({
    toolName: "fetch_scripture",
    args: { reference: args.reference, ... },
    startTime,
    originalError: error,
  });
}
```

### The Duplication

- **HTTP**: Complex status code extraction and HTTP-specific error formatting
- **MCP**: Simple error handler (but different format needed)
- **Status**: This is **intentional** - different protocols need different formats
- **Opportunity**: Could share error message extraction logic

---

## Example 5: Parameter Defaults and Type Conversion

### HTTP Endpoint (RouteGenerator.ts)

```typescript
// Lines 550-586: Manual parameter parsing
for (const [paramName, paramConfig] of Object.entries(paramConfigs)) {
  const rawValue = sourceParams[paramName];

  if (rawValue === undefined) {
    if (paramConfig.default !== undefined) {
      params[paramName] = paramConfig.default;
    }
    continue;
  }

  // Parse based on type
  switch (paramConfig.type) {
    case "string":
      params[paramName] = rawValue;
      break;
    case "boolean":
      params[paramName] = rawValue === "true";
      break;
    case "number": {
      const numValue = Number(rawValue);
      params[paramName] = isNaN(numValue) ? undefined : numValue;
      break;
    }
    // ...
  }
}
```

### MCP Tool (via Zod schemas)

```typescript
// Automatic via MCP SDK + Zod
export const FetchScriptureArgs = z.object({
  language: LanguageParam, // .optional().default("en")
  organization: OrganizationParam, // .optional().default("unfoldingWord")
  // Zod handles parsing, defaults, type conversion automatically
});
```

### The Duplication

- **HTTP**: ~40 lines of manual parameter parsing/type conversion
- **MCP**: Automatic via Zod (handled by MCP SDK)
- **Problem**: Two different parsing systems
- **Opportunity**: Could generate HTTP parsing from Zod schemas OR generate Zod from endpoint configs

---

## Example 6: Response Metadata Construction

### HTTP Endpoint (functionalDataFetchers.ts)

```typescript
// Manual metadata construction scattered throughout
// No consistent pattern - each endpoint builds metadata differently
```

### MCP Tool (All tools now)

```typescript
// Consistent metadata via shared utility
const metadata = buildMetadata({
  startTime,
  data: result,
  serviceMetadata: result.metadata,
  additionalFields: { ... },
});
```

### The Duplication

- **HTTP**: Inconsistent metadata construction (if any)
- **MCP**: Consistent via `buildMetadata()` utility
- **Opportunity**: HTTP could use same metadata builder

---

## Summary: Specific Code Duplications

### Critical Duplications (Must Fix)

1. **Scripture Data Transformation** (~50 lines in HTTP)
   - Location: `functionalDataFetchers.ts` lines 209-261
   - Duplicated Logic: Translation→resource mapping, deduplication, primary selection
   - Fix: Move to `scripture-service.ts`, HTTP calls service

2. **Reference Normalization** (~25 lines in HTTP)
   - Location: `functionalDataFetchers.ts` lines 239-261
   - Duplicated Logic: Chapter range detection, reference string building
   - Fix: Service should handle this, HTTP should pass raw reference

3. **Cache Status Detection** (~20 lines in HTTP)
   - Location: `functionalDataFetchers.ts` lines 263-285
   - Duplicated Logic: X-ray trace inspection, cache hit detection
   - Fix: Service already provides this in metadata, HTTP should use it

### Medium Priority Duplications

4. **Parameter Parsing** (~40 lines in HTTP)
   - Location: `RouteGenerator.ts` lines 530-589
   - Duplicated Logic: Type conversion, default application
   - Fix: Generate from Zod schemas or vice versa

5. **Error Message Extraction** (scattered)
   - Location: Multiple places
   - Duplicated Logic: `error instanceof Error ? error.message : String(error)`
   - Fix: Shared utility function

### Low Priority (Intentional Differences)

6. **Error Response Formatting**
   - HTTP: HTTP response format (statusCode, body, headers)
   - MCP: MCP protocol format (content array, isError flag)
   - Status: **Intentional** - different protocols
   - Opportunity: Share error message construction

---

## Key Finding

**The biggest duplication is in `functionalDataFetchers.ts` for scripture fetching:**

- **~95 lines** of transformation/normalization logic that should be in the service
- This logic is **completely bypassed** by MCP tools (which use the service)
- **If HTTP used the service, we'd eliminate ~95 lines of duplicate code**

## Recommended Action

**Priority 1: Refactor HTTP to use core services**

This single change would eliminate:

- ✅ Data transformation logic (~50 lines)
- ✅ Reference normalization (~25 lines)
- ✅ Cache detection (~20 lines)
- ✅ Total: ~95 lines of duplicate code per resource type

**Impact**: Massive reduction in duplication, single source of truth for data fetching.
