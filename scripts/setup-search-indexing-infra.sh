#!/bin/bash
# Search Indexing Pipeline Infrastructure Setup
# Run this script with Cloudflare credentials configured
# 
# Prerequisites:
# - npx wrangler login (or set CLOUDFLARE_API_TOKEN)
# - Cloudflare account with R2 and Queues enabled

set -e

echo "=== Creating Search Index R2 Bucket ==="
npx wrangler r2 bucket create translation-helps-search-index

echo ""
echo "=== Creating Indexing Queue ==="
npx wrangler queues create zip-indexing-queue

echo ""
echo "=== Creating Dead Letter Queue ==="
npx wrangler queues create zip-indexing-dlq

echo ""
echo "=== Configuring R2 Event Notification ==="
npx wrangler r2 bucket notification create translation-helps-mcp-zip-persistence \
  --event-type object-create \
  --queue zip-indexing-queue \
  --suffix ".zip"

echo ""
echo "=== Infrastructure Setup Complete ==="
echo ""
echo "Next steps (via Cloudflare Dashboard):"
echo "1. Configure AI Search on the new bucket"
echo "2. Add 90-day lifecycle rule to translation-helps-search-index"
echo "3. Create API token for AI Search reindex trigger"
echo "   - Store as secret: npx wrangler secret put CF_API_TOKEN --config src/workers/indexer/wrangler.toml"

