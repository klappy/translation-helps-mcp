# Translation Helps Distilled Wisdom - The Complete Guide

This document distills 123 documents worth of hard-won wisdom from the translation-helps project into actionable patterns for our MCP implementation.

## 🎯 THE UNIVERSAL TRUTHS

### 1. **INGREDIENTS ARRAY IS SACRED**

The #1 discovery that took WEEKS to figure out:

```javascript
// ❌ NEVER - Files have unpredictable names
const filePath = `tn_${bookId}.tsv`; // WRONG! Could be 01-GEN.tsv

// ✅ ALWAYS - Trust the ingredients
const ingredient = resourceData.ingredients.find((ing) => ing.identifier === bookId);
const filePath = ingredient?.path || fallbackPath;
```

### 2. **SIMPLE SCALES, COMPLEX FAILS**

They evolved from complex to simple:

- Started with 246+ lines of manifest code → Deleted it all
- Complex Proskomma implementation → Simple USFM extraction
- Multi-file caching → Direct API calls
- Result: 90% performance improvement

### 3. **NO MANIFESTS - EVER**

```javascript
// ❌ NEVER use manifests
await fetchManifest(); // 3-9 second waste

// ✅ ALWAYS use catalog API
const resources = await catalogAPI.search({
  metadataType: "rc",
  subject: "Bible",
  lang: languageId,
});
```

### 4. **VERSE-LOADING PATTERN**

```javascript
// ❌ DON'T load entire book (420KB)
const bookContent = await fetchBook(bookId);

// ✅ DO load current verse only (10KB)
const verseContent = await fetchVerse(bookId, chapter, verse);
```

### 5. **CROSS-ORGANIZATION SUPPORT**

```javascript
// ❌ WRONG - Hardcoded organization
const url = `https://git.door43.org/unfoldingWord/${lang}_${resource}`;

// ✅ RIGHT - Dynamic organization
const url = `https://git.door43.org/${organization}/${lang}_${resource}`;
```

## 📚 COMPLETE PATTERN LIBRARY

### API Integration Patterns

#### DCS Catalog API - THE SOURCE OF TRUTH

```javascript
// Base URL for all catalog operations
const BASE_URL = "https://git.door43.org/api/v1/catalog";

// 1. List organizations
const orgs = await fetch(`${BASE_URL}/list/owners`);
// Response: { data: [{ login: "unfoldingWord", full_name: "unfoldingWord®" }] }

// 2. List languages for org
const langs = await fetch(`${BASE_URL}/list/languages?owner=${org}`);
// Response: { data: [{ lc: "en", ln: "English" }] }

// 3. List resources
const resources = await fetch(`${BASE_URL}/list/subjects?owner=${org}&lang=${lang}`);
// Response: { data: ["Translation Notes", "Translation Questions"] }

// 4. Search with metadata (THE KEY API)
const results = await fetch(`${BASE_URL}/search?metadataType=rc&lang=${lang}&subject=Bible`);
// Response includes ingredients array!
```

### USFM Text Extraction - UNIFIED APPROACH

```javascript
// ❌ NEVER - Browser-specific extraction
element.innerText; // Unreliable CSS hiding
getComputedStyle(); // Environment inconsistent

// ✅ ALWAYS - Unified server-side extraction
import { extractVerseText, extractChapterText } from "./usfmTextExtractor";

// Works identically in browser, server, and tests
const verseText = extractVerseText(usfmContent, chapter, verse);
const chapterText = extractChapterText(usfmContent, chapter);

// CRITICAL: Always validate
if (!validateCleanText(verseText)) {
  throw new Error("USFM contamination detected!");
}
```

### Resource-Specific Patterns

#### Translation Notes (TN)

```javascript
// File format: Always TSV with specific columns
const parseTN = (tsvContent) => {
  return parseTSV(tsvContent, {
    columns: ["Reference", "ID", "Tags", "SupportReference", "Quote", "Occurrence", "Note"],
  });
};

// Filter by verse
const notes = allNotes.filter((note) => note.Reference === `${chapter}:${verse}`);
```

#### Translation Questions (TQ)

```javascript
// File format: TSV with Reference, ID, Tags, Quote, Occurrence, Question, Response
const parseTQ = (tsvContent) => {
  return parseTSV(tsvContent, {
    columns: ["Reference", "ID", "Tags", "Quote", "Occurrence", "Question", "Response"],
  });
};
```

#### Translation Words (TW)

```javascript
// ❌ NEVER hardcode article paths
const articlePath = `bible/kt/${word}.md`;

// ✅ ALWAYS parse from rc:// links
const rcLink = "rc://en/tw/dict/bible/kt/faith";
const article = await fetchTWArticle(rcLink);
```

#### Translation Word Links (TWL)

```javascript
// TWL provides rc:// links for words in verses
const links = twlData.filter((link) => link.Reference === `${chapter}:${verse}`);
// Each link has: Reference, TWLink (rc:// URI)
```

### Caching Strategy

```javascript
// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};
```

### RC Links Implementation

```javascript
// RC Link format: rc://language/resource/version/path
// Example: rc://en/tw/dict/bible/kt/faith

