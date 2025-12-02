# Product Requirements Document: Event-Driven Search Indexing Pipeline

## Document Info

| Field            | Value                                 |
| ---------------- | ------------------------------------- |
| **Title**        | Event-Driven Search Indexing Pipeline |
| **Author**       | Translation Helps MCP Team            |
| **Version**      | 5.1                                   |
| **Status**       | Draft                                 |
| **Last Updated** | December 2, 2025                      |

---

## 1. Executive Summary

This document proposes an **event-driven indexing pipeline** that automatically extracts, cleans, and chunks biblical translation content into a dedicated search index bucket when ZIP files are cached in R2.

### Design Philosophy: LLM-as-Client

The primary consumer of search results is an **LLM via MCP** (Model Context Protocol), not a human viewing a search results page. This means:

- **Return rich data, let the LLM curate**: No need for complex server-side deduplication or query routing
- **Label everything clearly**: The LLM uses metadata to filter and select appropriate results
- **Keep the API simple**: Provide data and optional filters; intelligence lives in the LLM

### Key Outcomes

- **Search** and **Filter** become two distinct, optimized features
- Content is automatically indexed when first accessed (no pre-population needed)
- Multi-level chunking enables both precise lookups AND thematic discovery
- LLM intelligently selects the right chunk level for each user query
- Clean separation: API serves data, Indexer builds search index, LLM curates results
- **Self-cleaning architecture**: R2 lifecycle auto-deletes old versions; AI Search auto-syncs
- No changes required to existing API code

---

## 2. Problem Statement

### Current State

The Translation Helps MCP system serves biblical translation resources from Door43 Content Service (DCS). Resources are cached on-demand as ZIP files in Cloudflare R2.

**Current architecture tightly couples**:

- Data serving (API responses)
- Content cleaning (USFM stripping, TSV parsing)
- Search indexing (populating `/clean/` prefix)

This creates:

- **First-request penalty**: User who triggers cache must wait for indexing
- **Fragility**: Indexing failures can affect API responses
- **Imprecise AI Search**: Can't easily filter by prefix; indexes everything in bucket

### The Sparse Matrix Challenge

- **Hundreds of organizations** × **hundreds of languages** = **thousands of resources**
- Only **~12-50 resources** are actually used
- Cannot predict which ones ahead of time
- Pre-indexing everything is wasteful and infeasible

### The Thematic Search Problem

Granular per-verse indexing misses thematic queries:

- "Prodigal son parable" spans 22 verses (Luke 15:11-32)
- No single verse contains "prodigal" - the theme emerges from the whole
- Users need both precise lookups AND thematic discovery

---

## 3. Proposed Solution

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  API LAYER (unchanged)                INDEXING LAYER (new, decoupled)       │
│                                                                              │
│  ┌─────────────────────┐              ┌─────────────────────────────────┐   │
│  │ User Request        │              │ R2 Event Notification           │   │
│  │ GET /api/fetch-*    │              │ (fires on *.zip creation)       │   │
│  └─────────┬───────────┘              └──────────────┬──────────────────┘   │
│            │                                         │                       │
│            ▼                                         ▼                       │
│  ┌─────────────────────┐              ┌─────────────────────────────────┐   │
│  │ ZipResourceFetcher  │              │ Cloudflare Queue                │   │
│  │ - Fetch from DCS    │──────┐       │ zip-indexing-queue              │   │
│  │ - Cache ZIP in R2   │      │       └──────────────┬──────────────────┘   │
│  │ - Extract file      │      │                      │                       │
│  │ - Return JSON       │      │                      ▼                       │
│  └─────────────────────┘      │       ┌─────────────────────────────────┐   │
│                               │       │ Indexer Worker                  │   │
│  (API unchanged - no          │       │ - Read ZIP from source bucket   │   │
│   indexing responsibility)    │       │ - Extract all files             │   │
│                               └──────▶│ - Clean content                 │   │
│                                       │ - Generate multi-level chunks   │   │
│                                       │ - Write .md with frontmatter    │   │
│                                       │ - Store in search index bucket  │   │
│                                       └──────────────┬──────────────────┘   │
│                                                      │                       │
│  STORAGE LAYER                                       ▼                       │
│  ┌─────────────────────┐              ┌─────────────────────────────────┐   │
│  │ translation-helps-  │              │ translation-helps-search-index  │   │
│  │ mcp-zip-persistence │              │ (NEW BUCKET)                    │   │
│  │                     │              │                                 │   │
│  │ • Raw ZIPs from DCS │              │ • Multi-level .md chunks        │   │
│  │ • Extracted files   │              │ • Rich YAML frontmatter         │   │
│  │ • AI Search: ❌     │              │ • AI Search: ✅ (whole bucket)  │   │
│  └─────────────────────┘              └──────────────┬──────────────────┘   │
│                                                      │                       │
│                                                      ▼                       │
│                                       ┌─────────────────────────────────┐   │
│                                       │ Cloudflare AI Search            │   │
│                                       │ (indexes entire search bucket)  │   │
│                                       │ BM25 + Semantic/Vector Search   │   │
│                                       └──────────────┬──────────────────┘   │
│                                                      │                       │
│  CLIENT LAYER                                        ▼                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LLM via MCP (Primary Client)                                        │   │
│  │                                                                      │   │
│  │ • Understands human intent                                          │   │
│  │ • Receives all matching chunks with metadata                        │   │
│  │ • Selects appropriate chunk level (verse/passage/chapter)           │   │
│  │ • Deduplicates and synthesizes for human consumption                │   │
│  │ • Can make follow-up requests for different granularity             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Two Distinct Features

