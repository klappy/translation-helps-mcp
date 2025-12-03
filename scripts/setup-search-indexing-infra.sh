#!/bin/bash
# Search Indexing Pipeline Infrastructure Setup
# Run this script with Cloudflare credentials configured
# 
# Architecture:
#   ZIP files → zip-unzip-queue → Unzip Worker → extracts files to R2
#   Extracted files → zip-indexing-queue → Index Worker → search index
#
# Prerequisites:
# - npx wrangler login (or set CLOUDFLARE_API_TOKEN)
# - Cloudflare account with R2 and Queues enabled

set -e

BUCKET_NAME="translation-helps-mcp-zip-persistence"
SEARCH_BUCKET="translation-helps-search-index"

echo "=== Creating Search Index R2 Bucket ==="
npx wrangler r2 bucket create $SEARCH_BUCKET || echo "Bucket may already exist"

echo ""
echo "=== Creating Unzip Queue (for ZIP files) ==="
npx wrangler queues create zip-unzip-queue || echo "Queue may already exist"

echo ""
echo "=== Creating Unzip Dead Letter Queue ==="
npx wrangler queues create zip-unzip-dlq || echo "Queue may already exist"

echo ""
echo "=== Creating Indexing Queue (for extracted files) ==="
npx wrangler queues create zip-indexing-queue || echo "Queue may already exist"

echo ""
echo "=== Creating Indexing Dead Letter Queue ==="
npx wrangler queues create zip-indexing-dlq || echo "Queue may already exist"

echo ""
echo "=== Configuring R2 Event Notifications ==="
echo ""

# ZIP files go to Unzip Worker
echo "Setting up .zip notification → zip-unzip-queue"
npx wrangler r2 bucket notification create $BUCKET_NAME \
  --event-type object-create \
  --queue zip-unzip-queue \
  --suffix ".zip"

# Extracted files go to Index Worker
echo ""
echo "Setting up extracted file notifications → zip-indexing-queue"

echo "  .usfm (scripture)"
npx wrangler r2 bucket notification create $BUCKET_NAME \
  --event-type object-create \
  --queue zip-indexing-queue \
  --suffix ".usfm"

echo "  .tsv (notes, questions, word links)"
npx wrangler r2 bucket notification create $BUCKET_NAME \
  --event-type object-create \
  --queue zip-indexing-queue \
  --suffix ".tsv"

echo "  .md (translation words, academy)"
npx wrangler r2 bucket notification create $BUCKET_NAME \
  --event-type object-create \
  --queue zip-indexing-queue \
  --suffix ".md"

echo "  .txt (metadata)"
npx wrangler r2 bucket notification create $BUCKET_NAME \
  --event-type object-create \
  --queue zip-indexing-queue \
  --suffix ".txt"

echo "  .json (metadata)"
npx wrangler r2 bucket notification create $BUCKET_NAME \
  --event-type object-create \
  --queue zip-indexing-queue \
  --suffix ".json"

echo ""
echo "=== Infrastructure Setup Complete ==="
echo ""
echo "Queue routing:"
echo "  ZIP files (.zip) → zip-unzip-queue → Unzip Worker"
echo "  Extracted files (.usfm, .tsv, .md, .txt, .json) → zip-indexing-queue → Index Worker"
echo ""
echo "Next steps (via Cloudflare Dashboard):"
echo "1. Configure AI Search on the search index bucket"
echo "2. Add 90-day lifecycle rule to $SEARCH_BUCKET"
echo "3. Create API token for AI Search reindex trigger"
echo "   - Store as secret: npx wrangler secret put CF_API_TOKEN --config src/workers/indexer/wrangler.toml"
