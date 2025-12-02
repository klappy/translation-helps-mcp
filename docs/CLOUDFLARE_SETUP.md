# Cloudflare Setup Guide

This guide covers all Cloudflare configuration for the Translation Helps MCP project.

## Services Used

| Service     | Purpose                         | Free Tier         |
| ----------- | ------------------------------- | ----------------- |
| **Pages**   | Hosts web app and API endpoints | Unlimited sites   |
| **Workers** | Serverless API functions        | 100k requests/day |
| **KV**      | Cache metadata and catalogs     | 100k reads/day    |
| **R2**      | Store ZIP archives              | 10GB storage      |

**Key Advantage**: Zero egress fees - R2 doesn't charge for data transferred out.

## KV Namespace Binding

The KV namespace must be manually bound to Pages projects (not automatic from wrangler.toml).

### Via Dashboard

1. Go to **Cloudflare Dashboard** → **Pages** → **translation-helps-mcp**
2. Navigate to **Settings** → **Functions**
3. Click **KV namespace bindings** → **Add binding**
4. Configure:
   - Variable name: `TRANSLATION_HELPS_CACHE`
   - KV namespace: Select from dropdown

### Via CLI

```bash
# Create namespace (if needed)
npx wrangler kv namespace create "TRANSLATION_HELPS_CACHE"

# For local dev, add preview namespace
npx wrangler kv namespace create "TRANSLATION_HELPS_CACHE" --preview
```

## Secrets Setup

Secrets are encrypted environment variables for sensitive data (API keys).

### Setting Secrets

**Via Dashboard (Recommended):**

1. Go to **Pages** → **Your Project** → **Settings** → **Environment variables**
2. Add variable (e.g., `OPENAI_API_KEY`)
3. Set for Production and/or Preview environments

**Via CLI:**

```bash
npx wrangler pages secret put OPENAI_API_KEY --project-name=translation-helps-mcp
```

### Accessing Secrets in Code

```typescript
export const POST: RequestHandler = async ({ platform }) => {
  const apiKey = platform?.env?.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response("API key not configured", { status: 500 });
  }
  // Use the API key...
};
```

**Important Notes:**

- Secrets are NOT available during build time - only at runtime
- Use `platform?.env?.SECRET_NAME`, NOT `process.env.SECRET_NAME`
- The `platform` object is only available in Cloudflare Pages deployment
- For local dev, use `.env` file

## Troubleshooting

### KV Not Available

1. Check binding exists in Pages dashboard
2. Verify wrangler.toml has correct namespace ID
3. Redeploy after adding bindings

### Secrets Not Working

```bash
# Verify secret exists
npx wrangler pages secret list --project-name=translation-helps-mcp
```

- Ensure secret is set for correct environment (production/preview)
- Redeploy after adding secrets

## Pricing Links

- [Pages Pricing](https://developers.cloudflare.com/pages/platform/pricing/)
- [Workers Pricing](https://workers.cloudflare.com/pricing)
- [KV Pricing](https://developers.cloudflare.com/kv/platform/pricing/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