| Feature    | Purpose                                  | Implementation                       | Data Source         | Speed                 |
| ---------- | ---------------------------------------- | ------------------------------------ | ------------------- | --------------------- |
| **Search** | Broad discovery across indexed content   | Cloudflare AI Search (BM25/Semantic) | Search index bucket | Fast (after indexing) |
| **Filter** | Narrow results within a fetched response | Regex/string matching                | In-memory array     | Always instant        |

### 3.3 LLM-as-Client Design Principles

| Principle                    | Implementation                                                |
| ---------------------------- | ------------------------------------------------------------- |
| **Return rich data**         | Include all matching chunks at all levels                     |
| **Label everything**         | Every result has `chunk_level`, `resource`, `reference`, etc. |
| **Don't over-engineer**      | No server-side deduplication or intent detection              |
| **Provide optional filters** | LLM can filter by level if it wants to                        |
| **Trust the LLM**            | It will pick the right results for the human's question       |

---

## 4. Functional Requirements

### FR-1: Dedicated Search Index Bucket

**Description**: Create a separate R2 bucket exclusively for clean, chunked content that AI Search indexes.

**Bucket Name**: `translation-helps-search-index`

**Acceptance Criteria**:

- [ ] Bucket created and configured
- [ ] AI Search indexes entire bucket (no prefix filtering needed)
- [ ] Only Indexer Worker has write access
- [ ] API Worker has read access

### FR-2: R2 Event Notifications

**Description**: Configure source bucket to emit events when ZIP files are created.

**Acceptance Criteria**:

- [ ] Event notification on `object-create` events
- [ ] Filtered to `*.zip` suffix only
- [ ] Events delivered to `zip-indexing-queue`

### FR-3: Indexing Queue

**Description**: Durable queue to buffer indexing work with retry support.

**Configuration**:
| Setting | Value |
|---------|-------|
| Queue name | `zip-indexing-queue` |
| Dead letter queue | `zip-indexing-dlq` |
| Max retries | 3 |
| Max batch size | 10 |
| Max batch timeout | 30 seconds |

### FR-4: Indexer Worker

**Description**: Cloudflare Worker that consumes queue messages and populates search index.

**Acceptance Criteria**:

- [ ] Consumes messages from queue
- [ ] Downloads ZIP from source bucket
- [ ] Extracts all files from ZIP
- [ ] Applies content cleaning per resource type
- [ ] Generates multi-level chunks for scripture (verse, passage, chapter)
- [ ] Generates appropriate chunks for other resources
- [ ] Writes `.md` files with YAML frontmatter to search index bucket
- [ ] **Triggers AI Search reindex via API** (makes content searchable within minutes)
- [ ] Acknowledges message on success, retries on failure
- [ ] Logs indexing metrics

**AI Search Reindex Trigger**:

AI Search auto-reindexes every 6 hours. To make content searchable immediately, the Indexer Worker must trigger a manual reindex after writing files:

