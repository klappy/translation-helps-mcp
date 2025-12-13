# Translation Helps MCP Architecture

**Last Updated:** December 2025  
**Version:** 7.19.29

## Overview

Translation Helps MCP is a modern API service providing access to biblical translation resources. Built on SvelteKit and Cloudflare Workers, it features multi-agent AI orchestration, event-driven search indexing, and edge-native inference.

## Core Principles

### KISS (Keep It Simple, Stupid)

- No complex abstractions
- Direct, readable code
- Minimal layers between request and response

### DRY (Don't Repeat Yourself)

- Shared utilities for common patterns
- Centralized validation and error handling
- Reusable response formatters

### Antifragile Design

- Fail fast with real errors
- No mock fallbacks in production
- Graceful degradation when external services fail

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                          │
│                    (Web UI, AI Assistants, SDKs)                     │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                        Cloudflare Pages                              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   SvelteKit  │  │  API Routes  │  │    Workers AI (Llama 4)  │  │
│  │      UI      │  │   /api/*     │  │    Multi-Agent Chat      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                      │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                      Platform Services                               │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │    KV    │  │    R2    │  │  Queues  │  │    AI Search      │   │
│  │  Cache   │  │ Storage  │  │ Indexing │  │  (Semantic)       │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────────┘   │
│                                                                      │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                    External Services                                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 Door43 Content Service (DCS)                 │   │
│  │              git.door43.org - Bible Resources                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Architecture Layers

### 1. API Endpoints (`ui/src/routes/api/`)

Each endpoint is a SvelteKit server route that:

- Uses `createSimpleEndpoint` wrapper
- Defines parameters with validation
- Implements a fetch function
- Returns standardized responses

```typescript
export const GET = createSimpleEndpoint({
  name: "fetch-scripture",
  params: [COMMON_PARAMS.reference],
  fetch: async (params) => {
    // Fetch and return data
  },
});
```

### 2. Multi-Agent Chat System (`ui/src/lib/ai/`)

The AI chat uses a sophisticated multi-agent architecture:

```
User Query → Orchestrator → [Parallel Agents] → Synthesis → Response
```

**Components:**

- **Orchestrator Agent** - Plans and coordinates
- **Specialist Agents** - Scripture, Notes, Words, Academy, Questions, Search
- **QA Validator** - Verifies citations

**Model:** Cloudflare Workers AI (Llama 4 Scout 17B)

See [AI_CHAT_ARCHITECTURE.md](./AI_CHAT_ARCHITECTURE.md) for details.

### 3. Data Services (`src/services/`)

#### ZipResourceFetcher2.ts

Optimized resource fetching:

- Downloads entire resources as ZIP files
- Caches in R2 storage
- Extracts files on demand
- Triggers indexing via R2 events

### 4. Search Indexing Pipeline (`src/workers/indexer/`)

Event-driven pipeline for AI Search:

```
ZIP → R2 → Unzip Queue → Index Queue → AI Search
```

**Features:**

- Two-queue architecture
- Memory-efficient extraction
- Book-level chunking
- Automatic reindexing

See [EVENT_DRIVEN_INDEXING.md](./EVENT_DRIVEN_INDEXING.md) for details.

### 5. Caching Strategy

#### Multi-Tier Caching

```
Request → Memory Cache → KV Cache → R2 Storage → DCS API
```

| Layer     | Purpose                      | TTL        |
| --------- | ---------------------------- | ---------- |
| Memory    | Hot data                     | Session    |
| KV        | Catalog metadata             | 1 hour     |
| R2        | ZIP files, extracted content | Persistent |
| Cache API | Edge-cached responses        | Varies     |

#### Cache Rules

- **NEVER cache API responses** - Only cache raw data
- Cache DCS API calls (catalog, metadata)
- Cache ZIP file downloads
- Cache extracted files from ZIPs

See [CACHE_ARCHITECTURE.md](./CACHE_ARCHITECTURE.md) for details.

### 6. Middleware

#### responseValidator.ts

- Strips diagnostic data from bodies
- Validates response structure
- Prevents data leakage

#### cacheValidator.ts

- Validates data before caching
- Rejects empty or invalid data
- Maintains cache integrity

## Request Flow

### API Request

```
1. Client Request → API Endpoint
2. Parameter Validation → Common Validators
3. Data Fetching → ZipResourceFetcher2 → R2/DCS
4. Caching → Cache Validator → KV/R2
5. Response Shaping → Markdown/JSON
6. Response Validation → Response Validator
7. Client Response ← Clean, Consistent Data
```

### Chat Request

```
1. User Message → /api/chat-orchestrated
2. Orchestrator Planning → Workers AI
3. Agent Dispatch → Parallel Execution
4. Tool Calls → MCP Endpoints
5. Synthesis → Workers AI
6. QA Validation → Citation Check
7. Streamed Response ← SSE Events
```

## Performance Optimizations

### Edge Runtime

- Runs on Cloudflare Workers
- Global distribution (200+ PoPs)
- Near-zero cold starts
- Workers AI on same edge network

### ZIP-Based Fetching

- Entire resources downloaded once
- Individual files extracted on demand
- 90% reduction in API calls

### Parallel Processing

- Agents execute concurrently
- Tool calls batched where possible
- Streaming reduces perceived latency

### Smart Caching

- Version-aware cache keys
- Automatic invalidation on deploy
- R2 lifecycle rules for cleanup

## Error Handling

### Consistent Error Format

```json
{
  "error": "Human-readable message",
  "endpoint": "endpoint-name",
  "status": 400
}
```

### Error Categories

| Code | Meaning                      |
| ---- | ---------------------------- |
| 400  | Invalid parameters           |
| 404  | Resource not found           |
| 500  | Server errors                |
| 503  | External service unavailable |

### Graceful Degradation

- Single agent failure doesn't crash chat
- Partial data still produces useful response
- Clear indication of what couldn't be fetched

## Deployment

### Environments

| Environment | Purpose            | URL                             |
| ----------- | ------------------ | ------------------------------- |
| Development | Local testing      | localhost:5173                  |
| Preview     | Branch deployments | \*.pages.dev                    |
| Production  | Main branch        | translation-helps-mcp.pages.dev |

### Configuration

- `wrangler.toml` - Worker bindings
- KV namespaces for caching
- R2 buckets for storage
- Queues for indexing
- Secrets for API keys

### Bindings

```toml
[ai]
binding = "AI"

[[kv_namespaces]]
binding = "CACHE"

[[r2_buckets]]
binding = "ZIP_FILES"

[[queues.producers]]
binding = "INDEXER_QUEUE"
```

## Project Structure

```
translation-helps-mcp/
├── ui/                        # SvelteKit frontend + API
│   ├── src/
│   │   ├── routes/            # Pages and API endpoints
│   │   │   ├── api/           # API routes
│   │   │   └── (app)/         # UI pages
│   │   └── lib/
│   │       ├── ai/            # Multi-agent system
│   │       │   ├── agents/    # Specialist agents
│   │       │   └── orchestrated-chat.ts
│   │       └── mcp/           # MCP client
├── src/
│   ├── services/              # Data services
│   ├── functions/             # Platform-agnostic logic
│   ├── tools/                 # MCP tool definitions
│   └── workers/
│       └── indexer/           # Search indexing worker
├── docs/                      # Documentation
└── tests/                     # Test suites
```

## Related Documentation

- [AI Chat Architecture](./AI_CHAT_ARCHITECTURE.md) - Multi-agent system
- [Multi-Agent Orchestration](./MULTI_AGENT_ORCHESTRATION.md) - Agent details
- [Event-Driven Indexing](./EVENT_DRIVEN_INDEXING.md) - Search pipeline
- [Cache Architecture](./CACHE_ARCHITECTURE.md) - Caching strategy
- [Hybrid Search Feature](./HYBRID_SEARCH_FEATURE.md) - AI Search
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production setup
