# Event-Driven Search Indexing

This document describes the event-driven pipeline that automatically indexes Translation Helps content for Cloudflare AI Search.

**Last Updated:** December 2025  
**Version:** 7.19.1

## Overview

The indexing system uses a two-queue architecture that processes ZIP files asynchronously. When content is uploaded to R2 storage, event notifications trigger workers that extract and index the content for semantic search.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  ZIP Upload → R2 Storage → Event Notification                   │
│                                    ↓                             │
│                         zip-unzip-queue                          │
│                                    ↓                             │
│                           Unzip Worker                           │
│               (List files, extract one-at-a-time)                │
│                                    ↓                             │
│                    Extracted Files → R2 Storage                  │
│                                    ↓                             │
│                         zip-indexing-queue                       │
│                                    ↓                             │
│                           Index Worker                           │
│                    (Parse, clean, chunk content)                 │
│                                    ↓                             │
│                 Clean Markdown → Search Index Bucket             │
│                                    ↓                             │
│                        AI Search Reindex Trigger                 │
└──────────────────────────────────────────────────────────────────┘
```

## Key Features

- **Two Queues:** Separates ZIP extraction from indexing for better resource management
- **Memory Efficient:** Extracts one file at a time to stay within Cloudflare Workers limits
- **Universal Indexing:** Files extracted by the main API also trigger indexing via R2 events
- **Consistent Keys:** All R2 keys use normalized `by-url/...` format

## Components

### Queue 1: Unzip Queue (`zip-unzip-queue`)

When a ZIP file is cached in R2:

1. R2 event notification triggers `zip-unzip-queue`
2. Unzip Worker downloads ZIP from R2
3. Lists files using fflate filter (no full decompression)
4. Extracts files ONE at a time to avoid memory limits
5. Writes each file to R2, which triggers Queue 2

### Queue 2: Index Queue (`zip-indexing-queue`)

When an extracted file lands in R2:

1. R2 event notification triggers `zip-indexing-queue`
2. Index Worker reads the file from R2
3. Parses and cleans content based on file type
4. Writes clean chunk to search index bucket
5. Triggers AI Search reindex

## Content Processing

### File Type Handling

| Extension | Resource Type              | Processing                        |
| --------- | -------------------------- | --------------------------------- |
| `.usfm`   | Scripture                  | USFM → clean text → Markdown      |
| `.tsv`    | Notes, Questions, TWL      | TSV parsing → structured Markdown |
| `.md`     | Translation Words, Academy | Markdown cleaning                 |

### Chunking Strategies

| Resource              | Level   | Description                     |
| --------------------- | ------- | ------------------------------- |
| Scripture             | Book    | One chunk per book              |
| Translation Notes     | Book    | One chunk per book of notes     |
| Translation Words     | Article | One chunk per word definition   |
| Translation Academy   | Article | One chunk per academy article   |
| Translation Questions | Book    | One chunk per book of questions |

### Content Cleaning

**Scripture (USFM):**

- Remove alignment markers (`\zaln-s`, `\zaln-e`)
- Extract word content from `\w word|data\w*`
- Preserve verse markers as numbers
- Remove all other USFM markers
- Result: ~30x smaller than raw USFM

**Translation Notes (TSV):**

- Extract all columns from TSV rows
- Join non-empty cells with spaces
- Create searchable text entries per row

**Translation Words/Academy (Markdown):**

- Remove code blocks
- Strip link syntax, keep text
- Remove bold/italic markers
- Preserve readable content

## R2 Key Format

All extracted files use normalized format:

```
by-url/git.door43.org/{org}/{repo}/archive/{version}.zip/files/{filepath}
```

Example:

```
by-url/git.door43.org/unfoldingWord/en_ult/archive/v87.zip/files/43-JHN.usfm
```

## Markdown Output

Indexed content is stored as Markdown with YAML frontmatter:

```markdown
---
language: en
organization: unfoldingWord
resource: ult
version: v87
book: JHN
chapter_count: 21
verse_count: 879
---

# John

## Chapter 1

1 In the beginning was the Word, and the Word was with God...
```

## Setup Instructions

### 1. Run Infrastructure Setup Script

```bash
# Login to Cloudflare first
npx wrangler login

