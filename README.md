# Translation Helps MCP Server v6.6.3

**🚨 MAJOR UPDATE: 100% Real Data - Zero Mock Fallbacks**

A comprehensive MCP (Model Context Protocol) server that provides AI agents with access to Bible translation resources from Door43's Content Service (DCS). This server enables AI assistants to fetch, process, and intelligently work with translation helps including scripture texts, translation notes, translation words, and translation questions.

## 🎉 What's New in v6.6.3

### Complete Architecture Overhaul

- **✅ 100% Real Data** - All mock data removed, every endpoint fetches from DCS
- **✅ Unified Architecture** - Single `UnifiedResourceFetcher` class handles all data
- **✅ Markdown Support Everywhere** - All endpoints support `format=md` for LLMs
- **✅ Wrangler-Only Testing** - Standardized on port 8787 with real KV/R2 bindings
- **✅ No Mock Fallbacks** - Real errors instead of fake success

### Breaking Changes

**Removed Endpoints:**

- `/api/fetch-ult-scripture` → Use `fetch-scripture?resource=ult`
- `/api/fetch-ust-scripture` → Use `fetch-scripture?resource=ust`
- `/api/fetch-resources` → Use specific endpoints
- `/api/resource-recommendations` → Removed completely
- `/api/language-coverage` → Removed completely
- `/api/get-words-for-reference` → Use `fetch-translation-words`

See [MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) for detailed migration instructions.

## 🚀 Key Features

### Core Translation Resources

- **Scripture Texts**: Multiple translations (ULT, UST, T4T, UEB) with real-time DCS fetching
- **Translation Notes**: Verse-by-verse explanations from TSV data
- **Translation Words**: Biblical term definitions from markdown files
- **Translation Word Links**: Connections between scripture and word articles
- **Translation Questions**: Comprehension questions from TSV data
- **Translation Academy**: Training modules for translators

### Technical Excellence

- **Real Data Only**: No mock data, no fake responses, no fallbacks
- **Unified Fetcher**: Single class (`UnifiedResourceFetcher`) for all resources
- **Smart Caching**: KV for catalogs, R2 for ZIPs, Cache API for extracted files
- **Format Support**: JSON, Markdown, Text, and TSV (where applicable)
- **Cloudflare Pages**: Global edge deployment with sub-100ms response times

## 🌟 Deployment

### Live Production

- **API Base**: `https://api.translation.helps/api/`
- **Documentation**: `https://api.translation.helps/`
- **Health Check**: `https://api.translation.helps/api/health`

### Quick Start

```bash
# Fetch scripture
curl "https://api.translation.helps/api/fetch-scripture?reference=John%203:16"

# Get translation notes in markdown (for LLMs)
curl "https://api.translation.helps/api/translation-notes?reference=Genesis%201:1&format=md"

# Fetch translation word links
curl "https://api.translation.helps/api/fetch-translation-word-links?reference=Titus%201:1"

# Browse translation academy modules
curl "https://api.translation.helps/api/browse-translation-academy?language=en"
```

## 🛠️ Architecture

### Unified Data Fetching

All endpoints use the same architecture:

```
API Endpoint → createSimpleEndpoint → UnifiedResourceFetcher → ZipResourceFetcher2 → DCS
```

**Key Components:**

1. **UnifiedResourceFetcher** - Single interface for all resource types
2. **ZipResourceFetcher2** - Handles ZIP archives with intelligent caching
3. **createSimpleEndpoint** - Standardized endpoint creation pattern
4. **Real Error Handling** - No mock fallbacks, actual error messages

### Caching Strategy

```
DCS API → KV Cache (1hr TTL) → Catalog Metadata
        ↓
     R2 Storage → ZIP Files
        ↓
    Cache API → Extracted Files
```

## 🚨 Production Setup

**⚠️ CRITICAL: R2 bucket must be populated with ZIP files for production to work!**

See [R2 Setup Guide](docs/R2_SETUP_GUIDE.md) for instructions on populating the R2 bucket.

## 🧪 Testing with Wrangler

**⚠️ IMPORTANT: All tests MUST use Wrangler for KV/R2 functionality**

### Setup

```bash
# Start Wrangler (REQUIRED for tests)
cd ui && npx wrangler pages dev .svelte-kit/cloudflare --port 8787

# In another terminal, run tests
npm test
```

### Test Configuration

- **Port**: Always 8787 (enforced by test setup)
- **Bindings**: Real KV and R2 bindings
- **No Mocks**: Tests use real Cloudflare services

See [tests/TESTING_REQUIREMENTS.md](tests/TESTING_REQUIREMENTS.md) for details.

## 📚 API Documentation

### Scripture Endpoints

```bash
# Fetch multiple translations
GET /api/fetch-scripture?reference=John%203:16&resource=ult,ust

# Response format options
GET /api/fetch-scripture?reference=John%203:16&format=md    # Markdown
GET /api/fetch-scripture?reference=John%203:16&format=text  # Plain text
```

### Translation Helps

```bash
# Translation notes (from TSV)
GET /api/translation-notes?reference=John%203:16

# Translation questions (from TSV)
GET /api/translation-questions?reference=John%203:16

# Translation words (from markdown)
GET /api/fetch-translation-words?reference=John%203:16

# Translation word links (from TSV) - NEW!
GET /api/fetch-translation-word-links?reference=John%203:16

# Translation academy modules
GET /api/fetch-translation-academy?moduleId=figs-metaphor

# Browse academy modules
GET /api/browse-translation-academy?language=en&category=translate
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

See [API_ENDPOINTS.md](docs/API_ENDPOINTS.md) for complete documentation.

## 🔧 Development

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)

### Local Development

```bash
# Install dependencies
npm install
cd ui && npm install

# Start Wrangler dev server (REQUIRED)
cd ui && npx wrangler pages dev .svelte-kit/cloudflare --port 8787

# Run tests
npm test

# Build for production
npm run build
```

### Development Standards

- **KISS**: Keep It Simple - no over-engineering
- **DRY**: Don't Repeat Yourself - single source of truth
- **Consistent**: Same patterns everywhere
- **Antifragile**: Fail fast with real errors, no hiding issues

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. **Use Wrangler for all testing** (no exceptions!)
4. Ensure all tests pass
5. Submit a pull request

**Remember**:

- No mock data
- All endpoints must support markdown format
- Use `UnifiedResourceFetcher` for new features
- Test with real KV/R2 bindings

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built with ❤️ for Bible translators worldwide
