# Comprehensive Translation Helps Patterns for MCP Implementation

This document captures ALL critical patterns, lessons, and discoveries from the translation-helps project that MUST be applied to our MCP implementation.

## 🔥 THE ABSOLUTE CRITICAL PATTERNS

### 1. INGREDIENTS ARRAY - THE #1 DISCOVERY

```javascript
// ❌ NEVER hardcode file paths - they are UNPREDICTABLE!
const filePath = `tn_${bookId.toUpperCase()}.tsv`; // WRONG! May be 01-GEN.tsv

// ✅ ALWAYS use ingredients array from resource metadata
const ingredient = resourceData.ingredients.find((ing) => ing.identifier === bookId);
const filePath = ingredient?.path || fallbackPath; // e.g., "57-TIT.usfm"
```

### 2. NO MANIFESTS - EVER!

- The catalog API already has EVERYTHING: books, ingredients, metadata
- Manifests added 3-9 seconds of unnecessary load time
- 246+ lines of manifest code were completely deleted

### 3. API ENDPOINT OPTIMIZATION

```javascript
// ❌ WRONG - Generic search (4-9 seconds, 5-10MB)
/api/v1/catalog/search?limit=1000

// ✅ RIGHT - Specific endpoints (500ms, 50KB)
/api/v1/catalog/list/languages?stage=prod&subject=Bible
```

### 4. MULTI-TIER FALLBACK ARCHITECTURE

Every service MUST implement 3-tier fallback:

```javascript
// TIER 1: Ingredients-based (primary)
const ingredient = resourceData?.ingredients?.find((ing) => ing.identifier === bookId);
if (ingredient?.path) return ingredient.path;

// TIER 2: Standard naming (secondary)
const standardPath = `tn_${bookId.toUpperCase()}.tsv`;
if (await checkExists(standardPath)) return standardPath;

// TIER 3: Graceful degradation (tertiary)
return []; // Empty array, not error
```

### 5. SIMPLE VERSE-LOADING PATTERN

- Load ONLY current verse (~10KB vs 420KB per chapter)
- Natural browser caching handles optimization
- Small requests scale infinitely better
- Memory efficient with automatic cleanup

## 📊 PERFORMANCE REQUIREMENTS

### Must Achieve:

- Language loading: < 1 second (was 4-9 seconds)
- Resource loading: < 2 seconds (was 6+ seconds)
- Zero manifest.yaml requests in network tab
- Request deduplication working (no duplicate API calls)
- 95% reduction in data transfer

### Request Deduplication Pattern:

```javascript
const pendingRequests = new Map();

async function fetchWithDedup(key, fetcher) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetcher();
  pendingRequests.set(key, promise);

  try {
    return await promise;
  } finally {
    pendingRequests.delete(key);
  }
}
```

## 🎯 TSV PARSING PATTERNS

### Translation Notes Columns

`Reference | ID | Tags | Quote | Note | Occurrence`

### Translation Questions Columns

`Reference | ID | Tags | Quote | Question | Response`

### Translation Words

Different format - uses Markdown files accessed via RC links

### CRITICAL: Each resource type needs its own parser!

## 🌍 CROSS-ORGANIZATION SUPPORT

### Must Handle:

- Organization context passing through entire stack
- Clear organization context on language change
- Resource organization vs global organization
- Mixed organization resources (Bible from X, Notes from Y)

### Organization Context Pattern:

```javascript
const getResourceOrganization = (resourceType = "scripture") => {
  // Always check resource-specific org first
  if (resourceType === "scripture" && resourceOrganization) {
    return resourceOrganization;
  }
  return organization; // Fall back to global
};
```

## 🧹 USFM TEXT EXTRACTION

### Unified Server-Side Approach (2025 Rewrite)

- NO browser innerText (unreliable)
- NO environment detection
- ONE extraction method for all environments
- Regex-based removal in specific order

### USFM Removal Patterns (IN ORDER):

```javascript
text = text.replace(/\\zaln-s[^\\]*\\zaln-e\*/g, "");
text = text.replace(/\\w\s+([^|\\]*)\|[^\\]*\\w\*/g, "$1");
text = text.replace(/\\k-s[^\\]*\\k-e\*/g, "");
text = text.replace(/\\\+?[\w\d]+\*?\s*/g, "");
text = text.replace(/\\[\w\d]+\s*/g, "");
```

