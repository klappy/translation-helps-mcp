# Endpoint Behavior Specification

**Purpose**: This document serves as the authoritative source of truth for all endpoint behaviors in the translation-helps-mcp project. It documents what each endpoint SHOULD return based on user requirements and DCS data availability.

**Last Updated**: 2025-08-06
**Status**: In Progress

---

## 1. Scripture Endpoints

### 1.1 fetch-scripture

**Current Behavior** (as of diagnostic run):

```json
{
  "data": {
    "success": true,
    "resources": [
      {
        "text": "16 For God so loved the world...",
        "translation": "ULT"
      },
      {
        "text": "16 {This is} because God loved...",
        "translation": "UST"
      }
    ],
    "total": 4,
    "reference": "John 3:16",
    "language": "en",
    "organization": "unfoldingWord",
    "resourcesRequested": "all"
  }
}
```

**Issues Identified**:

- Returns array of resources instead of single text
- No direct `data.text` property as tests expect
- Returns multiple translations when only one requested

**Questions for User**:

1. When user requests a specific version (e.g., `version=ult`), should we:
   - Return ONLY that version as a single text string?
   - Return an array but filtered to only that version?
   - Keep current behavior of returning all versions?

2. What should the response structure be?
   - Option A: `{ data: { text: "scripture text", version: "ULT", reference: "John 3:16" } }`
   - Option B: `{ data: { resources: [{ text: "...", translation: "ULT" }] } }`
   - Option C: Something else?

**DCS Provides**:

- Scripture text per version
- Multiple translations available
- Verse ranges supported

**Decision**:

- **Response Structure**: Always return array format for consistency (Option B)
- **Version Parameter**: When specified, filter to only that version; when omitted, return all versions
- **Use Case**: Multiple versions for comparison is primary use case
- **Rationale**: Consistency prevents fragile/brittle dynamic shapes
- **Implementation**: `{ data: { resources: [{ text: "...", translation: "ULT" }], total: 1, reference: "...", ... } }`

---

### 1.2 fetch-ust-scripture

**Current Behavior**:

- Returns empty response or no text property

**Expected Behavior**:

- Should return UST translation specifically

**Questions for User**:

1. Should this endpoint exist separately or should users use `fetch-scripture?version=ust`?
2. If separate, what's the response format?

**Decision**:

- **Keep Separate Endpoints**: Yes, for LLM clarity about translation purposes
- **Behavior**: Should behave exactly like `fetch-scripture?version=ult` or `fetch-scripture?version=ust`
- **Response Format**: Same as main fetch-scripture (consistent array structure)
- **Rationale**: Explicit endpoint names help LLMs understand translation purposes (literal vs simplified)
- **Enhancement**: Consider including translation metadata to help LLMs understand how to use each translation

---

## 2. Translation Notes

### 2.1 fetch-translation-notes

**Current Behavior**:

- Works WITH organization parameter
- Returns 400 error WITHOUT organization parameter
- Returns array of note objects with proper structure

**Issues Identified**:

- Organization parameter not documented as required
- Inconsistent parameter requirements

**Questions for User**:

1. Should organization be:
   - Required (current behavior)?
   - Optional with default to "unfoldingWord"?
   - Removed entirely?

2. Is the current response structure correct?

```json
{
  "data": [
    {
      "Reference": "JHN 3:16",
      "ID": "vg6z",
      "Quote": "γὰρ",
      "Note": "**For** here indicates..."
    }
  ]
}
```

**Decision**:

- **Organization Parameter**: REQUIRED (current behavior is correct)
- **Rationale**: Organization varies by language/resource, requiring explicit specification
- **Error Response**: Should guide users to available organizations for the language
- **Enhancement**: Link to existing endpoint for organization discovery (list-available-resources)
- **TSV Field Preservation**: ALL original TSV fields must be preserved (no data dropping)
- **Future Feature**: Research organization recommendations based on language/resource type

---

## 3. Translation Words

### 3.1 get-translation-word

**Current Behavior**:

- Expects `term` parameter, not `word`
- Returns array of matching words, not definition

**Issues Identified**:

- Parameter name mismatch
- Response doesn't include actual definition/article content

**Questions for User**:

1. Should the parameter be `word` or `term`?
2. Should this endpoint return:
   - The full article/definition for the word?
   - Just a list of matching words (current)?
   - Both?

**CRITICAL ISSUE IDENTIFIED**: Current endpoint returns fake/placeholder paths that don't fetch real content!

**Decision**:

- **Parameter Name**: `word` (more intuitive and obvious)
- **Primary Purpose**: Return FULL ARTICLE CONTENT for translation words
- **Response Should Include**:
  - Title and subtitle of the article
  - Complete markdown content (01, 02 sections, etc.)
  - Best match for the requested word
  - Alternative/related words for additional queries
- **Use Case**: Users come from TWL with specific word, need actual article content to read
- **Critical Fix Needed**: Current paths (`bible/kt/beloved.md`) appear to be placeholder/fake data
- **Rationale**: This is the ONLY endpoint responsible for fetching actual word article content

---

### 3.2 browse-translation-words

**Current Behavior**:

- Works correctly
- Returns array of word objects with id, title, category, path

**Questions for User**:

1. Is the current structure sufficient?
2. Should it include brief definitions or just metadata?

**Decision**: _TO BE FILLED BY USER_

---

## 4. Context Aggregation

### 4.1 get-context

**Current Behavior**:

- Returns 500 error
- Says "Computed data source not yet implemented"

**Expected Behavior**:

- Should aggregate all resources for a verse

**Questions for User**:

