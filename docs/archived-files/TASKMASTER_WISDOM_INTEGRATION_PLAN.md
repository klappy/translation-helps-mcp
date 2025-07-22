# TaskMaster Wisdom Integration Plan

## 🚨 CRITICAL ISSUE: Tasks Don't Reference Hard-Won Wisdom

Current tasks are attempting to solve problems that have ALREADY BEEN SOLVED through weeks of debugging. This is like rebuilding a house when the blueprints are sitting on the table.

## 📋 Tasks That Need Immediate Updates

### Task 3: Implement DCS API client

**Current Problem**: Building from scratch without referencing patterns
**Required Updates**:

1. Reference `CRITICAL_TRANSLATION_HELPS_LEARNINGS_FOR_MCP.md` section on DCS Catalog API
2. Use the EXACT endpoint patterns documented:
   - `/api/v1/catalog/list/owners`
   - `/api/v1/catalog/list/languages?owner=${org}`
   - `/api/v1/catalog/search?metadataType=rc`
3. Reference caching patterns (5-minute TTL)
4. Use error handling patterns with fallbacks

**Updated Details Should Include**:

```
CRITICAL: Read docs/CRITICAL_TRANSLATION_HELPS_LEARNINGS_FOR_MCP.md FIRST!
- Section: "DCS Catalog API - The Foundation"
- Use proven endpoint patterns
- Implement 5-minute cache TTL
- NO MANIFESTS - use metadataType=rc
```

### Task 6: Create USFM text extractor

**Current Problem**: Mentions unified extraction but doesn't reference the WORKING solution
**Required Updates**:

1. Reference `TRANSLATION_HELPS_DISTILLED_WISDOM.md` section "USFM Text Extraction"
2. Use the EXACT regex patterns that work across all environments
3. Include validation patterns to prevent USFM contamination

**Updated Details Should Include**:

```
MANDATORY: Read docs/TRANSLATION_HELPS_DISTILLED_WISDOM.md
- Section: "USFM Text Extraction - UNIFIED APPROACH"
- Use server-side regex (NOT browser innerText)
- Implement validateCleanText() to prevent contamination
- Test for environment consistency
```

### Task 8: Implement resource aggregator

**Current Problem**: Doesn't reference the complete multi-resource pattern
**Required Updates**:

1. Reference `COMPREHENSIVE_TRANSLATION_HELPS_PATTERNS.md` section on ResourceAggregator
2. Use Promise.all() pattern for parallel loading
3. Include support for DCS, FIA, VBD providers
4. Reference request deduplication patterns

**Updated Details Should Include**:

```
REQUIRED READING: docs/COMPREHENSIVE_TRANSLATION_HELPS_PATTERNS.md
- Section: "Multi-Resource Integration Pattern"
- Must support multiple providers (DCS, FIA, VBD)
- Use Promise.all() for parallel loading
- Implement request deduplication
```

### Task 13: Implement ingredients-based file resolution

**Current Problem**: Knows about ingredients but not the complete pattern
**Required Updates**:

1. This is THE MOST CRITICAL PATTERN - reference all three wisdom docs
2. Use exact code pattern from wisdom docs
3. Include all edge cases (numbered prefixes, language variations)

**Updated Details Should Include**:

```
🚨 CRITICAL - THE #1 DISCOVERY 🚨
Read ALL THREE wisdom documents for this:
1. CRITICAL_TRANSLATION_HELPS_LEARNINGS_FOR_MCP.md - "The Ingredients Array Discovery"
2. COMPREHENSIVE_TRANSLATION_HELPS_PATTERNS.md - "Ingredients-Based File Resolution"
3. TRANSLATION_HELPS_DISTILLED_WISDOM.md - "INGREDIENTS ARRAY IS SACRED"

Files have UNPREDICTABLE names:
- Could be: 01-GEN.usfm, 57-TIT.tsv, tn_GEN.tsv
- NEVER hardcode paths
- ALWAYS use ingredients array
```

### Task 14: Handle verse bridges and special references

**Current Problem**: Mentions the issue but not the solution
**Required Updates**:

1. Reference the working regex patterns in wisdom docs
2. Include chapter intro (1:intro) and book intro (front:intro) patterns
3. Reference test cases that verify the patterns work

