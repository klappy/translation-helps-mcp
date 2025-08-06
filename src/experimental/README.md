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

### 🛠️ Unused Performance Utilities (Moved from Core)

- **advanced-filter-unused.ts** - Sophisticated 636-line filtering system (not used by any endpoints)
- **request-coalescer-unused.ts** - Request coalescing system to combine identical requests (384 lines, unused)
- **response-optimizer-unused.ts** - Response optimization middleware (unused by endpoints)
- **compression-middleware-unused.ts** - Compression middleware (unused by endpoints)
- **cache-warmer-functions.ts** - Deprecated cache warming system (moved from functions)

### 🧪 Moved Test Files

Test files for the above unused utilities have been moved to `src/experimental/tests/`:

- **tests/advanced-filter.test.ts** - Tests for the 636-line filtering system
- **tests/request-coalescer.test.ts** - Tests for request coalescing functionality
- **tests/response-optimizer.test.ts** - Tests for response optimization middleware
- **tests/compression-middleware.test.ts** - Tests for compression middleware
- **tests/cache-warmer.test.ts** - Tests for deprecated cache warming system

### 🗄️ Deprecated Features

- **cache-warmer.ts** - Deprecated cache warming system
- **automated-content-ingestion.ts** - Automated content discovery and ingestion

## Translation Helps MCP Architecture

This project follows a **three-tier architecture** for organizing functionality:

### 🔧 **CORE - DCS Proxies**

_Clean, formatted versions of Door43 Content Service data_

**Location:** `/api/` endpoints in production  
**Purpose:** Direct proxies to DCS with minimal processing - JSON formatting, caching, error handling

**Endpoints:**

- `fetch-scripture` - Scripture text from ULT, UST, T4T, UEB translations
- `fetch-translation-notes` - Verse-by-verse translation notes
- `fetch-translation-questions` - Comprehension questions for passages
- `fetch-translation-academy` - Translation Academy articles
- `get-translation-word` - Individual translation word definitions
- `fetch-translation-word-links` - Links between verses and translation words
- `get-languages` - Available languages list
- `get-available-books` - Available books per language/organization
- `list-available-resources` - Resource catalog from DCS

**Characteristics:**

- Response time: <100ms (with caching)
- Data format: JSON (default) with optional TSV for exact DCS content
- No cross-resource bridging - one DCS resource per call
- Minimal business logic - just formatting and performance optimization

### 🚀 **EXTENDED - Value-Added Bridging**

_Production-ready features that combine multiple DCS resources intelligently_

**Location:** `/api/` endpoints in production  
**Purpose:** Save developers from making multiple chained calls by combining DCS data with smart logic

**Endpoints:**

- `resource-recommendations` - AI-powered recommendations for which resources to use for a passage
- `fetch-resources` - Aggregates multiple translation resources (notes, questions, etc.) in one call
- `resource-catalog` - Enhanced catalog with metadata and usage statistics

**Characteristics:**

- Response time: <500ms
- Combines 2-10 DCS API calls into single response
- Adds business logic and intelligence
- Production-ready with comprehensive testing
- Includes performance monitoring and caching

### 🧪 **EXPERIMENTAL - LLM-Powered Crazy Ideas**

_Advanced features using AI/LLM for heavy lifting_

**Location:** `src/experimental/` directory  
**Purpose:** Experimental features that use LLMs to do complex reasoning and provide intelligent responses

**Features:**

#### 🤖 AI-Powered Content Processing

- `ai-content-summarizer.ts` - LLM-powered content summarization (mock implementation)
- `ai-quality-checker.ts` - AI quality assessment for translations (mock implementation)

#### 💬 LLM Chat Interfaces

- `chat` - AI Bible assistant with context awareness
- `chat-reasoning` - Chat with visible reasoning process
- `chat-stream` - Streaming chat responses
- `chat-dynamic` - Dynamic chat with adaptive responses (moved to `api-routes/`)

#### 🔬 Advanced MCP Features

- `mcp-experimental` - Experimental MCP protocol extensions (moved to `api-routes/`)
- `mcp-dynamic` - Dynamic MCP tool generation (moved to `api-routes/`)

#### 🛠️ Debug & Development Tools

- `debug-titus` - Debug endpoint with massive catalog data output (moved to `api-routes/`)
- `test-twl` - Test endpoint for translation word links (moved to `api-routes/`)

#### 📦 Alternative Implementations

- `resource-aggregator.ts` - Alternative resource aggregation (not used by production)
- `resource-aggregator-unused.ts` - Duplicate from core (moved here, unused)
- `resource-recommendations.ts` - Alternative recommendations engine
- `resource-recommender.ts` - Alternative recommender (experimental version)

#### 🗄️ Deprecated Features

- `cache-warmer.ts` - Deprecated cache warming system
- `automated-content-ingestion.ts` - Automated content discovery (30% complete)

**Characteristics:**

- May use external LLM APIs (OpenAI, Claude, etc.)
- Response times variable (500ms - 30s depending on LLM)
- Heavy computational requirements
- Mock implementations for cost control
- Not guaranteed to work reliably

---

## Promotion Path Between Tiers

### Experimental → Extended

1. Replace mock LLM calls with efficient algorithms
2. Achieve <500ms response times consistently
3. Add comprehensive testing and error handling
4. Prove production stability over 30+ days

### Extended → Core