# Run the setup script
./scripts/setup-search-indexing-infra.sh
```

This creates:

- `translation-helps-search-index` R2 bucket
- `zip-unzip-queue` for ZIP file events
- `zip-indexing-queue` for extracted file events
- Dead letter queues for both
- R2 event notifications

### 2. Configure AI Search (Cloudflare Dashboard)

1. Navigate to **AI** → **AI Search**
2. Click **Create Index**
3. Configure:
   - Name: `translation-helps-search`
   - Data Source: R2 bucket `translation-helps-search-index`
   - File Types: `.md`
   - Index Entire Bucket: Yes
4. Click **Create**

### 3. Configure R2 Lifecycle Rule

1. Navigate to **R2** → `translation-helps-search-index`
2. Go to **Settings** → **Object Lifecycle Rules**
3. Add rule:
   - Name: `auto-cleanup-old-versions`
   - Prefix: (empty)
   - Expire after: 90 days

### 4. Create API Token for Reindex

1. Navigate to **My Profile** → **API Tokens**
2. Create Token with:
   - Name: `AI Search Reindex`
   - Permissions: `AI Search: Edit`
3. Copy the token

### 5. Set Worker Secrets

```bash
cd src/workers/indexer
npx wrangler secret put CF_API_TOKEN
# Paste your token when prompted
```

### 6. Deploy the Worker

```bash
cd src/workers/indexer
npm install
npx wrangler deploy
```

## Monitoring

### Queue Health

```bash
# Check unzip queue
npx wrangler queues info zip-unzip-queue

# Check indexing queue
npx wrangler queues info zip-indexing-queue

# Check dead letter queues
npx wrangler queues info zip-unzip-dlq
npx wrangler queues info zip-indexing-dlq
```

### View Logs

```bash
npx wrangler tail --config src/workers/indexer/wrangler.toml
```

### R2 Bucket Stats

```bash
# List objects in search index bucket
npx wrangler r2 object list translation-helps-search-index --prefix "en/"
```

## Version Handling

- Version included in paths: `en/unfoldingWord/ult/v87/JHN.md`
- Multiple versions can coexist
- R2 lifecycle rule auto-deletes after 90 days
- AI Search reindexes every 6 hours (or on manual trigger)

## File Structure

```
src/workers/indexer/
├── index.ts                 # Pipeline router
├── unzip-worker.ts          # ZIP extraction handler
├── index-worker.ts          # File indexing handler
├── wrangler.toml            # Worker configuration
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── types.ts                 # Type definitions
├── chunkers/                # Content chunkers
│   ├── scripture-chunker.ts
│   ├── notes-chunker.ts
│   ├── words-chunker.ts
│   ├── academy-chunker.ts
│   └── questions-chunker.ts
└── utils/
    ├── markdown-generator.ts # YAML frontmatter
    ├── ai-search-trigger.ts  # Reindex API
    ├── parallel.ts           # Parallel processing
    └── zip-handler.ts        # ZIP utilities
```

## Performance Characteristics

### v7.7.0 Improvements

- Book-level chunking: 66 files instead of 31,000 per resource
- 470x fewer R2 writes
- Eliminated timeouts from excessive writes
- True parallel processing interleaves CPU and IO

### v7.9.0 Search Improvements

- Default to vector-only search (~2-4s) instead of full RAG (~15-20s)
- 5-7x faster search responses
- Optional `useAI=true` for LLM-enhanced results

## Troubleshooting

### ZIP Not Being Indexed

1. Check if R2 event notification is configured
2. Verify queue is receiving messages
3. Check dead letter queue for failures

### Missing Files in Index

1. File may not match extension filter
2. Check if extraction succeeded
3. Verify content was written to index bucket

### Slow Indexing

1. Check queue depth
2. Verify worker isn't timing out
3. Consider increasing batch size

### Reindex Not Triggering

1. Verify CF_API_TOKEN secret is set
2. Check API token has AI Search Edit permission
3. Review worker logs for API errors

## Related Documentation

- [Hybrid Search Feature](./HYBRID_SEARCH_FEATURE.md) - Search API reference
- [Cache Architecture](./CACHE_ARCHITECTURE.md) - R2/KV caching
- [AI Chat Architecture](./AI_CHAT_ARCHITECTURE.md) - How search integrates with chat