### Verse Bridge Handling:

```javascript
text = text.replace(/(\d+)-(\d+)/g, (match, start, end) => {
  const verses = [];
  for (let i = parseInt(start); i <= parseInt(end); i++) {
    verses.push(i);
  }
  return verses.join(", ");
});
```

## 🔧 DCS API QUIRKS

### Critical API Knowledge:

- Some endpoints return 422 if missing `metadataType=rc`
- Empty results return `{"data": []}` not error
- Organization names are case-sensitive
- Language codes MUST be lowercase
- Books array may differ from ingredients array

### API Response Structure:

```javascript
{
  "data": actualData,  // Always access via .data
  "ok": true|false     // API-level success indicator
}
```

## 🏗️ ARCHITECTURE PATTERNS

### ResourcesContext Pattern (Single Source of Truth):

```javascript
export function ResourcesProvider({ children }) {
  const { reference } = useReferenceContext();
  const [resources, setResources] = useState({});
  const [activeResources, setActiveResources] = useState(
    new Set(["scripture", "notes", "questions"])
  );

  useEffect(() => {
    if (!reference?.bookId) return;

    Promise.allSettled(
      Array.from(activeResources).map((type) => loadResourceForType(type, reference))
    ).then((results) => {
      // Update all resources at once
    });
  }, [reference, activeResources]);

  const activateResource = useCallback((resourceType) => {
    setActiveResources((prev) => new Set(prev).add(resourceType));
  }, []);
}
```

### Self-Activating Panels:

```javascript
export function TranslationNotesPanel() {
  const { resources, activateResource } = useResourcesContext();

  useEffect(() => {
    activateResource("notes"); // Self-activate!
  }, [activateResource]);

  if (!resources.notes?.length) {
    return <div>No notes available</div>;
  }

  // Pure display logic only
}
```

## 📋 CACHING STRATEGY

### Multi-Level Cache Architecture:

```javascript
const organizationCache = new Cache(3600000); // 1 hour
const languageCache = new Cache(3600000); // 1 hour
const resourceCache = new Cache(300000); // 5 minutes
const fileCache = new Cache(600000); // 10 minutes
```

### Session-Based Caching:

```javascript
const cacheKey = "all_languages_optimized";
const cached = sessionStorage.getItem(cacheKey);
if (cached) {
  try {
    return JSON.parse(cached);
  } catch (error) {
    sessionStorage.removeItem(cacheKey);
  }
}
```

## 🚨 ANTI-PATTERNS TO AVOID

### ❌ DON'T:

- Use manifest.yaml files
- Hardcode file naming conventions
- Load entire chapters/books at once
- Create complex caching layers
- Use browser-specific APIs
- Make duplicate API requests
- Ignore the ingredients array
- Skip error handling

### ✅ DO:

- Use ingredients array for file paths
- Implement 3-tier fallback patterns
- Load only current verse data
- Use natural browser caching
- Keep architecture simple
- Deduplicate requests
- Handle errors gracefully
- Test with real organizations

## 🎓 KEY DISCOVERIES TIMELINE

1. **File naming is unpredictable** → Use ingredients array
2. **Manifests are unnecessary** → Catalog API has everything
3. **Generic search is slow** → Use specific endpoints
4. **Browser innerText unreliable** → Unified server extraction
5. **Large payloads don't scale** → Verse-specific loading
6. **Complex caching breaks** → Natural HTTP caching
7. **Organizations are complex** → Pass context everywhere

## 📈 SUCCESS METRICS

Your MCP implementation is correct when:

- ✅ Zero hardcoded file paths (using ingredients)
- ✅ All resources load in < 2 seconds
- ✅ Graceful handling of missing resources
- ✅ Clean USFM text extraction (no markup)
- ✅ Works with multiple organizations
- ✅ Handles verse bridges correctly
- ✅ No manifest.yaml requests
- ✅ Request deduplication working
- ✅ 3-tier fallback implemented
- ✅ Simple architecture maintained

## 🔮 FUTURE-PROOFING

### Patterns That Scale:

1. **Simple over complex** - Resist over-engineering
2. **Small over large** - Verse-specific beats chapter-wide
3. **Standard over custom** - Use browser caching
4. **Explicit over implicit** - Clear data flow
5. **Resilient over perfect** - Fallbacks everywhere

### When Adding Features:

