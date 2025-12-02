# Search Indexer Worker Testing Guide

This document outlines the testing strategy for the Search Indexer Worker.

## Prerequisites

Before testing, ensure:

1. Infrastructure is set up (run `scripts/setup-search-indexing-infra.sh`)
2. AI Search index is configured in Cloudflare Dashboard
3. R2 lifecycle rules are configured
4. Worker is deployed

## Test Categories

### 1. End-to-End Event Flow Test

**Goal**: Verify ZIP cache → Queue → Worker → Search Index flow

```bash
# 1. Request a new resource (triggers ZIP cache in source bucket)
curl "http://localhost:8787/api/fetch-scripture?reference=John%203:16&language=en&organization=unfoldingWord"

# 2. Verify queue receives message (check Cloudflare Dashboard or use wrangler)
npx wrangler queues info zip-indexing-queue

# 3. Verify chunks appear in search index bucket
npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/"

# 4. Verify content is searchable (after ~5 min for AI Search reindex)
curl "http://localhost:8787/api/search?query=born%20again&language=en"
```

### 2. Thematic Search Test

**Goal**: Verify passage-level chunking captures thematic content

```bash
# Search for "prodigal son parable" - should return passage-level result
curl "http://localhost:8787/api/search?query=prodigal%20son%20parable&language=en&chunk_level=passage"

# Expected: Luke 15:11-32 at passage level
# The individual verses might not match "prodigal son" but the passage context should
```

### 3. Multi-Level Chunk Test

**Goal**: Verify all chunk levels are generated

```bash
# Check for verse-level chunks
npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/ult/v86/JHN/3/verses/"

# Check for passage-level chunks
npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/ult/v86/JHN/3/passages/"

# Check for chapter-level chunks
npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/ult/v86/JHN/3/chapter.md"
```

### 4. Version Handling Test

**Goal**: Verify multiple versions can coexist

```bash
# Index v85 (trigger by fetching with older ref if available)
# Then index v86
# Verify both exist with different paths:

npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/ult/v85/"
npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/ult/v86/"
```

### 5. Resource Type Tests

Test each resource type generates appropriate chunks:

#### Scripture (USFM)

```bash
# Fetch scripture
curl "http://localhost:8787/api/fetch-scripture?reference=John%203&language=en"

# Verify chunks: verse, passage, chapter levels
npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/ult/" | head -20
```

#### Translation Notes (TSV)

```bash
# Fetch notes
curl "http://localhost:8787/api/fetch-translation-notes?reference=John%203:16&language=en"

# Verify chunks: one per note
npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/tn/" | head -20
```

#### Translation Words (Markdown)

```bash
# Fetch word
curl "http://localhost:8787/api/fetch-translation-word?term=grace&language=en"

# Verify chunks: one per article
npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/tw/" | head -20
```

#### Translation Academy (Markdown)

```bash
# Fetch academy module
curl "http://localhost:8787/api/fetch-translation-academy?moduleId=figs-metaphor&language=en"

# Verify chunks: section + article levels
npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/ta/" | head -20
```

#### Translation Questions (TSV)

```bash
# Fetch questions
curl "http://localhost:8787/api/fetch-translation-questions?reference=John%203&language=en"

# Verify chunks: one per Q&A
npx wrangler r2 object list translation-helps-search-index --prefix "en/unfoldingWord/tq/" | head -20
```

### 6. Metadata Verification

**Goal**: Verify YAML frontmatter contains required metadata

```bash
# Download a chunk and inspect its content
npx wrangler r2 object get translation-helps-search-index en/unfoldingWord/ult/v86/JHN/3/verses/16.md --file /tmp/verse.md

# Inspect frontmatter
cat /tmp/verse.md
```

Expected frontmatter fields:

- `language`, `language_name`
- `organization`
- `resource`, `resource_name`
- `version`
- `chunk_level`
- `indexed_at`
- Resource-specific fields (book, chapter, verse, article_id, etc.)

### 7. AI Search Filter Tests

**Goal**: Verify search filters work correctly

```bash
# Filter by language
curl "http://localhost:8787/api/search?query=love&language=es"

# Filter by resource
curl "http://localhost:8787/api/search?query=grace&resource=tw"

# Filter by chunk level
curl "http://localhost:8787/api/search?query=prodigal&chunk_level=passage"

# Filter by book
curl "http://localhost:8787/api/search?query=born&book=JHN"

# Combined filters
curl "http://localhost:8787/api/search?query=faith&language=en&resource=tw&chunk_level=article"
```

### 8. Dead Letter Queue Test

**Goal**: Verify failed messages go to DLQ

```bash
# Intentionally corrupt a message or trigger an error
# Then check DLQ:
npx wrangler queues info zip-indexing-dlq
```

## Monitoring Commands

```bash
# View worker logs in real-time
npx wrangler tail translation-helps-indexer

# Check queue status
npx wrangler queues info zip-indexing-queue

# List recent R2 objects (shows recently indexed content)
npx wrangler r2 object list translation-helps-search-index --prefix "en/" | head -50

# Check R2 bucket stats
npx wrangler r2 object list translation-helps-search-index --summarize
```

## Troubleshooting

### No chunks appearing

1. Check worker logs: `npx wrangler tail translation-helps-indexer`
2. Verify R2 event notification is configured
3. Verify queue is receiving messages
4. Check for errors in DLQ

### Search not finding new content

1. Wait ~5 minutes for AI Search reindex
2. Check if reindex trigger is working (look for API call in worker logs)
3. Manually trigger reindex via Cloudflare Dashboard

### Wrong metadata

1. Download and inspect chunk content
2. Check path parsing in `parseZipKey()` function
3. Verify ZIP structure matches expected pattern

## Performance Benchmarks

Target metrics:

- Queue processing: <30s per batch of 10 messages
- Chunk generation: <5s per ZIP file
- Time to searchable: <5 minutes after ZIP cached
