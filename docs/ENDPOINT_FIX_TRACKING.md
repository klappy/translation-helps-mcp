# Endpoint Fix Tracking Document

**Purpose**: Track the systematic fixing of all broken endpoints identified in testing
**Started**: 2025-08-06
**Status**: IN PROGRESS

---

## Latest Update: ULT/UST Endpoints Fixed!

**Problem**: Both endpoints were failing to find resources

- ULT was using `dcsClient.getResourceMetadata` which doesn't return ingredients
- UST was hardcoding paths as `content/${book}.usfm`

**Solution**: ALWAYS USE DIRECT CATALOG SEARCH!

- Use `https://git.door43.org/api/v1/catalog/search` with `metadataType=rc`
- Find the resource and its ingredients
- Use the ingredient path to fetch the actual USFM file

**Result**: Both endpoints now work correctly and return alignment data!

---

## Fix Order & Status

### 1. Fix get-translation-word endpoint (Task 8.6)

- **Status**: ✅ COMPLETED
- **Issue**: Returns fake paths like 'bible/kt/beloved.md' instead of real content
- **Fix**: Implement proper DCS markdown fetching using TWLink RC paths
- **Test Command**: `curl -s "http://localhost:8174/api/get-translation-word?word=love&language=en" | jq`
- **Started**: 2025-08-06
- **Completed**: ✅ 2025-08-06
- **Notes**:
  - Created new handler that uses 'word' parameter as requested
  - Successfully fetches real markdown from DCS
  - Returns full article content with title, definition, translation suggestions
  - ENHANCED: Now also checks for subtitle (sub.md) and numbered sections (01.md, 02.md, etc.)
  - Note: Translation Words are typically single files, but code is ready for Translation Academy structure
  - Provides helpful error messages for missing words
  - Test suite updated and passing

### 2. Fix fetch-translation-questions path logic (Task 8.7)

- **Status**: ✅ COMPLETED
- **Issue**: Tries to fetch 'JHN/3.md' which doesn't exist
- **Fix**: Use proper TSV file structure from manifest
- **Test Command**: `curl -s "http://localhost:8174/api/fetch-translation-questions?reference=John+3:16&language=en&organization=unfoldingWord" | jq`
- **Started**: 2025-08-06
- **Completed**: ✅ 2025-08-06
- **Notes**:
  - Fixed by using the actual handler instead of generated configuration
  - Service already knew how to use manifest ingredients properly
  - Returns real translation questions from TSV files
  - Test suite updated and passing

### 3. Implement get-context aggregation (Task 8.8)

- **Status**: ✅ COMPLETED
- **Issue**: Returns 500 error "Computed data source not yet implemented"
- **Fix**: Build comprehensive aggregation of all resources
- **Test Command**: `curl -s "http://localhost:8174/api/get-context?reference=John+3:16&language=en" | jq`
- **Started**: 2025-08-06
- **Completed**: ✅ 2025-08-06
- **Notes**:
  - Used D43 catalog search API to get ALL resources in ONE call
  - Leverages `metadataType=rc` to get ingredients for each resource
  - Fetches scripture, notes, questions, and word links all at once
  - Returns as array format as specified by user
  - KISS principle: simple, direct, no complex imports
  - Test suite updated and passing

### 4. Add version filtering to fetch-scripture (Task 8.9)

- **Status**: ⏳ PENDING
- **Issue**: Ignores version parameter, returns all versions
- **Fix**: Filter results when version parameter is specified
- **Test Command**: `curl -s "http://localhost:8174/api/fetch-scripture?reference=John+3:16&language=en&version=ult" | jq`
- **Started**: Not yet
- **Completed**: ❌ Not yet
- **Notes**:

### 5. Implement helpful error messages (Task 8.10)

- **Status**: ⏳ PENDING
- **Issue**: Generic unhelpful error messages
- **Fix**: Add LLM-friendly guidance in all error responses
- **Test Command**: Various error scenarios
- **Started**: Not yet
- **Completed**: ❌ Not yet
- **Notes**: Depends on all other fixes

---

## Progress Log

### 2025-08-06

- Created comprehensive validation tests
- Identified all broken endpoints
- Created fix tracking system
- Started Fix #1: get-translation-word endpoint
- ✅ COMPLETED Fix #1: get-translation-word now fetches real content from DCS
  - Changed from returning fake paths to fetching actual markdown articles
  - Uses 'word' parameter as requested
  - Returns full article content with proper error handling
  - Test suite updated and passing
- ✅ COMPLETED Fix #2: fetch-translation-questions now uses proper paths
  - Changed from hardcoded JHN/3.md to using manifest ingredients
  - Service already had proper logic, just needed to bypass bad configuration
  - Returns real translation questions from TSV files
  - Test suite updated and passing
- ✅ COMPLETED Fix #3: get-context now aggregates all resources
  - Changed from "not implemented" to full aggregation
  - Uses ONE D43 catalog search call with ingredients
  - Returns scripture, notes, questions, and words all at once
  - Test suite updated and passing

---

## Test Suite Command

Run validation after each fix:

```bash
npm test -- tests/endpoint-source-data-validation.test.ts --reporter=verbose
```

---

## Notes

- Working systematically through each fix in order
- Updating this document after each fix
- Running full test suite after each change
- No jumping around between fixes
