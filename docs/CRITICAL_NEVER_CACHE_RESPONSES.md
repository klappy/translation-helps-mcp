# CRITICAL: NEVER CACHE RESPONSES

## THE CARDINAL RULE

**RESPONSES MUST NEVER BE CACHED! EVER! UNDER ANY CIRCUMSTANCES!!!**

### What CAN Be Cached:

- ✅ External API calls (DCS catalog, etc.)
- ✅ ZIP file downloads
- ✅ Extracted files from ZIPs

**THAT'S IT. NOTHING ELSE. EVER.**

### What MUST NEVER Be Cached:

- ❌ HTTP responses
- ❌ Error responses
- ❌ Formatted output
- ❌ Any data with user-specific formatting
- ❌ Anything with a `cacheStatus` field
- ❌ Parsed/processed data structures
- ❌ Transformed responses
- ❌ Aggregated data
- ❌ ANY computation results

## Why This Matters

1. **Stale Errors**: Cached error responses make debugging impossible
2. **Security**: User-specific data could leak across requests
3. **Correctness**: Data sources change, responses must reflect current state
4. **Performance**: Caching responses HURTS performance by serving stale data

## How To Verify

Before ANY commit, check:

```bash
# Search for response caching attempts
grep -r "cache.*response" src/
grep -r "responseCache" src/
grep -r "cacheStatus.*hit" src/

# Verify Cache-Control headers
grep -r "Cache-Control" src/ | grep -v "no-cache\|no-store"
```

## Implementation Rules

1. **RouteGenerator**: MUST set `Cache-Control: no-store, no-cache, must-revalidate`
2. **Platform Adapter**: MUST NOT cache response bodies
3. **Service Functions**: Cache data sources ONLY, return fresh responses
4. **Error Handlers**: MUST mark all errors as non-cacheable

## Code Review Checklist

- [ ] No response caching code added
- [ ] All endpoints set proper no-cache headers
- [ ] Error responses are never cached
- [ ] Only data sources are cached

## If You See Response Caching

1. **STOP** - Do not merge
2. **REMOVE** - Delete all response caching code
3. **DOCUMENT** - Add a comment explaining why it was removed
4. **TEST** - Verify responses are fresh

## Historical Context

This rule has been violated many, many times, causing:

- Users seeing "Invalid reference" errors when the real issue was server failures
- Cached errors persisting even after issues were fixed
- Hours of debugging time wasted on phantom issues

**THIS MUST NEVER HAPPEN AGAIN!!!**