1. Start with ingredients array
2. Implement 3-tier fallback
3. Keep payloads small
4. Use existing patterns
5. Test with real data

## 💡 THE META-LESSON

The translation-helps team spent MONTHS discovering these patterns through painful trial and error. Every pattern here represents weeks of debugging, performance analysis, and architectural evolution.

**Do not repeat their mistakes. Learn from their discoveries.**

The most sophisticated solution is often the simplest one that:

- Trusts the API's data structure (ingredients)
- Uses proven patterns (verse-loading)
- Implements proper fallbacks (3-tier)
- Keeps architecture minimal (single context)
- Handles errors gracefully (empty arrays)

## 📊 DEBUGGING METHODOLOGIES

### Systematic Debugging Approach

```javascript
// 1. Define problem precisely
"Organization avatars displaying as initials instead of logo images"

// 2. Identify data flow
API Response → catalogService.js → ResourceSelector.jsx → DOM Rendering

// 3. Test each layer independently
// API Layer
curl -I "https://git.door43.org/api/v1/catalog/search?metadataType=rc"

// Service Layer
const resources = await searchResourcesAcrossOrgs('en', 'Bible');
console.log('Organization data:', resources.unfoldingWord[0].organizationData);

// Component Layer
console.log('Props:', group.organization.avatar_url);

// DOM Layer
document.querySelector('.organizationLogo').src
```

### Root Cause Analysis - "5 Whys"

1. Why are letters showing? → Fallback initials displaying
2. Why fallback? → Image elements not rendering
3. Why not rendering? → avatar_url prop missing
4. Why missing? → Browser cache serving old version
5. Root cause: Cache invalidation needed

### Common Error Patterns

```javascript
// 422 Unprocessable Entity
// Cause: Missing metadataType=rc parameter

// Resources from wrong organization
// Cause: Organization context not passed through hierarchy

// Images showing briefly then disappearing
// Cause: CORS issues or network timeouts
```

## 🏢 ORGANIZATION AVATAR SYSTEM

### Data Extraction Pattern

```javascript
// From API response
const organizationData = resource.repo?.owner || null;
resource.organizationData = organizationData;

// Critical fields
{
  avatar_url: 'https://git.door43.org/avatars/1bc81b740b4286613cdaa55ddfe4b1fc',
  full_name: 'unfoldingWord®',
  login: 'unfoldingWord'
}
```

### Fallback System

```javascript
// Image with automatic fallback
{
  group.organization.avatar_url ? (
    <img
      src={group.organization.avatar_url}
      onError={handleAvatarError} // Falls back to initials
    />
  ) : (
    <div className={styles.organizationInitials}>{getOrganizationInitials(group.organization)}</div>
  );
}
```

## 🔄 RESOURCESCONTEXT SYNCHRONIZATION

### The Problem Pattern

```javascript
// ❌ Component A and Component B accessing same data differently
// TranslationQuestionsPanel.jsx
const customPath = manifest.projects.find((p) => p.identifier === bookId)?.path;
const questions = await getQuestionsForVerse(bookId, chapter, verse, org, lang, customPath);

// ResourcesContext.jsx (BROKEN)
const questions = await getQuestionsForVerse(bookId, chapter, verse, org, lang); // Missing customPath!
```

### The Solution Pattern

```javascript
// ✅ Both components use IDENTICAL logic
// Extract custom file path from manifest
let customFilePath = null;
if (tqManifest) {
  const project = tqManifest.projects?.find((p) => p.identifier === bookId);
  if (project?.path) {
    customFilePath = project.path.replace("./", "");
  }
}
// Use extracted path
const questions = await getQuestionsForVerse(bookId, chapter, verse, org, lang, customFilePath);
```

## 🚫 HARDCODED RESOURCE FIXES

### Problem: Hardcoded "ult" Resource ID

```javascript
// ❌ WRONG - Always uses ULT regardless of user selection
const scriptureResourceId = reference?.resourceId || "ult";

// ✅ CORRECT - Dynamic from context
const { resourceId } = useReferenceContext();
const scriptureResourceId = resourceId || "ult";
```

### Problem: Broken USFM Text Extraction

```javascript
// ❌ BROKEN - $1 wasn't capturing anything
verseText = verseText.replace(/\\w\s+[^|]*\|[^\\*]*\\*\\w\\*/g, "$1");

// ✅ FIXED - Proper capture groups
verseText = verseText.replace(/\\w\s+([^|\\]*)\|[^\\]*\\*([^\\]*)\\w\\*/g, "$1");
```

