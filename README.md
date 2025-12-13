# Translation Helps MCP Server v7.19.29

A comprehensive MCP (Model Context Protocol) server that provides AI agents with access to Bible translation resources from Door43's Content Service (DCS). This server enables AI assistants to fetch, process, and intelligently work with translation helps including scripture texts, translation notes, translation words, and translation questions.

## What's New in v7.19

### Multi-Agent Orchestration (v7.12+)

The chat system now uses a sophisticated multi-agent architecture:

- **Orchestrator Agent** - Analyzes queries and dispatches specialist agents
- **Scripture Agent** - Fetches Bible text (ULT, UST translations)
- **Notes Agent** - Gets verse-by-verse translation guidance
- **Words Agent** - Fetches biblical term definitions
- **Academy Agent** - Gets translation concept articles
- **Questions Agent** - Gets comprehension questions (v7.19)
- **Search Agent** - Semantic search across all resources

```
User Query → Orchestrator → [Parallel Agent Dispatch] → Synthesis → Response
```

### Cloudflare Workers AI (v7.11)

Migrated from OpenAI GPT-4o-mini to **Cloudflare Workers AI (Llama 4 Scout 17B)**:

- Native tool calling with structured output
- Edge-native inference (no external API calls)
- 80% code reduction in chat endpoint
- Parallel tool execution for multi-tool requests

### QA Citation Validator (v7.18)

Automatic verification of AI response accuracy:

- Re-fetches resources to validate citations
- Inline indicators: verified, uncertain, invalid
- Validation summary in X-Ray panel
- Prevents hallucinated quotes

### Event-Driven Search Indexing (v7.6-v7.8)

Two-queue pipeline for automatic content indexing:

```
ZIP Upload → R2 → Unzip Queue → Index Queue → AI Search
```

- Memory-efficient one-file-at-a-time extraction
- Book-level chunking (470x fewer R2 writes)
- 5-7x faster search (vector-only by default)

## Key Features

### Core Translation Resources

- **Scripture Texts**: Multiple translations (ULT, UST, T4T, UEB) with real-time DCS fetching
- **Translation Notes**: Verse-by-verse explanations from TSV data
- **Translation Words**: Biblical term definitions from markdown files
- **Translation Word Links**: Connections between scripture and word articles
- **Translation Questions**: Comprehension questions from TSV data
- **Translation Academy**: Training modules for translators

### MCP Prompts

Guided workflows that chain multiple tools intelligently:

- **`translation-helps-for-passage`** - Complete translation help (scripture + notes + questions + words + academy)
- **`get-translation-words-for-passage`** - All dictionary entries for a passage
- **`get-translation-academy-for-passage`** - Training articles referenced in notes

See [HOW_TO_USE_PROMPTS.md](./HOW_TO_USE_PROMPTS.md) for usage guide.

### AI-Powered Search

Semantic search across all biblical resources:

```bash
# Search for love in Translation Words
curl "https://translation-helps-mcp.pages.dev/api/search?query=what+does+love+mean&resource=tw"

# Search within John chapter 3
curl "https://translation-helps-mcp.pages.dev/api/search?query=believe&reference=John+3"
```

**Features:**

- Semantic understanding with Cloudflare AI Search
- Multi-filter support (language, organization, resource, reference)
- Rich results with formatted references
- Contextual previews

See [docs/HYBRID_SEARCH_FEATURE.md](./docs/HYBRID_SEARCH_FEATURE.md) for documentation.

### AI Chat Interface

Built-in chat interface at `/chat` with:

- Multi-agent orchestration for complex queries
- Real-time streaming of agent thoughts
- X-Ray panel showing tool calls and timings
- Citation validation with source verification
- Clickable article links in responses

## Architecture

### Multi-Agent Chat System

