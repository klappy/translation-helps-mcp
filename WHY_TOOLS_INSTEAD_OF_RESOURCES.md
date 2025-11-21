# Why We Use Tools Instead of Resources

## The Core Reason: **Computation vs. Static Files**

Our translation resources require **significant computation and processing** before they can be used. They are not simple static files that can be directly read.

---

## What Our Tools Actually Do

### 1. **Scripture Service** - Complex USFM Processing

**What happens when you call `fetch_scripture`:**

1. **Parse Bible Reference** → `"John 3:16"` → `{book: "JHN", chapter: 3, verse: 16}`
2. **Discover Resources** → Query DCS catalog to find available translations
3. **Download ZIP Files** → Download entire repository ZIPs (9-10MB each)
4. **Extract USFM Files** → Extract specific book USFM from ZIP (e.g., `41-JHN.usfm`)
5. **Parse USFM Format** → Parse complex USFM markup:
   ```
   \id JHN
   \c 3
   \v 16 For God so loved the world...
   ```
6. **Extract Specific Verses** → Filter to only requested verses (e.g., verse 16)
7. **Handle Multiple Translations** → Process ULT, UST, T4T, UEB in parallel
8. **Format Conversion** → Convert to text, markdown, or USFM format
9. **Alignment Parsing** → Extract word-level alignment data if requested

**This is NOT a simple file read!** It's a multi-step computation pipeline.

### 2. **Translation Notes Service** - TSV Parsing & Filtering

**What happens when you call `fetch_translation_notes`:**

1. **Parse Reference** → `"John 3:16"` → `{book: "JHN", chapter: 3, verse: 16}`
2. **Discover Resource** → Find `en_tn` resource in catalog
3. **Download ZIP** → Download entire translation notes ZIP (5-6MB)
4. **Extract TSV File** → Extract `41-JHN.tsv` from ZIP
5. **Parse TSV Format** → Parse tab-separated values:
   ```
   Reference	ID	Quote	Note	SupportReference
   JHN 3:16	figs-metaphor	"so loved"	This is a metaphor...	rc://*/ta/man/translate/figs-metaphor
   ```
6. **Filter by Verse** → Match rows where `Reference` contains `JHN 3:16`
7. **Separate Note Types** → Split into `verseNotes` vs `contextNotes`
8. **Filter by Options** → Apply `includeIntro` and `includeContext` filters
9. **Transform Structure** → Convert TSV rows to structured `TranslationNote` objects

**This requires parsing, filtering, and transformation - not just file access!**

### 3. **Translation Questions Service** - Similar TSV Processing

Same complex pipeline:

- Download ZIP
- Extract TSV
- Parse TSV
- Filter by reference
- Transform to structured format

### 4. **Translation Word Links** - TSV Processing + Data Transformation

1. Download ZIP
2. Extract TSV
3. Parse TSV
4. Filter by reference
5. **Transform RC Links** → Extract category, term, path from RC link format
6. Map to clean structure

### 5. **Translation Words** - Markdown + Search

1. **Search by Term** → Search across all categories (kt, names, other)
2. **Find Matching Files** → Locate markdown file (e.g., `bible/kt/love.md`)
3. **Download ZIP** → Download translation words ZIP
4. **Extract Markdown** → Extract specific file
5. **Parse Markdown** → Extract title, content, Bible references
6. **Format Response** → Structure as word article

**This requires search logic, not just file access!**

### 6. **Translation Academy** - Module Resolution + Concatenation

1. **Resolve Module ID** → `"figs-metaphor"` → Find in translate/process/checking categories
2. **Download ZIP** → Download academy ZIP
3. **Extract Multiple Files** → Extract all `.md` files in module directory
4. **Concatenate Content** → Combine multiple files into single article
5. **Extract Title** → Parse title from first H1 heading

---

## Why Resources Wouldn't Work Well

### Problem 1: **Dynamic Reference-Based Queries**

**User Query**: "Get helps for John 3:16"

**With Tools (Current)**:

```
fetch_translation_notes({ reference: "John 3:16" })
→ Parses reference
→ Finds right TSV file
→ Filters TSV rows by verse
→ Returns only relevant notes
```

**With Resources (Hypothetical)**:

```
resources/read({ uri: "en_tn_john_3_16" })
→ Would need to pre-generate a resource for EVERY verse
→ 31,102 verses × multiple resource types = millions of resources
→ Not practical!
```

### Problem 2: **Complex Filtering**

**User Query**: "Get notes for John 3, but exclude intro notes"

**With Tools**:

```
fetch_translation_notes({
  reference: "John 3",
  includeIntro: false
})
→ Filters TSV rows after parsing
→ Returns only verse notes
```

**With Resources**:

```
resources/read({ uri: "en_tn_john_3" })
→ Would need separate resources for:
  - en_tn_john_3_all
  - en_tn_john_3_verse_only
  - en_tn_john_3_context_only
→ Exponential resource explosion!
```

### Problem 3: **Multi-Translation Aggregation**

**User Query**: "Get all translations for John 3:16"

**With Tools**:

```
fetch_scripture({
  reference: "John 3:16",
  specificTranslations: ["ult", "ust", "t4t", "ueb"]
})
→ Processes 4 translations in parallel
→ Returns all in one response
```

**With Resources**:

```
resources/read({ uri: "en_ult_john_3_16" })
resources/read({ uri: "en_ust_john_3_16" })
resources/read({ uri: "en_t4t_john_3_16" })
resources/read({ uri: "en_ueb_john_3_16" })
→ Requires 4 separate calls
→ Client must aggregate
→ More complex for users
```