```typescript
async function triggerAISearchReindex(env: Env): Promise<void> {
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai-search/indexes/${env.AI_SEARCH_INDEX_ID}/reindex`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  );
}
```

**Note**: Manual reindex can be triggered every 30 seconds. Content becomes searchable within ~1-5 minutes of indexing.

### FR-5: Content Format - Markdown with YAML Frontmatter

**Description**: All indexed content stored as Markdown with rich metadata.

**File Extension**: `.md`

**Rationale**:

- LLMs natively understand Markdown (trained on it)
- YAML frontmatter is parseable for programmatic filtering
- AI Search indexes full content including frontmatter
- Human-readable in any text editor

### FR-6: Search Endpoint (LLM-Optimized)

**Description**: `/api/search` returns all matching chunks with rich metadata. The LLM selects and curates results.

**Query Parameters**:
| Parameter | Description | Required | Example |
|-----------|-------------|----------|---------|
| `query` | Search terms | ✅ | `"prodigal son"` |
| `language` | ISO language code filter | Optional | `en` |
| `organization` | Content owner filter | Optional | `unfoldingWord` |
| `resource` | Resource type filter | Optional | `tn`, `tw` |
| `book` | Bible book filter | Optional | `LUK`, `JHN` |
| `chapter` | Chapter filter | Optional | `15` |
| `chunk_level` | Granularity filter | Optional | `passage` |
| `limit` | Max results | Optional | `50` (default) |

**Response Design** (LLM-friendly):

- Return **all matching chunks** at all levels
- Include `chunk_level` on every result
- Include rich metadata for LLM decision-making
- **No server-side deduplication** - LLM handles this

**Resource Type Aliases** (for user-friendly queries):

```typescript
const RESOURCE_ALIASES = {
  tn: "tn",
  notes: "tn",
  translationNotes: "tn",
  tw: "tw",
  words: "tw",
  translationWords: "tw",
  ta: "ta",
  academy: "ta",
  translationAcademy: "ta",
  tq: "tq",
  questions: "tq",
  translationQuestions: "tq",
  ult: "ult",
  literal: "ult",
  ust: "ust",
  simplified: "ust",
};
```

### FR-7: R2 Object Lifecycle Rule (Auto-Cleanup)

**Description**: Configure R2 lifecycle rule to automatically delete old indexed content after 90 days.

**Acceptance Criteria**:

- [ ] Lifecycle rule created on `translation-helps-search-index` bucket
- [ ] Rule deletes objects older than 90 days
- [ ] Old versions automatically pruned without manual intervention
- [ ] AI Search index automatically updated (reindexes every 6 hours)

**Configuration**:
| Setting | Value |
|---------|-------|
| Rule name | `auto-cleanup-old-versions` |
| Prefix | (empty = all objects) |
| Action | Delete |
| Expire after | 90 days |

---

## 5. Content Chunking Strategy

### 5.1 Principle: Chunk at Natural Semantic Boundaries

Each chunk should be:

- **Semantically coherent** - about one thing
- **Right-sized** - ~50-500 words (optimal for embedding models)
- **Self-contained** - understandable without surrounding context

### 5.2 The Multi-Level Chunking Approach

**Problem**: Granular verse-level chunking enables precise lookups but misses thematic queries.

**Example**: Searching "prodigal son parable" against verse-level chunks fails because:

- The story spans Luke 15:11-32 (22 verses)
- No single verse contains "prodigal son"
- The theme emerges from the whole passage

**Solution**: Index content at multiple levels. The LLM selects the appropriate level based on user intent.

### 5.3 Chunk Levels by Resource Type

#### Scripture: Three Levels

| Level     | Granularity               | Size           | Best For                           |
| --------- | ------------------------- | -------------- | ---------------------------------- |
| `verse`   | Individual verse          | 20-50 words    | Specific lookups, exact quotes     |
| `passage` | Pericope (story unit)     | 100-800 words  | Thematic search, parables, stories |
| `chapter` | Full chapter with summary | 500-2000 words | Overview, chapter-level topics     |

**Passage boundaries derived from**:

1. USFM section markers (`\s`, `\p`)
2. Translation Notes verse ranges
3. Standard pericope divisions

#### Translation Notes: Single Level (Per-Note)

| Level  | Granularity         | Size         |
| ------ | ------------------- | ------------ |
| `note` | One note per phrase | 50-200 words |

#### Translation Words: Single Level (Per-Article)

| Level     | Granularity         | Size          |
| --------- | ------------------- | ------------- |
| `article` | One word definition | 200-500 words |

#### Translation Academy: Two Levels

| Level     | Granularity               | Size           |
| --------- | ------------------------- | -------------- |
| `section` | One section (## header)   | 150-400 words  |
| `article` | Full article with summary | 500-1500 words |

#### Translation Questions: Single Level (Per-Question)

| Level      | Granularity  | Size         |
| ---------- | ------------ | ------------ |
| `question` | One Q&A pair | 30-100 words |

### 5.4 File Structure

```
/translation-helps-search-index/
  /{language}/
    /{organization}/

      # SCRIPTURE (multi-level)
      /{scripture-resource}/
        /{version}/
          /{book}/
            /{chapter}/
              /verses/
                {verse}.md                    # Level: verse
              /passages/
                {start}-{end}.md              # Level: passage
              chapter.md                      # Level: chapter

      # TRANSLATION NOTES (single level)
      /tn/
        /{version}/
          /{book}/
            /{chapter}/
              {verse}-{noteId}.md             # Level: note

      # TRANSLATION WORDS (single level)
      /tw/
        /{version}/
          /{category}/
            {article}.md                      # Level: article

      # TRANSLATION ACADEMY (two levels)
      /ta/
        /{version}/
          /{article}/
            {section-num}-{section-name}.md   # Level: section
            _full.md                          # Level: article

      # TRANSLATION QUESTIONS (single level)
      /tq/
        /{version}/
          /{book}/
            /{chapter}/
              {verse}-q{num}.md               # Level: question
```

### 5.5 Version Handling and Auto-Cleanup

**Design Decision**: Multiple versions may coexist temporarily; R2 lifecycle rules auto-prune old versions.

#### Version in Path

Version is included in the file path to allow multiple versions to coexist:

```
/{language}/{organization}/{resource}/{version}/{book}/{chapter}/...

