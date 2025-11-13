# Architecture Analysis: Why Mismatches Exist & Proposed Solution

## Current Architecture Analysis

### How It Works Now

**HTTP Endpoints:**
1. **Route Generator** (`src/config/RouteGenerator.ts`) generates HTTP handlers from endpoint configs
2. **Functional Data Fetchers** (`src/config/functionalDataFetchers.ts`) contain the actual data fetching logic
3. **Endpoint Configs** (`src/config/endpoints/*.ts`) define parameters, shapes, and examples
4. HTTP endpoints call `functionalDataFetchers` which **directly call `ZipResourceFetcher2`** (bypassing core services)

**MCP Tools:**
1. **MCP Tool Handlers** (`src/tools/*.ts`) are separate implementations
2. They call **Core Services** directly:
   - `fetchScripture` from `src/functions/scripture-service.ts`
   - `fetchTranslationNotes` from `src/functions/translation-notes-service.ts`
   - `fetchTranslationQuestions` from `src/functions/translation-questions-service.ts`
3. **MCP Tool Schemas** are defined in each tool file (e.g., `FetchScriptureArgs`)

**The Critical Issue:**
- HTTP endpoints bypass core services and call `ZipResourceFetcher2` directly
- MCP tools use core services which also call `ZipResourceFetcher2`
- **Result**: Two different code paths with different parameter handling

### The Problem: Two Parallel Implementations

```
HTTP Endpoints                    MCP Tools
     │                                │
     ├─ RouteGenerator                ├─ Tool Handlers (src/tools/*.ts)
     │   └─ functionalDataFetchers     │   └─ Core Services (src/functions/*-service.ts)
     │       └─ ZipResourceFetcher2    │       └─ ZipResourceFetcher2
     │         (DIRECT CALL)           │         (via service)
     │                                 │
     └─ Endpoint Configs               └─ Tool Schemas (in tool files)
         (params, shapes, examples)        (zod schemas)
              │                                │
              └──────── NO SHARED ─────────────┘
                 INTERFACE LAYER
```

**Issues:**
1. **Parameter Mismatches**: HTTP endpoints use `EndpointConfig.params`, MCP tools use custom Zod schemas
2. **Different Code Paths**: HTTP goes through `functionalDataFetchers`, MCP goes through `*-service.ts`
3. **No Single Source of Truth**: Parameters are defined in two places
4. **Maintenance Burden**: Changes must be made in multiple places

## Root Cause

The architecture evolved organically:
- HTTP endpoints were built first with `RouteGenerator` + `functionalDataFetchers`
- MCP tools were added later, calling core services directly
- Both use the same underlying services (`ZipResourceFetcher2`, etc.) but have different parameter interfaces

## Proposed Solution: Unified Interface Architecture

### Option 1: Core Service as Single Source of Truth (Recommended)

**Make core services the authoritative interface, and have both HTTP and MCP use them:**

```
┌─────────────────────────────────────────────────────────┐
│              Core Services (Single Source of Truth)       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  scripture-service.ts                             │   │
│  │  - ScriptureOptions interface                     │   │
│  │  - fetchScripture(options)                        │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  translation-notes-service.ts                     │   │
│  │  - TranslationNotesOptions interface              │   │
│  │  - fetchTranslationNotes(options)                │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  translation-questions-service.ts                 │   │
│  │  - TranslationQuestionsOptions interface          │   │
│  │  - fetchTranslationQuestions(options)             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
         │                           │
┌────────┴────────┐        ┌────────┴────────┐
│  HTTP Endpoints │        │   MCP Tools     │
│                 │        │                 │
│ RouteGenerator  │        │ Tool Handlers   │
│   └─ Maps      │        │   └─ Maps        │
│   EndpointConfig│        │   Tool Schema   │
│   params to     │        │   to            │
│   ServiceOptions│        │   ServiceOptions│
└─────────────────┘        └─────────────────┘
```

**Implementation Steps:**

1. **Define Unified Service Interfaces** (already partially done):
   ```typescript
   // src/functions/scripture-service.ts
   export interface ScriptureOptions {
     reference: string;
     language?: string;
     organization?: string;
     resource?: string;        // ADD: ult, ust, all, etc.
     format?: "text" | "usfm" | "json" | "md" | "markdown";  // EXPAND
     includeVerseNumbers?: boolean;
     includeAlignment?: boolean;  // ADD
     // ... other options
   }
   ```

2. **Update Core Services** to accept all HTTP endpoint parameters:
   - Add missing parameters (`resource`, `includeAlignment`, `format` options)
   - Make services the complete, authoritative interface

