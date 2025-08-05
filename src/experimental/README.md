# 🧪 EXPERIMENTAL FEATURES LAB

## ⚠️ WARNING: EXPERIMENTAL CODE AHEAD ⚠️

This directory contains experimental features that are:
- **NOT production-ready**
- **NOT guaranteed to work reliably**
- **NOT covered by stability guarantees**
- **SUBJECT TO CHANGE without notice**

## What's in the Lab?

### 🚧 Debug & Test API Routes (Moved from Core)
**Location:** `api-routes/`

- **debug-titus/** - Debug endpoint returning massive catalog data (working but debug-only)
- **test-twl/** - Test endpoint for translation word links (working but test-only)
- **mcp-experimental/** - Experimental MCP protocol endpoint
- **mcp-dynamic/** - Dynamic MCP features
- **chat-dynamic/** - Dynamic chat endpoint features

### 🤖 AI-Powered Features
- **ai-content-summarizer.ts** - AI-powered content summarization (currently using mock responses)
- **ai-quality-checker.ts** - AI quality assessment (currently using mock responses)

### 📦 Unused/Duplicate Features
- **resource-aggregator.ts** - Alternative resource aggregation implementation (not used by core)
- **resource-aggregator-unused.ts** - Duplicate from core functions (moved here, unused)
- **resource-recommendations.ts** - Alternative recommendations (experimental version)
- **resource-recommender.ts** - Alternative recommender engine (experimental version)

### 🗄️ Deprecated Features  
- **cache-warmer.ts** - Deprecated cache warming system
- **automated-content-ingestion.ts** - Automated content discovery and ingestion

## Core vs Experimental Clarification

**✅ CORE (Working in Production):**
- Main resource endpoints (`/api/fetch-scripture`, `/api/fetch-translation-notes`, etc.)
- Resource recommendations endpoint (`/api/resource-recommendations`) - Uses `src/functions/resource-recommender.ts`
- Unified cache system
- Performance monitoring
- X-ray transparency

**🧪 EXPERIMENTAL (Moved Here):**
- Debug endpoints (working but not production-appropriate)
- Test endpoints (working but for testing only)
- Alternative implementations (may or may not work)
- AI features (mock implementations)

## Promotion Criteria

For a feature to move from experimental to core, it must:

1. **Get explicit approval** from project maintainers
2. **Get partner approval** from stakeholders  
3. **Meet performance benchmarks**:
   - Response time < 500ms for 95th percentile
   - Cache hit ratio > 80%
   - Error rate < 0.1%
4. **Pass real-world testing**:
   - Used in production for 30+ days
   - Processed 10,000+ requests
   - No critical bugs reported
5. **Have complete documentation**:
   - API documentation
   - Integration guide
   - Migration guide from experimental
6. **Have comprehensive tests**:
   - Unit tests with >90% coverage
   - Integration tests with real data
   - Load tests proving scalability

## Using Experimental Features

### In Development

```typescript
// ⚠️ EXPERIMENTAL - DO NOT USE IN PRODUCTION
import { ExperimentalFeature } from '../experimental/feature-experimental';

// Must explicitly acknowledge experimental status
const feature = new ExperimentalFeature({
  acknowledgeExperimental: true
});
```

### API Endpoints

Experimental features are accessible via:
- Debug/Test endpoints: Moved to experimental but still accessible for development
- Experimental MCP: `/api/mcp-experimental` (moved to experimental directory)

## Migration Path

When a feature is approved for core:

1. Remove `-experimental` suffix from filename
2. Move to appropriate core directory
3. Update all imports
4. Remove experimental warnings  
5. Add to core endpoint configuration
6. Update documentation
7. Announce in changelog

## Current Status

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Debug Titus | 🔧 Debug Only | `api-routes/debug-titus/` | Working but debug output |
| Test TWL | 🧪 Test Only | `api-routes/test-twl/` | Working test endpoint |
| MCP Experimental | 🔬 Experimental | `api-routes/mcp-experimental/` | Experimental MCP features |
| AI Content Summarizer | 🔬 Experimental | Root | Mock only |
| AI Quality Checker | 🔬 Experimental | Root | Mock only |
| Resource Aggregator (Alt) | 🔬 Experimental | Root | Alternative implementation |
| Resource Aggregator (Unused) | ❌ Unused | Root | Moved from core, unused |
| Cache Warmer | ❌ Deprecated | Root | Feature removed from roadmap |
| Automated Ingestion | 🔬 Experimental | Root | 30% complete |

## Contact

Questions about experimental features? Contact the development team.

**Remember: These features are experiments. They might work perfectly, they might not work at all, or they might work in unexpected ways. Use at your own risk!**