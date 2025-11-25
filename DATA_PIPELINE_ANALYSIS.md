# Data Pipeline Analysis: Scripture Search

## Test Case: Gospel of John (ULT)

- **879 verses**, 21 chapters
- Mid-size book (Psalms would be 2,461 verses)

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA PIPELINE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STAGE 1: Origin (DCS)          STAGE 2: Transport       STAGE 3: Cache     │
│  ┌──────────────────┐           ┌──────────────┐         ┌──────────────┐   │
│  │  Raw USFM File   │           │   ZIP File   │         │  R2 Bucket   │   │
│  │   3.0 MB/file    │──────────▶│   9.2 MB     │────────▶│  9.2 MB      │   │
│  │  (John only)     │           │  (all 66     │         │  (cached)    │   │
│  │  ~797K tokens    │           │   books)     │         │              │   │
│  └──────────────────┘           └──────────────┘         └──────────────┘   │
│                                                                  │           │
│                                                                  ▼           │
│  STAGE 6: Response              STAGE 5: Process          STAGE 4: Extract  │
│  ┌──────────────────┐           ┌──────────────┐         ┌──────────────┐   │
│  │  JSON Response   │◀──────────│  Parse USFM  │◀────────│  Unzip File  │   │
│  │   110 KB         │           │  Strip tags  │         │  3.0 MB      │   │
│  │  ~28K tokens     │           │  106K chars  │         │  (John)      │   │
│  └──────────────────┘           └──────────────┘         └──────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage-by-Stage Analysis

### Stage 1: Origin Data (DCS Git Repository)

| Metric                   | Value                    | Notes                      |
| ------------------------ | ------------------------ | -------------------------- |
| **Raw USFM file (John)** | 3,187,469 bytes (3.0 MB) | With word-level alignment  |
| Lines                    | 19,812                   |                            |
| Words                    | 159,755                  |                            |
| Estimated tokens         | **~797,000**             | Alignment markers dominate |

**Why so large?** ULT contains word-by-word Greek alignment:

```usfm
\v 1 \zaln-s |x-strong="G17220" x-lemma="ἐν" x-morph="Gr,P,,,,,D,,,"
x-occurrence="1" x-occurrences="1" x-content="ἐν"\*\w In|x-occurrence="1"
x-occurrences="1"\w*\zaln-e\*
```

Each English word has:

- Strong's number (`G17220`)
- Greek lemma (`ἐν`)
- Morphology code (`Gr,P,,,,,D,,,`)
- Occurrence tracking
- Greek source word

---

### Stage 2: ZIP Archive (DCS Storage)

| Resource   | ZIP Size | Files     | Compression |
| ---------- | -------- | --------- | ----------- |
| **en_ult** | 9.2 MB   | 77 files  | ~3:1 ratio  |
| en_ust     | 10.6 MB  | 76 files  |             |
| en_tn      | 7.9 MB   | 78 files  |             |
| en_tw      | 938 KB   | 967 files |             |

**Total for all 4 resources: ~29 MB**

---

### Stage 3: R2 Cache (Cloudflare Edge)

| Metric                   | Value       | Notes              |
| ------------------------ | ----------- | ------------------ |
| Cache hit time           | 20-40ms     | From R2 edge cache |
| Cache miss (first fetch) | 2-5 seconds | Download from DCS  |
| TTL                      | 7 days      |                    |
| Storage per resource     | ~10 MB      | Entire ZIP cached  |

---

### Stage 4: ZIP Extraction

| Metric         | Value  | Notes                  |
| -------------- | ------ | ---------------------- |
| **Unzip time** | 266ms  | Using fflate (en_ult)  |
| Memory usage   | ~30 MB | Uncompressed in memory |
| John file size | 3.0 MB | Single book extracted  |

---

### Stage 5: USFM Processing

| Metric                | Value  | Notes                       |
| --------------------- | ------ | --------------------------- |
| Parse time            | 5-20ms | Stripping alignment markers |
| **Input size**        | 3.0 MB | Raw USFM with alignment     |
| **Output size**       | 106 KB | Clean text only             |
| **Compression ratio** | 30:1   | Alignment overhead removed  |

**Transformation:**

```
Input:  \zaln-s |x-strong="G17220"...\w In|...\w*\zaln-e\*
Output: In
```

---

### Stage 6: JSON Response

| Metric               | Value         | Notes                |
| -------------------- | ------------- | -------------------- |
| **Response size**    | 109.7 KB      | JSON with metadata   |
| Text content         | 106,191 chars | Clean scripture text |
| **Estimated tokens** | ~26,500       | GPT-4 tokenization   |
| Response time        | 70ms          | Total round-trip     |

---

## Token Size Summary (John - ULT)

| Stage             | Size     | Tokens (est.) | Notes             |
| ----------------- | -------- | ------------- | ----------------- |
| Raw USFM (origin) | 3.0 MB   | ~797,000      | With alignment    |
| ZIP (compressed)  | 9.2 MB\* | -             | All 66 books      |
| Extracted file    | 3.0 MB   | ~797,000      |                   |
| Parsed text       | 106 KB   | ~26,500       | Clean text        |
| **API Response**  | 110 KB   | **~28,000**   | With JSON wrapper |

\*ZIP contains all books, not just John

---

## Timing Breakdown (Normal Fetch - Warm Cache)

```
Total: 70ms

├── Cache lookup (R2)         : 20-40ms
├── Decompress (in-memory)    : ~5ms   (single file extraction)
├── Parse USFM               : 5-20ms  (strip alignment)
├── Build JSON response      : 2-5ms
└── Network transit          : 5-10ms
```

---

## Timing Breakdown (Search All Books - Cold Cache)

```
Total: 16-40 seconds (!)

For each of 49 books:
├── Cache lookup (R2)         : 20-40ms    ✅
├── Decompress               : 50-300ms   ✅
├── Parse USFM to verses     : 100-500ms  🐌 (large books)
├── Create MiniSearch index  : 50-200ms   🐌
├── Index all verses         : 100-800ms  🐌 (large books)
├── Search index            : 5-20ms     ✅
└── Discard index           : 0ms        ❌ (wasted work)

× 49 books = 16-40 seconds
```

---

## Key Insights

### 1. Alignment Data is 96% of Source Size

The word-level Greek alignment makes ULT files ~30x larger than they need to be for plain text. This is valuable for translation work but adds overhead.

### 2. Cache is Critical

- **Warm cache**: 70ms response
- **Cold cache**: 2-5 seconds for ZIP download

### 3. Search Bottleneck is Indexing, Not I/O

For search operations:

- Network/cache: ~10% of time
- **Parsing + Indexing: ~90% of time**

### 4. Token Context Windows

For LLM context:

- Single verse: ~50-100 tokens
- Single chapter: ~500-2,000 tokens
- **Full book (John): ~26,500 tokens**
- Full Bible (ULT): ~800,000 tokens

---

## Recommendations

### For Normal Scripture Fetching

✅ **Current implementation is optimal**

- 70ms response time
- Effective caching
- Clean text extraction

### For Broad Search

❌ **Current search-all-books is slow**

- Use `/api/search` endpoint instead (has index caching)
- Or redirect to search endpoint when no reference provided

### For LLM Integration

📝 **Consider context size carefully**

- Single book = ~26K tokens (near GPT-4 context limit)
- Use verse/chapter references, not full books
- The API already returns clean text suitable for LLM consumption

---

_Analysis Date: November 25, 2025_
