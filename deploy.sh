#!/bin/bash

# Translation Helps MCP - Manual Deploy Script
# Use this if auto-deploy isn't working or for testing

set -e

echo "🚀 Starting manual deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Build everything
echo "🔨 Building project..."
npm run build:all

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
netlify deploy --prod

echo "✅ Deployment complete!"
echo "🌍 Check your site: https://translation-helps-mcp.netlify.app"

# Test the health endpoint
echo "🔍 Testing health endpoint..."
sleep 5
curl -s "https://translation-helps-mcp.netlify.app/.netlify/functions/health" | jq -r '.version' || echo "Health check failed"

echo "🎉 All done!" 