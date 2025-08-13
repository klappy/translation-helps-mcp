# Cloudflare Pages KV Binding Guide

## Problem

The KV namespace is not automatically bound to Cloudflare Pages projects. The `wrangler.toml` configuration only applies to local development and Workers, not Pages deployments.

## Solution

### Via Cloudflare Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages**
3. Select your project: **translation-helps-mcp**
4. Go to **Settings** tab
5. Scroll to **Functions** section
6. Click **KV namespace bindings**
7. Click **Add binding**
8. Configure:
   - Variable name: `TRANSLATION_HELPS_CACHE`
   - KV namespace: Select from dropdown or enter ID `116847d7b0714a9c8d2882335b05d35a`
9. Click **Save**
10. Trigger a new deployment (push a commit or click "Retry deployment")

### Via Wrangler CLI (Alternative)

```bash
# List your KV namespaces to confirm the ID
npx wrangler kv namespace list

# Bind KV to Pages project
npx wrangler pages project edit translation-helps-mcp \
  --kv TRANSLATION_HELPS_CACHE=116847d7b0714a9c8d2882335b05d35a
```

## Verification

After binding and redeployment, verify with:

```bash
# Check KV status
curl https://translation-helps-mcp.pages.dev/api/kv-status | jq .
```

You should see:

- `hasTranslationHelpsCache: true`
- `kvStatus.initialized: true`
- Successful read/write tests

## Important Notes

1. **Production vs Preview**: You may need separate bindings for production and preview environments
2. **Deployment Required**: Changes to bindings require a new deployment to take effect
3. **Environment Variables vs KV**: Regular env vars (like `OPENAI_API_KEY`) are configured separately from KV bindings

## Troubleshooting

If KV still doesn't work after binding:

1. Check the binding variable name matches exactly: `TRANSLATION_HELPS_CACHE`
2. Ensure the KV namespace ID is correct
3. Trigger a fresh deployment
4. Check Cloudflare Pages build logs for binding errors
5. Use `/api/kv-status` endpoint to diagnose issues

