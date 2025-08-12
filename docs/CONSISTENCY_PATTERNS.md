# Consistency Patterns

## The Problem We're Solving

Before: Every endpoint had slightly different:

- Parameter validation
- Error messages
- Response formats
- Error handling

This meant fixing the same issues over and over in different endpoints!

## The Solution: Shared Utilities

### 1. Common Validators (`commonValidators.ts`)

```typescript
// Before: Each endpoint had its own reference validation
const isValid = /^[A-Za-z]+\s+\d+:\d+$/.test(reference); // Different everywhere!

// After: One consistent validator
import { COMMON_PARAMS } from "$lib/commonValidators.js";

params: [
  COMMON_PARAMS.reference, // Same validation everywhere!
  COMMON_PARAMS.language,
  COMMON_PARAMS.organization,
];
```

Benefits:

- ✅ Fix validation once, it's fixed everywhere
- ✅ Add new validation rules in one place
- ✅ Consistent parameter names and defaults

### 2. Standard Error Handlers (`commonErrorHandlers.ts`)

```typescript
// Before: Each endpoint had different error messages
if (error) {
  return json({ error: "Something went wrong" }); // Inconsistent!
}

// After: Consistent error handling
onError: createStandardErrorHandler({
  "No data found": {
    status: 404,
    message: "Resource not available for this reference.",
  },
});
```

Benefits:

- ✅ Same error produces same message across all endpoints
- ✅ Circuit breaker errors handled consistently
- ✅ Network errors have helpful messages

### 3. Standard Response Shapes (`standardResponses.ts`)

```typescript
// Before: Each endpoint returned data differently
return {
  translations: [...],  // Or was it 'scriptures'? Or 'items'?
  count: 5              // Or was it 'total'? Or 'totalCount'?
};

// After: Consistent response shapes
return createScriptureResponse(
  scriptures,
  reference,
  language,
  organization
);
// Always returns: { scripture: [...], metadata: { totalCount, resources, ... } }
```

Benefits:

- ✅ Frontend knows exactly what to expect
- ✅ Same metadata fields across all endpoints
- ✅ Easy to add new standard fields

## Example: Two Translation Endpoints

Look how similar these are now:

### Translation Questions

```typescript
export const GET = createSimpleEndpoint({
  name: "translation-questions-v2",
  params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],
  fetch: fetchTranslationQuestions,
  onError: createStandardErrorHandler({
    "No translation questions found": { status: 404, message: "..." },
  }),
});
```

### Translation Notes

```typescript
export const GET = createSimpleEndpoint({
  name: "translation-notes-v2",
  params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],
  fetch: fetchTranslationNotes,
  onError: createStandardErrorHandler({
    "No translation notes found": { status: 404, message: "..." },
  }),
});
```

The ONLY differences are:

1. The endpoint name
2. The fetch function
3. The specific error message

Everything else is consistent!

## The Pattern for New Endpoints

1. Import the utilities:

```typescript
import { COMMON_PARAMS } from "$lib/commonValidators.js";
import { createStandardErrorHandler } from "$lib/commonErrorHandlers.js";
import { createTranslationHelpsResponse } from "$lib/standardResponses.js";
```

2. Use common parameters:

```typescript
params: [
  COMMON_PARAMS.reference,
  COMMON_PARAMS.language,
  // Add any endpoint-specific params
];
```

3. Return standard responses:

```typescript
return createTranslationHelpsResponse(items, reference, language, organization, "tn");
```

4. Handle errors consistently:

```typescript
onError: createStandardErrorHandler({
  // Add any endpoint-specific errors
});
```

## Benefits Summary

1. **Fix Once, Fixed Everywhere**: Update validation in one file, all endpoints get it
2. **Predictable API**: Same parameters work the same way everywhere
3. **Better Developer Experience**: Know one endpoint, know them all
4. **Easier Testing**: Test utilities once, trust them everywhere
5. **Faster Development**: Copy an existing endpoint, change the business logic, done!

This is what KISS and DRY really look like in practice!