Examples:
en/unfoldingWord/ult/v85/JHN/3/verses/16.md
en/unfoldingWord/ult/v86/JHN/3/verses/16.md  ← Different files, both exist
```

#### Determining Latest Version

The LLM determines the latest version by comparing:

- **Version strings**: `v86 > v85` (simple string/numeric comparison)
- **`indexed_at` timestamps**: More recent = more current

**No `is_latest` flag needed.** The version number IS the indicator. Adding flags would require expensive rewrites when new versions arrive.

#### Auto-Cleanup via R2 Object Lifecycle

R2 Object Lifecycle rules automatically delete old files:

```
R2 Bucket Settings → Object Lifecycle Rules:
- Rule Name: auto-cleanup-old-versions
- Prefix: (empty = all objects)
- Action: Delete objects
- Expire after: 90 days
```

#### AI Search Index Sync

Cloudflare AI Search automatically removes deleted files from its index:

- AI Search reindexes every 6 hours
- Deleted R2 objects are removed from search results
- No manual index cleanup required

#### Self-Cleaning Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SELF-CLEANING ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Timeline for v85:                                                          │
│                                                                              │
│  Day 1:   v85 ZIP cached → v85 indexed                                      │
│  Day 30:  v86 ZIP cached → v86 indexed (v85 still exists)                   │
│  Day 91:  v85 hits 90-day expiration                                        │
│           └─ R2 Lifecycle deletes v85 files (within 24 hours)               │
│  Day 91+: AI Search reindexes (within 6 hours)                              │
│           └─ v85 removed from search results                                │
│                                                                              │
│  Result: Only v86+ remains searchable. Zero manual intervention.            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Typical Index State

At any given time, the index typically contains:

- **1-2 versions per resource** (current + recently replaced)
- Old versions auto-expire after 90 days
- Search results may include multiple versions temporarily
- LLM picks latest based on version comparison

#### Configuration Required

**R2 Lifecycle Rule** (via Cloudflare Dashboard):

1. Navigate to R2 → `translation-helps-search-index` bucket
2. Settings → Object Lifecycle Rules → Add Rule
3. Configure:
   - Name: `auto-cleanup-old-versions`
   - Prefix: (leave empty for all objects)
   - Expire after: `90` days
4. Save

---

## 6. Metadata Schema

### 6.1 Common Metadata (All Resources)

| Field           | Type   | Required | Description                                                             |
| --------------- | ------ | -------- | ----------------------------------------------------------------------- |
| `language`      | string | ✅       | ISO language code                                                       |
| `language_name` | string | ✅       | Human-readable name                                                     |
| `organization`  | string | ✅       | Content owner                                                           |
| `resource`      | string | ✅       | Resource type code                                                      |
| `resource_name` | string | ✅       | Human-readable name                                                     |
| `version`       | string | ✅       | Release version                                                         |
| `chunk_level`   | string | ✅       | `verse`, `passage`, `chapter`, `note`, `article`, `section`, `question` |
| `indexed_at`    | string | ✅       | ISO 8601 timestamp                                                      |

### 6.2 Scripture Metadata

| Field                 | Type   | Level   | Description                                         |
| --------------------- | ------ | ------- | --------------------------------------------------- |
| `book`                | string | All     | 3-letter book code                                  |
| `book_name`           | string | All     | Full book name                                      |
| `chapter`             | number | All     | Chapter number                                      |
| `verse`               | number | verse   | Verse number                                        |
| `verse_start`         | number | passage | First verse in passage                              |
| `verse_end`           | number | passage | Last verse in passage                               |
| `passage_title`       | string | passage | Passage name (e.g., "The Prodigal Son")             |
| `passage_type`        | string | passage | `parable`, `narrative`, `discourse`, `poetry`, etc. |
| `themes`              | array  | passage | Key themes for thematic search                      |
| `context_before`      | string | verse   | Previous verse text                                 |
| `context_after`       | string | verse   | Next verse text                                     |
| `summary`             | string | chapter | Chapter summary                                     |
| `passages_in_chapter` | array  | chapter | List of passage titles in chapter                   |

### 6.3 Translation Notes Metadata

| Field                      | Type   | Description                              |
| -------------------------- | ------ | ---------------------------------------- |
| `book`, `chapter`, `verse` |        | Same as scripture                        |
| `phrase`                   | string | Original language phrase being explained |
| `note_id`                  | string | Unique note identifier                   |
| `support_reference`        | string | Link to TA article if referenced         |

### 6.4 Translation Words Metadata

| Field              | Type   | Description                       |
| ------------------ | ------ | --------------------------------- |
| `article_id`       | string | Word identifier                   |
| `category`         | string | `kt` (key term), `names`, `other` |
| `title`            | string | Display title                     |
| `related`          | array  | Related article IDs               |
| `bible_references` | array  | Key scripture references          |

### 6.5 Translation Academy Metadata

| Field            | Type   | Level   | Description               |
| ---------------- | ------ | ------- | ------------------------- |
| `article_id`     | string | All     | Article identifier        |
| `article_title`  | string | All     | Full article title        |
| `section`        | number | section | Section number            |
| `section_title`  | string | section | Section heading           |
| `total_sections` | number | section | Total sections in article |
| `summary`        | string | article | Article summary           |

### 6.6 Translation Questions Metadata

| Field                      | Type   | Description        |
| -------------------------- | ------ | ------------------ |
| `book`, `chapter`, `verse` |        | Same as scripture  |
| `question_id`              | string | Unique question ID |
| `question_text`            | string | The question       |
| `answer_text`              | string | The answer         |

---

## 7. Content Format Examples

### 7.1 Scripture - Verse Level

```markdown
---
language: en
language_name: English
organization: unfoldingWord
resource: ult
resource_name: Literal Translation
version: v85
chunk_level: verse
book: LUK
book_name: Luke
chapter: 15
verse: 13
context_before: "And not many days after the younger son gathered all together"
context_after: "And when he had spent all, there arose a mighty famine in that land"
indexed_at: 2025-12-02T10:30:00Z
---

# Luke 15:13 (ULT)

And not many days after, the younger son gathered all together, and took his journey into a far country, and there wasted his substance with riotous living.
```

### 7.2 Scripture - Passage Level

```markdown
---
language: en
language_name: English
organization: unfoldingWord
resource: ult
resource_name: Literal Translation
version: v85
chunk_level: passage
book: LUK
book_name: Luke
chapter: 15
verse_start: 11
verse_end: 32
passage_title: The Parable of the Prodigal Son
passage_type: parable
themes:
  - repentance
  - forgiveness
  - grace
  - father's love
  - prodigal
  - restoration
  - reconciliation
indexed_at: 2025-12-02T10:30:00Z
---

# The Parable of the Prodigal Son (Luke 15:11-32)

## Summary

Jesus tells a parable about a father and his two sons. The younger son demands his inheritance early, leaves home, and squanders everything in reckless living. Destitute and humbled, he returns home expecting to be treated as a servant. Instead, the father welcomes him back with celebration and restores him as a son. The older brother resents this grace, revealing his own self-righteousness.