1. What resources should be included?
   - Scripture (all versions?)
   - Translation notes
   - Translation words
   - Translation questions
   - Translation Academy articles?

2. What structure should the response have?

**Decision**:

- **Resources to Include**:
  - Scripture: ALL versions for the language, FULL CHAPTER (for context)
  - Translation Notes: Book, Chapter, and all for reference/passage (context)
  - Translation Words: ALL unique words for reference/passage via TWL (context)
  - Translation Questions: All for reference/passage (context)
  - Translation Academy: All articles linked from translation notes RC links (context)
- **Response Structure**: Array of different resource types (most flexible, not brittle)
- **Scope**: Kitchen sink approach - comprehensive context for passage
- **Performance**: Current caching strategies sufficient, not heavy operation
- **Rationale**: Provides complete contextual information for translation work

---

## 5. Error Handling

**Current Behavior**:

- Invalid references return 200 OK with empty results
- Missing required parameters sometimes default to John 3:16

**Questions for User**:

1. Should invalid references return:
   - 400 Bad Request?
   - 404 Not Found?
   - 200 OK with empty results?

2. Should missing parameters:
   - Always return 400?
   - Have sensible defaults?
   - Different behavior per endpoint?

**Decision**:

- **Invalid References**: 400 Bad Request with clear guidance
  - Example: "Reference 'NotABook' not found. Valid books include: Genesis, Exodus, Leviticus..."
  - Always explain how to fix the problem
- **Missing Parameters**: Use sensible defaults BUT communicate alternatives
  - Default to unfoldingWord/en when possible
  - When defaults fail, explain where to find valid options
  - Example: "No resources found for organization 'unfoldingWord' and language 'zh'. Use list-available-resources to find valid organizations for language 'zh'"
- **Error Message Philosophy**:
  - ALWAYS provide clear guidance for LLMs to rectify errors
  - Include explicit examples of correct usage
  - Distinguish between: file not found in resource vs resource not found for org/language combo
  - Reference other endpoints that can provide valid parameter values
- **LLM Guidance Priority**: If there's one thing to do right, it's clear error messages that help LLMs fix problems autonomously

---

## Implementation Tracking

### Regression Prevention Strategy

1. Each decision above will generate:
   - Specific test cases
   - Response shape validators
   - Integration tests

2. All endpoints must pass these tests before deployment

3. Any changes to behavior must update this document FIRST

### Test Generation

Based on decisions above, we will generate:

- Unit tests for each endpoint
- Integration tests for workflows
- Contract tests for response shapes
- Regression tests for specific issues

---

## Critical Issues Identified

### 🔴 URGENT: get-translation-word Endpoint

- **Issue**: Returns fake/placeholder paths that don't fetch real article content
- **Impact**: Users cannot access actual translation word articles
- **Fix Required**: Complete implementation to fetch real markdown content from DCS

### 🔴 HIGH: fetch-scripture Version Filtering

- **Issue**: Requesting specific version still returns all versions
- **Impact**: Inconsistent behavior, larger than expected responses
- **Fix Required**: Implement proper version filtering

### 🔴 HIGH: get-context Not Implemented

- **Issue**: Returns 500 error "Computed data source not yet implemented"
- **Impact**: No way to get comprehensive context for verses
- **Fix Required**: Full implementation of context aggregation

### 🔴 MEDIUM: Error Handling

- **Issue**: Poor error messages, inconsistent HTTP status codes
- **Impact**: LLMs cannot self-correct errors effectively
- **Fix Required**: Implement helpful error messages with guidance

## Notes

### Interview Completed: 2025-08-06

- All major endpoint behaviors defined
- Critical implementation gaps identified
- Error handling strategy established
- Response structure consistency prioritized
- LLM-friendly guidance emphasized

### Additional Questions for Complete Specification

#### 1. **TSV Field Completeness**

- **Question**: For translation notes, are ALL TSV columns being returned in the response?
- **Current Status**: Code preserves all fields, but need to verify actual responses
- **Decision Needed**: List of required fields that MUST be present

#### 2. **Browse Translation Words Response**

- **Question**: What should browse-translation-words return - just metadata or include brief definitions?
- **Current Status**: Returns id, title, category, path only
- **Decision Needed**: Complete response specification

#### 3. **Translation Questions Format**

- **Question**: What's the expected format for translation questions responses?
- **Current Status**: Not tested or specified
- **Decision Needed**: Response structure and required fields

#### 4. **Translation Academy Articles**

- **Question**: How should TA articles be fetched and formatted?
- **Current Status**: No dedicated endpoint documented
- **Decision Needed**: Endpoint behavior or integration with get-context

#### 5. **Language/Organization Discovery**

- **Question**: How do LLMs discover valid language/organization combinations?
- **Current Status**: list-available-resources mentioned but not specified
- **Decision Needed**: Clear discovery workflow documentation

#### 6. **Response Consistency Across Endpoints**

- **Question**: Should all endpoints follow the same wrapper structure?
- **Example**: `{ data: {...}, success: true, error?: {...} }`
- **Decision Needed**: Standardized response envelope

#### 7. **Caching Headers**

- **Question**: What cache headers should endpoints return?
- **Current Status**: Not specified
- **Decision Needed**: Cache-Control, ETag requirements

#### 8. **Rate Limiting**

- **Question**: Should endpoints communicate rate limits?
- **Current Status**: Not mentioned
- **Decision Needed**: Rate limit headers and error responses

### Next Steps

1. Fix critical get-translation-word endpoint
2. Implement proper version filtering for fetch-scripture
3. Implement get-context aggregation
4. Update all error messages with helpful guidance
5. Generate comprehensive test suite based on specifications
6. Complete specifications for unanswered questions above
