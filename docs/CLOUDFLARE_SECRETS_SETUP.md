# Cloudflare Pages Secrets Setup Guide

## Understanding Cloudflare Pages Environment Variables vs Secrets

### Environment Variables

- Defined in `wrangler.toml`
- Stored in plain text in your repo
- Good for non-sensitive config (NODE_ENV, API URLs, etc.)

### Secrets (Encrypted Variables)

- Set via Cloudflare Dashboard or `wrangler secret` command
- Encrypted and never exposed in code
- Required for sensitive data (API keys, tokens, etc.)
- **Available at runtime via `platform.env`**

## Setting Up OpenAI API Key

### Option 1: Via Cloudflare Dashboard (Recommended)

1. Go to Cloudflare Dashboard > Pages > Your Project
2. Navigate to Settings > Environment variables
3. Add variable:
   - Variable name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key
   - Environment: Production (and Preview if needed)
   - Click "Save"

### Option 2: Via Wrangler CLI

```bash
# For production
npx wrangler pages secret put OPENAI_API_KEY --project-name=translation-helps-mcp

# You'll be prompted to enter the value securely
```

## Accessing Secrets in Code

Secrets are available via `platform.env` in your request handlers:

```typescript
export const POST: RequestHandler = async ({ platform }) => {
  // Access the secret
  const apiKey = platform?.env?.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response("API key not configured", { status: 500 });
  }

  // Use the API key...
};
```

## Important Notes

1. **Secrets are NOT available during build time** - only at runtime
2. **Secrets are accessed the same way as env vars** via `platform.env`
3. **Local development**: Use `.env` file or set via command line
4. **The `platform` object is only available in Cloudflare Pages deployment**

## Troubleshooting

If secrets aren't working:

1. **Verify the secret exists**:

   ```bash
   npx wrangler pages secret list --project-name=translation-helps-mcp
   ```

2. **Check you're accessing it correctly**:
   - Use `platform?.env?.OPENAI_API_KEY`
   - NOT `process.env.OPENAI_API_KEY` (this won't work in Pages)

3. **Ensure you're in the right environment**:
   - Secrets can be set per environment (production, preview)
   - Make sure you set it for the environment you're testing

4. **Redeploy after adding secrets**:
   - Sometimes you need to trigger a new deployment for secrets to take effect

## Example Fix for chat-stream Endpoint

The current code tries multiple sources, but might need adjustment:

```typescript
// Current code
const apiKey =
  (platform as any)?.env?.OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY ||
  import.meta.env.VITE_OPENAI_API_KEY;

// If platform.env exists but is typed incorrectly, try:
const apiKey = platform?.env?.["OPENAI_API_KEY"] as string | undefined;
```
