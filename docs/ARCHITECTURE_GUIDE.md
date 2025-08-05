# Translation Helps MCP - Architecture Guide

## Three-Tier Architecture Overview

The Translation Helps MCP follows a **three-tier architecture** that clearly separates functionality by complexity and purpose:

### 🔧 **Tier 1: CORE - DCS Proxies**

_Simple, fast, reliable proxies to Door43 Content Service_

**Purpose:** Provide clean, formatted access to DCS data with minimal processing
**Location:** `/api/*` endpoints
**Response Time:** <100ms (with caching)
**Reliability:** 99.9% uptime expected

**Characteristics:**

- Direct 1:1 mapping to DCS resources
- JSON formatting with optional TSV for exact DCS content
- Comprehensive caching and performance optimization
- No cross-resource bridging or business logic
- Minimal transformation - just formatting and error handling

**Core Endpoints:**

- `fetch-scripture` - Scripture text (ULT, UST, T4T, UEB)
- `fetch-translation-notes` - Verse-by-verse translation notes
- `fetch-translation-questions` - Comprehension questions
- `fetch-translation-academy` - Translation Academy articles
- `get-translation-word` - Individual word definitions
- `fetch-translation-word-links` - Verse-to-word mappings
- `get-languages` - Available languages catalog
- `get-available-books` - Available books per language
- `list-available-resources` - Complete resource catalog

### 🚀 **Tier 2: EXTENDED - Value-Added Bridging**

_Production-ready features that intelligently combine multiple DCS resources_

**Purpose:** Save developers from multiple API calls by providing smart aggregation
**Location:** `/api/*` endpoints  
**Response Time:** <500ms
**Reliability:** 99.5% uptime expected

**Characteristics:**

- Combines 2-10 DCS API calls into single intelligent response
- Adds business logic and domain expertise
- Production-ready with comprehensive testing
- Performance monitoring and caching
- Smart recommendations and resource suggestions

**Extended Endpoints:**

- `resource-recommendations` - AI-powered suggestions for optimal resource usage
- `fetch-resources` - Aggregated multi-resource data for passages
- `resource-catalog` - Enhanced catalog with metadata and usage analytics

### 🧪 **Tier 3: EXPERIMENTAL - LLM-Powered Innovation**

_Advanced features using AI/LLM for complex reasoning and intelligent responses_

**Purpose:** Experimental features that push the boundaries of what's possible
**Location:** `src/experimental/` directory
**Response Time:** Variable (500ms - 30s)
**Reliability:** Best effort, no guarantees

**Characteristics:**

- Uses external LLM APIs (OpenAI, Claude, Perplexity)
- Heavy computational requirements
- Variable response times depending on LLM complexity
- Mock implementations for cost control during development
- Advanced reasoning and natural language processing

**Experimental Features:**

- AI-powered content summarization and quality assessment
- Interactive chat interfaces with Bible context
- Advanced MCP protocol extensions
- Dynamic tool generation and adaptive responses
- Debug and development tools

## Architecture Benefits

### For Developers

- **Core**: Simple, predictable APIs that mirror DCS structure
- **Extended**: Powerful aggregation without complexity of multiple calls
- **Experimental**: Access to cutting-edge AI features as they mature

### For Performance

- **Core**: Extremely fast (<100ms) with aggressive caching
- **Extended**: Fast enough for interactive use (<500ms) with smart caching
- **Experimental**: Variable performance optimized for capability over speed

### For Reliability

- **Core**: Production-critical with 99.9% uptime expectations
- **Extended**: Production-ready with comprehensive monitoring
- **Experimental**: Best effort with rapid iteration and improvement

## Technology Stack by Tier

### Core Technology

- **Platform**: Cloudflare Workers (edge computing)
- **Caching**: Multi-layer unified cache with performance monitoring
- **Data Format**: JSON (default) with TSV option for exact DCS compatibility
- **Performance**: X-ray tracing and comprehensive metrics

### Extended Technology

- **Aggregation**: Smart resource combining with dependency management
- **Logic**: Business rules for optimal resource recommendations
- **Monitoring**: Performance tracking and bottleneck detection
- **Testing**: Comprehensive unit and integration test coverage

### Experimental Technology

- **LLM Integration**: OpenAI GPT, Anthropic Claude, Perplexity API
- **Streaming**: Real-time response streaming for chat interfaces
- **Context**: Advanced Bible passage context and cross-referencing
- **Research**: Live web search for current information beyond training data

## Migration Paths

### Experimental → Extended

1. Replace LLM calls with efficient algorithmic solutions
2. Achieve consistent <500ms response times
3. Add comprehensive error handling and testing
4. Prove 30+ days of production stability

### Extended → Core

Generally not applicable - Extended features remain Extended unless they become simple DCS proxies.

### Direct Experimental → Core

Rare, only when experimental feature becomes a simple DCS proxy with no bridging logic.

---

_This architecture ensures clear separation of concerns while providing a natural evolution path for features to mature from experimental concepts to production-ready core functionality._
