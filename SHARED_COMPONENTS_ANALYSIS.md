# Shared Components Analysis: What Can Be Unified

This document identifies all areas where code is duplicated between HTTP endpoints and MCP tools, and proposes shared utilities to eliminate repetition.

## Summary of Duplication Areas

### 1. ✅ **Core Services** (Already Partially Shared)

- **Status**: MCP tools use core services, but HTTP endpoints bypass them
- **Action**: Make HTTP endpoints use core services (covered in ARCHITECTURE_ANALYSIS_AND_PROPOSAL.md)

---

## 2. ❌ **Metadata Generation** (High Priority)

**Current Duplication:**
Every MCP tool manually builds metadata objects:

```typescript
// Repeated in EVERY tool:
const startTime = Date.now();
// ... fetch data ...
metadata: {
  responseTime: Date.now() - startTime,
  tokenEstimate: estimateTokens(JSON.stringify(result)),
  timestamp: new Date().toISOString(),
  cached: result.metadata.cached,
}
```

**Proposed Solution:**

```typescript
// src/utils/metadata-builder.ts
export interface MetadataOptions {
  startTime: number;
  data: unknown;
  serviceMetadata?: { cached?: boolean; [key: string]: unknown };
  additionalFields?: Record<string, unknown>;
}

export function buildMetadata(options: MetadataOptions) {
  const { startTime, data, serviceMetadata = {}, additionalFields = {} } = options;

  return {
    responseTime: Date.now() - startTime,
    tokenEstimate: estimateTokens(JSON.stringify(data)),
    timestamp: new Date().toISOString(),
    cached: serviceMetadata.cached || false,
    ...additionalFields,
  };
}

// Usage in tools:
const startTime = Date.now();
const result = await fetchScripture(...);
const metadata = buildMetadata({
  startTime,
  data: result,
  serviceMetadata: result.metadata,
  additionalFields: { textLength: scriptureText.length }
});
```

**Benefits:**

- ✅ Consistent metadata structure across all tools
- ✅ Single place to add new metadata fields
- ✅ Automatic token estimation
- ✅ No manual timestamp/responseTime calculation

---

## 3. ❌ **Error Handling** (High Priority)

**Current Duplication:**
Every tool has identical error handling:

```typescript
// Repeated in EVERY tool:
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error("Failed to fetch...", {
    reference: args.reference,
    error: errorMessage,
    responseTime: Date.now() - startTime,
  });

  return {
    error: errorMessage,
    reference: args.reference,
    timestamp: new Date().toISOString(),
  };
}
```

**Proposed Solution:**

```typescript
// src/utils/mcp-error-handler.ts
export interface MCPErrorResponse {
  content?: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface ErrorContext {
  toolName: string;
  args: Record<string, unknown>;
  startTime: number;
  originalError: unknown;
}

export function handleMCPError(context: ErrorContext): MCPErrorResponse {
  const { toolName, args, startTime, originalError } = context;
  const errorMessage =
    originalError instanceof Error
      ? originalError.message
      : String(originalError);

  logger.error(`Failed to execute ${toolName}`, {
    ...args,
    error: errorMessage,
    responseTime: Date.now() - startTime,
  });

  // Return MCP-formatted error
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          error: errorMessage,
          tool: toolName,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
    isError: true,
  };
}

// Usage in tools:
try {
  // ... tool logic ...
} catch (error) {
  return handleMCPError({
    toolName: "fetch_scripture",
    args: { reference: args.reference },
    startTime,
    originalError: error,
  });
}
```

**Benefits:**

- ✅ Consistent error format across all tools
- ✅ Automatic logging with context
- ✅ MCP-compliant error responses
- ✅ Single place to improve error handling

---

## 4. ❌ **Response Formatting** (Medium Priority)

**Current Duplication:**

- HTTP endpoints use `ResponseFormatter` service
- MCP tools manually format responses
- Different response shapes for same data

**Proposed Solution:**

```typescript
// src/utils/mcp-response-formatter.ts
export interface MCPResponseOptions {
  data: unknown;
  format?: "text" | "json" | "markdown";
  metadata?: Record<string, unknown>;
}

export function formatMCPResponse(options: MCPResponseOptions) {
  const { data, format = "text", metadata = {} } = options;

  // For text format, return content array
  if (format === "text") {
    const text =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);

    return {
      content: [{ type: "text", text }],
      isError: false,
      ...metadata,
    };
  }

  // For JSON format, return structured data
  if (format === "json") {
    return {
      ...data,
      metadata,
    };
  }

  // For markdown, format accordingly
  // ...
}
```

**Benefits:**

- ✅ Consistent MCP response format
- ✅ Reusable formatting logic
- ✅ Easy to add new formats

---

## 5. ❌ **Parameter Schema Definitions** (High Priority)

**Current Duplication:**

- HTTP endpoints define params in `EndpointConfig.params` (TypeScript objects)
- MCP tools define params in Zod schemas
- Same parameters defined twice with different syntax

