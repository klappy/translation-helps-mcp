# Translation Helps MCP - Architecture Guide

Complete system architecture and design patterns for the Translation Helps MCP server.

## 🏗️ **SYSTEM OVERVIEW**

Translation Helps MCP is a **serverless HTTP MCP server** that provides Bible translation resources through a clean API, optimized for AI/LLM consumption.

### Core Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Assistant  │    │   Web Browser    │    │  Mobile App     │
│   (MCP Client)  │    │   (HTTP Client)  │    │  (HTTP Client)  │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          └──────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────┴─────────────┐
                    │    HTTP MCP Endpoint       │
                    │  (/api/mcp + /api/*)       │
                    └──────────────┬─────────────┘
                                   │
                    ┌──────────────┴─────────────┐
                    │   Platform Adapter Layer   │
                    │  (Cloudflare/Netlify)      │
                    └──────────────┬─────────────┘
                                   │
                    ┌──────────────┴─────────────┐
                    │  Business Logic Services   │
                    │ (Cache + Resource Fetching)│
                    └──────────────┬─────────────┘
                                   │
                    ┌──────────────┴─────────────┐
                    │   Door43 Content Service   │
                    │      (External API)        │
                    └────────────────────────────┘
```

### Key Innovations

- **HTTP MCP:** Stateless MCP over HTTP (no WebSockets required)
- **Platform Agnostic:** Same code runs on Cloudflare Workers, Netlify, locally
- **Intelligent Caching:** 5-minute TTL with request deduplication
- **Performance First:** <2s response times, 30+ RPS sustained

## 🎯 **ARCHITECTURAL PRINCIPLES**

### 1. Serverless First

- **Zero infrastructure** - runs on edge functions
- **Auto-scaling** - handles traffic spikes automatically
- **Cost effective** - pay per request, not for idle time

### 2. Platform Agnostic Design

```typescript
// Platform Adapter Pattern
export const platformAdapter = {
  cloudflare: CloudflareWorkerAdapter,
  netlify: NetlifyFunctionAdapter,
  local: LocalServerAdapter,
};

// Unified interface across platforms
const response = await platformAdapter[platform].handleRequest(request);
```

### 3. Performance Optimization

- **Parallel loading** with `Promise.all()`
- **Request deduplication** prevents duplicate API calls
- **Edge deployment** for global low latency
- **Verse-specific loading** (10KB vs 420KB full books)

### 4. Error Resilience

```typescript
// Graceful degradation pattern
const resources = await Promise.allSettled([
  fetchScripture(params),
  fetchNotes(params),
  fetchQuestions(params),
]);

// Always return partial results, never fail completely
return {
  scripture: resources[0].status === "fulfilled" ? resources[0].value : null,
  notes: resources[1].status === "fulfilled" ? resources[1].value : [],
  questions: resources[2].status === "fulfilled" ? resources[2].value : [],
};
```

## 📚 **DATA FETCHING PATTERNS**

### DCS Catalog API Integration

**Base URLs:**

```typescript
const BASE_URL = "https://git.door43.org/api/v1/catalog";
```

**Core Patterns:**

```typescript
// 1. Organization Discovery
const orgs = await fetch(`${BASE_URL}/list/owners`)
  .then((r) => r.json())
  .then((data) =>
    data.data.map((org) => ({
      login: org.login, // Use for API calls
      displayName: org.full_name, // Use for UI
      languages: org.repo_languages || [],
    }))
  );

// 2. Language Discovery
const languages = await fetch(`${BASE_URL}/list/languages?owner=${org}`)
  .then((r) => r.json())
  .then((data) => data.data);

// 3. Resource Discovery (THE CRITICAL API)
const resources = await fetch(
  `${BASE_URL}/search?metadataType=rc&lang=${lang}&owner=${org}&subject=Bible`
)
  .then((r) => r.json())
  .then((data) => data.data);
```

### Resource Fetching Strategy

**The Ingredients Array Pattern (Critical):**

```typescript
// ❌ NEVER hardcode file paths
const filePath = `tn_${bookId}.tsv`;

// ✅ ALWAYS use ingredients array
const getResourceFile = (resourceData, bookId) => {
  const ingredient = resourceData.ingredients?.find((ing) => ing.identifier === bookId);
  if (!ingredient?.path) {
    throw new Error(`No file found for book ${bookId} in resource ${resourceData.name}`);
  }
  return ingredient.path.replace("./", "");
};

// Build complete file URL
const fileUrl = `https://git.door43.org/${org}/${resourceName}/raw/branch/master/${filePath}`;
```

### Resource Type Patterns

**Scripture (USFM):**

```typescript
// Extract clean verse text from USFM
const extractVerseText = (usfmContent, chapter, verse) => {
  const verseRegex = new RegExp(`\\\\v ${verse}\\s+(.*?)(?=\\\\v|\\\\c|$)`, "s");
  const match = usfmContent.match(verseRegex);

  return match
    ? match[1]
        .replace(/\\[a-z]+\*/g, "") // Remove USFM markers
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()
    : null;
};
```

**Translation Notes (TSV):**

```typescript
// Parse TSV with specific columns
const parseTN = (tsvContent) => {
  const lines = tsvContent.split("\n").slice(1); // Skip header
  return lines
    .map((line) => {
      const [Reference, ID, Tags, SupportReference, Quote, Occurrence, Note] = line.split("\t");
      return { Reference, ID, Tags, Quote, Note };
    })
    .filter((note) => note.Reference === `${chapter}:${verse}`);
};
```

**Translation Words (Markdown):**

```typescript
// Parse RC links to get word articles
const parseRcLink = (uri) => {
  // rc://en/tw/dict/bible/kt/faith → {lang: 'en', resource: 'tw', path: 'bible/kt/faith'}
  const match = uri.match(/rc:\/\/(\*|[^/]+)\/([^/]+)\/(.+)/);
  if (!match) return null;

  return {
    lang: match[1] === "*" ? contextLang : match[1],
    resource: match[2],
    path: match[3],
  };
};
```

## ⚡ **CACHING ARCHITECTURE**

### Multi-Layer Caching Strategy

```typescript
// 1. Memory Cache (Fastest - In-process)
const memoryCache = new Map();
const MEMORY_TTL = 5 * 60 * 1000; // 5 minutes