### Problem: Missing Verse Bridge Support

```javascript
// ✅ Enhanced verse bridge detection
const bridgeRegex = /\\v\s+(\d+)-(\d+)\s+([\s\S]*?)(?=(\\v\s+[\d\-]+|\\c\s+\d+|$))/gm;
let bridgeMatch;
while ((bridgeMatch = bridgeRegex.exec(usfmText)) !== null) {
  const startVerse = parseInt(bridgeMatch[1]);
  const endVerse = parseInt(bridgeMatch[2]);
  if (targetVerse >= startVerse && targetVerse <= endVerse) {
    match = [bridgeMatch[0], bridgeMatch[3]];
    break;
  }
}
```

### Problem: LLM Chat Hardcoded Titles

```javascript
// ❌ WRONG - Generic title
prompt += `\n\n[SCRIPTURE] Scripture Text:\n"${resources.scripture}"`;

// ✅ CORRECT - Dynamic title from metadata
const scriptureTitle = contextData.metadata?.manifestTitles?.scripture || "Scripture Text";
prompt += `\n\n[SCRIPTURE] ${scriptureTitle}:\n"${resources.scripture}"`;
```

## 🌐 API PATTERNS

### DCS Catalog API Structure

```javascript
// Base endpoints
const CATALOG_BASE = 'https://git.door43.org/api/v1/catalog';

// List endpoints (for dropdowns)
`${CATALOG_BASE}/list/owners`      // Organizations
`${CATALOG_BASE}/list/languages`    // Languages per org
`${CATALOG_BASE}/list/subjects`     // Resources per org/lang

// Search endpoint (for resource data WITH ingredients)
`${CATALOG_BASE}/search?metadataType=rc&lang=${lang}&subject=Bible`

// Response structure ALWAYS
{
  data: [...actual data...],
  ok: true
}
```

### Error Handling Pattern

```javascript
// Always check response.ok first
if (!response.ok) {
  throw new Error(`API request failed: ${response.status}`);
}

// Always validate data structure
const apiResponse = await response.json();
if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
  return fallbackData; // Graceful degradation
}

// Always filter invalid entries
const validOrgs = data.filter((org) => org && org.login);
```

## 🔌 MULTI-RESOURCE INTEGRATION ARCHITECTURE

### Unified Resource Manager Pattern

```javascript
// Single interface for multiple resource providers
class UnifiedResourceManager {
  constructor() {
    this.providers = {
      dcs: new DCSService(), // Existing text resources
      fia: new FiaService(), // Audio/video learning
      vbd: new VBDService(), // Visual Bible Dictionary
      media: new MediaService(), // Google Drive media
    };
  }

  async getResourcesForReference(book, chapter, verse) {
    // Parallel loading from all providers
    const results = await Promise.all([
      this.providers.dcs.getResources(book, chapter, verse),
      this.providers.fia.getPericope(book, chapter, verse),
      this.providers.vbd.getRelatedVideos(book, chapter, verse),
      this.providers.media.getAssets(book, chapter, verse),
    ]);

    return this.mergeResults(results);
  }
}
```

### Resource Type Definitions

```typescript
interface Resource {
  id: string;
  type: "text" | "audio" | "video" | "image";
  source: "dcs" | "fia" | "vbd" | "media";
  language: string;
  metadata: ResourceMetadata;
}

interface FiaResource extends Resource {
  pericope: Pericope;
  steps: Step[]; // 6-step oral learning process
  mediaAssets: MediaAsset[];
  terms: Term[];
}
```

### GraphQL Integration Pattern

```javascript
// Apollo Client for FIA GraphQL
import { ApolloClient, InMemoryCache } from "@apollo/client";

const fiaClient = new ApolloClient({
  uri: "https://api.fiaproject.org/graphql",
  cache: new InMemoryCache(),
  headers: {
    authorization: localStorage.getItem("fia-token") || "",
  },
});
```

### Media Caching Strategy

```javascript
// Progressive Web App media cache
class MediaCache {
  async cacheMedia(url, metadata) {
    const cache = await caches.open("fia-media-v1");
    const response = await fetch(url);
    await cache.put(url, response);
    await this.saveMetadata(url, metadata);
  }

  async getMedia(url) {
    const cache = await caches.open("fia-media-v1");
    return await cache.match(url);
  }
}
```