## Key Themes

- **God's unconditional love**: The father's eager welcome represents God's love for sinners
- **True repentance**: The son "comes to himself" and returns humbly
- **Grace over merit**: Restoration is a gift, not earned
- **The danger of self-righteousness**: The older brother's resentment mirrors the Pharisees

## Full Text

**11** And he said, A certain man had two sons:

**12** And the younger of them said to his father, Father, give me the portion of goods that falleth to me. And he divided unto them his living.

[... verses 13-31 ...]

**32** It was meet that we should make merry, and be glad: for this thy brother was dead, and is alive again; and was lost, and is found.
```

### 7.3 Scripture - Chapter Level

```markdown
---
language: en
language_name: English
organization: unfoldingWord
resource: ult
resource_name: Literal Translation
version: v85
chunk_level: chapter
book: LUK
book_name: Luke
chapter: 15
summary: "Jesus responds to Pharisees' criticism by telling three parables about God's joy over repentant sinners"
passages_in_chapter:
  - title: The Parable of the Lost Sheep
    verses: 1-7
  - title: The Parable of the Lost Coin
    verses: 8-10
  - title: The Parable of the Prodigal Son
    verses: 11-32
indexed_at: 2025-12-02T10:30:00Z
---

# Luke 15 - Parables of the Lost

## Overview

Luke 15 contains three of Jesus' most beloved parables, all responding to the Pharisees' criticism that Jesus "receives sinners and eats with them." Each parable illustrates God's heart for the lost and His joy when sinners repent.

## Passages in This Chapter

### The Parable of the Lost Sheep (vv. 1-7)

A shepherd leaves ninety-nine sheep to find the one that is lost, then celebrates when he finds it.

### The Parable of the Lost Coin (vv. 8-10)

A woman searches her whole house for one lost coin, then celebrates with her neighbors when she finds it.

### The Parable of the Prodigal Son (vv. 11-32)

A father's younger son squanders his inheritance, returns in repentance, and is welcomed home with celebration—while the older brother resents the grace shown.

## Key Themes

- God actively seeks the lost
- Heaven rejoices over one sinner who repents
- Self-righteousness blinds us to grace
```

### 7.4 Translation Note

```markdown
---
language: en
language_name: English
organization: unfoldingWord
resource: tn
resource_name: Translation Notes
version: v88
chunk_level: note
book: LUK
book_name: Luke
chapter: 15
verse: 13
phrase: "wasted his substance with riotous living"
note_id: luk-15-13-02
support_reference: figs-idiom
indexed_at: 2025-12-02T10:30:00Z
---

# Translation Note: Luke 15:13

## "wasted his substance with riotous living"

This phrase means he spent all his money on wild, immoral, and foolish behavior.

**Alternate translations:**

- "spent all his money on parties and sinful living"
- "used up everything he had by living foolishly and immorally"

The word translated "riotous" implies wastefulness and lack of self-control.

_See: [Idiom](../figs-idiom)_
```

### 7.5 Translation Word

```markdown
---
language: en
language_name: English
organization: unfoldingWord
resource: tw
resource_name: Translation Words
version: v85
chunk_level: article
article_id: grace
category: kt
title: Grace
related:
  - mercy
  - forgiveness
  - salvation
  - gift
bible_references:
  - Romans 3:24
  - Ephesians 2:8-9
  - Titus 2:11
  - John 1:14
indexed_at: 2025-12-02T10:30:00Z
---

# Grace

## Definition

The word **grace** refers to help or blessing that is given to someone who has not earned it. The term is especially used to refer to the kindness of God in saving people from sin.

## Key Points

- God gives grace to people because of his great love and mercy
- Grace is often contrasted with the law
- The law tells us what we must do; grace tells us what God has already done
- Salvation is "by grace through faith" - it cannot be earned

## Translation Suggestions

- "kindness" or "undeserved kindness"
- "gift" or "free gift"
- "favor" or "unmerited favor"

## Bible References

- **Romans 3:24** - "justified freely by his grace"
- **Ephesians 2:8-9** - "by grace you have been saved through faith"
- **Titus 2:11** - "the grace of God has appeared, bringing salvation"

## See Also

- [mercy](./mercy.md)
- [forgiveness](./forgiveness.md)
- [salvation](./salvation.md)
```

### 7.6 Translation Academy - Section Level

```markdown
---
language: en
language_name: English
organization: unfoldingWord
resource: ta
resource_name: Translation Academy
version: v85
chunk_level: section
article_id: figs-metaphor
article_title: Metaphor
section: 1
section_title: Description
total_sections: 4
indexed_at: 2025-12-02T10:30:00Z
---

# Metaphor - Description

## What is a Metaphor?

A **metaphor** is a figure of speech in which one concept is expressed by referring to something else that shares characteristics with it. Unlike a simile, a metaphor states directly that one thing IS another thing.

## Examples

- "God is my rock" - God is not literally a rock, but shares characteristics (solid, stable, reliable)
- "You are the light of the world" - Believers illuminate moral darkness
- "I am the bread of life" - Jesus provides spiritual sustenance

## How to Recognize a Metaphor

A metaphor directly states that one thing IS another thing, even though this is not literally true. The two things being compared share one or more important characteristics.
```

### 7.7 Translation Question

```markdown
---
language: en
language_name: English
organization: unfoldingWord
resource: tq
resource_name: Translation Questions
version: v88
chunk_level: question
book: LUK
book_name: Luke
chapter: 15
verse: 13
question_id: luk-15-13-q1
question_text: "What did the younger son do with his inheritance?"
answer_text: "He went to a far country and wasted it with riotous living."
indexed_at: 2025-12-02T10:30:00Z
---

