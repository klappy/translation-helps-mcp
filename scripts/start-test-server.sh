#!/bin/bash

# Start Test Server Script
# 
# This is the ONLY approved way to start the dev server for tests
# Uses Wrangler to ensure KV/R2 bindings work correctly

echo "🚀 Starting Wrangler dev server for tests..."
echo ""
echo "This is the ONLY way to test KV/R2 functionality!"
echo ""

cd ui

# Build first to ensure we have the latest
echo "📦 Building application..."
npm run build:cloudflare

# Start Wrangler on the standard test port
echo "🔧 Starting Wrangler on port 8787..."
npx wrangler pages dev .svelte-kit/cloudflare --port 8787