```
┌─────────────────────────────────────────────────────────────┐
│                    User Query                                │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Orchestrator (Llama 4 Scout 17B)               │
│         Analyzes query, plans agent dispatch                 │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
    ┌────────┬────────┬────────┬────────┬────────┬────────┐
    │Scripture│ Notes │ Words │Academy │Questions│ Search │
    │ Agent  │ Agent │ Agent │ Agent  │ Agent  │ Agent  │
    └────┬───┴───┬───┴───┬───┴───┬────┴───┬────┴───┬────┘
         │       │       │       │        │        │
         └───────┴───────┴───┬───┴────────┴────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│           Synthesis + QA Citation Validation                 │
└─────────────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Streamed Response                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Fetching

```
API Endpoint → createSimpleEndpoint → UnifiedResourceFetcher → ZipResourceFetcher2 → DCS
```

### Caching Strategy

```
DCS API → KV Cache (1hr TTL) → Catalog Metadata
        ↓
     R2 Storage → ZIP Files → Event Notification
        ↓                           ↓
    Cache API               Indexer Worker
        ↓                           ↓
  Extracted Files            AI Search Index
```

## Deployment

### Live Production

- **URL**: `https://translation-helps-mcp.pages.dev/`
- **API Base**: `https://translation-helps-mcp.pages.dev/api/`
- **Chat**: `https://translation-helps-mcp.pages.dev/chat`
- **Health Check**: `https://translation-helps-mcp.pages.dev/api/health`

### Quick Start

```bash
# Fetch scripture
curl "https://translation-helps-mcp.pages.dev/api/fetch-scripture?reference=John%203:16"

# Get translation notes in markdown
curl "https://translation-helps-mcp.pages.dev/api/translation-notes?reference=Genesis%201:1&format=md"

# Search for a term
curl "https://translation-helps-mcp.pages.dev/api/search?query=grace&resource=tw"
```

## Development

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)

### Local Development

```bash
# Install dependencies
npm install
cd ui && npm install

# Start development server
npm run dev

# Or with Wrangler for KV/R2 bindings
cd ui && npx wrangler pages dev .svelte-kit/cloudflare --port 8787

# Run tests
npm test

# Build for production
npm run build
```

### Testing with Wrangler

All tests MUST use Wrangler for KV/R2 functionality:

```bash
# Start Wrangler (REQUIRED for tests)
cd ui && npx wrangler pages dev .svelte-kit/cloudflare --port 8787

# In another terminal, run tests
npm test
```

## API Documentation

### Scripture Endpoints

```bash
# Fetch multiple translations
GET /api/fetch-scripture?reference=John%203:16&resource=ult,ust

# Response format options
GET /api/fetch-scripture?reference=John%203:16&format=md
```

### Translation Helps

```bash
# Translation notes
GET /api/translation-notes?reference=John%203:16

# Translation questions
GET /api/translation-questions?reference=John%203:16

# Translation words
GET /api/fetch-translation-words?reference=John%203:16

# Translation word links
GET /api/fetch-translation-word-links?reference=John%203:16

# Translation academy
GET /api/fetch-translation-academy?moduleId=figs-metaphor
```

### Discovery Endpoints

```bash
# Available languages
GET /api/simple-languages

# Available books
GET /api/get-available-books?language=en

# Resource catalog
GET /api/resource-catalog?language=en&subject=Bible
```

See [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md) for complete documentation.

## Documentation

- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md) - Setup and deployment
- [Architecture](docs/ARCHITECTURE.md) - System design
- [Multi-Agent Orchestration](docs/MULTI_AGENT_ORCHESTRATION.md) - Chat architecture
- [Event-Driven Indexing](docs/EVENT_DRIVEN_INDEXING.md) - Search pipeline
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Use Wrangler for all testing
4. Ensure all tests pass
5. Submit a pull request

**Standards:**

- KISS: Keep It Simple
- DRY: Don't Repeat Yourself
- Consistent: Same patterns everywhere
- Antifragile: Fail fast with real errors

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built with care for Bible translators worldwide
