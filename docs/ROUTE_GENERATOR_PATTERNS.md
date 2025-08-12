# RouteGenerator Pattern Analysis

## Current Architecture Overview

The `RouteGenerator` class is a 1700+ line monolith that handles:

1. **Parameter parsing and validation**
2. **Cache key generation**
3. **Data fetching (DCS API, computed, hybrid, zip-cached)**
4. **Data transformation**
5. **Response formatting**
6. **Error handling**
7. **Performance monitoring**
8. **CORS handling**
9. **Response validation**

## Common Patterns Found

### 1. Handler Generation Pattern

Every endpoint follows this pattern:

```typescript
generateHandler(config: EndpointConfig) {
  return async (request) => {
    // 1. Parse parameters
    // 2. Validate parameters
    // 3. Fetch data
    // 4. Transform data
    // 5. Format response
    // 6. Add headers/metadata
    // 7. Handle errors
  }
}
```

### 2. Parameter Handling

```typescript
// Parse from query strings and path
const params = this.parseParameters(request, config.params);
// Validate against schema
const errors = this.validateParameters(params, config.params);
```

### 3. Data Fetching Pattern

All data sources follow a similar pattern:

- **DCS API**: Direct HTTP fetch
- **Computed**: Function call
- **Zip-cached**: ZIP file extraction
- **Hybrid**: Combination

### 4. Response Formatting

All responses go through:

1. Data validation
2. Metadata injection
3. Format conversion (JSON/text/markdown)
4. Header generation

## Simplification Opportunities

### 1. Extract Parameter Handler

```typescript
class ParameterHandler {
  parse(request: Request, schema: ParamConfig[]): ParsedParams;
  validate(params: ParsedParams, schema: ParamConfig[]): ValidationError[];
}
```

### 2. Extract Data Fetchers

```typescript
interface DataFetcher {
  fetch(params: ParsedParams): Promise<unknown>;
}

class DCSFetcher implements DataFetcher {}
class ZipFetcher implements DataFetcher {}
class ComputedFetcher implements DataFetcher {}
```

### 3. Extract Response Builder

```typescript
class ResponseBuilder {
  build(data: unknown, format: string, metadata: Metadata): Response;
}
```

### 4. Simple Endpoint Wrapper

Instead of 200+ lines per endpoint, we could have:

```typescript
function createEndpoint(config: SimpleConfig): RequestHandler {
  const params = new ParameterHandler(config.params);
  const fetcher = createFetcher(config.source);
  const response = new ResponseBuilder(config.format);

  return async (req) => {
    try {
      const parsed = params.parse(req);
      const data = await fetcher.fetch(parsed);
      return response.build(data);
    } catch (error) {
      return response.error(error);
    }
  };
}
```

## Key Abstractions Needed

1. **ParameterHandler** - Parse & validate
2. **DataFetcher** - Fetch from various sources
3. **ResponseBuilder** - Format & add metadata
4. **ErrorHandler** - Consistent error responses

## Migration Strategy

1. **Extract interfaces** first
2. **Create adapters** for existing RouteGenerator
3. **Build new simple wrapper**
4. **Migrate one endpoint** as proof
5. **Gradually migrate** remaining endpoints