**Example:**

```typescript
// HTTP endpoint config:
params: {
  reference: {
    type: "string",
    required: true,
    description: 'Bible reference (e.g., "John 3:16")',
  },
  language: {
    type: "string",
    required: false,
    default: "en",
  },
}

// MCP tool schema:
export const FetchScriptureArgs = z.object({
  reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
  language: z.string().optional().default("en"),
});
```

**Proposed Solution:**

```typescript
// src/schemas/common-params.ts
export const CommonParamSchemas = {
  reference: z
    .string()
    .describe('Bible reference (e.g., "John 3:16", "Genesis 1:1-5")')
    .min(3)
    .max(50),

  language: z
    .string()
    .optional()
    .default("en")
    .describe('Language code (default: "en")'),

  organization: z
    .string()
    .optional()
    .default("unfoldingWord")
    .describe('Organization (default: "unfoldingWord")'),

  format: z
    .enum(["text", "usfm", "json", "md", "markdown"])
    .optional()
    .default("json")
    .describe("Output format"),
};

// Usage in MCP tools:
export const FetchScriptureArgs = z.object({
  ...CommonParamSchemas,
  resource: z.string().optional().default("all"),
  includeAlignment: z.boolean().optional().default(false),
});

// Convert to HTTP endpoint config:
export function zodSchemaToEndpointParams(schema: z.ZodObject<any>) {
  // Convert Zod schema to EndpointConfig.params format
  // This allows single source of truth
}
```

**Benefits:**

- ✅ Single source of truth for parameters
- ✅ Automatic validation consistency
- ✅ Can generate both Zod schemas and endpoint configs
- ✅ Type safety across both systems

---

## 6. ❌ **Performance Tracking** (Medium Priority)

**Current Duplication:**

- HTTP endpoints use `performanceMonitor.recordMetrics()`
- MCP tools manually track `startTime` and calculate `responseTime`
- Different tracking mechanisms

**Proposed Solution:**

```typescript
// src/utils/performance-tracker.ts
export class PerformanceTracker {
  private startTime: number;
  private traceId: string;

  constructor(operationName: string) {
    this.startTime = Date.now();
    this.traceId = `${operationName}_${this.startTime}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  recordMetrics(endpoint: string, statusCode: number, cacheHit: boolean) {
    performanceMonitor.recordMetrics({
      endpoint,
      method: "MCP",
      responseTime: this.getElapsedTime(),
      statusCode,
      contentSize: 0, // Could be calculated
      cacheHit,
      compressed: false,
    });
  }

  getTraceId(): string {
    return this.traceId;
  }
}

// Usage:
const tracker = new PerformanceTracker("fetch_scripture");
const result = await fetchScripture(...);
tracker.recordMetrics("fetch_scripture", 200, result.metadata.cached);
```

**Benefits:**

- ✅ Consistent performance tracking
- ✅ Automatic metrics recording
- ✅ Unified trace IDs

---

## 7. ❌ **Logging Patterns** (Low Priority)

**Current Duplication:**
Similar logging patterns across tools:

```typescript
logger.info("Fetching...", { reference, language });
logger.info("Fetched successfully", { count, responseTime });
logger.error("Failed to fetch", { error, reference });
```

**Proposed Solution:**

```typescript
// src/utils/tool-logger.ts
export class ToolLogger {
  constructor(private toolName: string) {}

  logStart(args: Record<string, unknown>) {
    logger.info(`[${this.toolName}] Starting`, args);
  }

  logSuccess(result: {
    count?: number;
    responseTime: number;
    cached?: boolean;
  }) {
    logger.info(`[${this.toolName}] Success`, result);
  }

