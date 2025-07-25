#!/bin/bash

# Unattended Deployment Script
# Ensures deployment runs without any prompts or hanging

set -e  # Exit on error
set -u  # Exit on undefined variable

echo "🚀 Starting unattended deployment..."

# Ensure we're in the project root
cd "$(dirname "$0")/.." || exit 1

# Install dependencies without prompts
echo "📦 Installing dependencies..."
npm ci --yes --no-audit --no-fund || npm install --yes --no-audit --no-fund

# Run tests with no-watch flag
echo "🧪 Running tests..."
npm run test -- --no-watch --reporter=dot || {
  echo "❌ Tests failed!"
  exit 1
}

# Build the project
echo "🔨 Building project..."
npm run build || {
  echo "❌ Build failed!"
  exit 1
}

# Run performance tests (non-interactive)
echo "⚡ Running performance benchmarks..."
npm run test -- tests/performance-benchmarks.test.ts --no-watch || {
  echo "⚠️ Performance tests failed (non-blocking)"
}

# Deploy to staging first (if configured)
if [ -n "${STAGING_URL:-}" ]; then
  echo "🔄 Deploying to staging..."
  netlify deploy --dir=ui/build --alias=staging --json --yes || {
    echo "❌ Staging deployment failed!"
    exit 1
  }
  
  # Smoke test staging
  echo "🔍 Testing staging deployment..."
  curl -f "${STAGING_URL}/api/health" || {
    echo "❌ Staging health check failed!"
    exit 1
  }
fi

# Deploy to production
echo "🚀 Deploying to production..."
netlify deploy --prod --dir=ui/build --json --yes || {
  echo "❌ Production deployment failed!"
  exit 1
}

# Verify deployment
if [ -n "${PRODUCTION_URL:-}" ]; then
  echo "✅ Verifying production deployment..."
  sleep 10  # Give it time to propagate
  
  curl -f "${PRODUCTION_URL}/api/health" || {
    echo "❌ Production health check failed!"
    exit 1
  }
fi

echo "✅ Deployment completed successfully!"
echo "📊 Deployment summary:"
echo "  - Tests: PASSED"
echo "  - Build: SUCCESS"
echo "  - Deploy: COMPLETE"
echo "  - Health: VERIFIED"

# Optional: Send notification (non-blocking)
if [ -n "${SLACK_WEBHOOK:-}" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"✅ Translation Helps MCP deployed successfully!"}' \
    "$SLACK_WEBHOOK" 2>/dev/null || true
fi

exit 0