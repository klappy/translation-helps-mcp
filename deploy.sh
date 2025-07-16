#!/bin/bash

# Translation Helps API Deployment Script
# This script helps you deploy the API to Netlify

echo "🙏 Translation Helps API Deployment"
echo "=================================="

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Check if logged in to Netlify
if ! netlify status > /dev/null 2>&1; then
    echo "🔐 Please log in to Netlify..."
    netlify login
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
echo ""
echo "Choose an option:"
echo "1. Deploy to a new site"
echo "2. Deploy to an existing site"
echo "3. Deploy as draft (preview)"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "Creating new site and deploying..."
        netlify deploy --prod --dir=.
        ;;
    2)
        echo "Deploying to existing site..."
        netlify deploy --prod
        ;;
    3)
        echo "Creating draft deployment..."
        netlify deploy
        ;;
    *)
        echo "Invalid choice. Creating draft deployment..."
        netlify deploy
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Netlify dashboard"
echo "2. Set environment variables if needed"
echo "3. Test your API endpoints"
echo ""
echo "🧪 Test commands:"
echo "curl \"https://your-site.netlify.app/api/health\""
echo "curl \"https://your-site.netlify.app/api/fetch-resources?reference=John+3:16\""
echo "" 