# Luke 15:13 - Question 1

**Question:** What did the younger son do with his inheritance?

**Answer:** He went to a far country and wasted it with riotous living.
```

---

## 8. Search API Response Design

### 8.1 Design Principle: Rich Data for LLM Curation

The search endpoint returns **all matching chunks** with complete metadata. The LLM is responsible for:

- Selecting the appropriate chunk level for the user's intent
- Deduplicating overlapping results (e.g., verse vs. passage)
- Synthesizing multiple results into a coherent response for the human

### 8.2 Response Structure

```json
{
  "query": "prodigal son",
  "filters_applied": {
    "language": "en",
    "organization": "unfoldingWord"
  },
  "total_hits": 12,
  "took_ms": 45,
  "hits": [
    {
      "id": "en/unfoldingWord/ult/v85/LUK/15/passages/11-32.md",
      "chunk_level": "passage",
      "resource": "ult",
      "resource_name": "Literal Translation",
      "reference": "Luke 15:11-32",
      "title": "The Parable of the Prodigal Son",
      "themes": ["repentance", "forgiveness", "grace", "prodigal"],
      "score": 0.95,
      "preview": "Jesus tells a parable about a father and his two sons. The younger son demands his inheritance..."
    },
    {
      "id": "en/unfoldingWord/ult/v85/LUK/15/chapter.md",
      "chunk_level": "chapter",
      "resource": "ult",
      "resource_name": "Literal Translation",
      "reference": "Luke 15",
      "title": "Parables of the Lost",
      "score": 0.88,
      "preview": "Luke 15 contains three of Jesus' most beloved parables..."
    },
    {
      "id": "en/unfoldingWord/tn/v88/LUK/15/13-02.md",
      "chunk_level": "note",
      "resource": "tn",
      "resource_name": "Translation Notes",
      "reference": "Luke 15:13",
      "phrase": "wasted his substance with riotous living",
      "score": 0.72,
      "preview": "This phrase means he spent all his money on wild, immoral, and foolish behavior..."
    },
    {
      "id": "en/unfoldingWord/ult/v85/LUK/15/verses/13.md",
      "chunk_level": "verse",
      "resource": "ult",
      "resource_name": "Literal Translation",
      "reference": "Luke 15:13",
      "score": 0.68,
      "preview": "And not many days after, the younger son gathered all together, and took his journey..."
    }
  ]
}
```

### 8.3 LLM Processing Example

```
Human: "What does the Bible say about the prodigal son?"

LLM receives search results with:
- 1 passage-level hit (score 0.95) ← Best for thematic question
- 1 chapter-level hit (score 0.88)
- 3 note-level hits (scores 0.65-0.72)
- 5 verse-level hits (scores 0.55-0.68)

LLM decides:
- "This is a thematic question, passage level is best"
- "I'll use the passage hit as my primary source"
- "I'll mention the chapter context for additional info"
- "The verse-level hits are redundant with the passage, skip them"
- "The TN hits might help if user asks follow-up about translation"

LLM responds to human:
"The parable of the prodigal son is found in Luke 15:11-32.
It's one of three parables in Luke 15 about God's joy over
repentant sinners. Here's what happens in the story..."
```

### 8.4 What We DON'T Do (By Design)

| Anti-Pattern               | Why We Avoid It                                  |
| -------------------------- | ------------------------------------------------ |
| Server-side deduplication  | LLM is smarter about user intent                 |
| Query intent detection     | LLM already understands the human                |
| Automatic level selection  | LLM knows what granularity fits the conversation |
| Result reranking by intent | LLM handles this naturally                       |

---

## 9. Technical Specifications

### 9.1 Infrastructure Components

| Component                        | Type      | Purpose                                 |
| -------------------------------- | --------- | --------------------------------------- |
| `translation-helps-search-index` | R2 Bucket | Clean chunked content for AI Search     |
| `zip-indexing-queue`             | Queue     | Buffer indexing work                    |
| `zip-indexing-dlq`               | Queue     | Dead letter queue                       |
| `translation-helps-indexer`      | Worker    | Processes ZIPs → populates search index |

### 9.2 Wrangler Configuration - Indexer Worker

```toml
# workers/indexer/wrangler.toml
name = "translation-helps-indexer"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# Source bucket (read ZIPs)
[[r2_buckets]]
binding = "SOURCE_BUCKET"
bucket_name = "translation-helps-mcp-zip-persistence"

# Destination bucket (write clean chunks)
[[r2_buckets]]
binding = "SEARCH_INDEX_BUCKET"
bucket_name = "translation-helps-search-index"

[[queues.consumers]]
queue = "zip-indexing-queue"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "zip-indexing-dlq"

# Environment variables for AI Search reindex trigger
[vars]
CF_ACCOUNT_ID = "your-cloudflare-account-id"
AI_SEARCH_INDEX_ID = "translation-helps-search"

# CF_API_TOKEN stored as secret (npx wrangler secret put CF_API_TOKEN)
```

### 9.3 Wrangler Configuration - Main API (Updated)

```toml
# wrangler.toml (add to existing config)

# Existing ZIP cache bucket
[[r2_buckets]]
binding = "ZIP_FILES"
bucket_name = "translation-helps-mcp-zip-persistence"

