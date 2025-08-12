# Health DCS Endpoint Comparison

## Original Version (94 lines)

```typescript
export const GET: RequestHandler = async ({ url, fetch }) => {
  try {
    const checks: ValidationCheck[] = [
      // ... check definitions ...
    ];

    // Run all checks
    for (const check of checks) {
      try {
        const response = await fetch(
          `${url.origin}${check.endpoint}?reference=${encodeURIComponent(check.reference)}`,
        );
        const data = await response.json();

        // Extract content based on endpoint
        let content = "";
        if (check.endpoint.includes("scripture")) {
          const ult = data.scriptures?.find((s: any) =>
            s.translation?.includes("Literal Text"),
          );
          content = ult?.text || data.text || "";
        } else if (check.endpoint.includes("notes")) {
          content = JSON.stringify(data.verseNotes || data.notes || []);
        } else if (check.endpoint.includes("questions")) {
          const questions = data.translationQuestions || data.questions || [];
          content = questions.map((q: any) => q.question).join(" ");
        }

        check.actualContent = content.substring(0, 100);
        check.passed = content
          .toLowerCase()
          .includes(check.expectedContent.toLowerCase());
      } catch (error) {
        check.error = error instanceof Error ? error.message : "Unknown error";
        check.passed = false;
      }
    }

    // Fetch DCS status
    let dcsStatus = "unknown";
    try {
      const dcsResponse = await fetch("https://git.door43.org/api/v1/version");
      dcsStatus = dcsResponse.ok ? "healthy" : "unhealthy";
    } catch {
      dcsStatus = "unreachable";
    }

    const allPassed = checks.every((c) => c.passed);

    return json({
      status: allPassed ? "healthy" : "unhealthy",
      dcsStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        total: checks.length,
        passed: checks.filter((c) => c.passed).length,
        failed: checks.filter((c) => !c.passed).length,
      },
    });
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
```

## Simple Pattern Version (105 lines - but much cleaner!)

```typescript
/**
 * Perform health validation checks
 */
async function performHealthChecks(
  params: Record<string, any>,
  request: Request,
) {
  const checks: ValidationCheck[] = [
    // ... check definitions ...
  ];

  // Get the origin from the request URL
  const origin = new URL(request.url).origin;

  // Run all checks
  for (const check of checks) {
    try {
      const response = await fetch(
        `${origin}${check.endpoint}?reference=${encodeURIComponent(check.reference)}`,
      );
      const data = await response.json();

      // Extract content based on endpoint
      let content = "";
      if (check.endpoint.includes("scripture")) {
        // Handle both old and new response formats
        const scriptures = data.scripture || data.scriptures || [];
        const ult = Array.isArray(scriptures)
          ? scriptures.find(
              (s: any) =>
                s.translation?.includes("Literal Text") ||
                s.resource?.includes("ult"),
            )
          : null;
        content = ult?.text || data.text || "";
      } else if (check.endpoint.includes("notes")) {
        content = JSON.stringify(data.verseNotes || data.notes || []);
      } else if (check.endpoint.includes("questions")) {
        const questions = data.translationQuestions || data.questions || [];
        content = questions.map((q: any) => q.question).join(" ");
      }

      check.actualContent = content.substring(0, 100);
      check.passed = content
        .toLowerCase()
        .includes(check.expectedContent.toLowerCase());
    } catch (error) {
      check.error = error instanceof Error ? error.message : "Unknown error";
      check.passed = false;
    }
  }

  // Fetch DCS status
  let dcsStatus = "unknown";
  try {
    const dcsResponse = await fetch("https://git.door43.org/api/v1/version");
    dcsStatus = dcsResponse.ok ? "healthy" : "unhealthy";
  } catch {
    dcsStatus = "unreachable";
  }

  const allPassed = checks.every((c) => c.passed);

  return {
    status: allPassed ? "healthy" : "unhealthy",
    dcsStatus,
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter((c) => c.passed).length,
      failed: checks.filter((c) => !c.passed).length,
    },
  };
}

// Create the endpoint
export const GET = createSimpleEndpoint({
  name: "health-dcs-v2",

  // No parameters needed for this endpoint
  params: [],

  // Pass the request object to get the origin
  fetch: performHealthChecks,
});

// CORS handler
export const OPTIONS = createCORSHandler();
```

## Key Improvements

1. **Separation of Concerns**
   - Business logic (`performHealthChecks`) is separate from HTTP handling
   - Pure function that's easy to test
   - No manual error handling boilerplate

2. **Cleaner Error Handling**
   - Automatic 500 error handling
   - Consistent error response format
   - No need for try/catch wrapper

3. **Better Structure**
   - Clear declaration of endpoint configuration
   - Automatic parameter validation (if we had params)
   - Standardized CORS handling

4. **Response Format Flexibility**
   - Handles both old and new scripture response formats
   - More robust content extraction

5. **Testability**
   - `performHealthChecks` can be unit tested in isolation
   - No HTTP concerns mixed with business logic

## Migration Notes

- Had to update `simpleEndpoint` to pass the `request` object for endpoints that need it
- The pattern still works great for endpoints that need request context
- Total lines are similar, but the code is much cleaner and more maintainable
- Error handling is automatic and consistent
