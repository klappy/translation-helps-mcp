# Search Indexer Worker

Event-driven worker that automatically indexes Translation Helps content for AI Search.

## Architecture (v2 - Two-Queue Pipeline)

```
┌──────────────────────────────────────────────────────────────────┐
│  ZIP Event → Unzip Worker (list + extract) → writes files to R2 │
│                                                    ↓             │
│                    R2 Event (extracted file) → Index Worker      │
│                           ↑                                      │
│    Main API extractions ──┘                                      │
└──────────────────────────────────────────────────────────────────┘
```

**Key Features:**

- **Two Queues:** Separates ZIP extraction from indexing for better resource management
- **Memory Efficient:** Extracts one file at a time to stay within Cloudflare Workers limits
- **Universal Indexing:** Files extracted by the main API also trigger indexing via R2 events
- **Consistent Keys:** All R2 keys use normalized `by-url/...` format

## Setup

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
- R2 event notifications:
  - `.zip` → `zip-unzip-queue`
  - `.usfm`, `.tsv`, `.md`, `.txt`, `.json` → `zip-indexing-queue`

### 2. Configure AI Search (Cloudflare Dashboard)

1. Navigate to **AI** → **AI Search** in the Cloudflare Dashboard
2. Click **Create Index**
3. Configure:
   - **Name**: `translation-helps-search`
   - **Data Source**: R2 bucket `translation-helps-search-index`
   - **File Types**: `.md`
   - **Index Entire Bucket**: Yes (no prefix filter needed)
4. Click **Create**

### 3. Configure R2 Lifecycle Rule (Cloudflare Dashboard)

1. Navigate to **R2** → `translation-helps-search-index` bucket
2. Go to **Settings** → **Object Lifecycle Rules**
3. Click **Add Rule**
4. Configure:
   - **Name**: `auto-cleanup-old-versions`
   - **Prefix**: (leave empty for all objects)
   - **Expire after**: `90` days
5. Click **Save**

### 4. Create API Token for Reindex Trigger

1. Navigate to **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use **Custom Token** template
4. Configure:
   - **Name**: `AI Search Reindex`
   - **Permissions**: `AI Search: Edit`
   - **Zone Resources**: All zones (or specific account)
5. Click **Create Token**
6. Copy the token

### 5. Set Worker Secrets

```bash
# Navigate to worker directory
cd src/workers/indexer

# Set the API token secret
npx wrangler secret put CF_API_TOKEN
# Paste your token when prompted

# Update wrangler.toml with your account ID
# Find it in Cloudflare Dashboard → Overview (right sidebar)
```

### 6. Deploy the Worker

Deployment is handled automatically via GitHub hooks when you push to main.

For manual deployment:

```bash
cd src/workers/indexer
npm install
npx wrangler deploy
```

## How It Works

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
3. Parses and cleans content based on file type:
   - `.usfm` → Scripture (USFM → Markdown)
   - `.tsv` → Notes, Questions, Word Links
   - `.md` → Translation Words, Academy
4. Writes clean chunk to search index bucket
5. Triggers AI Search reindex

## File Structure

```
src/workers/indexer/
├── index.ts                 # Pipeline router (dispatches to handlers)
├── unzip-worker.ts          # ZIP extraction handler
├── index-worker.ts          # File indexing handler
├── wrangler.toml            # Worker configuration (two queues)
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── types.ts                 # Type definitions
├── chunkers/                # Legacy chunkers (for batch processing)
│   ├── scripture-chunker.ts
│   ├── notes-chunker.ts
│   ├── words-chunker.ts
│   ├── academy-chunker.ts
│   └── questions-chunker.ts
└── utils/
    ├── markdown-generator.ts # YAML frontmatter generation
    ├── ai-search-trigger.ts  # Reindex API call
    ├── parallel.ts           # Parallel processing utilities
    └── zip-handler.ts        # ZIP extraction utilities
```

## R2 Key Format

All extracted files use the normalized format:

```
by-url/git.door43.org/{org}/{repo}/archive/{version}.zip/files/{filepath}
```

Example:

```
by-url/git.door43.org/unfoldingWord/en_ult/archive/v87.zip/files/43-JHN.usfm
```

## Chunk Levels

| Resource              | Level   | Description                     |
| --------------------- | ------- | ------------------------------- |
| Scripture             | book    | One chunk per book              |
| Translation Notes     | book    | One chunk per book of notes     |
| Translation Words     | article | One chunk per word definition   |
| Translation Academy   | article | One chunk per academy article   |
| Translation Questions | book    | One chunk per book of questions |

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

- Version is included in file paths: `en/unfoldingWord/ult/v87/JHN.md`
- Multiple versions can coexist
- R2 lifecycle rule auto-deletes after 90 days
- AI Search reindexes every 6 hours (or on manual trigger)
