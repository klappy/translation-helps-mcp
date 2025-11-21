# MCP Tools vs HTTP Endpoints Comparison

This document compares MCP tool implementations with their HTTP endpoint counterparts to identify mismatches.

## Summary of Mismatches

### ✅ **fetch_translation_word** - FIXED

- **Status**: Now matches HTTP endpoint
- **MCP**: Supports `term`, `path`, `rcLink`, `reference` (optional)
- **HTTP**: Supports `term`, `path`, `rcLink` (TERM_PARAMS)
- **Match**: ✅

---

### ❌ **fetch_scripture** - HAS MISMATCHES

**HTTP Endpoint Parameters:**

- `reference` (required)
- `language` (optional, default: "en")
- `organization` (optional, default: "unfoldingWord")
- `resource` (optional, default: "all") - **MISSING IN MCP**
  - Options: "ult", "ust", "t4t", "ueb", "all", "ult,ust", "t4t,ueb"
- `format` (optional, default: "json")
  - Options: "json", "text", "md", "markdown", "usfm"
- `includeAlignment` (optional, default: false) - **MISSING IN MCP**

**MCP Tool Parameters:**

- `reference` (required)
- `language` (optional, default: "en")
- `organization` (optional, default: "unfoldingWord")
- `includeVerseNumbers` (optional, default: true) - **NOT IN HTTP**
- `format` (optional, default: "text")
  - Options: "text", "usfm" - **LIMITED OPTIONS**

**Issues:**

1. ❌ Missing `resource` parameter (HTTP allows selecting specific translations: ult, ust, all, etc.)
2. ❌ Missing `includeAlignment` parameter
3. ❌ `format` options don't match (HTTP has: json, text, md, markdown, usfm; MCP has: text, usfm)
4. ⚠️ `includeVerseNumbers` exists in MCP but not in HTTP (may be handled differently)

---

### ⚠️ **fetch_translation_notes** - POTENTIAL MISMATCHES

**HTTP Endpoint Parameters:**

- `reference` (required)
- `language` (optional, default: "en")
- `organization` (optional, default: "unfoldingWord")
- `format` (optional, default: "json")
  - Options: "json", "md", "text"

**MCP Tool Parameters:**

- `reference` (required)
- `language` (optional, default: "en")
- `organization` (optional, default: "unfoldingWord")
- `includeIntro` (optional, default: true) - **NOT IN HTTP**
- `includeContext` (optional, default: true) - **NOT IN HTTP**

**Issues:**

1. ⚠️ Missing `format` parameter (HTTP supports json, md, text)
2. ⚠️ `includeIntro` and `includeContext` exist in MCP but not explicitly in HTTP endpoint config
   - These may be handled internally by the HTTP endpoint, but not exposed as parameters

---

### ❌ **fetch_translation_questions** - HAS MISMATCHES

**HTTP Endpoint Parameters:**

- `reference` (required)
- `language` (optional, default: "en")
- `organization` (optional, default: "unfoldingWord")
- `format` (optional, default: "json")
  - Options: "json", "md", "text"

**MCP Tool Parameters:**

- `reference` (required)
- `language` (optional, default: "en")
- `organization` (optional, default: "unfoldingWord")

**Issues:**

1. ❌ Missing `format` parameter (HTTP supports json, md, text)

---

### ❌ **fetch_translation_word_links** - HAS MISMATCHES

**HTTP Endpoint Parameters:**

- `reference` (required)
- `language` (optional, default: "en")
- `organization` (optional, default: "unfoldingWord")
- `format` (optional, default: "json")
  - Options: "json", "md", "text"

**MCP Tool Parameters:**

- `reference` (required)
- `language` (optional, default: "en")
- `organization` (optional, default: "unfoldingWord")

**Issues:**

1. ❌ Missing `format` parameter (HTTP supports json, md, text)

---

### ⚠️ **fetch_translation_academy** - POTENTIAL MISMATCHES

**HTTP Endpoint Parameters:**

- `moduleId` (optional)
- `path` (optional)
- `rcLink` (optional)
- `language` (optional, default: "en")
- `organization` (optional, default: "unfoldingWord")
- `format` (optional, default: "json")
  - Options: "json", "md", "markdown"

**MCP Tool Parameters:**

- `moduleId` (optional)
- `path` (optional)
- `rcLink` (optional)
- `language` (optional, default: "en")
- `organization` (optional, default: "unfoldingWord")
- `format` (optional, default: "json")
  - Options: "json", "markdown"

**Issues:**

1. ⚠️ `format` options don't fully match (HTTP has: json, md, markdown; MCP has: json, markdown)
   - HTTP "md" might be same as "markdown", but should verify

---

## Recommendations

### High Priority Fixes

1. **fetch_scripture**: Add `resource` parameter to allow selecting specific translations
2. **fetch_scripture**: Add `includeAlignment` parameter
3. **fetch_scripture**: Expand `format` options to match HTTP (add json, md, markdown)
4. **fetch_translation_questions**: Add `format` parameter
5. **fetch_translation_word_links**: Add `format` parameter

### Medium Priority Fixes

1. **fetch_translation_notes**: Add `format` parameter
2. **fetch_translation_academy**: Verify `format` options match (add "md" if needed)

### Low Priority / Investigation Needed

1. **fetch_scripture**: Verify if `includeVerseNumbers` should be removed or if HTTP should add it
2. **fetch_translation_notes**: Verify if `includeIntro` and `includeContext` are handled by HTTP endpoint internally
