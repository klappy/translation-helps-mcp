# Cloudflare Deployment - The Even Simpler Way! ⚡

## Why Cloudflare?

- **Faster Cold Starts**: Workers start in ~1ms vs Netlify's ~100ms
- **Cheaper Pricing**: First 100,000 requests per day are FREE
- **Global Edge Network**: 300+ locations worldwide
- **Better Performance**: V8 isolates instead of containers

## The Simple Setup

### 1. Install Cloudflare Adapter

```bash
cd ui
npm install -D @sveltejs/adapter-cloudflare
```

### 2. Create Cloudflare Configuration

Create `ui/svelte.config.cloudflare.js`:

```js
import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";

export default {
  preprocess: [vitePreprocess(), mdsvex()],
  kit: {
    adapter: adapter({
      // Cloudflare Pages configuration
      routes: {
        include: ["/*"],
        exclude: ["<all>"],
      },
    }),
  },
  extensions: [".svelte", ".svx"],
};
```

### 3. Add Build Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "build:netlify": "cd ui && npm install && npm run build",
    "build:cloudflare": "cd ui && npm install && SVELTE_CONFIG=svelte.config.cloudflare.js npm run build",
    "preview:netlify": "cd ui && npm run preview",
    "preview:cloudflare": "cd ui && npx wrangler pages dev build"
  }
}
```

### 4. Create wrangler.toml (Cloudflare config)

```toml
name = "translation-helps-mcp"
compatibility_date = "2024-01-15"
pages_build_output_dir = "ui/build"

[env.production]
  vars = { NODE_ENV = "production" }

# Environment variables go here (same as Netlify)
[env.production.vars]
  # Add your API keys here or use wrangler secrets
```

## Deployment Options

### Option 1: Manual Deploy (Quick Test)

```bash
# Build for Cloudflare
npm run build:cloudflare

# Deploy with Wrangler CLI
cd ui
npx wrangler pages deploy build
```

### Option 2: GitHub Integration (Recommended)

1. Connect your GitHub repo to Cloudflare Pages
2. Set build command: `npm run build:cloudflare`
3. Set output directory: `ui/build`
4. Add environment variables in Cloudflare dashboard

## API Routes on Cloudflare

The same SvelteKit API routes work on Cloudflare! The adapter automatically converts them to Cloudflare Workers.

```
ui/src/routes/api/scripture/+server.ts → Cloudflare Worker
ui/src/routes/api/translation-notes/+server.ts → Cloudflare Worker
```

## Benefits Comparison

### Netlify Functions

- Cold start: ~100-500ms
- Pricing: 125k invocations free, then $25/million
- Runtime: Node.js on AWS Lambda

### Cloudflare Workers

- Cold start: ~1ms ⚡
- Pricing: 100k requests/day FREE, then $0.50/million 💰
- Runtime: V8 isolates (faster, lighter)

## The Best Part

Since we simplified to pure SvelteKit, we can deploy to BOTH platforms with the SAME codebase:

```bash
# Deploy to Netlify
npm run build:netlify
netlify deploy --prod

# Deploy to Cloudflare
npm run build:cloudflare
cd ui && npx wrangler pages deploy build
```

## Environment Variables

### Netlify (.env)

```env
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
```

### Cloudflare (wrangler secrets)

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OPENAI_API_KEY
```

## Multi-Platform Strategy

1. **Use Cloudflare for primary deployment** (faster, cheaper)
2. **Keep Netlify as backup** (easy rollback)
3. **Same codebase, different adapters** (no duplication!)

This is the power of proper SvelteKit architecture - write once, deploy anywhere!
