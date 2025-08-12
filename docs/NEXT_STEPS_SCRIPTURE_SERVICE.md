# Next Steps: Create ScriptureService

## Objective

Extract the scripture fetching logic from ZipResourceFetcher2 into a simple, focused service.

## Current State

Scripture fetching is buried in:

- `ZipResourceFetcher2.ts` - getScripture() method (~200 lines)
- `RouteGenerator.ts` - transformation logic
- `ResponseFormatter.ts` - response shaping

## Target State

A single, simple service:

```typescript
// src/services/ScriptureService.ts
export class ScriptureService {
  async getScripture(params: ScriptureParams): Promise<Scripture[]>;
}
```

## Implementation Plan

### Step 1: Create the Service Interface

```typescript
// src/services/ScriptureService.ts
export interface ScriptureParams {
  reference: string;
  language?: string;
  organization?: string;
  resource?: string;
}

export interface Scripture {
  text: string;
  reference: string;
  resource: string;
  language: string;
  citation: string;
  organization: string;
}

export class ScriptureService {
  private zipFetcher: ZipResourceFetcher2;

  constructor() {
    // Reuse existing ZIP fetcher for now
    this.zipFetcher = new ZipResourceFetcher2();
  }

  async getScripture(params: ScriptureParams): Promise<Scripture[]> {
    // Implementation here
  }
}
```

### Step 2: Extract Core Logic

Copy the essential logic from ZipResourceFetcher2.getScripture():

1. Parse reference
2. Fetch from ZIP
3. Format response
4. Return clean array

### Step 3: Write Tests

```typescript
// tests/services/ScriptureService.test.ts
describe("ScriptureService", () => {
  it("fetches John 3:16", async () => {
    const service = new ScriptureService();
    const result = await service.getScripture({
      reference: "John 3:16",
      language: "en",
    });

    expect(result).toHaveLength(4); // ULT, UST, etc
    expect(result[0]).toHaveProperty("text");
    expect(result[0]).toHaveProperty("reference", "John 3:16");
  });
});
```

### Step 4: Create Simple Endpoint

```typescript
// ui/src/routes/api/v2/scripture/+server.ts
import { ScriptureService } from "$lib/../../../../src/services/ScriptureService";
import { json } from "@sveltejs/kit";

const service = new ScriptureService();

export const GET: RequestHandler = async ({ url }) => {
  const reference = url.searchParams.get("reference");
  if (!reference) {
    return json({ error: "Reference required" }, { status: 400 });
  }

  try {
    const scripture = await service.getScripture({
      reference,
      language: url.searchParams.get("language") || "en",
    });

    return json({
      scripture,
      metadata: { count: scripture.length },
    });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};
```

### Step 5: Test & Compare

1. Run both endpoints side by side
2. Ensure identical output
3. Benchmark performance
4. Add to contract tests

## Success Criteria

- [ ] ScriptureService class created (~200 lines)
- [ ] Unit tests passing
- [ ] v2 endpoint working
- [ ] Performance within 10% of original
- [ ] Contract tests updated

## Time Estimate

- Create service: 2 hours
- Write tests: 1 hour
- Create endpoint: 30 minutes
- Testing & verification: 1.5 hours
  **Total: ~5 hours**

## Code to Reuse

From `ZipResourceFetcher2.ts`:

- `getScripture()` method (lines 250-450)
- Reference parsing logic
- Resource fetching logic

## What NOT to Include

- Complex caching logic (use existing)
- Transformation pipelines
- Response formatting
- Error wrapping/unwrapping

## Notes

- Keep it simple - no premature optimization
- Reuse existing ZIP fetcher for now
- Focus on clean interface
- This is a proof of concept for the pattern
