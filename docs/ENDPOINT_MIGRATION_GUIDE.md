# Endpoint Migration Guide

This guide walks through migrating endpoints from RouteGenerator to the Simple Pattern.

## Why Migrate?

- **70% less code** - Focus on business logic, not boilerplate
- **Pure functions** - Easy to test and understand
- **Clear flow** - No magic, just simple functions
- **Better errors** - Explicit validation and error handling
- **Type safety** - Direct, simple types

## Migration Steps

### 1. Analyze the Existing Endpoint

First, understand what the endpoint does:

- What parameters does it accept?
- What data does it fetch?
- What transformations does it apply?
- What's the response format?

### 2. Create the Business Logic Function

Extract the core logic into a pure function:

```typescript
async function fetchYourData(params: Record<string, any>) {
  // Your business logic here
  // No HTTP concerns, just data processing

  return {
    // Your response data
  };
}
```

### 3. Define Parameter Schema

Convert the verbose config to simple schema:

```typescript
// Old way (RouteGenerator)
params: {
  reference: {
    type: "string" as const,
    required: true,
    description: "Bible reference...",
    example: "John 3:16",
    pattern: "^[A-Za-z0-9\\s:,-]+$"
  }
}

// New way (Simple)
params: [
  {
    name: 'reference',
    required: true,
    validate: (value) => value && value.length > 0
  }
]
```

### 4. Create the Endpoint

Use the simple wrapper:

```typescript
export const GET = createSimpleEndpoint({
  name: "your-endpoint-v2",

  params: [
    // Your parameters
  ],

  fetch: fetchYourData,

  // Optional custom error handling
  onError: (error) => {
    if (error.message.includes("specific")) {
      return { status: 400, message: "User friendly message" };
    }
    return { status: 500, message: "Internal error" };
  },
});

export const OPTIONS = createCORSHandler();
```

### 5. Test Thoroughly

1. Test all parameter combinations
2. Test error cases
3. Compare responses with old endpoint
4. Verify headers are correct
5. Check performance

## Common Patterns

### Parameter Validation

```typescript
// String enum validation
{
  name: 'type',
  validate: (value) => ['ult', 'ust', 'tn'].includes(value)
}

// Number range validation
{
  name: 'limit',
  type: 'number',
  default: 10,
  validate: (value) => value > 0 && value <= 100
}

// Complex validation
{
  name: 'reference',
  required: true,
  validate: (value) => {
    // Your validation logic
    return isValidReference(value);
  }
}
```

### Data Fetching Patterns

```typescript
// Simple fetch
async function fetchData(params) {
  const response = await fetch(buildUrl(params));
  return response.json();
}

// With caching
async function fetchDataWithCache(params) {
  const cacheKey = buildCacheKey(params);
  const cached = await cache.get(cacheKey);

  if (cached) return cached;

  const data = await fetchFromSource(params);
  await cache.set(cacheKey, data, TTL);

  return data;
}

// With transformation
async function fetchAndTransform(params) {
  const raw = await fetchRawData(params);
  return transformData(raw, params);
}
```

### Error Handling

```typescript
onError: (error) => {
  // Map specific errors to user-friendly messages
  const errorMap = {
    "Invalid reference": {
      status: 400,
      message: "Please provide a valid Bible reference",
    },
    "Not found": { status: 404, message: "Resource not found" },
    "Network error": {
      status: 503,
      message: "Service temporarily unavailable",
    },
  };

  for (const [key, response] of Object.entries(errorMap)) {
    if (error.message.includes(key)) {
      return response;
    }
  }

  // Default error
  return { status: 500, message: "An unexpected error occurred" };
};
```

## Migration Checklist

- [ ] Understand existing endpoint behavior
- [ ] Extract business logic to pure function
- [ ] Convert parameter schema
- [ ] Create new endpoint with simple wrapper
- [ ] Add proper error handling
- [ ] Test all scenarios
- [ ] Compare with old endpoint
- [ ] Update documentation
- [ ] Plan deprecation of old endpoint

## Tips

1. **Start Simple**: Don't try to replicate every feature immediately
2. **Test First**: Write tests for the business logic function
3. **Incremental**: Create v2 endpoints alongside old ones
4. **Document**: Note any behavior differences
5. **Monitor**: Watch for errors after deployment

## Example Migrations

See completed migrations for reference:

- [Health Endpoint](./HEALTH_ENDPOINT_COMPARISON.md)
- [Languages Endpoint](./LANGUAGES_ENDPOINT_COMPARISON.md)

## Future Considerations

As we migrate more endpoints, we'll:

1. Build a library of common validators
2. Create shared error handlers
3. Develop data fetching utilities
4. Standardize response formats

The goal is a clean, consistent, maintainable API!
