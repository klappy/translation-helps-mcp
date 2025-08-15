# R2 Bucket Setup Guide

## How It Works

The system automatically downloads and caches ZIP files from Door43 Content Service (DCS) to R2:

1. **Automatic Download**: When a resource is requested, the system fetches it from DCS
2. **ZIP Fallback**: If `.zip` files return 500 errors, it automatically tries `.tar.gz`
3. **R2 Caching**: Successfully downloaded files are stored in R2 for future requests
4. **File Extraction**: Individual files are extracted and cached separately

## Troubleshooting Production Issues

### 404 Errors for Translation Resources

If production returns 404 errors while dev works:

1. **Check R2 Permissions**
   - Ensure the production deployment has write access to R2 bucket
   - Verify R2 bindings are correctly configured in `wrangler.toml`

2. **Check DCS Availability**
   - DCS might be blocking or rate-limiting production requests
   - ZIP files might be returning 500 errors without proper tar.gz fallback

3. **Check Browser DevTools**
   - Look for CORS errors or blocked requests
   - Check Network tab for actual error responses

4. **Force Cache Refresh**
   - Add `X-Force-Refresh: true` header to bypass cache
   - This forces fresh download from DCS

### Common Issues

1. **R2 Write Permissions**
   - Production might not have write access to R2 bucket
   - Check Cloudflare dashboard for R2 bucket permissions

2. **DCS Rate Limiting**
   - Production domain might be rate-limited by DCS
   - Check if direct DCS URLs work from production

3. **Worker Environment Differences**
   - ZIP extraction uses async operations that might behave differently in production
   - Check for "code:13" errors in logs

### Manual Cache Warming (If Needed)

If automatic caching isn't working, you can warm the cache by:

```bash
# Force download each resource type
curl -H "X-Force-Refresh: true" "https://translation-helps-mcp.pages.dev/api/translation-notes?reference=John%203:16"
curl -H "X-Force-Refresh: true" "https://translation-helps-mcp.pages.dev/api/translation-questions?reference=John%203:16"
curl -H "X-Force-Refresh: true" "https://translation-helps-mcp.pages.dev/api/fetch-translation-word-links?reference=John%203:16"
```

### Debug Information

The system logs detailed information about the caching process:

- ZIP download attempts (both .zip and .tar.gz)
- R2 storage operations
- Cache hits/misses
- Extraction errors

Check the Cloudflare Workers logs for detailed error messages.
