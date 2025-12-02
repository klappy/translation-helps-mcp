# Search Indexer Worker

Event-driven worker that automatically indexes Translation Helps content for AI Search.

## Architecture

```
ZIP cached in R2 → R2 Event → Queue → Indexer Worker → Search Index Bucket → AI Search
```

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
- `zip-indexing-queue` queue
- `zip-indexing-dlq` dead letter queue
- R2 event notification for `.zip` files

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

```bash
cd src/workers/indexer
npm install
npx wrangler deploy
```

## Development

### Local Development

```bash
cd src/workers/indexer
npm run dev
```

### View Logs

```bash
npx wrangler tail
```

## File Structure

```
src/workers/indexer/
├── index.ts                 # Queue consumer entry point
├── wrangler.toml            # Worker configuration
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── types.ts                 # Type definitions
├── chunkers/
│   ├── scripture-chunker.ts # Multi-level: verse, passage, chapter
│   ├── notes-chunker.ts     # Single level: note
│   ├── words-chunker.ts     # Single level: article
│   ├── academy-chunker.ts   # Two levels: section, article
│   └── questions-chunker.ts # Single level: question
└── utils/
    ├── markdown-generator.ts # YAML frontmatter generation
    ├── ai-search-trigger.ts  # Reindex API call
    └── zip-handler.ts        # ZIP extraction utilities
```

## Chunk Levels

| Resource              | Levels                  | Description                                 |
| --------------------- | ----------------------- | ------------------------------------------- |
| Scripture             | verse, passage, chapter | Multi-level for precise and thematic search |
| Translation Notes     | note                    | One chunk per note                          |
| Translation Words     | article                 | One chunk per word definition               |
| Translation Academy   | section, article        | Two levels for navigation and overview      |
| Translation Questions | question                | One chunk per Q&A pair                      |

## Version Handling

- Version is included in file paths: `en/unfoldingWord/ult/v86/JHN/3/...`
- Multiple versions can coexist
- R2 lifecycle rule auto-deletes after 90 days
- AI Search reindexes every 6 hours (or on manual trigger)
- LLM compares versions to pick latest: `v86 > v85`

## Monitoring

### Queue Health

```bash
# Check queue depth
npx wrangler queues info zip-indexing-queue

# Check dead letter queue
npx wrangler queues info zip-indexing-dlq
```

### R2 Bucket Stats

```bash
# List objects in search index bucket
npx wrangler r2 object list translation-helps-search-index --prefix "en/"
```