  logError(error: unknown, context: Record<string, unknown>) {
    logger.error(`[${this.toolName}] Failed`, {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Usage:
const toolLogger = new ToolLogger("fetch_scripture");
toolLogger.logStart({ reference: args.reference });
// ... fetch ...
toolLogger.logSuccess({ responseTime, cached });
```

**Benefits:**

- ✅ Consistent log format
- ✅ Easy to add structured logging
- ✅ Better log searchability

---

## 8. ❌ **Reference Parsing** (Already Shared, But Could Be Better)

**Current State:**

- Multiple reference parsers exist: `reference-parser.ts`, `referenceParser.ts`
- Both HTTP and MCP use different parsers

**Proposed Solution:**

- Consolidate to single reference parser
- Use in both HTTP and MCP paths
- Already partially done, but needs cleanup

---

## 9. ❌ **Validation Logic** (Medium Priority)

**Current Duplication:**

- HTTP endpoints validate via `RouteGenerator.validateParameters()`
- MCP tools rely on Zod schema validation
- Different validation error formats

**Proposed Solution:**

```typescript
// src/utils/validation-utils.ts
export function validateMCPArgs<T>(
  schema: z.ZodSchema<T>,
  args: unknown,
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(args);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}

// Usage in tools:
const validation = validateMCPArgs(FetchScriptureArgs, args);
if (!validation.success) {
  return handleMCPError({
    toolName: "fetch_scripture",
    args: {},
    startTime: Date.now(),
    originalError: new Error(
      `Validation failed: ${validation.errors.join(", ")}`,
    ),
  });
}
```

**Benefits:**

- ✅ Consistent validation error format
- ✅ Better error messages
- ✅ Type-safe validated args

---

## 10. ❌ **Response Wrapper** (Low Priority)

**Current Duplication:**
MCP tools manually wrap responses in different formats:

- Some return `{ content: [{ type: "text", text: "..." }] }`
- Some return `{ data, metadata }`
- Some return plain objects

**Proposed Solution:**

```typescript
// src/utils/mcp-response-wrapper.ts
export function wrapMCPResponse(
  data: unknown,
  options?: {
    format?: "content" | "structured";
    metadata?: Record<string, unknown>;
  },
) {
  const { format = "content", metadata = {} } = options || {};

  if (format === "content") {
    const text =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);

    return {
      content: [{ type: "text", text }],
      isError: false,
      ...metadata,
    };
  }

  return {
    ...(typeof data === "object" && data !== null ? data : { data }),
    metadata,
  };
}
```

**Benefits:**

- ✅ Consistent response format
- ✅ Easy to change response structure globally

---

## Implementation Priority

### High Priority (Do First)

1. **Metadata Generation** - Used in every tool, easy win
2. **Error Handling** - Critical for consistency
3. **Parameter Schema Definitions** - Prevents future mismatches

### Medium Priority (Do Next)

4. **Response Formatting** - Improves consistency
5. **Validation Logic** - Better error messages
6. **Performance Tracking** - Unified metrics

### Low Priority (Nice to Have)

7. **Logging Patterns** - Already works, just consistency
8. **Response Wrapper** - Minor improvement

---

## Recommended Implementation Order

1. **Phase 1: Metadata & Error Handling**
   - Create `metadata-builder.ts`
   - Create `mcp-error-handler.ts`
   - Update all MCP tools to use them
   - **Impact**: Eliminates ~50% of boilerplate in each tool

2. **Phase 2: Parameter Schemas**
   - Create `common-params.ts` with shared Zod schemas
   - Update all tools to use common schemas
   - Create converter from Zod to EndpointConfig
   - **Impact**: Single source of truth for parameters

3. **Phase 3: Response Formatting**
   - Create `mcp-response-formatter.ts`
   - Update tools to use formatter
   - **Impact**: Consistent response shapes

4. **Phase 4: Performance & Validation**
   - Create `performance-tracker.ts`
   - Create `validation-utils.ts`
   - **Impact**: Better observability and error messages

---

## Example: Before & After

### Before (Current):

```typescript
export async function handleFetchScripture(args: FetchScriptureArgs) {
  const startTime = Date.now();

  try {
    logger.info("Fetching scripture", { reference: args.reference });

    const result = await fetchScripture({
      reference: args.reference,
      language: args.language,
      organization: args.organization,
    });

    const scriptureText = result.scripture?.text || "";

    logger.info("Scripture fetched successfully", {
      reference: args.reference,
      textLength: scriptureText.length,
      responseTime: Date.now() - startTime,
      cached: result.metadata.cached,
    });

    return {
      content: [{ type: "text", text: scriptureText }],
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch scripture", {
      reference: args.reference,
      error: errorMessage,
      responseTime: Date.now() - startTime,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: errorMessage,
            reference: args.reference,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
      isError: true,
    };
  }
}
```

### After (With Shared Utilities):

```typescript
export async function handleFetchScripture(args: FetchScriptureArgs) {
  const tracker = new PerformanceTracker("fetch_scripture");
  const toolLogger = new ToolLogger("fetch_scripture");

  try {
    toolLogger.logStart({ reference: args.reference });

    const result = await fetchScripture({
      reference: args.reference,
      language: args.language,
      organization: args.organization,
    });

    const scriptureText = result.scripture?.text || "";

    const metadata = buildMetadata({
      startTime: tracker.startTime,
      data: result,
      serviceMetadata: result.metadata,
      additionalFields: { textLength: scriptureText.length },
    });

    tracker.recordMetrics("fetch_scripture", 200, result.metadata.cached);
    toolLogger.logSuccess(metadata);

    return wrapMCPResponse(scriptureText, { metadata });
  } catch (error) {
    tracker.recordMetrics("fetch_scripture", 500, false);
    return handleMCPError({
      toolName: "fetch_scripture",
      args: { reference: args.reference },
      startTime: tracker.startTime,
      originalError: error,
    });
  }
}
```

**Benefits:**

- ✅ 50% less code
- ✅ Consistent patterns
- ✅ Easier to maintain
- ✅ Better error handling
- ✅ Automatic performance tracking

---

## Next Steps

1. Review this document
2. Prioritize which shared utilities to implement first
3. Create shared utility files
4. Update MCP tools to use shared utilities
5. Update HTTP endpoints to use same patterns where applicable