### Unified Authentication

```javascript
// Single auth manager for multiple providers
class AuthManager {
  async authenticate(provider) {
    switch (provider) {
      case "fia":
        return await this.fiaAuth();
      case "google":
        return await this.googleAuth();
      case "youtube":
        return await this.youtubeAuth();
    }
  }
}
```

## 🎯 RESOURCE SERVICE PATTERNS

### Universal Service Template

```javascript
export async function getResourceWithResourceData(
  bookId,
  chapter,
  verse,
  resourceData, // ← Always require this!
  languageId = "en"
) {
  if (!resourceData) {
    throw new Error("No resource data provided");
  }

  // 1. Get file path from ingredients
  const ingredient = resourceData.ingredients?.find((ing) => ing.identifier === bookId);
  const filePath = ingredient?.path || `fallback_${bookId.toUpperCase()}.tsv`;

  // 2. Get organization from resource data
  const organization = resourceData.owner?.login || "unfoldingWord";

  // 3. Fetch and process
  const content = await fetchResourceFile(languageId, RESOURCE_ID, filePath, organization);
  return processContent(content);
}
```

### TSV Parsing Patterns

```javascript
// Translation Notes columns
["Reference", "ID", "Tags", "SupportReference", "Quote", "Occurrence", "Note"][
  // Translation Questions columns
  ("Reference", "ID", "Tags", "Quote", "Occurrence", "Question", "Response")
][
  // Translation Word Links columns
  ("Reference", "ID", "Tags", "OrigWords", "Occurrence", "TWLink")
];

// Generic TSV parser
export function parseTSV(content, options = {}) {
  const lines = content.trim().split("\n");
  const headers = options.columns || lines[0].split("\t");

  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || "";
      return obj;
    }, {});
  });
}
```

## 🚀 PERFORMANCE PATTERNS

### Parallel Loading

```javascript
// ✅ Load all resources simultaneously
const [scripture, notes, questions, words] = await Promise.all([
  fetchScripture(reference),
  fetchNotes(reference),
  fetchQuestions(reference),
  fetchWords(reference),
]);
```

### Request Deduplication

```javascript
const pendingRequests = new Map();

async function fetchWithDedup(key, fetcher) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetcher();
  pendingRequests.set(key, promise);

  try {
    return await promise;
  } finally {
    pendingRequests.delete(key);
  }
}
```

### Simple Caching

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
}
```

## 🤖 LLM INTEGRATION PATTERNS

### Context Assembly

```javascript
// Always include all available resources
const context = {
  reference: `${bookId} ${chapter}:${verse}`,
  scripture: extractVerseText(resources.scripture, chapter, verse),
  notes: resources.notes.map((n) => ({ quote: n.Quote, note: n.Note })),
  questions: resources.questions.map((q) => ({ question: q.Question, answer: q.Response })),
  words: resources.words.map((w) => ({ term: w.term, definition: w.definition })),
};
```

### Citation System

```javascript
// Mandatory citation format
const citations = {
  SCRIPTURE: "Direct scripture quote",
  "TN-1": "Translation Note #1",
  "TQ-1": "Translation Question #1",
  "TW-1": "Translation Word #1",
};