### Problem 4: **Search & Discovery**

**User Query**: "What translation words are available for 'love'?"

**With Tools**:

```
fetch_translation_word({ term: "love" })
→ Searches across all categories
→ Finds matching articles
→ Returns results
```

**With Resources**:

```
resources/list({ uri: "en/tw" })
→ Would need to list ALL translation words
→ Thousands of resources
→ No search capability
→ Client must filter
```

### Problem 5: **Data Transformation**

Our tools perform significant data transformation:

- **TSV → Structured Objects**: Parse tab-separated values into typed objects
- **USFM → Plain Text**: Extract verse text from complex markup
- **Alignment Parsing**: Extract word-level alignment data
- **Format Conversion**: Convert between text, markdown, JSON, USFM
- **Reference Parsing**: Convert "John 3:16" to structured reference

Resources are meant for **static content**, not computed transformations.

---

## When Resources WOULD Make Sense

Resources would be useful for:

### ✅ **Static, Pre-Generated Content**

1. **Complete Books/Chapters** (if we pre-generated them):
   - `en/ult/genesis/1` - Entire Genesis 1 chapter
   - `en/ult/genesis/2` - Entire Genesis 2 chapter
   - **But**: We'd need to pre-generate 1,189 chapters × 4 translations = 4,756 resources

2. **Translation Word Articles** (static markdown files):
   - `en/tw/kt/love` - Love article
   - `en/tw/kt/faith` - Faith article
   - **This could work!** These are static files

3. **Translation Academy Articles** (static markdown files):
   - `en/ta/translate/figs-metaphor` - Metaphor article
   - `en/ta/checking/intro-checking` - Checking intro
   - **This could work!** These are static files

### ❌ **Dynamic, Computed Content**

1. **Verse-Specific Notes** - Requires TSV filtering
2. **Verse-Specific Questions** - Requires TSV filtering
3. **Verse-Specific Scripture** - Requires USFM parsing
4. **Reference-Based Queries** - Requires parsing and filtering
5. **Aggregated Resources** - Requires computation

---

## The Hybrid Approach (Best of Both Worlds)

We could use **both** tools and resources:

### **Use Resources For:**

- ✅ Translation Words (`en/tw/kt/love`) - Static markdown files
- ✅ Translation Academy (`en/ta/translate/figs-metaphor`) - Static markdown files
- ✅ Complete Chapters (`en/ult/genesis/1`) - If we pre-generate them

### **Use Tools For:**

- ✅ Verse-specific queries (`fetch_translation_notes` for "John 3:16")
- ✅ Aggregation (`fetch_resources` for comprehensive helps)
- ✅ Search (`fetch_translation_word` with term search)
- ✅ Filtering (`includeIntro`, `includeContext`, `specificTranslations`)
- ✅ Format conversion (text, markdown, JSON, USFM)

---

## Real-World Example: Why Tools Are Better

### Scenario: "Get all translation helps for John 3:16"

**With Tools (Current)**:

```javascript
// One tool call that does everything
fetch_resources({
  reference: "John 3:16",
  resources: ["scripture", "notes", "questions", "words"]
})
→ Downloads ZIPs
→ Extracts files
→ Parses USFM/TSV
→ Filters by verse
→ Aggregates results
→ Returns comprehensive response
```

**With Resources (Hypothetical)**:

```javascript
// Would need multiple resource reads
resources/read({ uri: "en_ult_john_3_16" })
resources/read({ uri: "en_ust_john_3_16" })
resources/read({ uri: "en_tn_john_3_16" })
resources/read({ uri: "en_tq_john_3_16" })
resources/list({ uri: "en/tw" }) // Then filter for words in John 3:16
→ Client must:
  - Make 5+ separate calls
  - Parse and filter results
  - Aggregate data
  - Handle errors for each
→ Much more complex!
```

---

## Summary: Why Tools Were the Right Choice

### ✅ **Tools Are Better Because:**

1. **Computation Required**: Our data requires parsing, filtering, and transformation
2. **Dynamic Queries**: Reference-based queries need computation, not static files
3. **Aggregation**: Tools can combine multiple resource types efficiently
4. **Flexibility**: Tools support complex parameters (filtering, formatting, options)
5. **Efficiency**: One tool call can do what would require many resource reads
6. **Search Capability**: Tools can search across data (e.g., term search)
7. **Format Conversion**: Tools can transform data formats on-the-fly

### ⚠️ **Resources Would Be Limited Because:**

1. **Static Only**: Resources are for static files, not computed content
2. **No Filtering**: Can't filter by verse, category, or other criteria
3. **No Aggregation**: Can't combine multiple resources in one call
4. **No Search**: Can't search across resources
5. **Resource Explosion**: Would need millions of pre-generated resources
6. **No Format Conversion**: Resources are what they are, no transformation

---

## Conclusion

**We chose tools because our use case requires computation, not just file access.**

Our translation resources are:

- Stored in complex formats (USFM, TSV)
- Require parsing and extraction
- Need filtering by verse/reference
- Benefit from aggregation
- Support dynamic queries

**Tools are the right abstraction** for operations that require computation, transformation, and aggregation.

**Resources would be useful** for static content like complete translation word articles or academy modules, but they can't replace tools for our core use cases.

---

## Recommendation

**Keep tools as primary interface** - they're perfect for our use case.

**Add resources as complementary feature** - for browsing static content like:

- Translation Words (browse all terms)
- Translation Academy (browse all articles)
- Complete Chapters (if we pre-generate them)

This gives users:

- **Tools** for dynamic, computed queries
- **Resources** for browsing static content

Best of both worlds! 🎯
