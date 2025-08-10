# Translation Helps MCP - Complete Deployment Guide

This guide covers everything you need to deploy Translation Helps MCP to production on Cloudflare Workers.

## 🚀 **Current Architecture: Cloudflare Workers + HTTP MCP**

Translation Helps MCP v4.3.0+ uses a revolutionary **HTTP-based MCP** architecture that runs perfectly on Cloudflare Workers without WebSockets or long-lived connections.

### ✨ Live Production Deployment

- **HTTP MCP Endpoint**: `https://translation-helps-mcp.pages.dev/api/mcp`
- **Interactive Test UI**: `https://translation-helps-mcp.pages.dev/mcp-http-test`
- **Main Site**: `https://translation-helps-mcp.pages.dev`

## 🏗️ **Platform-Agnostic Architecture**

The project uses **shared business logic** that can run on multiple platforms:

```
translation-helps-mcp/
├── src/functions/                    # 🎯 Platform-agnostic business logic
│   ├── platform-adapter.ts          # Platform abstraction layer
│   ├── handlers/                     # Individual endpoint handlers
│   └── services/                     # Business logic services
├── netlify/                          # Netlify-specific wrappers (legacy)
└── ui/src/routes/api/               # SvelteKit API routes (Cloudflare)
```

**Platform Adapter Benefits:**

- Single codebase for multiple platforms
- Consistent behavior across environments
- Easy platform switching via build commands
- Shared testing and validation

## 📋 **Quick Deployment Options**

### Option 1: Cloudflare Pages (Recommended)

**Automatic GitHub Integration:**

1. **Connect Repository**: Link your GitHub repo to Cloudflare Pages
2. **Build Settings**:
   ```bash
   Build command: npm run build
   Output directory: ui/build
   Root directory: /
   ```
3. **Environment Variables**: None required (all APIs are public)
4. **Deploy**: Automatic on git push to main

**Manual Deploy:**

```bash
# Build for Cloudflare
npm run build

# Deploy using Wrangler
npx wrangler pages deploy ui/build --project-name translation-helps-mcp
```

### Option 2: Netlify (Legacy Support)

```bash
# Build for Netlify
npm run build:netlify

# Deploy using Netlify CLI
npx netlify deploy --prod --dir=dist
```

## 🔧 **Production Configuration**

### Cloudflare Workers Requirements

**Critical Fixes for Production:**

1. **No Node.js File System APIs**:

   ```javascript
   // ❌ DON'T - Breaks in Cloudflare Workers
   import fs from "fs";
   const version = fs.readFileSync("package.json");

   // ✅ DO - Use static imports
   import { version } from "./version.js";
   ```

2. **No Process APIs**:

   ```javascript
   // ❌ DON'T - process doesn't exist in Workers
   const uptime = process.uptime();

   // ✅ DO - Use Worker-compatible alternatives
   const startTime = Date.now();
   const uptime = Date.now() - startTime;
   ```

3. **Safe Environment Variable Access**:

   ```javascript
   // ❌ DON'T - process might not exist
   const nodeEnv = process.env.NODE_ENV;

   // ✅ DO - Check existence first
   const nodeEnv =
     typeof process !== "undefined" ? process.env.NODE_ENV : "production";
   ```

### Performance Optimizations

**Cloudflare KV Caching (Recommended):**

Current setup uses memory-only caching which doesn't persist across cold starts. Implementing Cloudflare KV provides:

- **Persistent cache** across cold starts
- **Global distribution** via Cloudflare edge network
- **10x performance improvement** for repeated requests
- **Cost efficiency** at scale

**Implementation Plan:**

1. Set up KV namespace in Cloudflare dashboard
2. Update caching layer to use KV as fallback
3. Configure appropriate TTL values (5-10 minutes for translation resources)
4. Monitor performance improvements

**Expected Results:**

- Cold start performance: Improved by 3-5x
- Cached response times: 30-40ms consistently
- Throughput: 38+ RPS sustained

## 🔄 **Automated Deployment (GitHub Actions)**

**Setup:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: translation-helps-mcp
          directory: ui/build
```

**Benefits:**

- **Pull Requests**: Test builds with preview URLs
- **Main Branch**: Auto-deploy to production
- **Fast CI**: Parallel testing and deployment
- **Zero Configuration**: Works out of the box

## 🧪 **Testing Your Deployment**

### 1. Health Check

```bash
curl https://your-deployment.pages.dev/api/health
```

### 2. Core API Test

```bash
curl "https://your-deployment.pages.dev/api/fetch-scripture?reference=John%203:16&language=en&organization=unfoldingWord"
```

### 3. MCP Integration Test

```bash
curl -X POST https://your-deployment.pages.dev/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

### 4. Performance Test

```bash
# Load testing (if you have artillery installed)
npx artillery quick --count 10 --num 5 https://your-deployment.pages.dev/api/health
```

## 🚨 **Common Deployment Issues**

### Issue 1: 500/503 Errors on Cloudflare

**Cause**: Node.js APIs being used in Worker environment

**Solution**:

- Remove all `fs`, `path`, `process` usage
- Use static imports instead of dynamic file reading
- Check Worker compatibility for all dependencies

### Issue 2: Cold Start Performance

**Cause**: Memory-only caching doesn't persist

**Solution**:

- Implement Cloudflare KV caching
- Use edge-compatible data structures
- Optimize bundle size to reduce cold start time

### Issue 3: CORS Issues

**Cause**: Missing CORS headers for browser requests

**Solution**:

```javascript
// Add to all API responses
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

## 📊 **Performance Monitoring**

**Key Metrics to Track:**

- **Response Times**: < 2s for resource loading, < 1s for languages
- **Cache Hit Rate**: > 80% for repeated requests
- **Error Rate**: < 1% for all endpoints
- **Throughput**: 30+ RPS sustained

**Monitoring Tools:**

- Cloudflare Analytics Dashboard
- Worker Logs via `wrangler tail`
- Custom health check endpoints
- Performance testing with load tools

## 🔗 **Related Documentation**

- **[Translation Helps Complete Guide](TRANSLATION_HELPS_COMPLETE_GUIDE.md)** - Technical implementation patterns
- **[Implementation Guide](IMPLEMENTATION_GUIDE.md)** - Setup and development guide
- **[Archive](ARCHIVE.md)** - Historical deployment documentation (Netlify, etc.)

---

**🎯 Success Criteria:** When your deployment can consistently serve 30+ RPS with sub-2s response times and >80% cache hit rate, you've achieved production readiness!
