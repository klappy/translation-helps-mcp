# Cloudflare KV Setup Guide

## The Problem
TRANSLATION_HELPS_CACHE is a KV namespace BINDING, not a secret. Adding it as a secret won't work.

## How to Fix It

### 1. Go to Cloudflare Pages Dashboard
- Visit https://dash.cloudflare.com
- Navigate to your project: `translation-helps-mcp`

### 2. Go to Settings → Functions
- Click on your project
- Go to "Settings" tab
- Scroll to "Functions" section

### 3. Add KV Namespace Binding
- Click "Add binding"
- Choose binding type: "KV Namespace"
- Variable name: `TRANSLATION_HELPS_CACHE`
- KV namespace: Select or create "translation-helps-cache"

### 4. Important: Do This for BOTH
- **Production** environment
- **Preview** environment

### 5. Redeploy
After adding the binding, redeploy your site:
```bash
git push origin main
```

## Why This Is Different from Secrets

**Secrets (Environment Variables)**:
- For sensitive data like API keys
- Set via "Environment variables" section
- Example: OPENAI_API_KEY, ANTHROPIC_API_KEY

**KV Namespace Bindings**:
- For connecting to Cloudflare services
- Set via "Functions → KV namespace bindings"
- Not sensitive - it's just a connection identifier

## Verify It's Working

After deployment, check:
1. Visit https://translation-helps-mcp.pages.dev/api/health
2. Look for KV-related messages in the response
3. Check if cache persists between deployments

## Common Mistakes

❌ DON'T add KV namespace ID as an environment variable/secret
✅ DO add it as a KV namespace binding in Functions settings

❌ DON'T put the namespace ID in quotes or treat it as a string
✅ DO select it from the dropdown in Cloudflare dashboard

## If You Don't Have a KV Namespace Yet

Create one first:
```bash
npx wrangler kv:namespace create "TRANSLATION_HELPS_CACHE"
```

This will output an ID like:
```
id = "116847d7b0714a9c8d2882335b05d35a"
```

Then use this namespace in the Cloudflare Pages settings.
