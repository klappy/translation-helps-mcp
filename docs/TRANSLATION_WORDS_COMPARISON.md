# Translation Words Endpoint Comparison

## Overview

Comparing the old (ResourceAggregator-based) implementation with the new simple pattern.

## Old Implementation

```typescript
// 60 lines of complex logic
export const GET: RequestHandler = async ({ url }) => {
  try {
    const reference = url.searchParams.get("reference");
    const language = url.searchParams.get("language") || "en";
    const organization =
      url.searchParams.get("organization") || "unfoldingWord";

    if (!reference) {
      return json(
        {
          success: false,
          error: "Missing required parameter: reference",
        },
        { status: 400 },
      );
    }

    const aggregator = new ResourceAggregator(language, organization);

    // Parse the reference and get translation words
    const parsedReference = parseReference(reference);
    const result = await aggregator.aggregateResources(parsedReference, {
      language,
      organization,
      resources: ["words"],
    });

    return json(result);
  } catch (error) {
    console.error("Error in fetch-translation-words:", error);
    return json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
};

// Enable CORS
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
```

## New Implementation

```typescript
// Simple, declarative configuration
export const GET = createSimpleEndpoint({
  name: "fetch-translation-words-v2",

  // Use common parameter validators
  params: [
    COMMON_PARAMS.reference,
    COMMON_PARAMS.language,
    COMMON_PARAMS.organization,
  ],

  fetch: fetchTranslationWords,

  // Use standard error handler
  onError: createStandardErrorHandler(),
});

// CORS handler
export const OPTIONS = createCORSHandler();
```

## Key Improvements

### 1. Code Reduction

- **Old**: 60 lines of boilerplate
- **New**: 15 lines of configuration
- **Reduction**: 75% less code

### 2. Consistent Validation

- **Old**: Manual parameter checking with custom error messages
- **New**: Shared validators that work the same everywhere

### 3. Standardized Response Format

- **Old**: Custom response structure per endpoint
- **New**: Standard `TranslationHelpsResponse` shape:
  ```json
  {
    "reference": "John 3:16",
    "language": "en",
    "organization": "unfoldingWord",
    "items": [...],
    "metadata": {
      "totalCount": 4,
      "source": "TW",
      "language": "en",
      "organization": "unfoldingWord"
    }
  }
  ```

### 4. Better Error Handling

- **Old**: Generic error messages
- **New**: Consistent, user-friendly error messages via `createStandardErrorHandler()`

### 5. Empty Data Handling

- **Old**: Might return error for missing data
- **New**: Always returns proper response with empty array

## Benefits

1. **Maintainability**: Business logic separated from HTTP concerns
2. **Consistency**: Same patterns across all endpoints
3. **Testability**: Pure functions are easy to test
4. **Reusability**: Common utilities prevent duplication
5. **Developer Experience**: Clear, simple, predictable

## Migration Path

1. Create v2 endpoint with mock data
2. Test response format and behavior
3. Implement real data fetching when edge-compatible service is ready
4. Redirect old endpoint to v2
5. Eventually remove old endpoint

This pattern has been successfully applied to 10 endpoints so far, with consistent results!