# NEW: Search index bucket (read access for search endpoint)
[[r2_buckets]]
binding = "SEARCH_INDEX"
bucket_name = "translation-helps-search-index"

# AI binding for search queries
[ai]
binding = "AI"
```

### 9.4 Infrastructure Setup Commands

```bash
# 1. Create the search index bucket
npx wrangler r2 bucket create translation-helps-search-index

# 2. Create queues
npx wrangler queues create zip-indexing-queue
npx wrangler queues create zip-indexing-dlq

# 3. Configure event notification on source bucket
npx wrangler r2 bucket notification create translation-helps-mcp-zip-persistence \
  --event-type object-create \
  --queue zip-indexing-queue \
  --suffix ".zip"

# 4. Configure AI Search (via Cloudflare Dashboard)
#    - Create index: translation-helps-search
#    - Source: R2 bucket "translation-helps-search-index"
#    - File types: .md
#    - Index entire bucket (no prefix filter)

# 5. Configure R2 Lifecycle Rule for Auto-Cleanup (via Cloudflare Dashboard)
#    - Navigate to R2 → translation-helps-search-index bucket
#    - Settings → Object Lifecycle Rules → Add Rule
#    - Name: auto-cleanup-old-versions
#    - Prefix: (leave empty for all objects)
#    - Expire after: 90 days
#    - Save
#
#    This ensures old versions are automatically deleted after 90 days.
#    AI Search will remove deleted files from its index within 6 hours.

