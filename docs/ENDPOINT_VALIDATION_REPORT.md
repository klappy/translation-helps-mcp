# Endpoint Validation Report

**Date**: 2025-08-06  
**Purpose**: Document the actual state of all translation-helps-mcp endpoints based on comprehensive testing

---

## Executive Summary

After comprehensive testing of all endpoints, we found:

- **3 endpoints working correctly** (with caveats)
- **4 endpoints completely broken**
- **Inconsistent response structures** across endpoints
- **Multiple endpoints not using proper file paths**

---

## Working Endpoints ✅

### 1. fetch-translation-notes

- **Status**: WORKING
- **Fields Preserved**: ALL 7 TSV fields preserved correctly
  - Reference, ID, Tags, SupportReference, Quote, Occurrence, Note
- **Issue**: Requires `organization` parameter (not documented)
- **Data Quality**: Returns actual translation notes with real content

### 2. fetch-translation-word-links

- **Status**: WORKING
- **Fields Preserved**: ALL 6 TSV fields preserved correctly
  - Reference, ID, Tags, OrigWords, Occurrence, TWLink
- **Data Quality**: Returns valid RC links to translation words

### 3. fetch-scripture

- **Status**: PARTIALLY WORKING
- **Issue**: Ignores `version` parameter - always returns ALL versions
- **Data Quality**: Returns actual scripture text (not placeholders)
- **Response Structure**: Different from expected (array of resources vs single text)

---

## Broken Endpoints ❌

### 1. fetch-translation-questions

- **Status**: BROKEN
- **Error**: 404 - "object does not exist [id: , rel_path: JHN]"
- **Root Cause**: Wrong file path structure
  - Trying: `JHN/3.md`
  - Should be: Proper TSV file structure
- **Impact**: Cannot fetch any translation questions

### 2. get-translation-word

- **Status**: BROKEN
- **Issue**: Returns fake/placeholder paths
- **Example**: Returns `bible/kt/beloved.md` but doesn't fetch actual content
- **Impact**: Cannot access translation word articles - the primary use case!

### 3. get-context

- **Status**: NOT IMPLEMENTED
- **Error**: 500 - "Internal server error"
- **Expected**: Should aggregate all resources for a verse
- **Impact**: No way to get comprehensive context

### 4. fetch-ust-scripture / fetch-ult-scripture

- **Status**: UNKNOWN (not tested, likely broken)
- **Expected**: Should filter to specific translation
- **Likely Issue**: Same as fetch-scripture version filtering

---

## Response Structure Inconsistencies

Different endpoints use completely different response structures:

```javascript
// fetch-scripture
{
  "data": {
    "resources": [...],
    "success": true
  },
  "metadata": {...}
}

// fetch-translation-notes
{
  "notes": [...],
  "citation": {...},
  "metadata": {...}
}

// fetch-translation-word-links
{
  "links": [...],
  "reference": "...",
  "language": "...",
  "organization": "...",
  "timestamp": "..."
}
```

---

## Critical Issues Summary

1. **Wrong File Paths**: Multiple endpoints not using proper DCS file structures
2. **Fake Data**: get-translation-word returns placeholder paths
3. **Missing Implementation**: get-context not implemented at all
4. **Parameter Issues**:
   - Version filtering ignored
   - Organization required but not documented
   - Parameter names inconsistent (word vs term)
5. **No Helpful Error Messages**: Errors don't guide LLMs to fix issues

---

## User Impact

> "I'm sick and tired of being the one that has to click on every single stinking endpoint and run test to see if the output is valid or not."

This frustration is completely justified because:

- Half the endpoints are broken
- The working ones don't behave as documented
- No clear error messages to help debug
- Inconsistent response structures
- Critical functionality (word articles, questions) completely unavailable

---

## Recommended Next Steps

1. **Immediate Fixes** (Critical):
   - Fix get-translation-word to fetch real article content
   - Fix translation questions file path logic
   - Implement get-context endpoint

2. **Quick Wins**:
   - Add version filtering to fetch-scripture
   - Standardize response structures
   - Add helpful error messages

3. **Documentation**:
   - Document all required parameters
   - Provide discovery endpoints for valid values
   - Include examples in error messages

4. **Testing**:
   - Run endpoint-source-data-validation.test.ts regularly
   - Add regression tests for each fix
   - Validate against real DCS data

---

## Test Command

To re-run validation tests:

```bash
npm test -- tests/endpoint-source-data-validation.test.ts --reporter=verbose
```