Extended features generally stay extended unless they become simple DCS proxies.

### Experimental → Core (Rare)

Only if the feature becomes a simple DCS proxy with no cross-resource logic.

## Promotion Criteria

For any feature to move up a tier, it must:

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

### Specific Promotion Requirements by Feature

#### AI Features (High Scrutiny Required)

- **ai-content-summarizer.ts**: Replace mock responses with real LLM integration, achieve consistent <500ms response times, demonstrate cost-effectiveness
- **ai-quality-checker.ts**: Replace mock responses with real LLM integration, validate accuracy against human expert reviews, prove reliability

#### Advanced Features (Implementation Quality Focus)

- **language-coverage-experimental.ts**: Remove hard-coded estimates, implement proper resource counting, test across multiple references, improve detection accuracy
- **resource-recommendations.ts**: Validate recommendation quality against user feedback, optimize for performance
- **automated-content-ingestion.ts**: Complete webhook implementation, add error handling, implement rate limiting

#### MCP Experimental Tools

- **mcp-experimental endpoint**: Each tool must individually meet all promotion criteria above before being moved to production MCP endpoint
- All experimental tools must demonstrate real value over mock responses
- Performance testing required under realistic load conditions

**⚠️ IMPORTANT**: No experimental feature should be promoted without explicit written approval from both project maintainers AND implementation partners. This ensures quality control and prevents premature deployment of unstable features.

## Using Experimental Features

### In Development

```typescript
// ⚠️ EXPERIMENTAL - DO NOT USE IN PRODUCTION
import { ExperimentalFeature } from "../experimental/feature-experimental";

// Must explicitly acknowledge experimental status
const feature = new ExperimentalFeature({
  acknowledgeExperimental: true,
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

## Current Status by Tier

### 🔧 CORE - DCS Proxies (Production)

| Endpoint                     | Status        | Response Time | Notes                           |
| ---------------------------- | ------------- | ------------- | ------------------------------- |
| fetch-scripture              | ✅ Production | 13-29ms       | ULT, UST, T4T, UEB translations |
| fetch-translation-notes      | ✅ Production | <50ms         | Verse-by-verse notes            |
| fetch-translation-questions  | ✅ Production | <50ms         | Comprehension questions         |
| get-translation-word         | ✅ Production | <50ms         | Individual word definitions     |
| fetch-translation-word-links | ✅ Production | <50ms         | Verse-to-word mappings          |
| get-languages                | ✅ Production | <30ms         | Available languages             |
| get-available-books          | ✅ Production | <30ms         | Available books catalog         |
| list-available-resources     | ✅ Production | <100ms        | Resource catalog                |

### 🚀 EXTENDED - Value-Added Bridging (Production)

| Endpoint                 | Status        | Response Time | Notes                          |
| ------------------------ | ------------- | ------------- | ------------------------------ |
| resource-recommendations | ✅ Production | <200ms        | Smart resource suggestions     |
| fetch-resources          | ✅ Production | <300ms        | Aggregated resource data       |
| resource-catalog         | ✅ Production | <150ms        | Enhanced catalog with metadata |

### 🧪 EXPERIMENTAL - LLM-Powered Features

| Feature                   | Status          | Location                       | Notes                                |
| ------------------------- | --------------- | ------------------------------ | ------------------------------------ |
| AI Content Summarizer     | 🔬 Mock Only    | Root                           | Needs real LLM integration           |
| AI Quality Checker        | 🔬 Mock Only    | Root                           | Needs real LLM integration           |
| Chat Assistant            | 🚀 Working      | `/api/chat`                    | Uses LLM for Bible Q&A               |
| Chat Reasoning            | 🚀 Working      | `/api/chat-reasoning`          | Shows reasoning process              |
| Chat Stream               | 🚀 Working      | `/api/chat-stream`             | Streaming responses                  |
| Chat Dynamic              | 🔬 Experimental | `api-routes/chat-dynamic/`     | Adaptive responses                   |
| MCP Experimental          | 🔬 Experimental | `api-routes/mcp-experimental/` | Protocol extensions                  |
| MCP Dynamic               | 🔬 Experimental | `api-routes/mcp-dynamic/`      | Dynamic tool generation              |
| Debug Titus               | 🛠️ Debug Tool   | `api-routes/debug-titus/`      | Catalog debugging                    |
| Test TWL                  | 🧪 Test Tool    | `api-routes/test-twl/`         | TWL testing                          |
| Advanced Filter           | ❌ Unused       | Root                           | 636-line filtering system (unused)   |
| Request Coalescer         | ❌ Unused       | Root                           | Request coalescing system (unused)   |
| Response Optimizer        | ❌ Unused       | Root                           | Response optimization (unused)       |
| Compression Middleware    | ❌ Unused       | Root                           | Compression middleware (unused)      |
| Cache Warmer (Functions)  | ❌ Deprecated   | Root                           | Cache warming from functions (moved) |
| Resource Aggregator (Alt) | ❌ Unused       | Root                           | Alternative implementation           |
| Cache Warmer              | ❌ Deprecated   | Root                           | Original cache warming system        |
| Automated Ingestion       | 🔬 30% Complete | Root                           | Webhook implementation needed        |

## Contact

Questions about experimental features? Contact the development team.

**Remember: These features are experiments. They might work perfectly, they might not work at all, or they might work in unexpected ways. Use at your own risk!**