**Updated Details Should Include**:

```
SOLUTION DOCUMENTED: docs/TRANSLATION_HELPS_DISTILLED_WISDOM.md
- Verse bridges: Use regex for \v 4-5 patterns
- Chapter intros: Handle "1:intro" references
- Book intros: Handle "front:intro" references
- Test with verse-1-test-case.md examples
```

### Task 15: Create resource-specific TSV parsers

**Current Problem**: Doesn't reference the exact column structures
**Required Updates**:

1. Reference documented TSV column structures for each resource
2. Use existing parseTSV patterns
3. Include error handling for malformed TSV

**Updated Details Should Include**:

```
EXACT PATTERNS IN: docs/COMPREHENSIVE_TRANSLATION_HELPS_PATTERNS.md
- TN columns: Reference, ID, Tags, SupportReference, Quote, Occurrence, Note
- TQ columns: Reference, ID, Tags, Quote, Occurrence, Question, Response
- TW columns: Different structure - check wisdom docs
- Use existing parseTSV utility patterns
```

## 🎯 New Task Recommendations

### Add Task: Study Wisdom Documentation

**Priority**: CRITICAL
**Dependencies**: None
**Description**: Team must read and understand all wisdom documentation before implementation
**Details**:

```
Required reading IN ORDER:
1. docs/CRITICAL_TRANSLATION_HELPS_LEARNINGS_FOR_MCP.md (30 min)
2. docs/COMPREHENSIVE_TRANSLATION_HELPS_PATTERNS.md (45 min)
3. docs/TRANSLATION_HELPS_DISTILLED_WISDOM.md (1 hour)

These documents contain 123 documents worth of debugging discoveries.
Reading them will save WEEKS of implementation time.
```

### Add Task: Implement Pre-Flight Checklist

**Priority**: HIGH
**Dependencies**: [Study Wisdom Documentation]
**Description**: Create automated checks that verify patterns from wisdom docs are followed
**Details**:

```
Create checks for:
- No manifest.yaml usage
- Ingredients array usage for file paths
- Proper USFM extraction patterns
- Caching implementation (5-min TTL)
- Error handling with fallbacks
```

## 📝 Task Update Script

Here's a script to update all tasks with wisdom doc references:

```javascript
// For each technical task
const tasksToUpdate = [3, 6, 8, 13, 14, 15];

tasksToUpdate.forEach((taskId) => {
  const wisdomPrefix = `
⚠️ CRITICAL: Before implementing, read wisdom docs:
- docs/CRITICAL_TRANSLATION_HELPS_LEARNINGS_FOR_MCP.md
- docs/COMPREHENSIVE_TRANSLATION_HELPS_PATTERNS.md  
- docs/TRANSLATION_HELPS_DISTILLED_WISDOM.md

These contain solutions to the exact problems this task addresses.
`;

  // Prepend to existing details
  updateTask(taskId, {
    details: wisdomPrefix + existingDetails,
  });
});
```

## 🚨 Implementation Rules

1. **NO IMPLEMENTATION** without reading relevant wisdom doc sections
2. **COPY EXACT PATTERNS** - don't try to "improve" them
3. **TEST AGAINST DOCUMENTED EDGE CASES** - they found them the hard way
4. **USE THE SAME VARIABLE NAMES** - makes debugging easier
5. **FOLLOW THE ARCHITECTURE** - it evolved for good reasons

## 📊 Expected Impact

By integrating wisdom docs into TaskMaster:

- **90% reduction** in debugging time (patterns already debugged)
- **Zero manifest-related delays** (3-9 second improvement)
- **Correct implementation first time** (no trial and error)
- **Consistent patterns** across all features
- **Avoided pitfalls** that took weeks to discover

## 🎬 Next Steps

1. Review and approve this plan
2. Update all existing tasks with wisdom doc references
3. Add "Study Wisdom Documentation" as Task 0
4. Require wisdom doc sections be read before task assignment
5. Create validation checklist based on wisdom patterns

---

**Remember**: Every pattern in those wisdom docs represents WEEKS of debugging. Using them isn't optional - it's the difference between success and repeating history.
