# 🚀 Cloudflare Pages Deployment Setup Guide

This guide will help you set up automatic deployment to Cloudflare Pages via GitHub integration.

## 📋 Prerequisites

- A Cloudflare account
- A GitHub repository with this project
- Admin access to both GitHub and Cloudflare

## 🔧 Setup Steps

### 1. Connect GitHub to Cloudflare Pages

1. **Log in to Cloudflare Dashboard**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Select your account

2. **Navigate to Pages**
   - Click on "Workers & Pages" in the left sidebar
   - Click on the "Pages" tab

3. **Create a New Project**
   - Click "Create a project"
   - Select "Connect to Git"
   - Choose GitHub and authorize Cloudflare access to your repositories

4. **Select Your Repository**
   - Find and select `translation-helps-mcp`
   - Click "Begin setup"

### 2. Configure Build Settings

In the Cloudflare Pages setup:

```yaml
Framework preset: None
Build command: cd ui && npm install && npm run build:cloudflare
Build output directory: ui/.svelte-kit/cloudflare
Root directory (advanced): /
Environment variables (advanced): NODE_VERSION=20
```

### 3. Set Up GitHub Secrets (for GitHub Actions)

If you prefer using GitHub Actions for more control, add these secrets to your repository:

1. **Go to GitHub Repository Settings**
   - Navigate to Settings → Secrets and variables → Actions

2. **Add the following secrets:**

   ```bash
   CLOUDFLARE_API_TOKEN    # Your Cloudflare API token
   CLOUDFLARE_ACCOUNT_ID   # Your Cloudflare account ID
   ```

3. **Get your Cloudflare API Token:**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Click "Create Token"
   - Use the "Custom token" template with these permissions:
     - Account: Cloudflare Pages:Edit
     - Zone: Page Rules:Edit (if using custom domain)

4. **Get your Account ID:**
   - Go to any domain in your Cloudflare account
   - Find the Account ID in the right sidebar

### 4. Deployment Workflow

The repository already includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

- **On Pull Requests**: Runs test builds for both Netlify and Cloudflare
- **On Push to Main**: Automatically deploys to both platforms

The workflow handles:

- ✅ Dependency installation
- ✅ Building for the correct platform
- ✅ Running smoke tests
- ✅ Deploying to production

### 5. Environment Variables

For production features, set these in Cloudflare Pages dashboard:

```bash
NODE_ENV=production
# Add any API keys or secrets your app needs
```

### 6. Custom Domain (Optional)

1. **In Cloudflare Pages:**
   - Go to your project → Settings → Custom domains
   - Click "Add a custom domain"
   - Follow the DNS configuration instructions

2. **SSL/TLS:**
   - Cloudflare automatically provisions SSL certificates
   - No additional configuration needed

## 🔍 Monitoring Deployments

### GitHub Actions

- Check Actions tab in GitHub for deployment status
- Each push to main triggers automatic deployment
- Pull requests get preview deployments

### Cloudflare Dashboard

- View deployment history in Pages dashboard
- Access deployment logs and preview URLs
- Monitor build times and errors

## 🚨 Troubleshooting

### Common Issues:

1. **Build Failures**

   ```bash
   # Check if all dependencies are committed
   git add package-lock.json ui/package-lock.json
   git commit -m "Fix: Add lock files"
   ```

2. **Environment Variables Missing**
   - Double-check Cloudflare Pages environment settings
   - Ensure secrets are properly set in GitHub

3. **Node Version Mismatch**
   - Set `NODE_VERSION=20` in Cloudflare Pages environment variables
   - Update `.nvmrc` if needed

### Debug Commands:

```bash
# Test build locally
cd ui && npm run build:cloudflare

# Preview locally
npx wrangler pages dev ui/.svelte-kit/cloudflare

# Check wrangler configuration
cat wrangler.toml
```

## ✅ Verification

After setup, verify your deployment:

1. **Check Automatic Deployment**
   - Make a small change to README.md
   - Push to main branch
   - Watch GitHub Actions and Cloudflare dashboard

2. **Test URLs**
   - Production: `https://translation-helps-mcp.pages.dev`
   - Preview: `https://<hash>.translation-helps-mcp.pages.dev`

3. **API Endpoints**
   ```bash
   curl https://translation-helps-mcp.pages.dev/api/health
   curl https://translation-helps-mcp.pages.dev/api/mcp
   ```

## 🎯 Best Practices

1. **Branch Protection**
   - Enable branch protection for `main`
   - Require PR reviews before merge
   - Run tests before allowing merge

2. **Preview Deployments**
   - Each PR gets a unique preview URL
   - Test changes before merging
   - Share preview URLs for review

3. **Monitoring**
   - Set up Cloudflare Analytics
   - Monitor Web Vitals
   - Track API performance

4. **Rollback Strategy**
   - Cloudflare keeps deployment history
   - Can instant rollback from dashboard
   - Git revert for source control

## 📚 Additional Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [GitHub Actions for Cloudflare](https://github.com/cloudflare/wrangler-action)
- [SvelteKit on Cloudflare](https://kit.svelte.dev/docs/adapter-cloudflare)

---

**🎉 Once configured, every push to `main` will automatically deploy to Cloudflare Pages!**
