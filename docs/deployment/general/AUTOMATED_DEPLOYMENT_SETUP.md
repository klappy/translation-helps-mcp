# Automated Deployment Setup 🚀⚡

We've set up GitHub Actions to automatically deploy to both Netlify and Cloudflare on every push to main. Here's how to configure it.

## Overview

- **Pull Requests**: Test builds for both platforms, verify routing works
- **Main Branch**: Auto-deploy to both Netlify and Cloudflare production
- **Parallel Testing**: Both platforms tested simultaneously for faster CI

## Required Secrets Setup

### For Netlify Deployment

1. **Get your Netlify Auth Token:**

   ```bash
   # Install Netlify CLI if you haven't
   npm install -g netlify-cli

   # Login and get your token
   netlify login
   netlify auth:list
   ```

2. **Get your Site ID:**
   - Go to your Netlify site dashboard
   - Copy the Site ID from Site settings → General

3. **Add to GitHub Secrets:**
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Add these secrets:
     - `NETLIFY_AUTH_TOKEN`: Your auth token
     - `NETLIFY_SITE_ID`: Your site ID

### For Cloudflare Deployment

1. **Get your API Token:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - Create Token → Custom Token
   - **Permissions needed:**
     - Zone: Zone Settings:Read, Zone:Read
     - Account: Cloudflare Pages:Edit
   - Copy the token

2. **Get your Account ID:**
   - Go to Cloudflare Dashboard → Right sidebar
   - Copy the Account ID

3. **Add to GitHub Secrets:**
   - Add these secrets to your GitHub repo:
     - `CLOUDFLARE_API_TOKEN`: Your API token
     - `CLOUDFLARE_ACCOUNT_ID`: Your account ID

## How It Works

### On Pull Requests:

```yaml
# Tests both platforms in parallel
test-builds:
  strategy:
    matrix:
      platform: [netlify, cloudflare]
```

- ✅ Builds both Netlify and Cloudflare versions
- ✅ Starts preview servers
- ✅ Tests that routing works (curl tests)
- ✅ Ensures no broken deployments reach main

### On Push to Main:

```yaml
# Deploys to both platforms simultaneously
deploy-netlify: # Deploys to Netlify
deploy-cloudflare: # Deploys to Cloudflare
```

- 🚀 Auto-deploys to both platforms
- 🚀 Uses the simplified build commands we created
- 🚀 No manual intervention needed

## Deployment Workflow

```bash
# Developer workflow:
git checkout -b feature/new-stuff
# ... make changes ...
git push origin feature/new-stuff

# Create PR → GitHub Actions tests both builds
# Merge PR → GitHub Actions deploys to both platforms automatically!
```

## Manual Deployment (Backup)

If you need to deploy manually:

```bash
# Netlify
npm run build:netlify
netlify deploy --prod --dir=ui/build

# Cloudflare
npm run build:cloudflare
npx wrangler pages deploy ui/build --project-name=translation-helps-mcp
```

## Monitoring Deployments

### GitHub Actions:

- Go to your repo → Actions tab
- See build/deploy status for each push

### Netlify:

- Dashboard shows deployment status
- Build logs available for debugging

### Cloudflare:

- Workers & Pages dashboard
- Real-time deployment logs

## Choosing Your Platform

Since both deploy automatically, you can:

1. **Test both** and see which performs better
2. **Use Netlify** for easier debugging/development
3. **Use Cloudflare** for better performance/cost
4. **Keep both** as redundancy/comparison

## Environment Variables

Add any API keys needed by your app:

### In GitHub Secrets (for CI/CD):

```bash
# Add these to GitHub repo secrets for the build process
ANTHROPIC_API_KEY
OPENAI_API_KEY
PERPLEXITY_API_KEY
# ... other keys
```

### In Platform Dashboards (for runtime):

- **Netlify**: Site settings → Environment variables
- **Cloudflare**: Workers & Pages → Settings → Environment variables

## Troubleshooting

### Build Fails:

1. Check GitHub Actions logs
2. Test locally: `npm run build:netlify` or `npm run build:cloudflare`
3. Verify all secrets are set correctly

### Routing Issues:

1. Check `ui/build/_routes.json` is generated correctly
2. Verify SvelteKit adapter configuration
3. Test with preview commands locally

### Deployment Fails:

1. Verify API tokens have correct permissions
2. Check platform-specific logs
3. Ensure project names match in configuration

---

## Quick Setup Commands

```bash
# 1. Commit and push the GitHub Actions workflow
git add .github/workflows/deploy.yml AUTOMATED_DEPLOYMENT_SETUP.md
git commit -m "feat: add automated deployment with GitHub Actions"
git push origin main

# 2. Set up secrets in GitHub repo settings
# 3. Test with a small change:
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: trigger automated deployment"
git push origin main

# 4. Watch the magic happen in GitHub Actions! 🎉
```

Your deployment is now fully automated! 🚀
