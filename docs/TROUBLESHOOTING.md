# Troubleshooting Guide

## Quick Diagnosis Flowchart

```
Chat not working?
├─ Check browser console for errors
├─ Check X-ray panel for tool failures
├─ Verify OpenAI API key is configured
└─ Check Cloudflare Pages build logs
```

## Common Issues

### 1. Chat Shows "OpenAI API Key Required"

**Symptoms**: 
- Chat displays setup instructions instead of responding
- No AI responses to queries

**Solutions**:
1. Add OpenAI API key as a Cloudflare Pages secret:
   ```bash
   npx wrangler pages secret put OPENAI_API_KEY
   # Enter your key when prompted
   ```
2. Trigger new deployment after adding secret
3. Verify in logs: Should see `hasApiKey: true`

### 2. "Tool endpoint failed: 400" Error

**Symptoms**:
- X-ray shows 400 error for tool calls
- Empty responses with error in X-ray

**Debug Steps**:
1. Click X-ray button to see exact error
2. Check tool parameters in X-ray panel
3. Common causes:
   - Invalid reference format (should be "Book Chapter:Verse")
   - Missing required parameters
   - Invalid language code

**Solutions**:
- Ensure reference format is correct: "John 3:16" not "John 3.16"
- Check that organization defaults to "unfoldingWord"
- Verify language code is valid (e.g., "en", "es", "fr")

### 3. Build Fails on Cloudflare Pages

**Symptom**: Deployment fails with build errors

**Common Errors**:

#### "Cannot resolve import"
```
[vite]: Rollup failed to resolve import "package-name"
```
**Solution**: Remove Node.js-specific packages or add to `external`

#### "window is not defined"
```
ReferenceError: window is not defined
```
**Solution**: 
- Wrap browser code in `if (browser)` checks
- Or disable SSR: `export const ssr = false`

#### Accessibility warnings
```
a11y_click_events_have_key_events
```
**Solution**: Use `<button>` instead of `<div>` for clickable elements

### 4. 500 Error on Page Refresh

**Symptoms**:
- Chat loads initially but crashes on refresh
- 500 error in browser

**Cause**: Browser APIs used during SSR

**Solution**:
```javascript
// In component
import { browser } from '$app/environment';

if (browser) {
  document.addEventListener('click', handler);
}
```

Or disable SSR for the route:
```javascript
// In +page.ts
export const ssr = false;
```

### 5. Empty or Incorrect Responses

**Symptoms**:
- Chat responds but content is missing
- Bullet points with no content
- Generic responses

**Debug Steps**:
1. Check X-ray panel for actual tool responses
2. Verify MCP endpoints are returning data
3. Check browser console for errors

**Common Causes**:
- MCP tools returning empty data
- LLM using pre-trained knowledge (now prevented)
- Network issues with tool calls

### 6. RC Links Not Working

**Symptoms**:
- Clicking blue links doesn't trigger new queries
- Links appear but nothing happens on click

**Debug Steps**:
1. Check browser console for click handler errors
2. Verify link format: Should be `rc://...`
3. Check if click handlers are attached

**Solution**: Links should automatically work with current implementation

### 7. X-Ray Panel Issues

**Symptoms**:
- X-ray button doesn't appear
- Panel doesn't open
- Missing timing data

**Requirements**:
- Tool calls must be made for X-ray to appear
- Only shows on assistant messages with tools

## Performance Issues

### Slow Responses

**Check**:
1. X-ray timing - which tool is slow?
2. Cache status - are tools being cached?
3. Network tab - API response times

**Solutions**:
- Enable caching headers on MCP endpoints
- Check if specific tools are consistently slow
- Consider implementing request timeouts

### High Token Usage

**Monitor**:
- Length of conversation history sent
- Size of tool responses
- System prompt length

**Solutions**:
- Limit conversation history to last 6 messages
- Implement response size limits
- Optimize system prompt

## Debugging Tools

### 1. Browser Console
- Check for JavaScript errors
- Look for failed network requests
- Monitor console.log outputs

### 2. X-Ray Panel
- Shows all tool calls
- Displays timing information
- Shows cache hit/miss
- Reveals actual API responses

### 3. Network Tab
- Monitor API calls to `/api/chat`
- Check MCP tool responses
- Verify OpenAI API calls

### 4. Cloudflare Pages Functions Log
- View server-side errors
- Check environment variable access
- Monitor edge function execution

## Prevention Checklist

Before reporting an issue:

- [ ] Clear browser cache and hard refresh
- [ ] Check X-ray panel for tool errors
- [ ] Verify OpenAI API key is configured
- [ ] Check browser console for errors
- [ ] Test with a simple query like "John 3:16"
- [ ] Verify you're on the latest deployment

## Getting Help

When reporting issues, include:

1. **What you typed**: Exact query that failed
2. **What happened**: Error message or unexpected behavior
3. **X-ray data**: Screenshot of X-ray panel if available
4. **Console errors**: Any errors from browser console
5. **Browser/OS**: What you're using

## Emergency Fixes

### Reset Everything
```bash
# Clear all caches
git clean -fdx
npm install
npm run build:cloudflare --prefix ui

# Re-add secrets
npx wrangler pages secret put OPENAI_API_KEY
```

### Rollback Deployment
```bash
# Find last working commit
git log --oneline

# Reset to that commit
git reset --hard <commit-hash>
git push --force origin main
```

Remember: The system is designed to fail gracefully and provide clear error messages. If you see an error, it's likely actionable!