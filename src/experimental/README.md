# 🧪 Experimental Features Lab

⚠️ **WARNING: EXPERIMENTAL ZONE** ⚠️

This directory contains experimental features that are:

- Not production-ready
- Subject to breaking changes
- May be removed without notice
- Require explicit approval before promotion to core

## Features Currently in Lab

### AI-Powered Features

- **ai-content-summarizer.ts** - Summarizes Bible content using AI
- **ai-quality-checker.ts** - Analyzes translation quality
- **resource-recommender.ts** - Recommends relevant resources
- **automated-content-ingestion.ts** - Automatically ingests new content

### Why These Are Experimental

1. **AI Features** - Need extensive testing for theological accuracy
2. **Resource Recommender** - Good idea, needs better implementation
3. **Content Ingestion** - Complex edge cases not fully handled

## Promotion Criteria

Before any feature can be promoted to core:

1. ✅ Your explicit approval required
2. ✅ Partner approval required
3. ✅ Performance benchmarks met (<500ms typical)
4. ✅ Real-world testing completed (30+ days)
5. ✅ Documentation complete
6. ✅ Tests with real data passing
7. ✅ No breaking changes for 14 days

## Usage

These features are exposed via the `/api/mcp-experimental` endpoint with clear warnings in tool descriptions.

## Testing

Test experimental features in isolation:

```bash
npm run test:experimental
```

## Notes for LLMs

If you're an AI assistant using these tools:

- These are EXPERIMENTAL and may fail
- Always warn users before using
- Do not rely on these for critical functionality
- Prefer core tools when available