// Parse RC link
const parseRcLink = (uri) => {
  const match = uri.match(/rc:\/\/(\*|[^/]+)\/([^/]+)\/(.+)/);
  if (!match) throw new Error("Invalid RC link");

  const [, lang, resource, path] = match;
  return { lang, resource, path };
};

// Resolve wildcard language
const resolveLanguage = (lang, contextLang) => {
  return lang === "*" ? contextLang : lang;
};
```

### Error Handling Patterns

```javascript
// Always provide fallbacks
const fetchWithFallback = async (url, fallbackData) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return fallbackData;
    }
    return await response.json();
  } catch (error) {
    console.error(`Network error fetching ${url}:`, error);
    return fallbackData;
  }
};

// Graceful degradation
const loadResource = async (resourceId) => {
  const cached = getCached(resourceId);
  if (cached) return cached;

  try {
    const data = await fetchResource(resourceId);
    setCached(resourceId, data);
    return data;
  } catch (error) {
    console.warn(`Failed to load ${resourceId}, using empty fallback`);
    return { items: [] };
  }
};
```

### Performance Optimizations

#### Parallel Loading

```javascript
// ✅ Load resources in parallel
const [scripture, notes, questions, words] = await Promise.all([
  fetchScripture(reference),
  fetchNotes(reference),
  fetchQuestions(reference),
  fetchWords(reference),
]);

// ❌ Don't load sequentially
const scripture = await fetchScripture(reference);
const notes = await fetchNotes(reference);
// ... etc
```

#### Debouncing Navigation

```javascript
// Prevent rapid navigation spam
const debouncedNavigate = debounce((reference) => {
  updateContext(reference);
}, 300);
```

### LLM Integration Patterns

```javascript
// Context preparation for LLM
const prepareLLMContext = (resources) => {
  return {
    scripture: extractVerseText(resources.scripture, chapter, verse),
    notes: resources.notes.map((n) => ({
      quote: n.Quote,
      note: n.Note,
    })),
    questions: resources.questions.map((q) => ({
      question: q.Question,
      answer: q.Response,
    })),
    words: resources.words.map((w) => ({
      term: w.term,
      definition: w.definition,
    })),
  };
};

// Citation system
const formatCitation = (type, index) => {
  const prefixes = {
    note: "TN",
    question: "TQ",
    word: "TW",
    scripture: "SCRIPTURE",
  };
  return `[${prefixes[type]}-${index}]`;
};
```

### Netlify Configuration - DO NOT MODIFY!

```toml
# This configuration was hand-tuned through extensive debugging
[build]
  command = "yarn install && yarn run build"  # DO NOT add tests here
  functions = "netlify/functions"
  publish = "dist"

# CRITICAL: Keep NODE_ENV as "development" even in production!
[context.production.environment]
  NODE_ENV = "development"  # This is intentional!
```

### Testing Patterns

```javascript
// Always test with real data structures
const mockResourceData = {
  ingredients: [
    { identifier: "gen", path: "01-GEN.usfm" },
    { identifier: "exo", path: "02-EXO.usfm" },
  ],
  repo: { owner: { login: "unfoldingWord" } },
};

// Test environment consistency
describe("USFM extraction", () => {
  it("produces identical output in all environments", () => {
    const browserResult = extractInBrowser(usfm);
    const serverResult = extractOnServer(usfm);
    const testResult = extractInTest(usfm);

    expect(browserResult).toBe(serverResult);
    expect(serverResult).toBe(testResult);
  });
});
```

## 🤖 LLM SYSTEM PROMPT PATTERNS

### Critical Constraints

```javascript
// The LLM MUST ONLY use provided resources
const CRITICAL_CONSTRAINTS = `
1. ONLY use information explicitly provided - NO external Bible knowledge
2. EVERY statement MUST have a citation: [TN-1], [TQ-2], [TW-3], [SCRIPTURE]
3. If information is missing, state: "This information is not available in the provided translation resources"
4. Scripture MUST be quoted EXACTLY character-for-character - NO paraphrasing
`;
```

### Scripture Quoting Requirements

```javascript
// #1 ABSOLUTE PRIORITY - SCRIPTURE ACCURACY
const SCRIPTURE_RULES = `
- Quote scripture EXACTLY as provided in [SCRIPTURE] field
- NEVER paraphrase, summarize, or reword
- Always use quotation marks: "In the beginning..." [SCRIPTURE]
- Character-for-character precision is MANDATORY
- This rule OVERRIDES ALL other instructions
`;

