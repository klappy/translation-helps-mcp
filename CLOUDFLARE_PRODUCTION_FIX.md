# Cloudflare Production Fix Guide

## Issues Found

The production site at `https://translation-helps-mcp.pages.dev` was experiencing 500/503 errors due to:

1. **CRITICAL: Node.js File System APIs**: `src/version.ts` was using `fs.readFileSync` and `path.resolve` which don't exist in Cloudflare Workers
2. **Node.js API Compatibility**: Code using `process.uptime()` and `process.memoryUsage()` that don't exist in Cloudflare Workers
3. **Environment Variable Access**: Unsafe access to `process.env` without checking if `process` exists
4. **Potential Build Configuration**: Need to verify correct adapter is being used

## Fixes Applied

### 1. CRITICAL FIX: Replaced Node.js File System APIs

**File**: `src/version.ts`

- Removed `fs.readFileSync` and `path.resolve` imports that fail in Cloudflare Workers
- Replaced with build-time import of package.json for version resolution
- Added platform-agnostic fallbacks for edge cases
- This was the root cause of all 500 errors across API endpoints

### 2. Fixed Node.js Compatibility Issues

**File**: `ui/src/routes/api/health/+server.ts`

- Added proper checks for `process` existence before calling Node.js APIs
- Made memory usage and uptime optional for Cloudflare Workers environment

**Files**: `src/functions/utils.ts`, `src/functions/resource-aggregator.ts`, `src/services/DCSApiClient.ts`

- Added safe environment variable access with `typeof process !== 'undefined'` checks
- Ensured fallback values are used when `process.env` is not available

### 2. Environment Variables to Configure

In Cloudflare Pages dashboard, configure these environment variables if needed:

**Optional Variables**:

```
ALLOWED_ORIGINS=*
DCS_API_URL=https://git.door43.org/api/v1
DEFAULT_TTL=3600
REQUIRE_API_KEY=false
```

**For Chat Features** (if using):

```
OPENAI_API_KEY=your-openai-key
```

### 3. Deployment Verification

The GitHub Actions workflow should be using the correct build command:

```bash
npm run build:cloudflare
```

This command:

1. Copies `svelte.config.cloudflare.js` to `svelte.config.js`
2. Builds with the Cloudflare adapter
3. Restores the original config

## Manual Deployment Steps

If you need to deploy manually:

```bash
# From project root
cd ui
npm install
npm run build:cloudflare

# Deploy with Wrangler
npx wrangler pages deploy build --project-name=translation-helps-mcp
```

## Testing the Fix

After deployment, test these endpoints:

```bash
# Health check
curl https://translation-helps-mcp.pages.dev/api/health

# Core scripture fetching
curl "https://translation-helps-mcp.pages.dev/api/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord"

# Translation notes
curl "https://translation-helps-mcp.pages.dev/api/fetch-translation-notes?reference=John+3:16&language=en&organization=unfoldingWord"
```

## Expected Results

- Health endpoint should return 200 status with system information
- Scripture endpoints should return 200 with proper JSON responses
- No more 500/503 errors

## Monitoring

The health endpoint now includes comprehensive testing of all API endpoints and will return:

- `200`: All systems healthy
- `503`: One or more core endpoints failing

Use this for ongoing monitoring of the production system.
