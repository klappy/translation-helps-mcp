# Translation Helps MCP - Complete Implementation Guide

This guide covers everything from setup to advanced integration of the Translation Helps MCP server. **This is the "how to implement" guide** - for understanding what the translation resources are and how they work conceptually, see the [UW Translation Resources Guide](UW_TRANSLATION_RESOURCES_GUIDE.md).

## 📖 **Documentation Structure**

- **[UW Translation Resources Guide](UW_TRANSLATION_RESOURCES_GUIDE.md)** - Understanding **what** the resources are, their relationships, and translation philosophy
- **This Implementation Guide** - Learning **how** to implement, deploy, and use the MCP server effectively
- **[Best Practices](#-best-practices--lessons-learned)** - Critical lessons learned from real-world implementation

## 🚀 **Quick Start (5 Minutes)**

Get the Translation Helps MCP Server running locally and integrated with your AI assistant.

### Prerequisites

- **Node.js 18+** and npm
- **Git** for cloning the repository
- **AI Assistant** that supports MCP (Claude, Cursor, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/klappy/translation-helps-mcp.git
cd translation-helps-mcp

# Install dependencies
npm install

# Install UI dependencies
cd ui && npm install && cd ..

# Start the development server
npm run dev
```

### Verify Installation

```bash
# Test the health endpoint
curl http://localhost:5173/api/health

# Test a scripture fetch
curl "http://localhost:5173/api/fetch-scripture?reference=John%203:16&language=en&organization=unfoldingWord"
```

### MCP Integration

**For Cursor/Claude Desktop:**

Add to your MCP configuration file (`.cursor/mcp.json` or similar):

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "node",
      "args": ["path/to/translation-helps-mcp/src/index.js"]
    }
  }
}
```

**For HTTP MCP (Serverless):**

Use the production endpoint directly:

```json
{
  "mcpServers": {
    "translation-helps": {
      "type": "http",
      "url": "https://translation-helps-mcp.pages.dev/api/mcp"
    }
  }
}
```

## 📚 **Core Features & Usage**

### Available Tools

1. **fetchScripture** - Get Bible text in any language
2. **fetchTranslationNotes** - Get verse-specific translation notes
3. **fetchTranslationQuestions** - Get comprehension questions
4. **getTranslationWord** - Get word definitions and explanations
5. **fetchResources** - Get all resources for a verse (comprehensive)
6. **getLanguages** - List available languages and organizations
7. **getContext** - Get contextual information for passages

### Example Usage

**Fetch Scripture:**

```javascript
// Via API
curl "http://localhost:5173/api/fetch-scripture?reference=Genesis%201:1&language=en&organization=unfoldingWord"

// Via MCP
{
  "tool": "fetchScripture",
  "arguments": {
    "reference": "Genesis 1:1",
    "language": "en",
    "organization": "unfoldingWord"
  }
}
```

**Get All Resources:**

```javascript
// Gets scripture, notes, questions, and word definitions
{
  "tool": "fetchResources",
  "arguments": {
    "reference": "John 3:16",
    "language": "en",
    "organization": "unfoldingWord"
  }
}
```

### Supported Organizations

- **unfoldingWord** - English, Spanish, and many other languages
- **Wycliffe** - Various language projects
- **Other organizations** - Check via `getLanguages` tool

## 🏗️ **Architecture Overview**

### Modern Stack

- **SvelteKit** - Full-stack web framework
- **TypeScript** - Type-safe development
- **Platform-Agnostic Functions** - Works on Cloudflare Workers, Netlify, and locally
- **HTTP MCP** - Stateless MCP over HTTP (revolutionary!)

### Project Structure

```
translation-helps-mcp/
├── src/                              # Core MCP server and functions
│   ├── index.ts                      # MCP server entry point
│   ├── functions/                    # Platform-agnostic business logic
│   │   ├── platform-adapter.ts      # Platform abstraction
│   │   ├── handlers/                 # API endpoint handlers
│   │   └── services/                 # Business logic services
│   └── tools/                        # MCP tool definitions
├── ui/                               # SvelteKit web application
│   ├── src/routes/api/              # API endpoints (SvelteKit format)
│   └── src/lib/                     # Shared UI components
├── tests/                           # Test suites
└── docs/                           # Documentation
```

### Key Design Principles

1. **Platform Agnostic** - Same code runs everywhere
2. **Performance First** - Aggressive caching, minimal bundle size
3. **Type Safety** - Full TypeScript coverage
4. **Error Resilience** - Graceful fallbacks for missing resources
5. **Standards Compliant** - Follows MCP specification exactly

## 🔧 **Development Setup**

### Local Development

```bash
# Start development server with hot reload
npm run dev

# Run in different modes
npm run dev                    # SvelteKit dev server (port 5173)
npm run build && npm start     # Production build preview
npm run mcp:dev               # MCP server only (for debugging)
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:smoke             # Quick smoke tests
npm run test:regression        # Full regression suite
npm run test:endpoints         # API endpoint tests
```

### Environment Setup

**No environment variables required!** All APIs are public.

**Optional Configuration:**

- Set `NODE_ENV=development` for verbose logging
- Configure custom ports via standard Node.js environment variables

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

## 🎯 **Integration Patterns**

### MCP Tool Usage

**Basic Pattern:**

```javascript
// Always provide required parameters
const result = await callTool("fetchScripture", {
  reference: "John 3:16", // Required: Bible reference
  language: "en", // Required: Language code
  organization: "unfoldingWord", // Required: Organization
});
```

**Error Handling:**

```javascript
try {
  const result = await callTool("fetchResources", params);
  // Handle successful response
} catch (error) {
  // Handle API errors, missing resources, etc.
  console.warn("Resource not available:", error.message);
}
```

**Batch Operations:**

```javascript
// Get multiple resources efficiently
const [scripture, notes, questions] = await Promise.all([
  callTool("fetchScripture", params),
  callTool("fetchTranslationNotes", params),
  callTool("fetchTranslationQuestions", params),
]);
```

### API Integration

**Direct HTTP Usage:**

```javascript
// RESTful API endpoints available at /api/*
const response = await fetch(
  "/api/fetch-resources?" +
    new URLSearchParams({
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
    }),
);

const data = await response.json();
```

**Caching Strategy:**

```javascript
// Responses are automatically cached for 5 minutes
// No need to implement your own caching layer
// Cache keys based on: endpoint + parameters
```

## 🧪 **Testing & Validation**

### Manual Testing

**Web Interface:**

- Visit `http://localhost:5173` for interactive testing
- Use the built-in API tester at `/test`
- Check performance at `/performance`

**Command Line:**

```bash
# Test core endpoints
curl http://localhost:5173/api/health
curl "http://localhost:5173/api/get-languages?organization=unfoldingWord"
curl "http://localhost:5173/api/fetch-scripture?reference=Genesis%201:1&language=en&organization=unfoldingWord"
```

### Automated Testing

**Continuous Integration:**

```bash
# Full test suite (runs on CI)
npm run test:ci

# Performance benchmarks
npm run test:performance

# Load testing
npm run test:load
```

**Test Coverage:**

- API endpoint functionality
- MCP tool compliance
- Error handling and edge cases
- Performance regression detection
- Cross-platform compatibility

## 📊 **Performance Guidelines**

### Response Time Targets

- **Languages**: < 1 second
- **Scripture**: < 2 seconds
- **Translation Resources**: < 2 seconds
- **Cached Responses**: < 100ms

### Optimization Features

1. **Intelligent Caching** - 5-minute TTL for translation resources
2. **Request Deduplication** - Prevents duplicate API calls
3. **Parallel Loading** - Multiple resources loaded simultaneously
4. **Graceful Degradation** - Missing resources don't break responses
5. **Edge Deployment** - Cloudflare Workers for global performance

### Monitoring

```javascript
// Built-in performance metrics
const metrics = await fetch("/api/health");
// Returns: response times, cache hit rates, error counts
```

## 🚨 **Troubleshooting**

### Common Issues

**1. "No translation resources found"**

- Check organization name (case-sensitive)
- Verify language code format (lowercase)
- Some books may not exist in all languages

**2. Slow initial responses**

- First request to any resource requires API calls
- Subsequent requests use cache (much faster)
- Cold starts on serverless platforms add ~1-2s

**3. CORS errors in browser**

- All endpoints include proper CORS headers
- Check for proxy/firewall interference
- Verify you're using correct protocol (http/https)

**4. MCP connection issues**

- Verify MCP server path in configuration
- Check Node.js version compatibility (18+)
- Look for import/export errors in console

### Debug Mode

```bash
# Enable verbose logging
NODE_ENV=development npm run dev

# MCP server debug mode
npm run mcp:debug

# Check server logs
tail -f logs/translation-helps-mcp.log
```

### Performance Issues

```bash
# Profile API performance
npm run profile

# Test with different load levels
npm run test:load -- --users 50 --duration 60s

# Check cache hit rates
curl http://localhost:5173/api/health | jq .cache
```

## 🔗 **Related Documentation**

- **[Translation Helps Complete Guide](TRANSLATION_HELPS_COMPLETE_GUIDE.md)** - Technical patterns and implementation wisdom
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[Archive](ARCHIVE.md)** - Historical context and deprecated features

## 📖 **Translation Words Lookup**

### Two Lookup Modes

**1. Word Lookup by Term:**

```bash
curl "http://localhost:5173/api/get-translation-word?word=grace&language=en&organization=unfoldingWord"
```

**2. Reference-based Lookup:**

```bash
curl "http://localhost:5173/api/fetch-translation-words?reference=John%203:16&language=en"
```

### Example Response

```json
{
  "translationWords": [
    {
      "term": "grace",
      "title": "grace, gracious",
      "content": "The meaning of the Greek word translated as 'grace'...",
      "definition": "Favor or kindness shown to someone who does not deserve it..."
    }
  ],
  "citation": {
    "resource": "en_tw",
    "organization": "unfoldingWord",
    "language": "en"
  }
}
```

### Use Cases

- **Comparative Study** - Compare word meanings across different contexts
- **Terminology Research** - Deep dive into biblical term definitions
- **Contextual Understanding** - See what words are important in specific verses

---

## 🧠 **Best Practices & Lessons Learned**

### Critical Implementation Principles

#### 1. **INGREDIENTS ARRAY IS SACRED**

The #1 discovery that took weeks to figure out:

```javascript
// ❌ NEVER - Files have unpredictable names
const filePath = `tn_${bookId}.tsv`; // WRONG! Could be 01-GEN.tsv

// ✅ ALWAYS - Trust the ingredients
const ingredient = resourceData.ingredients.find(
  (ing) => ing.identifier === bookId,
);
const filePath = ingredient?.path || fallbackPath;
```

#### 2. **SIMPLE SCALES, COMPLEX FAILS**

Evolution from complex to simple:

- Started with 246+ lines of manifest code → Deleted it all
- Complex Proskomma implementation → Simple USFM extraction
- Multi-file caching → Direct API calls
- Result: 90% performance improvement

#### 3. **NO MANIFESTS - EVER**

```javascript
// ❌ NEVER use manifests
await fetchManifest(); // 3-9 second waste

// ✅ ALWAYS use catalog API
const resources = await catalogAPI.search({
  metadataType: "rc",
  subject: "Bible",
  lang: languageId,
});
```

#### 4. **VERSE-LOADING PATTERN**

```javascript
// ❌ DON'T load entire book (420KB)
const bookContent = await fetchBook(bookId);

// ✅ DO load current verse only (10KB)
const verseContent = await fetchVerse(bookId, chapter, verse);
```

### Resource-Specific Implementation Patterns

#### Translation Notes (TN)

```javascript
// File format: Always TSV with specific columns
const parseTN = (tsvContent) => {
  return parseTSV(tsvContent, {
    columns: [
      "Reference",
      "ID",
      "Tags",
      "SupportReference",
      "Quote",
      "Occurrence",
      "Note",
    ],
  });
};

// Filter by verse
const notes = allNotes.filter(
  (note) => note.Reference === `${chapter}:${verse}`,
);
```

#### Translation Questions (TQ)

```javascript
// File format: TSV with Reference, ID, Tags, Quote, Occurrence, Question, Response
const parseTQ = (tsvContent) => {
  return parseTSV(tsvContent, {
    columns: [
      "Reference",
      "ID",
      "Tags",
      "Quote",
      "Occurrence",
      "Question",
      "Response",
    ],
  });
};
```

#### Translation Words (TW)

```javascript
// ❌ NEVER hardcode article paths
const articlePath = `bible/kt/${word}.md`;

// ✅ ALWAYS parse from rc:// links
const rcLink = "rc://en/tw/dict/bible/kt/faith";
const article = await fetchTWArticle(rcLink);
```

#### Translation Word Links (TWL) - The Bridge

```javascript
// TWL provides rc:// links for words in verses
const links = twlData.filter(
  (link) => link.Reference === `${chapter}:${verse}`,
);
// Each link has: Reference, TWLink (rc:// URI)
// TWL is the BRIDGE between verses and tW articles
```

### USFM Text Extraction - Unified Approach

```javascript
// ❌ NEVER - Browser-specific extraction
element.innerText; // Unreliable CSS hiding
getComputedStyle(); // Environment inconsistent

// ✅ ALWAYS - Unified server-side extraction
import { extractVerseText, extractChapterText } from "./usfmTextExtractor";

// Works identically in browser, server, and tests
const verseText = extractVerseText(usfmContent, chapter, verse);
const chapterText = extractChapterText(usfmContent, chapter);

// CRITICAL: Always validate
if (!validateCleanText(verseText)) {
  throw new Error("USFM contamination detected!");
}
```

### Caching Strategy

```javascript
// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};
```

### Translation Academy (tA) - Table of Contents

```javascript
// tA has hierarchical ToC structure
const tocStructure = {
  translate: {
    title: "Translation Manual",
    articles: ["translate-names", "figs-metaphor", "translate-unknown"],
  },
  checking: {
    title: "Checking Manual",
    articles: ["intro-check", "goal-checking"],
  },
};
```

### Performance Targets & Monitoring

- **Languages endpoint**: < 1 second
- **Resource fetching**: < 2 seconds for typical queries
- **Cache hit ratio**: 85%+ for optimal performance
- **95th percentile**: < 420ms

### Critical Warnings - Things That Will Break Everything

1. **Using manifests** - Adds 3-9 seconds of latency
2. **Hardcoding file paths** - Files have unpredictable names
3. **Loading entire books** - 420KB vs 10KB for single verse
4. **Browser-specific code** - Breaks in tests and server
5. **Ignoring ingredients array** - The source of truth
6. **Missing error boundaries** - Graceful degradation required

### Common Pitfalls

1. **Forgetting to encode URLs**: Always use `encodeURIComponent()`
2. **Not handling 404s**: Resources might not exist for all books
3. **Assuming file patterns**: Always check ingredients array
4. **Sequential loading**: Use Promise.all() for parallel fetching
5. **Complex lifecycles**: Use simple verse-loading pattern

### Implementation Checklist

When implementing any feature:

- [ ] Check ingredients array for file paths
- [ ] Use catalog API, not manifests
- [ ] Load only needed data (verse, not book)
- [ ] Handle cross-organization resources
- [ ] Implement proper caching
- [ ] Add error handling with fallbacks
- [ ] Test in all environments
- [ ] Validate output (no USFM contamination)
- [ ] Load resources in parallel
- [ ] Meet performance targets (< 1s languages, < 2s resources)
- [ ] Handle API quirks (422 errors, case sensitivity)
- [ ] Test with real organizations and error conditions

### Key Lessons

1. **Simple always wins** - Complex solutions were deleted for 90% performance gains
2. **Trust the API** - Catalog API has everything you need
3. **Cache aggressively** - Major performance improvement possible
4. **Fail gracefully** - Always have fallbacks
5. **Test everything** - Especially environment consistency
6. **Document discoveries** - Save weeks of debugging for others
7. **Performance matters** - Specific targets must be met
8. **API quirks exist** - Know the edge cases

**Remember**: Every pattern here was discovered through weeks of debugging. Don't repeat history - follow these patterns exactly!

---

## 📦 **Core Endpoint Data Shapes & Flags**

This section defines **exactly** what each core endpoint returns **by default** and which _optional flags_ can be supplied for light filtering or alternative formats.  
_Think of these as guard-rails: keeping raw data raw, so tests always know what to expect._

### 1. Scripture (`/fetch-scripture`)

| Default            | Value                                   |
| ------------------ | --------------------------------------- |
| `format`           | `text` (plain text, one verse per line) |
| `includeAlignment` | `false`                                 |
| `includeUsfm`      | `false`                                 |
| `language`         | Strategic Language requested            |
| `version`          | Resource ID (e.g. `ult`, `ust`)         |

**Optional Flags**

- `format=usfm` → return raw USFM for advanced processing
- `includeAlignment=true` → embed USFM-3 alignment blocks (experimental)

### 2. Translation Notes (`/fetch-translation-notes`)

| Field              | Preserved?             |
| ------------------ | ---------------------- |
| `Reference`        | ✅                     |
| `ID`               | ✅                     |
| `Tags`             | ✅                     |
| `SupportReference` | ✅                     |
| `Quote`            | ✅ (original language) |
| `Occurrence`       | ✅                     |
| `Note`             | ✅                     |

**Formats**  
`json` (default – _structured and readable_), `tsv` (optional – _matches Door43 content 100%_).

**Example JSON Response:**

```json
{
  "translationNotes": [
    {
      "Reference": "1:1",
      "ID": "abc1",
      "Tags": "grammar",
      "SupportReference": "rc://en/ta/man/translate/figs-metaphor",
      "Quote": "δοῦλος",
      "Occurrence": "1",
      "Note": "The Greek word **δοῦλος** means 'slave' rather than 'servant'..."
    }
  ],
  "citation": {
    "resource": "en_tn",
    "organization": "unfoldingWord",
    "language": "en"
  }
}
```

**Future Experimental Flags (not core)**

- `translateQuotes=true` → Translate `Quote` field to target language using alignment data or LLM (queued for lab environment).

### 3. Translation Words Links (`/fetch-translation-word-links`)

Returns structured **TWL data** with `tsv` option for raw format:

**Example JSON Response:**

```json
{
  "translationWordLinks": [
    {
      "Reference": "1:3",
      "ID": "xyz9",
      "Tags": "kt",
      "OrigWords": "אֱלֹהִים",
      "Occurrence": "1",
      "TWLink": "rc://en/tw/dict/bible/kt/god"
    }
  ],
  "citation": {
    "resource": "en_twl",
    "organization": "unfoldingWord",
    "language": "en"
  }
}
```

**Optional Flags**

- `format=tsv` → return raw TSV format matching Door43 content exactly

### 4. Translation Words (`/get-translation-word` or `/fetch-translation-words`)

Returns **Markdown payload** of the article plus metadata:

```json
{
  "term": "grace",
  "title": "grace, gracious",
  "content": "# grace\n\n## Word Data:\n\n- Strongs: G5485\n- Part of speech: Noun\n\n## Facts:\n\nThe meaning of the Greek word translated as 'grace'...",
  "definition": "Favor or kindness shown to someone who does not deserve it",
  "citation": {
    "resource": "en_tw",
    "organization": "unfoldingWord",
    "language": "en"
  }
}
```

- Titles, subtitles, numbered sections (`01`, `02`, …) are kept exactly as in source `.md` file.

### 5. Translation Academy (`/fetch-translation-academy`)

**Example JSON Response:**

```json
{
  "translationAcademy": [
    {
      "title": "Translate Unknowns",
      "content": "# Translate Unknowns\n\nWhen you are translating...",
      "rcLink": "rc://en/ta/man/translate/translate-unknown"
    }
  ],
  "toc": {
    "translate": {
      "title": "Translation Manual",
      "articles": ["translate-names", "figs-metaphor", "translate-unknown"]
    },
    "checking": {
      "title": "Checking Manual",
      "articles": ["intro-check", "goal-checking"]
    }
  },
  "citation": {
    "resource": "en_ta",
    "organization": "unfoldingWord",
    "language": "en"
  }
}
```

- Returns Markdown payload for each requested article
- Includes **hierarchical ToC** metadata when `includeToc=true` (default `false`).

### 6. Translation Questions (`/fetch-translation-questions`)

**Example JSON Response:**

```json
{
  "translationQuestions": [
    {
      "Reference": "1:1",
      "ID": "def2",
      "Tags": "general",
      "Quote": "Paul",
      "Occurrence": "1",
      "Question": "What does Paul call himself?",
      "Response": "Paul calls himself a servant of Christ Jesus."
    }
  ],
  "citation": {
    "resource": "en_tq",
    "organization": "unfoldingWord",
    "language": "en"
  }
}
```

- Default returns structured JSON
- `format=tsv` flag returns raw TSV rows matching Door43 content exactly

---

### 🚦 Guiding Principles

1. **JSON by Default** – Structured, readable responses that work great for LLMs and UIs.
2. **TSV When Needed** – Use `format=tsv` flag to get exact Door43 content for byte-perfect testing.
3. **Flag-Driven Enhancements** – Any filtering/parsing is _opt-in_ via flags.
4. **Predictable Testing** – TSV format mirrors upstream content byte-for-byte, JSON converts structure without changing data.
5. **Extended Endpoints Live Elsewhere** – Resource aggregation, auto-linking, and LLM-assisted helpers will be implemented as **lab/experimental** endpoints layered on top of these core proxies.

_If you need clever cross-resource lookups, reach for the experimental lab – not the core proxies!_

---

## 🔄 **Version Management**

### Single Source of Truth Approach

**Problem Solved:** Version numbers were scattered across 14+ files, causing drift and inconsistency.

**Solution:** Root `package.json` is now the ONLY place to update versions.

```json
{
  "name": "translation-helps-mcp",
  "version": "4.4.1", // ← SINGLE SOURCE OF TRUTH
  "description": "MCP Server for aggregating Bible translation resources"
}
```

### How It Works

All system components dynamically read the version:

```typescript
// MCP Server, HTTP Bridge, Health Endpoint all use:
function getVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  } catch (error) {
    return "4.4.1"; // Fallback only
  }
}
```

### Version Sync Script

Keep UI `package.json` in sync:

```bash
npm run sync-version
```

### Simple Release Process

**New Way (One Step):**

1. Update root `package.json` version ✅
2. Run `npm run sync-version` ✅
3. All components automatically get new version ✅

**Benefits:**

- ✅ Zero version drift
- ✅ Consistent version reporting
- ✅ Single update point
- ✅ Automated synchronization

---

## 🎓 **Next Steps**

### For Developers

1. **Explore the API** - Use the web interface to understand capabilities
2. **Read the patterns** - Check [Best Practices & Lessons Learned](#-best-practices--lessons-learned) section for implementation wisdom
3. **Contribute** - Submit PRs for improvements and new features

### For Users

1. **Configure MCP** - Add to your AI assistant configuration
2. **Try examples** - Test with different languages and organizations
3. **Integrate** - Use in your Bible study and translation workflows

### For Deployers

1. **Deploy to production** - Follow the Deployment Guide
2. **Monitor performance** - Set up alerts for response times
3. **Scale up** - Consider Cloudflare KV for high-traffic scenarios

---

**🎯 Success Metrics:** You'll know everything is working when you can fetch John 3:16 in multiple languages with sub-2s response times and explore translation notes that enhance your understanding!