3. **Update HTTP Endpoints** to use core services instead of calling `ZipResourceFetcher2` directly:
   ```typescript
   // In functionalDataFetchers.ts - CHANGE THIS:
   // OLD: scriptures = await zipFetcher.getScripture(...)
   
   // NEW: Use core service
   import { fetchScripture } from "../functions/scripture-service.js";
   
   const serviceOptions: ScriptureOptions = {
     reference: params.reference,
     language: params.language,
     organization: params.organization,
     resource: params.resource || "all",
     format: params.format || "json",
     includeAlignment: params.includeAlignment || false,
   };
   const result = await fetchScripture(serviceOptions);
   // Transform result to match HTTP response shape
   ```

4. **Update MCP Tools** to use the same service options:
   ```typescript
   // src/tools/fetchScripture.ts
   export const FetchScriptureArgs = z.object({
     reference: z.string(),
     language: z.string().optional().default("en"),
     organization: z.string().optional().default("unfoldingWord"),
     resource: z.string().optional().default("all"),  // ADD
     format: z.enum(["text", "usfm", "json", "md", "markdown"]).optional(),  // EXPAND
     includeAlignment: z.boolean().optional().default(false),  // ADD
     // ... match ScriptureOptions exactly
   });

   export async function handleFetchScripture(args: FetchScriptureArgs) {
     const result = await fetchScripture(args);  // Direct pass-through
     return formatMCPResponse(result);
   }
   ```

5. **Generate MCP Schemas from Service Interfaces** (optional, advanced):
   ```typescript
   // Auto-generate Zod schemas from TypeScript interfaces
   import { zodFromInterface } from "./schema-generator";
   export const FetchScriptureArgs = zodFromInterface<ScriptureOptions>();
   ```

### Option 2: Endpoint Config as Single Source of Truth

**Make `EndpointConfig` the authority, and generate both HTTP and MCP from it:**

```
┌─────────────────────────────────────────────────────────┐
│           Endpoint Configs (Single Source of Truth)     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  FETCH_SCRIPTURE_CONFIG                          │   │
│  │  - params: { reference, language, resource... } │   │
│  │  - responseShape, examples, etc.                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
         │                           │
┌────────┴────────┐        ┌────────┴────────┐
│  HTTP Endpoints │        │   MCP Tools     │
│                 │        │                 │
│ RouteGenerator  │        │ Tool Generator  │
│   (existing)    │        │   (new)         │
│                 │        │   - Generate    │
│                 │        │     Zod schemas │
│                 │        │     from config │
│                 │        │   - Generate    │
│                 │        │     handlers    │
│                 │        │     from config │
└─────────────────┘        └─────────────────┘
```

**Pros:**
- Single source of truth in config files
- Can generate both HTTP and MCP automatically
- Documentation, examples, and validation in one place

**Cons:**
- Requires significant refactoring
- Less flexible for MCP-specific needs
- Config files become more complex

## Recommendation: Option 1 (Core Services)

**Why Option 1 is better:**
1. ✅ **Minimal Changes**: Core services already exist and are used by MCP tools
2. ✅ **Type Safety**: TypeScript interfaces provide compile-time validation
3. ✅ **Flexibility**: Services can evolve independently of HTTP/MCP concerns
4. ✅ **Testability**: Services are pure functions, easy to test
5. ✅ **Incremental**: Can be implemented tool-by-tool

**Implementation Priority:**
1. **High Priority**: `fetch_scripture` (most mismatches)
2. **Medium Priority**: `fetch_translation_notes`, `fetch_translation_questions`, `fetch_translation_word_links`
3. **Low Priority**: `fetch_translation_academy` (fewer mismatches)

## Next Steps

1. **Audit Core Services**: Ensure all service interfaces include all HTTP endpoint parameters
2. **Update Service Implementations**: Add support for missing parameters
3. **Update MCP Tools**: Align Zod schemas with service interfaces
4. **Update HTTP Endpoints**: Map endpoint configs to service options
5. **Add Validation**: Ensure both paths validate the same way
6. **Documentation**: Update docs to reflect unified interface

## Benefits of Unified Architecture

- ✅ **No More Mismatches**: Single source of truth for parameters
- ✅ **Easier Maintenance**: Change once, works everywhere
- ✅ **Better Testing**: Test services once, both paths benefit
- ✅ **Type Safety**: TypeScript ensures consistency
- ✅ **Documentation**: One place to document all parameters

