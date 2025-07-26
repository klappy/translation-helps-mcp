# Cloudflare Pages Configuration

To properly deploy this project to Cloudflare Pages, you need to configure the following settings in your Cloudflare Pages dashboard:

## Build Configuration

1. **Build command**: `npm install --prefix ui && node scripts/generate-platform-functions.js && npm run build:cloudflare --prefix ui`
2. **Build output directory**: `ui/.svelte-kit/cloudflare`
3. **Root directory**: `/` (leave empty or set to `/`)

## Environment Variables

Add these environment variables in **Settings > Environment variables**:

### Build Environment Variables

- `NODE_VERSION`: `20`
- `NPM_FLAGS`: `--version` (This skips the automatic npm install)
- `SKIP_DEPENDENCY_INSTALL`: `true` (Alternative to NPM_FLAGS)

### Production Environment Variables

- `NODE_ENV`: `production`

### Secrets (Add via Cloudflare Dashboard)

- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `OPENAI_API_KEY`: Your OpenAI API key (if using OpenAI)
- Any other API keys your application needs

## Build System Version

In **Settings > Build & deployments > Build system version**:

- Select **v3 (latest)**

## Compatibility Settings

These are already configured in `wrangler.toml`:

- Compatibility date: `2024-09-23`
- Compatibility flags: `nodejs_compat`

## Notes

- The project uses a custom build process that installs dependencies in the UI subdirectory
- Husky (git hooks) is automatically skipped in the Cloudflare build environment
- The build will fail if the environment variables are not set correctly