// 2. Request Deduplication (Prevents duplicate API calls)
const requestCache = new Map();

// 3. Platform Cache (Persistent - Cloudflare KV/Netlify Blobs)
const persistentCache = {
  async get(key) {
    // Implementation varies by platform
    return await platform.cache.get(key);
  },
  async set(key, value, ttl) {
    await platform.cache.set(key, value, ttl);
  },
};
```

### Cache Key Strategy

```typescript
// Hierarchical cache keys
const generateCacheKey = (type, params) => {
  switch (type) {
    case "scripture":
      return `scripture:${params.reference}:${params.language}:${params.organization}:${params.includeVerseNumbers}:${params.format}`;
    case "notes":
      return `notes:${params.reference}:${params.language}:${params.organization}`;
    case "catalog":
      return `catalog:${params.metadataType}:${params.lang}:${params.owner}:${params.subject}`;
    default:
      return `api:${type}:${JSON.stringify(params)}`;
  }
};
```

### Cache Invalidation

- **TTL-based:** 5 minutes for translation resources
- **Manual bypass:** `?bypassCache=true` parameter
- **Version-based:** Include resource version in cache key
- **Error handling:** Serve stale cache on API failures

## 🔌 **MCP INTEGRATION PATTERNS**

### HTTP MCP Implementation

```typescript
// MCP over HTTP endpoint
export async function POST({ request }) {
  const body = await request.json();

  switch (body.method) {
    case "tools/list":
      return json({ tools: AVAILABLE_TOOLS });

    case "tools/call":
      const { name, arguments: args } = body.params;
      const result = await callTool(name, args);
      return json({ result });

    default:
      throw new Error(`Unknown method: ${body.method}`);
  }
}
```

### Tool Definition Pattern

```typescript
const TOOL_DEFINITION = {
  name: "fetchScripture",
  description: "Fetch Bible scripture text in any language",
  inputSchema: {
    type: "object",
    properties: {
      reference: { type: "string", description: 'Bible reference (e.g., "John 3:16")' },
      language: { type: "string", description: 'Language code (e.g., "en")' },
      organization: { type: "string", description: 'Organization (e.g., "unfoldingWord")' },
    },
    required: ["reference", "language", "organization"],
  },
};
```

### Chatbot Integration Patterns

```typescript
// Chat streaming pattern for conversational AI
export async function* chatStream(messages, context) {
  const lastMessage = messages[messages.length - 1];

  // Extract Bible references from message
  const references = extractReferences(lastMessage.content);

  if (references.length > 0) {
    // Fetch relevant resources
    const resources = await Promise.all(
      references.map((ref) =>
        fetchResources({
          reference: ref,
          language: context.language || "en",
          organization: context.organization || "unfoldingWord",
        })
      )
    );

    // Stream response with citations
    yield* generateResponseWithCitations(lastMessage, resources);
  }
}
```

## 🏎️ **PERFORMANCE OPTIMIZATIONS**

### Response Time Targets

- **Languages:** <1 second
- **Scripture:** <2 seconds
- **Full Resources:** <2 seconds
- **Cached Responses:** <100ms

### Optimization Techniques

**1. Parallel Loading:**

```typescript
// Load multiple resources simultaneously
const [scripture, notes, questions, words] = await Promise.all([
  fetchScripture(params),
  fetchTranslationNotes(params),
  fetchTranslationQuestions(params),
  fetchTranslationWords(params),
]);
```

**2. Request Deduplication:**

```typescript
// Prevent duplicate API calls
const deduplicateRequest = (fn) => {
  const pending = new Map();

  return async (...args) => {
    const key = JSON.stringify(args);

    if (pending.has(key)) {
      return pending.get(key);
    }

    const promise = fn(...args);
    pending.set(key, promise);

    try {
      return await promise;
    } finally {
      pending.delete(key);
    }
  };
};
```

**3. Bundle Optimization:**

```typescript
// Tree-shake unused code, minimize bundle size
// Use dynamic imports for large dependencies
const heavyParser = await import("./heavy-parser.js");
```

## 🛡️ **ERROR HANDLING PATTERNS**

### Graceful Degradation

```typescript
const fetchResourcesWithFallback = async (params) => {
  const results = {};

  // Always attempt all resources, never fail completely
  try {
    results.scripture = await fetchScripture(params);
  } catch (error) {
    console.warn("Scripture fetch failed:", error.message);
    results.scripture = null;
  }

  try {
    results.notes = await fetchTranslationNotes(params);
  } catch (error) {
    console.warn("Notes fetch failed:", error.message);
    results.notes = [];
  }

  return results;
};
```

### Error Response Format

```typescript
const errorResponse = {
  error: true,
  message: "Resource not found",
  details: "No translation notes found for Titus 1:1 in en/unfoldingWord",
  fallback: {
    // Provide alternative suggestions
    availableBooks: ["Genesis", "Exodus", "..."],
    alternativeOrganizations: ["Wycliffe", "GBT"],
  },
};
```

## 🔗 **INTEGRATION EXAMPLES**

### Direct API Usage

```javascript
// RESTful HTTP API
const response = await fetch(
  "/api/fetch-resources?" +
    new URLSearchParams({
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
    })
);
const data = await response.json();
```

### MCP Tool Usage

```javascript
// MCP protocol
const result = await mcp.callTool("fetchResources", {
  reference: "John 3:16",
  language: "en",
  organization: "unfoldingWord",
});
```

### Batch Operations

```javascript
// Efficient multi-reference fetching
const references = ["Genesis 1:1", "John 3:16", "Romans 1:1"];
const results = await Promise.all(
  references.map((ref) =>
    fetchResources({ reference: ref, language: "en", organization: "unfoldingWord" })
  )
);
```

## 📊 **MONITORING & METRICS**

### Key Metrics to Track

- **Response Times:** P50, P95, P99 percentiles
- **Cache Hit Rate:** >80% target for repeated requests
- **Error Rate:** <1% for valid requests
- **Throughput:** 30+ RPS sustained

### Health Check Implementation

```typescript
export const healthCheck = async () => {
  const metrics = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    cache: {
      hitRate: cacheHitRate,
      memoryUsage: process.memoryUsage(),
    },
    endpoints: await testCoreEndpoints(),
  };

  return metrics;
};
```

## 🎯 **SUCCESS CRITERIA**

The architecture succeeds when:

- **Reliability:** 99.9% uptime with graceful degradation
- **Performance:** Consistent sub-2s response times globally
- **Scalability:** Handles traffic spikes without configuration
- **Maintainability:** Single codebase deploys to multiple platforms
- **Developer Experience:** Clear APIs with comprehensive error messages

---

**Core Philosophy:** Simple, fast, reliable. Every architectural decision prioritizes these three principles.