# 6. Create API Token for AI Search Reindex Trigger
#    - Navigate to Cloudflare Dashboard → API Tokens
#    - Create token with "AI Search: Edit" permission
#    - Store as secret in Indexer Worker:
npx wrangler secret put CF_API_TOKEN
#    - Also add to wrangler.toml [vars]:
#      CF_ACCOUNT_ID = "your-account-id"
#      AI_SEARCH_INDEX_ID = "translation-helps-search"
#
#    The Indexer Worker calls the reindex API after writing files,
#    making content searchable within ~1-5 minutes instead of waiting
#    for the 6-hour automatic reindex cycle.
```

### 9.5 Code Reuse

The Indexer Worker imports existing modules:

- `src/services/ContentCleaners.ts` - USFM, TSV, Markdown cleaning
- `src/utils/metadata-extractors.ts` - Metadata extraction
- `src/parsers/` - USFM parsing for verse/passage extraction
- Shared utilities for book codes, reference parsing, etc.

---

## 10. Estimated Scale

### 10.1 File Count Projections (with Multi-Level)

| Resource                       | Chunks per Language | English Only | 50 Languages |
| ------------------------------ | ------------------- | ------------ | ------------ |
| Scripture (verses)             | ~31,000             | 31,000       | 1.5M         |
| Scripture (passages)           | ~1,200              | 1,200        | 60K          |
| Scripture (chapters)           | ~1,189              | 1,189        | 60K          |
| Translation Notes              | ~50,000             | 50,000       | 2.5M         |
| Translation Words              | ~1,000              | 1,000        | 50K          |
| Translation Academy (sections) | ~1,500              | 1,500        | 75K          |
| Translation Academy (articles) | ~500                | 500          | 25K          |
| Translation Questions          | ~20,000             | 20,000       | 1M           |
| **Total**                      |                     | **~105K**    | **~5.3M**    |

### 10.2 Storage Estimate

- Average file size: ~600 bytes
- 5.3M files × 600 bytes = **~3.2 GB**
- R2 cost: $0.015/GB/month = **~$0.05/month**

### 10.3 Search Performance

| Metric        | Impact of Multi-Level                |
| ------------- | ------------------------------------ |
| Index size    | 3x larger for scripture (still tiny) |
| Query latency | No change (O(log n) lookups)         |
| Result count  | More hits, LLM filters               |

---

## 11. Non-Functional Requirements

### NFR-1: Performance

| Metric                            | Target                        |
| --------------------------------- | ----------------------------- |
| Time from ZIP cached → searchable | < 5 minutes                   |
| Queue processing throughput       | 50+ ZIPs/minute               |
| API response time impact          | Zero (no changes to API path) |
| Search query latency              | < 100ms                       |

**Time to Searchable Breakdown**:

- R2 Event Notification → Queue: ~seconds
- Queue → Indexer Worker: ~seconds
- Indexer processes ZIP: ~1-2 minutes (varies by size)
- Trigger AI Search reindex: ~seconds
- AI Search indexes new content: ~1-3 minutes
- **Total: ~1-5 minutes**

**Note**: Without manual reindex trigger, content would wait up to 6 hours for auto-reindex. The manual trigger makes content searchable within minutes.

### NFR-2: Reliability

- **Idempotent processing**: Re-processing a ZIP produces identical results
- **Exactly-once delivery**: Messages acknowledged only after success
- **Dead letter queue**: Failed messages preserved for investigation

### NFR-3: Observability

- Log all indexing operations with file counts per level and timing
- Track queue depth and processing rate
- Alert on DLQ messages
- Dashboard for index coverage (% of resources indexed)

---

## 12. Migration Plan

### Phase 1: Infrastructure Setup (Day 1)

- [ ] Create `translation-helps-search-index` bucket
- [ ] Create queues
- [ ] Configure R2 event notification
- [ ] Deploy stub Indexer Worker (logs only)
- [ ] Verify events flow end-to-end

### Phase 2: Indexer Implementation - Core (Days 2-4)

- [ ] Implement content cleaning per resource type
- [ ] Implement verse-level chunking for scripture
- [ ] Implement single-level chunking for helps resources
- [ ] Implement metadata extraction
- [ ] Implement .md file generation with frontmatter
- [ ] Deploy and verify basic index population

### Phase 3: Multi-Level Chunking (Days 5-6)

- [ ] Implement passage boundary detection (USFM markers, pericopes)
- [ ] Implement passage-level chunk generation with themes
- [ ] Implement chapter-level summary generation
- [ ] Implement TA article-level aggregation
- [ ] Deploy and verify multi-level index

### Phase 4: Search Integration (Day 7)

- [ ] Configure AI Search on new bucket
- [ ] Update `/api/search` to use new index
- [ ] Add filter parameters (language, resource, book, chunk_level, etc.)
- [ ] Test search queries returning all levels
- [ ] Verify LLM can process and curate results

### Phase 5: API Cleanup (Day 8)

- [ ] Remove `/clean/` write logic from `ZipResourceFetcher2`
- [ ] Verify API still serves data correctly
- [ ] Verify Filter feature still works

### Phase 6: Validation (Days 9-10)

- [ ] End-to-end test: new resource → indexed → searchable
- [ ] Thematic search testing (parables, themes)
- [ ] LLM curation testing (does it pick the right level?)
- [ ] Performance testing
- [ ] Edge case testing

---

## 13. Success Metrics

| Metric                       | Current             | Target                        |
| ---------------------------- | ------------------- | ----------------------------- |
| API response time            | 70ms                | 70ms (unchanged)              |
| Time to searchable           | Immediate (coupled) | < 5 min (decoupled + reindex) |
| Indexing code in API         | ~200 lines          | 0 lines                       |
| "Prodigal son" search        | Poor/no results     | Passage-level match           |
| Search precision (specific)  | Good                | Excellent (verse-level)       |
| Search recall (thematic)     | Poor                | Excellent (passage-level)     |
| Indexing failures affect API | Possible            | Impossible                    |
| LLM result curation          | N/A                 | LLM selects appropriate level |

---

## 14. Risks and Mitigations

| Risk                         | Impact                  | Likelihood | Mitigation                         |
| ---------------------------- | ----------------------- | ---------- | ---------------------------------- |
| R2 events delayed            | Search slower to update | Low        | Acceptable; eventual consistency   |
| Indexer Worker crashes       | Messages stuck          | Low        | DLQ + monitoring + retries         |
| Passage detection inaccurate | Themes split awkwardly  | Medium     | Use established pericope divisions |
| AI Search limit reached      | Search degraded         | Low        | Monitor index size                 |
| LLM picks wrong level        | Suboptimal response     | Low        | Rich metadata helps LLM decide     |
| Too many results             | LLM context overflow    | Medium     | Limit parameter, LLM truncation    |

---

## 15. Out of Scope

- Real-time search (eventual consistency acceptable)
- Custom embedding models (use AI Search defaults)
- Cross-language search (search within one language)
- UI changes (backend only)
- Pre-populated index for unused resources
- Server-side result curation (LLM handles this)

---

## 16. Glossary

| Term                    | Definition                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------ |
| **Search**              | AI-powered discovery across all indexed content (BM25/semantic)                      |
| **Filter**              | Regex/string matching on already-fetched data                                        |
| **Chunk**               | A single semantic unit stored as one .md file                                        |
| **Chunk Level**         | Granularity: `verse`, `passage`, `chapter`, `note`, `article`, `section`, `question` |
| **Pericope**            | A literary unit in scripture (story, discourse, poem)                                |
| **Frontmatter**         | YAML metadata at the top of a Markdown file                                          |
| **Search Index Bucket** | R2 bucket containing only clean, chunked content                                     |
| **LLM-as-Client**       | Design philosophy: return rich data, let the LLM curate for humans                   |

---

## 17. Appendix

### A. R2 Event Notification Message Format

```typescript
interface R2EventNotification {
  account: string;
  bucket: string;
  object: {
    key: string;
    size: number;
    eTag: string;
  };
  eventTime: string;
  action: "PutObject" | "CopyObject" | "CompleteMultipartUpload";
}
```

### B. Standard Pericope Sources

For passage boundary detection:

- **USFM Section Markers**: `\s`, `\s1`, `\s2` (section headings)
- **USFM Paragraph Markers**: `\p`, `\m`, `\pi` (paragraph breaks)
- **Nestle-Aland Pericope Divisions**: Standard scholarly divisions
- **Translation Notes Ranges**: When a TN spans multiple verses, it indicates a unit

### C. Theme Extraction

Themes for passage-level chunks can be derived from:

1. Section headings in USFM
2. Translation Notes that reference thematic concepts
3. Translation Word links within the passage
4. Known biblical themes database

### D. LLM Integration Notes

The LLM (via MCP) should:

1. **Receive all matching chunks** at all levels
2. **Use `chunk_level` field** to understand what each result represents
3. **Select the appropriate level** based on user intent:
   - Specific reference → `verse`
   - Thematic question → `passage`
   - Overview question → `chapter`
   - Definition question → `article`
4. **Deduplicate naturally** - if verse is in passage, use passage for thematic queries
5. **Make follow-up requests** if initial results aren't at the right granularity

### E. Related Documents

- `docs/CACHE_ARCHITECTURE.md` - Caching rules
- `docs/HYBRID_SEARCH_FEATURE.md` - Current AI Search setup
- `src/services/ContentCleaners.ts` - Cleaning implementations
- `src/utils/metadata-extractors.ts` - Metadata extraction