// Common violations to prevent
// ❌ "God made..." instead of "God created..."
// ❌ Missing quotation marks
// ❌ Modernizing language
// ❌ Using synonyms
```

### Citation Format Standards

```javascript
// Every response MUST end with Sources section
const SOURCES_FORMAT = `
## Sources:
- **[TN-1]**: unfoldingWord® Translation Notes - Quote: "*actual quoted text*" - Text: "*actual explanation*"
- **[TQ-1]**: unfoldingWord® Translation Questions - Question: "*question*" - Answer: "*answer*"
- **[TW-1]**: unfoldingWord® Translation Words - Term: "*term*" - Content: "*definition and facts*"
- **[SCRIPTURE]**: unfoldingWord® Literal Text - "*exact scripture text*"
`;
```

### Response Structure

```javascript
// Required response format
const RESPONSE_TEMPLATE = `
## Analysis of [Reference]

[Introduction with formal resource titles]

### Key Findings
[Main content with proper citations]

### Translation Considerations
[Practical guidance with citations]

## Sources:
[Complete citation list with excerpts]
`;
```

### OpenAI Configuration

```javascript
// Optimal parameters for compliance
const OPENAI_CONFIG = {
  model: "gpt-4o-mini",
  max_tokens: 500,
  temperature: 0.2, // Low for accuracy
  top_p: 0.2, // Focused responses
  frequency_penalty: 0.4, // Reduce repetition
  presence_penalty: 0.4, // Encourage variety
};
```

## 👨‍💻 AI ASSISTANT DEVELOPMENT GUIDELINES

### CRITICAL: Always Check Git Status First

```bash
# Before ANY code changes
git status
git branch

# Should NOT be on dev/staging/production/master
# If wrong branch, STOP and create feature branch
```

### Proper Workflow Enforcement

```bash
# 1. Always start with git verification
git checkout dev
git pull origin dev
git checkout -b feature/descriptive-name

# 2. Implementation order (NEVER DEVIATE)
1. Git workflow verification
2. Feature planning
3. Technical implementation
4. Testing and verification
5. Documentation updates
6. Deployment preparation
```

### Red Alert Conditions

- User on `dev`, `staging`, `production`, or `master` branch
- Uncommitted changes to existing files
- About to implement without feature branch

### Quick Reference Templates

```markdown
# Starting new feature

Before we begin, let me verify your git status:
[git commands]

# Implementation complete

Feature complete! Documentation:

1. Version bump ✅
2. CHANGELOG.md ✅
3. README.md ✅
4. Testing ✅
```

### The Showcase Lesson

On 2025-01-08, proper branching was skipped during showcase implementation. The lesson:

> **Process discipline is as important as technical excellence.**

## 🚨 CRITICAL WARNINGS

### Things That Will Break Everything

1. **Using manifests** - Adds 3-9 seconds of latency
2. **Hardcoding file paths** - Files have unpredictable names
3. **Loading entire books** - 420KB vs 10KB for single verse
4. **Browser-specific code** - Breaks in tests and server
5. **Ignoring ingredients array** - The source of truth
6. **Modifying netlify.toml** - Hand-tuned configuration
7. **Skipping validation** - USFM contamination in LLM context
8. **Working on wrong branch** - Always use feature branches

### Common Pitfalls

1. **Forgetting to encode URLs**: Always use `encodeURIComponent()`
2. **Not handling 404s**: Resources might not exist for all books
3. **Assuming file patterns**: Always check ingredients array
4. **Sequential loading**: Use Promise.all() for parallel fetching
5. **Missing error boundaries**: Graceful degradation required
6. **Ignoring cache**: 90% performance improvement possible
7. **Skipping git workflow**: Process discipline matters

## 📋 Implementation Checklist

When implementing any feature:

- [ ] Git status verified (feature branch)
- [ ] Check ingredients array for file paths
- [ ] Use catalog API, not manifests
- [ ] Load only needed data (verse, not book)
- [ ] Handle cross-organization resources
- [ ] Implement proper caching
- [ ] Add error handling with fallbacks
- [ ] Test in all environments
- [ ] Validate output (no USFM contamination)
- [ ] Load resources in parallel
- [ ] Follow existing patterns exactly
- [ ] Update version and CHANGELOG
- [ ] Document in README if user-facing

## 🎓 Key Lessons

1. **Simple always wins** - They deleted 246 lines of complex code
2. **Trust the API** - Catalog API has everything you need
3. **Cache aggressively** - 90% performance improvement
4. **Fail gracefully** - Always have fallbacks
5. **Test everything** - Especially environment consistency
6. **Document discoveries** - Save weeks of debugging for others
7. **Process discipline** - As important as technical excellence

## 🔗 Related Documentation

- `CRITICAL_TRANSLATION_HELPS_LEARNINGS_FOR_MCP.md` - Initial critical patterns
- `COMPREHENSIVE_TRANSLATION_HELPS_PATTERNS.md` - Comprehensive patterns guide
- Individual pattern docs in `../translation-helps/docs/`

---

**Remember**: Every pattern here was discovered through weeks of debugging. Don't repeat history - follow these patterns exactly!
