# Endpoint Fix Plan

Date: 2025-01-03
Status: 5 endpoints need fixes

## Current Status

### ✅ Working Endpoints (4/9)

1. **fetch-translation-notes** - Returns all TSV fields preserved
2. **fetch-translation-questions** - Returns questions with all fields
3. **get-translation-word** - Returns full word articles
4. **browse-translation-words** - Returns word list

### ❌ Broken Endpoints (5/9)

#### 1. fetch-scripture

- **Issue**: Returns empty resources array
- **Diagnosis**: ResourceAggregator not finding scripture despite DCS having data
- **Fix**: Debug ingredient matching logic in ResourceAggregator.fetchScripture()

#### 2. get-context

- **Issue**: Returns "Internal Error" (500)
- **Diagnosis**: Likely due to dependency on broken fetch-scripture
- **Fix**: Fix fetch-scripture first, then test aggregation

#### 3. fetch-translation-academy

- **Issue**: Returns data but wrong structure (expected data array)
- **Diagnosis**: Response format mismatch
- **Fix**: Update response structure or test expectations

#### 4. browse-translation-academy

- **Issue**: "rootContents.filter is not a function"
- **Diagnosis**: Code expects array but getting different type
- **Fix**: Check handler implementation

#### 5. get-words-for-reference

- **Issue**: Wrong response structure
- **Diagnosis**: Not returning expected `words` array
- **Fix**: Update response format

## Fix Priority

1. **fetch-scripture** - Core functionality, blocks get-context
2. **browse-translation-academy** - Runtime error needs immediate fix
3. **get-context** - Should work once fetch-scripture is fixed
4. **fetch-translation-academy** - Structure adjustment
5. **get-words-for-reference** - Structure adjustment

## Systematic Approach

For each endpoint:

1. Check the handler implementation
2. Verify it matches documented spec in ENDPOINT_BEHAVIOR_SPECIFICATION.md
3. Test with real data
4. Update comprehensive tests to match new format
5. Document any API changes
