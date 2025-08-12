# Translation Helps MCP Architecture

## Overview

Translation Helps MCP is a modern API service providing access to biblical translation resources. Built on SvelteKit and Cloudflare Workers, it emphasizes consistency, simplicity, and performance.

## Core Principles

### KISS (Keep It Simple, Stupid)

- No complex abstractions
- Direct, readable code
- Minimal layers between request and response

### DRY (Don't Repeat Yourself)

- Shared utilities for common patterns
- Centralized validation and error handling
- Reusable response formatters

### Consistency Above All

- Every endpoint follows the same pattern
- Predictable request/response shapes
- Uniform error handling

## Architecture Layers

### 1. API Endpoints (`ui/src/routes/api/v2/`)

Each endpoint is a simple SvelteKit server route that:

- Uses `createSimpleEndpoint` wrapper
- Defines parameters with validation
- Implements a fetch function
- Returns standardized responses

Example:

```typescript
export const GET = createSimpleEndpoint({
  name: "endpoint-name",
  params: [COMMON_PARAMS.reference],
  fetch: async (params) => {
    // Fetch and return data
  },
});
```

### 2. Shared Utilities (`ui/src/lib/`)

#### simpleEndpoint.ts

Core wrapper that provides:

- Parameter parsing and validation
- Error handling
- Response formatting
- CORS support

#### commonValidators.ts

Reusable parameter validators:

- `isValidReference` - Bible reference validation
- `isValidLanguageCode` - Language code validation
- `isValidOrganization` - Organization validation

#### standardResponses.ts

Factory functions for consistent response shapes:

- `createScriptureResponse` - For scripture endpoints
- `createTranslationHelpsResponse` - For translation helps
- `createListResponse` - For list endpoints

#### circuitBreaker.ts

Resilience pattern for external API calls:

- Prevents cascading failures
- Automatic retry logic
- Graceful degradation

### 3. Data Services (`src/services/`)

#### ZipResourceFetcher2.ts

Optimized resource fetching:

- Downloads entire resources as ZIP files
- Caches in Cloudflare KV
- Extracts files on demand
- Reduces API calls by 90%

### 4. Caching Strategy

#### Two-Tier Caching

1. **Memory Cache** - Fast, limited size
2. **KV Cache** - Persistent, distributed

#### Cache Rules

- **NEVER cache responses** - Only cache raw data
- Cache DCS API calls
- Cache ZIP file downloads
- Cache extracted files from ZIPs

### 5. Middleware

#### responseValidator.ts

Ensures response integrity:

- Strips diagnostic data from bodies
- Validates response structure
- Prevents data leakage

#### cacheValidator.ts

Prevents bad data caching:

- Validates data before caching
- Rejects empty or invalid data
- Maintains cache integrity

## Request Flow

1. **Client Request** → API Endpoint
2. **Parameter Validation** → Common Validators
3. **Data Fetching** → Circuit Breaker → External API
4. **Caching** → Cache Validator → KV/Memory
5. **Response Shaping** → Standard Response
6. **Response Validation** → Response Validator
7. **Client Response** ← Clean, Consistent Data

## Performance Optimizations

### Edge Runtime

- Runs on Cloudflare Workers
- Global distribution
- Near-zero cold starts

### ZIP-Based Fetching

- Entire resources downloaded once
- Individual files extracted on demand
- Dramatic reduction in API calls

### Smart Caching

- Frequently accessed data in memory
- Long-term storage in KV
- Automatic cache warming

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

- 400 - Invalid parameters
- 404 - Resource not found
- 500 - Server errors
- 503 - External service unavailable

## Deployment

### Environments

- **Development** - Local with wrangler
- **Preview** - Branch deployments
- **Production** - Main branch auto-deploy

### Configuration

- Environment variables in wrangler.toml
- KV namespaces for caching
- Secrets for API keys

## Future Enhancements

1. **GraphQL Layer** - Optional query interface
2. **WebSocket Support** - Real-time updates
3. **Batch Operations** - Multiple resources in one call
4. **Enhanced Caching** - Predictive cache warming

## Migration from v1

The v2 architecture replaces the complex RouteGenerator system with simple, direct endpoints. Benefits:

- 75% less code
- Easier debugging
- Faster development
- Better performance

See `NEXT_PHASE_ROADMAP.md` for detailed migration plans.