// Response must include sources section
`
According to the translation notes [TN-1], the word "created" means...

Sources:
- [TN-1]: Quote: "created" - Text: "The Hebrew word 'bara' indicates..."
`;
```

## 💬 SEAMLESS CONTEXT SLIPSTREAMING

### The Problem Solved

```javascript
// ❌ OLD - Blocking behavior
const handleReferenceChange = () => {
  const userChoice = window.confirm("Context changed. Reset conversation?");
  if (userChoice) {
    resetConversation(); // Lost all chat history!
  }
};
```

### The Solution - Context Slipstreaming

```javascript
// ✅ NEW - Seamless context switching
const sendMessage = useCallback(
  async (message) => {
    // Always use latest available context without blocking
    const currentContext = getFormattedContext();

    if (!currentContext) {
      // Graceful handling
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please ensure resources are loaded before continuing...",
        },
      ]);
      return;
    }

    // Send with updated context
    const response = await sendChatMessage(message, currentContext, chatHistory);

    // Visual feedback for context change
    if (contextHasChanged(lastContext, currentContext)) {
      showContextChangeIndicator(currentContext);
    }
  },
  [getFormattedContext, chatHistory]
);
```

### Context Change Indicators

```javascript
// Non-blocking visual feedback
const showContextChangeIndicator = (newContext) => {
  setContextChangeNotification({
    message: `📚 Updated to ${newContext.reference.citation}`,
    timestamp: Date.now(),
    dismissible: true,
    type: "context-change",
  });
};
```

### User Experience Benefits

- Navigate freely between passages while chatting
- No conversation resets or crashes
- AI naturally acknowledges context changes
- Background resource loading
- Seamless workflow for translation teams

## 🚀 DEPLOYMENT PATTERNS

### Environment Setup (GitFlow)

```bash
# Branch structure
master (tagged releases only)
└── production (live site)
    └── staging (pre-production)
        └── dev (active development)
            └── feature/* (feature branches)
```

### Netlify Configuration

```toml
# Branch deploys
# dev → https://dev--translation-helps.netlify.app
# staging → https://staging--translation-helps.netlify.app
# production → https://translation-helps.netlify.app

[build]
  command = "yarn install && yarn run build"
  functions = "netlify/functions"
  publish = "dist"

# Environment contexts
[context.production.environment]
  NODE_ENV = "development"  # KEEP AS IS - DO NOT CHANGE!
  VITE_API_ENV = "production"

[context.staging.environment]
  NODE_ENV = "development"  # KEEP AS IS - DO NOT CHANGE!
  VITE_API_ENV = "staging"
```

### Branch Protection Rules

```yaml
# Master branch
- Require 2 PR reviews
- Require status checks
- Restrict push to admins only

# Production branch
- Require 1 PR review
- Require Netlify deploy preview
- Require status checks

# Staging branch
- Require status checks
- Auto-deploy on push
```

### Deployment Workflow

1. Feature development on `feature/*` branches
2. PR to `dev` for integration
3. Auto-deploy to dev environment
4. PR to `staging` for QA
5. Auto-deploy to staging environment
6. PR to `production` for release
7. Tag `master` after production deployment

## 🚨 CRITICAL DO NOT's

### Never Use These Patterns

```javascript
// ❌ NEVER hardcode file paths
const filePath = `tn_${bookId}.tsv`;

// ❌ NEVER use manifests
await fetchManifest();

// ❌ NEVER load entire books
const bookContent = await fetchBook(bookId);

// ❌ NEVER use browser-specific code
element.innerText; // Breaks in tests

// ❌ NEVER skip validation
// Always run validateCleanText() on USFM extraction

// ❌ NEVER modify netlify.toml build commands
// Keep as: "yarn install && yarn run build"

// ❌ NEVER change NODE_ENV in production
// Keep as: NODE_ENV = "development"  // This is intentional!

// ❌ NEVER hardcode resource IDs
const resourceId = "ult"; // Always get from context
```

## 📋 IMPLEMENTATION CHECKLIST

Before implementing ANY feature:

- [ ] Check ingredients array for file paths
- [ ] Use catalog API with metadataType=rc
- [ ] Load only current verse data
- [ ] Pass organization context through components
- [ ] Use unified USFM extraction
- [ ] Implement 3-tier fallback pattern
- [ ] Add proper error handling
- [ ] Test in all environments
- [ ] Validate clean text output
- [ ] Load resources in parallel
- [ ] Implement request deduplication
- [ ] Add simple caching with TTL
- [ ] Follow GitFlow branching
- [ ] Deploy through proper environments
- [ ] Check for hardcoded values
- [ ] Use dynamic resource IDs

## 🔗 Key Documentation References

From translation-helps project:

- `manifest-elimination-and-api-discoveries.md` - How they eliminated manifests
- `api-direct-testing-summary.md` - API testing patterns
- `SIMPLE-VERSE-LOADING-PATTERN.md` - The final architecture
- `usfm-text-extraction-unified-approach.md` - USFM extraction solution
- `debugging-methodologies.md` - Systematic debugging approaches
- `cross-organization-resource-loading.md` - Multi-org support
- `seamless-context-slipstreaming.md` - Chat context switching
- `deployment-setup-guide.md` - Environment configuration
- `hardcoded-ult-issue-resolution.md` - Dynamic resource fixes
- `multi-resource-api-comparison.md` - Multi-provider architecture

Remember: Every pattern here represents WEEKS of debugging. Follow them exactly!
