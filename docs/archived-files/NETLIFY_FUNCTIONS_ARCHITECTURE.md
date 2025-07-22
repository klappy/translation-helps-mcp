# Translation Helps API - Netlify Functions Architecture

## 🎯 Executive Summary

This document outlines the architecture for a serverless API that provides Bible translation resources through Netlify Functions. The API exposes REST endpoints that AI assistants and applications can use to access comprehensive Bible translation resources including Scripture text, Translation Notes, Questions, Words, and Links.

### Key Advantages of Netlify Functions Approach

- **Zero Infrastructure**: No servers to manage, automatic scaling
- **Cost Effective**: Pay only for actual usage
- **Global CDN**: Automatic edge deployment for low latency
- **Simple Deployment**: Git push to deploy
- **CORS Friendly**: Easy to configure for browser-based access
- **MCP Compatible**: Can be wrapped as an MCP server later

### Core Innovation

Transform Bible translation resources into a modern serverless API that any application or AI assistant can consume through simple HTTP requests.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [API Architecture](#api-architecture)
3. [Endpoint Design](#endpoint-design)
4. [Core Functions](#core-functions)
5. [Data Flow](#data-flow)
6. [Caching Strategy](#caching-strategy)
7. [Error Handling](#error-handling)
8. [Security](#security)
9. [Deployment](#deployment)
10. [Usage Examples](#usage-examples)
11. [MCP Integration](#mcp-integration)
12. [Performance Optimization](#performance-optimization)

---

## 🏗️ System Overview

### Problem Statement

AI assistants and applications need programmatic access to Bible translation resources without managing complex infrastructure or dealing with multiple data sources.

### Solution: Serverless API

A collection of Netlify Functions that:

1. Provide RESTful endpoints for translation resources
2. Handle all DCS (Door43 Content Service) integration
3. Cache responses for performance
4. Return clean, structured JSON data
5. Scale automatically based on demand

### Architecture Benefits

- **Serverless**: No infrastructure to manage
- **Scalable**: Handles 1 to 1 million requests automatically
- **Fast**: Edge deployment and intelligent caching
- **Simple**: Standard HTTP/REST interface
- **Cost-Effective**: Pay only for what you use

---

## 🏛️ API Architecture

### High-Level Design

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                     │     │                  │     │                 │
│   AI Assistant /    │────▶│  Netlify Edge    │────▶│ Netlify Function│
│    Application      │ HTTP│     Network      │     │   (Lambda)      │
└─────────────────────┘     └──────────────────┘     └────────┬────────┘
                                                               │
                            ┌──────────────────────────────────┴──────┐
                            │           API Endpoints                  │
                            │  ┌────────────┐  ┌─────────────────┐   │
                            │  │  /fetch-   │  │    /search-     │   │
                            │  │ resources  │  │   resources     │   │
                            │  └────────────┘  └─────────────────┘   │
                            │  ┌────────────┐  ┌─────────────────┐   │
                            │  │   /get-    │  │     /get-       │   │
                            │  │  context   │  │   languages     │   │
                            │  └────────────┘  └─────────────────┘   │
                            │  ┌────────────┐  ┌─────────────────┐   │
                            │  │  /extract- │  │    /health      │   │
                            │  │references  │  │                 │   │
                            │  └────────────┘  └─────────────────┘   │
                            └──────────────────────────────┬──────────┘
                                                           │
┌──────────────────────────────────────────────────────────┴─────────────┐
│                          External Services                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │    DCS      │  │   Netlify    │  │  Netlify   │  │   Upstash   │  │
│  │    API      │  │    Blobs     │  │   Cache    │  │    Redis    │  │
│  └─────────────┘  └──────────────┘  └────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Function Structure

Each Netlify Function:

1. Receives HTTP request with parameters
2. Validates input
3. Checks cache for existing data
4. Fetches from DCS if needed
5. Processes and formats response
6. Caches result
7. Returns JSON response

---

## 🔌 Endpoint Design

### Base URL

```
https://your-site.netlify.app/.netlify/functions
```

### 1. Fetch Resources

```http
GET /fetch-resources?reference=John+3:16&lang=en&org=unfoldingWord&resources=scripture,notes
```

**Query Parameters:**

- `reference` (required): Bible reference (e.g., "John 3:16")
- `lang` (optional): Language code (default: "en")
- `org` (optional): Organization (default: "unfoldingWord")
- `resources` (optional): Comma-separated resource types (default: all)

**Response:**

```json
{
  "reference": {
    "book": "JHN",
    "chapter": 3,
    "verse": 16,
    "citation": "John 3:16"
  },
  "scripture": {
    "text": "For God so loved the world...",
    "translation": "ULT"
  },
  "translationNotes": [...],
  "translationQuestions": [...],
  "translationWords": [...],
  "translationWordLinks": [...],
  "metadata": {
    "language": "en",
    "organization": "unfoldingWord",
    "cached": true,
    "timestamp": "2024-01-27T10:00:00Z"
  }
}
```

### 2. Search Resources

```http
GET /search-resources?lang=es&org=unfoldingWord&type=scripture
```

**Query Parameters:**

- `lang` (optional): Filter by language
- `org` (optional): Filter by organization
- `type` (optional): Resource type filter
- `subject` (optional): Subject filter

**Response:**

```json
{
  "resources": [
    {
      "organization": "unfoldingWord",
      "language": "es",
      "resource": "scripture",
      "title": "Unlocked Literal Bible",
      "subject": "Bible",
      "checkingLevel": "3"
    }
  ],
  "summary": {
    "total": 15,
    "byType": { "scripture": 5, "notes": 4, ... }
  }
}
```

### 3. Get Context

```http
POST /get-context
Content-Type: application/json

{
  "reference": "John 3:16",
  "maxTokens": 4000,
  "template": "study"
}
```

**Request Body:**

- `reference` (required): Bible reference
- `maxTokens` (optional): Maximum context size
- `template` (optional): Context template type

**Response:**

```json
{
  "systemPrompt": "You are a Bible translation assistant...",
  "context": "Formatted context with all resources...",
  "metadata": {
    "tokenCount": 3500,
    "includedResources": ["scripture", "notes", ...],
    "reference": "John 3:16"
  }
}
```

### 4. Get Languages

```http
GET /get-languages?org=unfoldingWord
```

**Response:**

```json
{
  "languages": [
    {
      "code": "en",
      "name": "English",
      "nativeName": "English",
      "resources": {
        "scripture": 5,
        "notes": 2,
        "questions": 2,
        "words": 1
      }
    }
  ],
  "total": 45
}
```

### 5. Extract References

```http
POST /extract-references
Content-Type: application/json

{
  "text": "Let's look at John 3:16 and compare it with Romans 8:28"
}
```

**Response:**

```json
{
  "references": [
    {
      "original": "John 3:16",
      "normalized": "JHN 3:16",
      "book": "JHN",
      "chapter": 3,
      "verse": 16,
      "confidence": 1.0
    },
    {
      "original": "Romans 8:28",
      "normalized": "ROM 8:28",
      "book": "ROM",
      "chapter": 8,
      "verse": 28,
      "confidence": 1.0
    }
  ]
}
```

### 6. Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "dcs": "reachable",
    "cache": "connected"
  },
  "timestamp": "2024-01-27T10:00:00Z"
}
```

---

## 🔧 Core Functions

### Function Structure

```
netlify/functions/
├── fetch-resources.ts
├── search-resources.ts
├── get-context.ts
├── get-languages.ts
├── extract-references.ts
├── health.ts
└── _shared/
    ├── cache.ts
    ├── dcs-client.ts
    ├── reference-parser.ts
    ├── usfm-extractor.ts
    └── types.ts
```

### Example Function Implementation

```typescript
// netlify/functions/fetch-resources.ts
import type { Handler } from "@netlify/functions";
import { parseReference } from "./_shared/reference-parser";
import { ResourceAggregator } from "./_shared/resource-aggregator";
import { cache } from "./_shared/cache";

export const handler: Handler = async (event) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  try {
    // Parse query parameters
    const params = event.queryStringParameters || {};
    const reference = params.reference;

    if (!reference) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Reference parameter is required" }),
      };
    }

    // Check cache
    const cacheKey = `resources:${reference}:${params.lang}:${params.org}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...cached, metadata: { ...cached.metadata, cached: true } }),
      };
    }

    // Parse reference
    const parsedRef = parseReference(reference);
    if (!parsedRef) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid Bible reference" }),
      };
    }

    // Fetch resources
    const aggregator = new ResourceAggregator();
    const resources = await aggregator.fetchResources(parsedRef, {
      language: params.lang || "en",
      organization: params.org || "unfoldingWord",
      resources: params.resources?.split(",") || [
        "scripture",
        "notes",
        "questions",
        "words",
        "links",
      ],
    });

    // Cache the result
    await cache.set(cacheKey, resources, 3600); // 1 hour TTL

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(resources),
    };
  } catch (error) {
    console.error("Error fetching resources:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to fetch resources",
        message: error.message,
      }),
    };
  }
};
```

---

## 🔄 Data Flow

### Request Lifecycle

1. **Client Request** → Netlify CDN Edge
2. **Edge Cache Check** → Return if hit
3. **Function Invocation** → AWS Lambda
4. **Input Validation** → Parse and validate parameters
5. **Cache Check** → Redis/Netlify Blobs
6. **DCS API Call** → Fetch if not cached
7. **Data Processing** → Format response
8. **Cache Update** → Store for future requests
9. **Response** → Return to client

### Caching Layers

1. **Browser Cache**: HTTP cache headers
2. **CDN Cache**: Netlify Edge caching
3. **Function Cache**: Redis or Netlify Blobs
4. **Memory Cache**: In-function temporary cache

---

## 💾 Caching Strategy

### Cache Implementation

```typescript
// netlify/functions/_shared/cache.ts
import { Redis } from "@upstash/redis";

class CacheManager {
  private redis: Redis;
  private memoryCache: Map<string, any>;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    this.memoryCache = new Map();
  }

  async get(key: string): Promise<any> {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // Check Redis
    try {
      const value = await this.redis.get(key);
      if (value) {
        this.memoryCache.set(key, value);
      }
      return value;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    this.memoryCache.set(key, value);

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }
}

export const cache = new CacheManager();
```

### Cache TTL Strategy

- **Scripture**: 7 days (stable content)
- **Translation Helps**: 24 hours
- **Language List**: 24 hours
- **Search Results**: 1 hour
- **Context**: 15 minutes (personalized)

---

## 🛡️ Error Handling

### Error Response Format

```json
{
  "error": "Resource not found",
  "code": "RESOURCE_NOT_FOUND",
  "details": {
    "resource": "scripture",
    "reference": "John 3:16",
    "language": "fr"
  },
  "timestamp": "2024-01-27T10:00:00Z"
}
```

### Error Codes

- `INVALID_REFERENCE`: Invalid Bible reference format
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `LANGUAGE_NOT_SUPPORTED`: Language not available
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `UPSTREAM_ERROR`: DCS API error
- `INTERNAL_ERROR`: Unexpected server error

---

## 🔒 Security

### Security Measures

1. **CORS Configuration**

   ```typescript
   const headers = {
     "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "*",
     "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
     "Access-Control-Allow-Headers": "Content-Type, Authorization",
   };
   ```

2. **Rate Limiting**

   ```typescript
   // Using Netlify's built-in rate limiting
   // netlify.toml
   [[edge_functions]];
   path = "/api/*";
   rate_limit = { window_sec = 60, window_limit = 100 };
   ```

3. **Input Validation**

   - Sanitize all inputs
   - Validate reference formats
   - Limit query complexity

4. **API Key Support** (optional)
   ```typescript
   const apiKey = event.headers["x-api-key"];
   if (process.env.REQUIRE_API_KEY && apiKey !== process.env.API_KEY) {
     return { statusCode: 401, body: "Unauthorized" };
   }
   ```

---

## 🚀 Deployment

### Environment Variables

```env
# Required
DCS_API_URL=https://git.door43.org/api/v1

# Optional - Redis Cache
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Optional - Security
ALLOWED_ORIGINS=https://your-app.com
REQUIRE_API_KEY=false
API_KEY=your-secret-key

# Optional - Performance
CACHE_ENABLED=true
MAX_CACHE_SIZE=1000
DEFAULT_TTL=3600
```

### netlify.toml Configuration

```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "public, max-age=300"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

  [functions.fetch-resources]
    external_node_modules = ["@netlify/functions"]

  [functions.search-resources]
    external_node_modules = ["@netlify/functions"]
```

### Deployment Steps

1. **Local Development**

   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli

   # Install dependencies
   npm install

   # Run locally
   netlify dev
   ```

2. **Deploy to Netlify**

   ```bash
   # Connect to Netlify
   netlify init

   # Deploy
   netlify deploy --prod
   ```

---

## 💡 Usage Examples

### JavaScript/TypeScript Client

```typescript
class TranslationHelpsClient {
  private baseUrl: string;

  constructor(baseUrl: string = "https://your-site.netlify.app/api") {
    this.baseUrl = baseUrl;
  }

  async fetchResources(
    reference: string,
    options?: {
      language?: string;
      organization?: string;
      resources?: string[];
    }
  ) {
    const params = new URLSearchParams({
      reference,
      lang: options?.language || "en",
      org: options?.organization || "unfoldingWord",
      resources: options?.resources?.join(",") || "",
    });

    const response = await fetch(`${this.baseUrl}/fetch-resources?${params}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getContext(reference: string, maxTokens?: number) {
    const response = await fetch(`${this.baseUrl}/get-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, maxTokens }),
    });

    return response.json();
  }
}

// Usage
const client = new TranslationHelpsClient();
const resources = await client.fetchResources("John 3:16", { language: "es" });
```

### Python Client

```python
import requests

class TranslationHelpsClient:
    def __init__(self, base_url='https://your-site.netlify.app/api'):
        self.base_url = base_url

    def fetch_resources(self, reference, language='en', organization='unfoldingWord'):
        params = {
            'reference': reference,
            'lang': language,
            'org': organization
        }

        response = requests.get(f'{self.base_url}/fetch-resources', params=params)
        response.raise_for_status()
        return response.json()

    def get_context(self, reference, max_tokens=4000):
        data = {
            'reference': reference,
            'maxTokens': max_tokens
        }

        response = requests.post(f'{self.base_url}/get-context', json=data)
        response.raise_for_status()
        return response.json()

# Usage
client = TranslationHelpsClient()
resources = client.fetch_resources('Romans 8:28', language='es')
```

### cURL Examples

```bash
# Fetch resources
curl "https://your-site.netlify.app/api/fetch-resources?reference=John+3:16&lang=en"

# Get context
curl -X POST "https://your-site.netlify.app/api/get-context" \
  -H "Content-Type: application/json" \
  -d '{"reference": "John 3:16", "maxTokens": 4000}'

# Search resources
curl "https://your-site.netlify.app/api/search-resources?lang=es&type=scripture"

# Get languages
curl "https://your-site.netlify.app/api/get-languages"
```

---

## 🔗 MCP Integration

### Creating an MCP Wrapper

To use these Netlify Functions with MCP-compatible tools:

```typescript
// mcp-wrapper/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";

const API_BASE = process.env.TRANSLATION_HELPS_API || "https://your-site.netlify.app/api";

const server = new Server({
  name: "translation-helps-mcp",
  version: "1.0.0",
});

// Register tools that call the Netlify Functions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "translation_helps_fetch_resources": {
      const response = await axios.get(`${API_BASE}/fetch-resources`, {
        params: {
          reference: args.reference,
          lang: args.language,
          org: args.organization,
          resources: args.resources?.join(","),
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    }
    // ... other tools
  }
});
```

---

## ⚡ Performance Optimization

### Optimization Strategies

1. **Edge Caching**

   ```toml
   [[headers]]
     for = "/api/fetch-resources"
     [headers.values]
       Cache-Control = "public, max-age=300, stale-while-revalidate=600"
   ```

2. **Resource Preloading**

   ```typescript
   // Preload common verses
   const COMMON_VERSES = ["John 3:16", "Romans 8:28", "Psalm 23:1"];

   export async function preloadCommonVerses() {
     const promises = COMMON_VERSES.map((ref) => fetchResources(ref).catch(console.error));
     await Promise.all(promises);
   }
   ```

3. **Response Compression**

   - Netlify automatically gzips responses
   - Use `Accept-Encoding: gzip` header

4. **Parallel Resource Loading**
   ```typescript
   const [scripture, notes, questions] = await Promise.all([
     fetchScripture(reference),
     fetchNotes(reference),
     fetchQuestions(reference),
   ]);
   ```

### Performance Targets

- **Cold Start**: < 1 second
- **Cached Response**: < 100ms
- **Uncached Response**: < 2 seconds
- **Concurrent Requests**: 1000+
- **Monthly Budget**: < $25 for 1M requests

---

## 📊 Monitoring

### Built-in Netlify Analytics

- Function execution time
- Error rates
- Traffic patterns
- Geographic distribution

### Custom Metrics

```typescript
// Log custom metrics
console.log("METRIC", {
  function: "fetch-resources",
  duration: Date.now() - startTime,
  cacheHit: cached ? 1 : 0,
  reference: reference,
  language: language,
});
```

### Health Monitoring

```typescript
// Health check function
export const handler: Handler = async () => {
  const checks = {
    dcs: await checkDCS(),
    cache: await checkCache(),
  };

  const healthy = Object.values(checks).every((check) => check);

  return {
    statusCode: healthy ? 200 : 503,
    body: JSON.stringify({
      status: healthy ? "healthy" : "unhealthy",
      checks,
      timestamp: new Date().toISOString(),
    }),
  };
};
```

---

## 🔮 Future Enhancements

### Short-term (1-3 months)

1. **GraphQL Endpoint**: Single query for complex requests
2. **Batch Operations**: Fetch multiple references in one call
3. **WebSocket Support**: Real-time updates via Netlify Edge Functions
4. **SDK Libraries**: Official clients for major languages

### Medium-term (3-6 months)

1. **AI Integration**: Built-in context optimization
2. **Smart Caching**: Predictive cache warming
3. **Analytics Dashboard**: Usage insights
4. **Premium Features**: Higher rate limits, priority processing

### Long-term (6-12 months)

1. **Plugin System**: Custom resource providers
2. **Federation**: Connect multiple resource sources
3. **Offline Support**: Downloadable resource packages
4. **Enterprise Features**: SLA, dedicated infrastructure

---

_Document Version: 1.0_  
_Last Updated: [Current Date]_  
_Status: Ready for Implementation_
