# Netlify Setup Guide for Translation Helps MCP

## Prerequisites

- GitHub repository: `klappy/translation-helps-mcp`
- Netlify account connected to GitHub

## Step 1: Site Configuration

### In Netlify Dashboard:

1. Go to [netlify.com](https://netlify.com) and login
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Select repository: `klappy/translation-helps-mcp`

### Build Settings:

```
Base directory: (leave empty)
Build command: npm run build:all
Publish directory: ui/build
Functions directory: netlify/functions
```

### Advanced Settings:

- **Node.js Version**: 18
- **Environment Variables**: (Add any API keys if needed)

## Step 2: Auto-Deploy Configuration

### Branch Settings:

- **Production Branch**: `main`
- **Deploy Previews**: Enabled for pull requests
- **Branch Deploys**: Enabled for all branches (optional)

### Build Hooks (Optional but Recommended):

1. Go to **Site settings** → **Build & deploy** → **Build hooks**
2. Click **"Add build hook"**
3. Name: `Manual Deploy Trigger`
4. Branch: `main`
5. Save the webhook URL for manual triggers

## Step 3: Domain Configuration

### Custom Domain (if you have one):

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow DNS configuration instructions

### Current Domain:

- Primary: `https://translation-helps-mcp.netlify.app`
- Make sure this matches your repository name

## Step 4: Environment Variables

If you need API keys or environment variables:

1. Go to **Site settings** → **Environment variables**
2. Add any required variables:
   ```
   NODE_ENV=production
   NODE_VERSION=18
   ```

## Step 5: Build Notifications (Optional)

### GitHub Status Checks:

1. Go to **Site settings** → **Build & deploy** → **Deploy notifications**
2. Enable **"GitHub commit statuses"**
3. This shows build status on GitHub PRs

### Slack/Email Notifications:

- Configure deploy notifications for success/failure
- Useful for team coordination

## Step 6: Testing the Setup

### Verify Auto-Deploy:

1. Make a small change to README.md
2. Commit and push to `main` branch
3. Watch Netlify dashboard for automatic build trigger
4. Check build logs if deployment fails

### Build Commands Verification:

Our `netlify.toml` is configured with:

- **Build Command**: `npm run build:all`
- **Functions**: `netlify/functions`
- **Publish**: `ui/build`

## Step 7: Troubleshooting

### If Auto-Deploy Doesn't Work:

1. Check **Site settings** → **Build & deploy** → **Continuous deployment**
2. Verify GitHub app permissions
3. Check build logs for errors
4. Ensure branch name matches (case-sensitive)

### Common Issues:

- **Build timeouts**: Increase in site settings (max 30 min)
- **Node version conflicts**: Set NODE_VERSION=18 in environment
- **Missing dependencies**: Check package-lock.json is committed
- **Function build errors**: Check TypeScript compilation

### Manual Deploy (if needed):

```bash
# From project root
npm run build:all
netlify deploy --prod
```

## Current Status

- ✅ Repository: Connected
- ✅ Build config: Ready (`netlify.toml`)
- ✅ Scripts: Configured (`package.json`)
- 🔄 Auto-deploy: **Needs setup in dashboard**

## Next Steps

1. Follow this guide in Netlify dashboard
2. Test with a small commit
3. Verify live site updates automatically
