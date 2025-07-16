# Translation Helps MCP Server Architecture

## 🎯 Executive Summary

This document outlines the architecture for a Model Context Protocol (MCP) server that provides Bible translation resources to AI assistants. The server exposes translation helps (Scripture, Notes, Questions, Words, Links) through standardized MCP tools, enabling any MCP-compatible AI assistant to access comprehensive Bible translation resources without requiring a specific UI or chat interface.

### Key Advantages of MCP Approach

- **Universal Integration**: Works with any MCP-compatible AI (Claude, Cursor, etc.)
- **Stateless Design**: Each tool call is independent and self-contained
- **Rich Context**: Provides complete translation resources for any BCV reference
- **Developer Friendly**: Simple tool interface for complex functionality
- **Extensible**: Easy to add new resource types or capabilities

### Core Innovation

The MCP server packages all available translation resources for a specific Bible reference into structured data that AI assistants can use to provide intelligent, resource-backed responses about Bible translation.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [MCP Architecture](#mcp-architecture)
3. [Tool Definitions](#tool-definitions)
4. [Core Components](#core-components)
5. [Resource Types](#resource-types)
6. [Implementation Details](#implementation-details)
7. [Context Building Strategy](#context-building-strategy)
8. [Performance Optimization](#performance-optimization)
9. [Error Handling](#error-handling)
10. [Deployment](#deployment)
11. [Usage Examples](#usage-examples)
12. [Future Enhancements](#future-enhancements)

---

## 🏗️ System Overview

### Problem Statement

Bible translators and students need AI assistants that can access comprehensive translation resources. Current AI models lack specific knowledge about Bible translation resources and cannot access real-time data from translation repositories.

### Solution: MCP Server

Transform the translation-helps functionality into an MCP server that:

1. Exposes Bible translation resources through standardized tools
2. Handles all API integration with Door43 Content Service (DCS)
3. Provides clean, structured data optimized for AI consumption
4. Manages caching and performance optimization transparently

### Architecture Benefits

- **Separation of Concerns**: AI logic separate from resource fetching
- **Reusability**: One server serves multiple AI assistants
- **Maintainability**: Updates to resource fetching don't affect AI implementations
- **Performance**: Centralized caching and optimization

---

## 🏛️ MCP Architecture

### High-Level Design

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                     │     │                  │     │                 │
│   AI Assistant      │────▶│   MCP Client     │────▶│   MCP Server    │
│ (Claude, ChatGPT)   │     │                  │     │                 │
└─────────────────────┘     └──────────────────┘     └────────┬────────┘
                                                               │
                            ┌──────────────────────────────────┴──────┐
                            │              MCP Tools                   │
                            │  ┌────────────┐  ┌─────────────────┐   │
                            │  │   fetch    │  │     search      │   │
                            │  │ resources  │  │   resources     │   │
                            │  └────────────┘  └─────────────────┘   │
                            │  ┌────────────┐  ┌─────────────────┐   │
                            │  │    get     │  │      get        │   │
                            │  │  context   │  │   languages     │   │
                            │  └────────────┘  └─────────────────┘   │
                            └──────────────────────────────┬──────────┘
                                                           │
┌──────────────────────────────────────────────────────────┴─────────────┐
│                          Resource Layer                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │  Scripture  │  │ Translation  │  │Translation │  │ Translation │  │
│  │   Service   │  │    Notes     │  │ Questions  │  │    Words    │  │
│  └─────────────┘  └──────────────┘  └────────────┘  └─────────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Translation │  │    Cache     │  │    DCS     │  │    USFM     │  │
│  │ Word Links  │  │   Manager    │  │   Client   │  │  Extractor  │  │
│  └─────────────┘  └──────────────┘  └────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### MCP Server Components

1. **Tool Handler**: Processes MCP tool calls and routes to appropriate services
2. **Resource Services**: Fetches specific resource types from DCS
3. **Cache Manager**: Handles intelligent caching of resources
4. **Context Builder**: Assembles resources into AI-ready context
5. **USFM Processor**: Extracts clean text from USFM markup

---

## 🛠️ Tool Definitions

### 1. `translation_helps_fetch_resources`

**Purpose**: Fetch all translation resources for a specific Bible reference

**Parameters**:

```typescript
{
  reference: string;        // "John 3:16" or "Jn 3:16-18"
  language?: string;        // ISO code (default: "en")
  organization?: string;    // "unfoldingWord" (default)
  resources?: string[];     // ["scripture", "notes", "questions", "words", "links"]
}
```

**Response**:

```typescript
{
  reference: {
    book: string;
    chapter: number;
    verse: number;
    verseEnd?: number;
    citation: string;
  };
  scripture: {
    text: string;           // Clean extracted text
    rawUsfm?: string;       // Original USFM (optional)
    translation: string;    // "ULT", "UST", etc.
  };
  translationNotes: Array<{
    reference: string;
    quote: string;
    note: string;
    supportReference?: string;
  }>;
  translationQuestions: Array<{
    reference: string;
    question: string;
    answer: string;
  }>;
  translationWords: Array<{
    term: string;
    definition: string;
    content: string;
    seeAlso?: string[];
  }>;
  translationWordLinks: Array<{
    word: string;
    occurrences: number;
    twlid: string;
  }>;
  metadata: {
    language: string;
    organization: string;
    timestamp: string;
    resourcesFound: string[];
    tokenEstimate: number;
  };
}
```

### 2. `translation_helps_search_resources`

**Purpose**: Search for available resources across organizations and languages

**Parameters**:

```typescript
{
  language?: string;        // Filter by language
  organization?: string;    // Filter by organization
  resource?: string;        // "scripture", "notes", etc.
  subject?: string;         // "Bible", "Aligned Bible", etc.
}
```

**Response**:

```typescript
{
  resources: Array<{
    organization: string;
    language: string;
    resource: string;
    title: string;
    subject: string;
    checkingLevel: string;
    version: string;
    url: string;
  }>;
  summary: {
    totalResources: number;
    byOrganization: Record<string, number>;
    byLanguage: Record<string, number>;
    byType: Record<string, number>;
  }
}
```

### 3. `translation_helps_get_context`

**Purpose**: Get AI-optimized context for a Bible reference

**Parameters**:

```typescript
{
  reference: string;
  language?: string;
  organization?: string;
  includeRawData?: boolean;
  maxTokens?: number;       // Optimize context size
}
```

**Response**:

```typescript
{
  systemPrompt: string;     // Ready-to-use system prompt
  context: string;          // Formatted context
  metadata: {
    tokenCount: number;
    includedResources: string[];
    truncated: boolean;
    reference: string;
  };
}
```

### 4. `translation_helps_get_languages`

**Purpose**: Get list of available languages with resource counts

**Parameters**:

```typescript
{
  organization?: string;    // Filter by organization
}
```

**Response**:

```typescript
{
  languages: Array<{
    code: string; // "en", "es", etc.
    name: string; // "English", "Spanish"
    englishName: string;
    resourceCounts: {
      scripture: number;
      notes: number;
      questions: number;
      words: number;
    };
    organizations: string[];
  }>;
  total: number;
}
```

### 5. `translation_helps_extract_references`

**Purpose**: Extract Bible references from natural language text

**Parameters**:

```typescript
{
  text: string;             // User message to parse
  context?: string;         // Previous conversation context
}
```

**Response**:

```typescript
{
  references: Array<{
    original: string; // As found in text
    normalized: string; // Standardized format
    book: string;
    chapter: number;
    verseStart?: number;
    verseEnd?: number;
    confidence: number; // 0.0 to 1.0
  }>;
}
```

---

## 🔧 Core Components

### 1. Reference Parser

**Purpose**: Parse various Bible reference formats

```typescript
class ReferenceParser {
  private bookMappings = {
    // English
    genesis: "GEN",
    gen: "GEN",
    matthew: "MAT",
    matt: "MAT",
    mt: "MAT",
    // Spanish
    génesis: "GEN",
    mateo: "MAT",
    // Add more languages...
  };

  parse(input: string): Reference {
    // Handle formats:
    // - "John 3:16"
    // - "Jn 3:16-18"
    // - "Genesis 1"
    // - "Rom 8:28-39"
    // - "1 Corinthians 13:4-7"
  }

  parseMultiple(text: string): Reference[] {
    // Extract all references from natural text
  }
}
```

### 2. Resource Aggregator

**Purpose**: Efficiently load all resources for a reference

```typescript
class ResourceAggregator {
  async fetchResources(reference: Reference, options: FetchOptions) {
    // Check cache first
    const cached = await this.cache.get(reference, options);
    if (cached) return cached;

    // Parallel fetch all resources
    const [scripture, notes, questions, words, links] = await Promise.all([
      this.scriptureService.fetch(reference, options),
      this.notesService.fetch(reference, options),
      this.questionsService.fetch(reference, options),
      this.wordsService.fetch(reference, options),
      this.linksService.fetch(reference, options),
    ]);

    const resources = {
      scripture,
      translationNotes: notes,
      translationQuestions: questions,
      translationWords: words,
      translationWordLinks: links,
    };

    // Cache for future use
    await this.cache.set(reference, options, resources);

    return resources;
  }
}
```

### 3. USFM Text Extractor

**Purpose**: Extract clean text from USFM markup

```typescript
class USFMExtractor {
  extractChapter(usfm: string, chapter: number): string {
    // Remove all USFM markers
    // Preserve verse numbers
    // Handle special formatting (poetry, quotes)
    // Return clean, readable text
  }

  extractVerse(usfm: string, chapter: number, verse: number): string {
    // Extract specific verse
    // Include verse number
    // Handle verse bridges
    // Clean all markup
  }

  extractRange(usfm: string, chapter: number, startVerse: number, endVerse: number): string {
    // Extract verse range
    // Maintain verse numbers
    // Clean formatting
  }
}
```

### 4. Context Builder

**Purpose**: Build AI-optimized context from resources

```typescript
class ContextBuilder {
  buildSystemPrompt(reference: Reference, resources: Resources): string {
    return `You are a Bible translation assistant with access to comprehensive resources for ${
      reference.citation
    }.

SCRIPTURE TEXT (${resources.scripture.translation}):
${resources.scripture.text}

TRANSLATION NOTES:
${this.formatNotes(resources.translationNotes)}

TRANSLATION QUESTIONS:
${this.formatQuestions(resources.translationQuestions)}

TRANSLATION WORDS:
${this.formatWords(resources.translationWords)}

INSTRUCTIONS:
- Use ONLY the provided scripture text when quoting
- Reference translation resources to support answers
- Be accurate about translation principles
- Respect different translation philosophies`;
  }

  optimizeForTokens(resources: Resources, maxTokens: number): Resources {
    // Intelligently truncate resources to fit token limit
    // Prioritize most relevant content
    // Maintain coherence
  }
}
```

### 5. Cache Manager

**Purpose**: Intelligent caching for performance

```typescript
class CacheManager {
  private cache = new Map();
  private lru = new LRUCache({ max: 1000 });

  async get(key: string): Promise<any> {
    // Check memory cache
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Check persistent cache
    const persisted = await this.redis.get(key);
    if (persisted) {
      this.cache.set(key, persisted);
      return persisted;
    }

    return null;
  }

  async set(key: string, value: any, ttl?: number) {
    // Memory cache
    this.cache.set(key, value);
    this.lru.set(key, true);

    // Persistent cache
    await this.redis.setex(key, ttl || 3600, JSON.stringify(value));
  }
}
```

---

## 📚 Resource Types

### Scripture

- **Source**: USFM files from DCS repositories
- **Processing**: Extract clean text, preserve verse numbers
- **Translations**: ULT, UST, and others per organization
- **Format**: Plain text with verse numbers

### Translation Notes (tN)

- **Source**: TSV files with verse-level notes
- **Content**: Explanatory notes for translators
- **Structure**: Reference, quote, note text
- **Usage**: Clarify difficult passages

### Translation Questions (tQ)

- **Source**: TSV files with comprehension questions
- **Content**: Questions and expected answers
- **Purpose**: Verify understanding
- **Format**: Question-answer pairs per verse

### Translation Words (tW)

- **Source**: Markdown files with term definitions
- **Content**: Key biblical term explanations
- **Structure**: Term, definition, extended content
- **Cross-references**: Related terms

### Translation Word Links (tWL)

- **Source**: TSV files linking terms to verses
- **Content**: Occurrence mapping
- **Purpose**: Show where key terms appear
- **Format**: Word, verse reference, occurrence count

---

## 🛠️ Implementation Details

### Project Structure

```
translation-helps-mcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── tools/            # MCP tool implementations
│   │   ├── fetchResources.ts
│   │   ├── searchResources.ts
│   │   ├── getContext.ts
│   │   ├── getLanguages.ts
│   │   └── extractReferences.ts
│   ├── services/         # Resource fetching services
│   │   ├── scriptureService.ts
│   │   ├── notesService.ts
│   │   ├── questionsService.ts
│   │   ├── wordsService.ts
│   │   └── linksService.ts
│   ├── parsers/          # Parsing utilities
│   │   ├── referenceParser.ts
│   │   ├── usfmExtractor.ts
│   │   └── tsvParser.ts
│   ├── utils/            # Helper utilities
│   │   ├── cache.ts
│   │   ├── dcsClient.ts
│   │   └── contextBuilder.ts
│   └── types/            # TypeScript definitions
├── tests/
├── docs/
└── package.json
```

### MCP Server Implementation

```typescript
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "translation-helps-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "translation_helps_fetch_resources",
      description: "Fetch Bible translation resources for a specific reference",
      inputSchema: {
        type: "object",
        properties: {
          reference: { type: "string", description: 'Bible reference (e.g., "John 3:16")' },
          language: { type: "string", description: 'Language code (default: "en")' },
          organization: { type: "string", description: 'Organization (default: "unfoldingWord")' },
          resources: {
            type: "array",
            items: { type: "string" },
            description: "Resource types to fetch",
          },
        },
        required: ["reference"],
      },
    },
    // ... other tools
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "translation_helps_fetch_resources":
      return await handleFetchResources(args);
    case "translation_helps_search_resources":
      return await handleSearchResources(args);
    // ... other tools
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool Implementation Example

```typescript
// src/tools/fetchResources.ts
async function handleFetchResources(args: FetchResourcesArgs) {
  try {
    // Parse reference
    const reference = parseReference(args.reference);
    if (!reference) {
      throw new Error(`Invalid reference: ${args.reference}`);
    }

    // Set defaults
    const options = {
      language: args.language || "en",
      organization: args.organization || "unfoldingWord",
      resources: args.resources || ["scripture", "notes", "questions", "words", "links"],
    };

    // Fetch resources
    const aggregator = new ResourceAggregator();
    const resources = await aggregator.fetchResources(reference, options);

    // Build response
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              reference: {
                book: reference.book,
                chapter: reference.chapter,
                verse: reference.verse,
                verseEnd: reference.verseEnd,
                citation: formatCitation(reference),
              },
              ...resources,
              metadata: {
                language: options.language,
                organization: options.organization,
                timestamp: new Date().toISOString(),
                resourcesFound: Object.keys(resources).filter((k) => resources[k]),
                tokenEstimate: estimateTokens(resources),
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error.message,
            reference: args.reference,
          }),
        },
      ],
      isError: true,
    };
  }
}
```

---

## 🧠 Context Building Strategy

### Intelligent Context Assembly

1. **Priority Levels**:

   - **Essential**: Scripture text, directly relevant notes
   - **Important**: Related questions, key word definitions
   - **Supplementary**: Word links, extended definitions

2. **Token Optimization**:

   ```typescript
   function optimizeContext(resources: Resources, maxTokens: number = 4000) {
     let context = {
       scripture: resources.scripture, // Always include
       translationNotes: [],
       translationQuestions: [],
       translationWords: [],
       translationWordLinks: [],
     };

     let currentTokens = estimateTokens(context);

     // Add resources in priority order
     const prioritized = prioritizeResources(resources);

     for (const item of prioritized) {
       const itemTokens = estimateTokens(item);
       if (currentTokens + itemTokens < maxTokens * 0.9) {
         addToContext(context, item);
         currentTokens += itemTokens;
       }
     }

     return context;
   }
   ```

3. **Context Templates**:
   - **Study Context**: Full resources for deep study
   - **Quick Context**: Essential resources only
   - **Translation Context**: Focus on notes and words
   - **Reading Context**: Scripture with minimal helps

---

## ⚡ Performance Optimization

### Caching Strategy

**Multi-Level Cache**:

1. **Memory Cache**: Hot data, instant access
2. **Redis Cache**: Shared across instances
3. **CDN Cache**: Static resources
4. **Client Cache**: MCP client-side caching

**Cache Keys**:

```typescript
function getCacheKey(reference: Reference, options: Options): string {
  return `${options.organization}:${options.language}:${reference.book}:${reference.chapter}:${
    reference.verse || "all"
  }`;
}
```

**TTL Strategy**:

- Scripture: 7 days (stable content)
- Translation helps: 24 hours (may update)
- Search results: 1 hour
- Languages: 24 hours

### Parallel Processing

```typescript
class ResourceLoader {
  async loadAll(reference: Reference, options: Options) {
    // Create promise array for parallel loading
    const loaders = [
      this.loadScripture(reference, options),
      this.loadNotes(reference, options),
      this.loadQuestions(reference, options),
      this.loadWords(reference, options),
      this.loadLinks(reference, options),
    ];

    // Use Promise.allSettled to handle partial failures
    const results = await Promise.allSettled(loaders);

    // Process results, use null for failed loads
    return {
      scripture: results[0].status === "fulfilled" ? results[0].value : null,
      notes: results[1].status === "fulfilled" ? results[1].value : [],
      // ... etc
    };
  }
}
```

### Resource Optimization

**Compression**:

- Gzip responses for large payloads
- Minimize JSON structure
- Remove redundant data

**Streaming**:

- Stream large scripture chapters
- Progressive resource loading
- Chunked responses for very large contexts

---

## 🛡️ Error Handling

### Error Types

1. **Reference Errors**:

   ```typescript
   class InvalidReferenceError extends Error {
     constructor(reference: string) {
       super(`Invalid Bible reference: ${reference}`);
       this.name = "InvalidReferenceError";
     }
   }
   ```

2. **Resource Not Found**:

   ```typescript
   class ResourceNotFoundError extends Error {
     constructor(resource: string, reference: string) {
       super(`${resource} not found for ${reference}`);
       this.name = "ResourceNotFoundError";
     }
   }
   ```

3. **API Errors**:
   - Network timeouts
   - Rate limiting
   - Invalid responses

### Graceful Degradation

```typescript
async function fetchWithFallback(primary: () => Promise<any>, fallback: () => Promise<any>) {
  try {
    return await primary();
  } catch (error) {
    console.warn("Primary fetch failed, trying fallback:", error);
    try {
      return await fallback();
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      return null;
    }
  }
}
```

### Error Responses

```typescript
{
  error: {
    type: 'InvalidReferenceError',
    message: 'Invalid Bible reference: Jon 3:16',
    suggestion: 'Did you mean "John 3:16"?',
    similarReferences: ['John 3:16', 'Jonah 3:16']
  }
}
```

---

## 🚀 Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Environment Variables

```bash
# .env
DCS_API_URL=https://git.door43.org/api/v1
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
MAX_CONCURRENT_REQUESTS=10
LOG_LEVEL=info
```

### MCP Configuration

```json
// mcp.json (for Cursor/Claude Desktop)
{
  "mcpServers": {
    "translation-helps": {
      "command": "node",
      "args": ["/path/to/translation-helps-mcp/dist/index.js"],
      "env": {
        "DCS_API_URL": "https://git.door43.org/api/v1",
        "CACHE_ENABLED": "true"
      }
    }
  }
}
```

---

## 💡 Usage Examples

### Basic Resource Fetch

**User**: "Show me the translation notes for John 3:16"

**AI Assistant** uses:

```typescript
translation_helps_fetch_resources({
  reference: "John 3:16",
  resources: ["notes"],
});
```

**Response**: AI formats the notes in a user-friendly way

### Multi-Language Support

**User**: "What does Romans 8:28 say in Spanish with translation helps?"

**AI Assistant** uses:

```typescript
translation_helps_fetch_resources({
  reference: "Romans 8:28",
  language: "es",
  resources: ["scripture", "notes", "words"],
});
```

### Context-Aware Study

**User**: "I'm studying the concept of love in 1 Corinthians 13"

**AI Assistant** uses:

```typescript
// First, get the context
translation_helps_get_context({
  reference: "1 Corinthians 13",
  maxTokens: 8000,
});

// Then search for related words
translation_helps_search_resources({
  resource: "words",
  query: "love",
});
```

### Cross-Reference Analysis

**User**: "Compare the word 'faith' across Hebrews 11"

**AI Assistant** can:

1. Extract all references from Hebrews 11
2. Fetch translation words for each occurrence
3. Analyze patterns and usage

---

## 🔮 Future Enhancements

### Short-term (1-3 months)

1. **Additional Tools**:

   - `compare_translations` - Side-by-side comparison
   - `get_cross_references` - Find related verses
   - `search_by_topic` - Topical resource search

2. **Performance**:

   - Implement resource pre-fetching
   - Add predictive caching
   - Optimize USFM parsing

3. **Language Support**:
   - Expand language mappings
   - Add RTL language support
   - Improve transliteration

### Medium-term (3-6 months)

1. **Advanced Features**:

   - Original language support (Greek/Hebrew)
   - Interlinear data integration
   - Audio resource links

2. **AI Enhancements**:

   - Fine-tuned context generation
   - Semantic search capabilities
   - Smart resource prioritization

3. **Integration**:
   - Webhook support for updates
   - GraphQL API option
   - WebSocket streaming

### Long-term (6-12 months)

1. **Ecosystem**:

   - Plugin system for custom resources
   - Community resource contributions
   - Translation memory integration

2. **Analytics**:

   - Usage pattern analysis
   - Popular reference tracking
   - Performance metrics dashboard

3. **Enterprise**:
   - Multi-tenant support
   - Custom organization resources
   - SLA guarantees

---

## 📝 Appendices

### A. Supported Bible Books

```typescript
const BOOK_CODES = {
  Genesis: "GEN",
  Exodus: "EXO",
  // ... full list
  Revelation: "REV",
};
```

### B. Language Codes

```typescript
const SUPPORTED_LANGUAGES = {
  en: "English",
  es: "Spanish",
  fr: "French",
  // ... extensible list
};
```

### C. Resource Type Definitions

```typescript
interface Scripture {
  text: string;
  translation: string;
  language: string;
  direction: "ltr" | "rtl";
}

interface TranslationNote {
  reference: string;
  quote: string;
  occurrence: number;
  note: string;
}
// ... other types
```

---

_Document Version: 1.0_  
_Last Updated: [Current Date]_  
_Status: Ready for Implementation_
_MCP SDK Version: 0.1.0_
