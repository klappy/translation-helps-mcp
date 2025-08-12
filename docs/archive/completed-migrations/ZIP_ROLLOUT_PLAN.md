# ZIP-Based Resource Fetching Rollout Plan

## 🎯 Goal

Replace the current complex catalog/ingredient-based fetching with a simple, cached ZIP approach that actually works.

## 📋 Current State

- ✅ Proof of concept working in Node.js
- ✅ ZIP + Ingredients approach validated
- ❌ Edge runtime compatibility needs fixing
- ❌ Test endpoint returning empty (runtime issues)

## 🚀 Rollout Phases

### Phase 1: Edge Runtime Compatibility (Current)

**Goal**: Get `ZipResourceFetcher2` working in SvelteKit edge routes

1. **Fix the test endpoint** (`/api/test-zip-scripture`)
   - Debug why it returns empty resources
   - Ensure `fflate` dynamic import works
   - Add proper error logging

2. **Validate caching works**
   - Confirm ZIP files are cached
   - Test cache hit rates
   - Measure performance improvement

### Phase 2: Scripture Migration

**Goal**: Replace `ResourceAggregator`'s scripture fetching

1. **Update `fetch-scripture` endpoint**
   - Use `ZipResourceFetcher2` instead of current logic
   - Maintain exact same response format
   - Keep X-ray tracing intact

2. **Remove old scripture logic**
   - Delete the complex catalog searching
   - Remove ingredient parsing code
   - Clean up unnecessary helpers

### Phase 3: TSV Resources Migration

**Goal**: Migrate Translation Notes, Questions, and Word Links

1. **Update TSV endpoints**
   - `fetch-translation-notes` → Use ZIP approach
   - `fetch-translation-questions` → Use ZIP approach
   - `fetch-translation-word-links` → Use ZIP approach

2. **Optimize TSV parsing**
   - Cache parsed TSV data (not just raw files)
   - Implement efficient filtering

### Phase 4: Special Resources

**Goal**: Handle Translation Words and Academy

1. **Translation Words**
   - ZIP contains markdown files in folders
   - Need to handle directory structure
   - Cache article lookups

2. **Translation Academy**
   - Similar to TW but with TOC files
   - Already working well, just needs ZIP backend

### Phase 5: Performance Testing

**Goal**: Prove this was worth it

1. **Benchmark improvements**
   - Before: 50+ API calls for context
   - After: 4-5 ZIP downloads (cached)
   - Measure response time improvements

2. **Load testing**
   - Test with multiple concurrent users
   - Verify cache efficiency
   - Check memory usage

### Phase 6: Cleanup & Documentation

**Goal**: Remove old code and document new approach

1. **Code cleanup**
   - Delete old `ResourceAggregator` methods
   - Remove unused helpers
   - Simplify error handling

2. **Documentation**
   - Update API docs
   - Document caching strategy
   - Add troubleshooting guide

## 🎮 Implementation Strategy

### Step 1: Fix Current Test Endpoint

```typescript
// Fix the current test endpoint to actually work
// Main issue: Edge runtime compatibility
```

### Step 2: Create Compatibility Layer

```typescript
// Wrap ZipResourceFetcher2 to match existing interfaces
class ZipResourceAdapter {
  async fetchScripture(reference, options) {
    // Convert to ZIP fetcher format
    // Return in expected format
  }
}
```

### Step 3: Gradual Migration

- Start with one endpoint
- Test thoroughly
- Roll out to others
- Keep old code as fallback initially

### Step 4: Monitor & Optimize

- Track cache hit rates
- Monitor ZIP download times
- Optimize based on real usage

## 🚨 Risks & Mitigations

| Risk                 | Mitigation                     |
| -------------------- | ------------------------------ |
| Edge runtime issues  | Test thoroughly, have fallback |
| Large ZIP downloads  | Cache aggressively (30 days)   |
| Breaking changes     | Keep exact same API responses  |
| Cache storage limits | Monitor usage, implement LRU   |

## 📊 Success Metrics

- **Performance**: 80% reduction in API calls
- **Cache hit rate**: >90% after warm-up
- **Response time**: <200ms for cached content
- **Reliability**: Works offline with cached ZIPs
- **Simplicity**: 50% less code

## 🔄 Rollback Plan

If things go wrong:

1. Revert to previous `ResourceAggregator`
2. Keep ZIP fetcher as experimental
3. Gradually fix issues
4. Try again with lessons learned

## 📅 Timeline

- **Week 1**: Edge runtime fixes & testing
- **Week 2**: Scripture endpoints migration
- **Week 3**: TSV resources migration
- **Week 4**: Performance testing & optimization
- **Week 5**: Documentation & cleanup

## 🎉 End State

- All resources fetched via cached ZIPs
- Dramatic performance improvement
- Simplified codebase
- Offline capability
- Happy users (and developers!)
