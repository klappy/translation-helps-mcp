# Production Deployment Guide 🚀

Now that we have working builds for both platforms, here's how to deploy to production.

## Option 1: Netlify Production (Easier Setup)

### Quick Deploy via Netlify CLI

```bash
# Install Netlify CLI if you haven't
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
npm run build:netlify
netlify deploy --prod --dir=ui/build
```

### Auto-Deploy via Git (Recommended)

1. **Push your code to GitHub/GitLab**

   ```bash
   git add .
   git commit -m "feat: simplified deployment with multi-platform support"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to [netlify.com](https://netlify.com) → New site from Git
   - Connect your GitHub repo
   - **Build settings:**
     - Build command: `npm run build:netlify`
     - Publish directory: `ui/build`
     - Node version: `20`

3. **Deploy!** - Netlify will automatically deploy on every push to main

---

## Option 2: Cloudflare Pages Production (Faster/Cheaper)

### Quick Deploy via Wrangler CLI

```bash
# Install Wrangler CLI if you haven't
npm install -g wrangler

# Login to Cloudflare
npx wrangler login

# Build and deploy
npm run build:cloudflare
npx wrangler pages deploy ui/build --project-name=translation-helps-mcp
```

### Auto-Deploy via Git (Recommended)

1. **Push your code to GitHub** (same as above)

2. **Connect to Cloudflare Pages:**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create
   - Connect to Git → Select your repo
   - **Build settings:**
     - Framework preset: `SvelteKit`
     - Build command: `npm run build:cloudflare`
     - Build output directory: `ui/build`
     - Node version: `20`

3. **Deploy!** - Cloudflare will auto-deploy on every push

---

## Environment Variables & Secrets

### For Netlify:

```bash
# Set environment variables in Netlify dashboard or via CLI
netlify env:set ANTHROPIC_API_KEY "your-key-here"
netlify env:set OPENAI_API_KEY "your-key-here"
# Add other API keys as needed
```

### For Cloudflare:

```bash
# Set secrets via Wrangler (more secure than env vars)
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OPENAI_API_KEY
# Add other API keys as needed
```

---

## Custom Domains (Optional)

### Netlify Custom Domain:

1. Go to Site settings → Domain management
2. Add custom domain
3. Follow DNS setup instructions

### Cloudflare Custom Domain:

1. Go to Workers & Pages → Your site → Custom domains
2. Add domain
3. Configure DNS (easier if domain is already on Cloudflare)

---

## Performance Comparison

| Feature              | Netlify                  | Cloudflare              |
| -------------------- | ------------------------ | ----------------------- |
| **Cold Start**       | ~100ms                   | ~1ms                    |
| **Global Edge**      | ✅ Yes                   | ✅ Yes (300+ locations) |
| **Free Tier**        | 300 build minutes/month  | Unlimited builds        |
| **Bandwidth**        | 100GB/month free         | Unlimited free          |
| **Functions**        | 125k requests/month free | 100k requests/day free  |
| **Setup Difficulty** | Easier                   | Slightly more complex   |

---

## Recommended Approach

### Start with Netlify:

- **Easier setup** and debugging
- **Great developer experience**
- **Perfect for MVPs** and getting started quickly

### Scale to Cloudflare:

- **Better performance** at scale
- **Lower costs** for high-traffic sites
- **Faster cold starts** for dynamic content

---

## Git Workflow for Multi-Platform

Since you have both working, you can even deploy to both platforms from the same repo:

```bash
# Deploy to both platforms automatically
git add .
git commit -m "feat: new feature"
git push origin main

# Both Netlify and Cloudflare will auto-deploy!
# Compare performance and pick your favorite
```

---

## Monitoring & Debugging

### Netlify:

- Check build logs in Netlify dashboard
- Use Netlify Dev for local debugging: `netlify dev`

### Cloudflare:

- Check build logs in Cloudflare dashboard
- Use Wrangler for local debugging: `npx wrangler pages dev build`
- Real User Monitoring available in dashboard

---

## Quick Commands Summary

```bash
# Local development
npm run dev                    # SvelteKit dev server

# Local preview (production builds)
npm run preview:netlify        # Test Netlify build locally
npm run preview:cloudflare     # Test Cloudflare build locally

# Production deployment
npm run build:netlify && netlify deploy --prod --dir=ui/build
npm run build:cloudflare && npx wrangler pages deploy ui/build
```

You now have a simplified, working deployment to both platforms! 🎉
