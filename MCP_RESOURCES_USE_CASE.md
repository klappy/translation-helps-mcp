# MCP Resources Use Case for Translation Helps

## Understanding Resources vs Tools

**Tools** = Actions you can perform (e.g., "fetch scripture", "get translation notes")
**Resources** = Things you can read/browse (e.g., "en_ult_genesis_1", "en_tw_love", "en_ta_figs-metaphor")

Resources are like a **file system** or **document library** - they allow clients to:

1. **Browse** available resources (like listing files in a directory)
2. **Read** specific resources directly (like opening a file)
3. **Attach** resources to conversations (Claude can reference them directly)

---

## How Resources Would Work in Our Use Case

### 1. **Bible Translations as Resources**

**Resource URIs:**

```
en_ult_genesis_1
en_ult_genesis_2
en_ult_john_3
en_ust_genesis_1
en_t4t_genesis_1
```

**Benefits:**

- Users can browse available books/chapters
- Claude can directly reference specific chapters
- Better for "show me Genesis 1" type queries
- Resources can be attached to conversations

**Example `resources/list` response:**

```json
{
  "resources": [
    {
      "uri": "en_ult_genesis_1",
      "name": "Genesis 1 (ULT)",
      "description": "Genesis chapter 1 from unfoldingWord Literal Text",
      "mimeType": "text/plain"
    },
    {
      "uri": "en_ult_genesis_2",
      "name": "Genesis 2 (ULT)",
      "description": "Genesis chapter 2 from unfoldingWord Literal Text",
      "mimeType": "text/plain"
    }
  ]
}
```

**Example `resources/read` request:**

```json
{
  "uri": "en_ult_genesis_1"
}
```

**Example `resources/read` response:**

```json
{
  "contents": [
    {
      "uri": "en_ult_genesis_1",
      "mimeType": "text/plain",
      "text": "In the beginning, God created the heavens and the earth..."
    }
  ]
}
```

---

### 2. **Translation Words as Resources**

**Resource URIs:**

```
en_tw_kt_love
en_tw_kt_faith
en_tw_kt_grace
en_tw_names_paul
en_tw_names_god
```

**Benefits:**

- Browse all available translation words
- Direct access to word definitions
- Better for "what is love?" type queries
- Can attach word articles to conversations

**Example `resources/list` with filtering:**

```json
{
  "resources": [
    {
      "uri": "en_tw_kt_love",
      "name": "Love, Beloved",
      "description": "Translation word article for 'love' (Key Term)",
      "mimeType": "text/markdown"
    },
    {
      "uri": "en_tw_kt_faith",
      "name": "Faith, Believe",
      "description": "Translation word article for 'faith' (Key Term)",
      "mimeType": "text/markdown"
    }
  ]
}
```

---

### 3. **Translation Academy Articles as Resources**

**Resource URIs:**

```
en_ta_figs-metaphor
en_ta_figs-metonymy
en_ta_translate-names
en_ta_checking-intro
```

**Benefits:**

- Browse all available academy modules
- Direct access to training articles
- Better for "teach me about metaphors" queries
- Can attach articles to conversations

**Example:**

```json
{
  "uri": "en_ta_figs-metaphor",
  "name": "Metaphor",
  "description": "Translation Academy article on understanding and translating metaphors",
  "mimeType": "text/markdown"
}
```

---

### 4. **Translation Notes as Resources**

**Resource URIs:**

```
en_tn_genesis_1_1
en_tn_genesis_1_2
en_tn_john_3_16
```

**Benefits:**

- Browse notes by book/chapter/verse
- Direct access to specific notes
- Better for verse-specific queries

---

### 5. **Translation Questions as Resources**

**Resource URIs:**

```
en_tq_genesis_1_1
en_tq_genesis_1_2
en_tq_john_3_16
```

**Benefits:**

- Browse questions by reference
- Direct access to comprehension questions

---

## Implementation Strategy

### Option 1: **Hierarchical Resource Structure** (Recommended)

Organize resources in a tree-like structure:

```
en/
  ult/
    genesis/
      1
      2
      3
    john/
      3
      16
  tw/
    kt/
      love
      faith
      grace
    names/
      paul
      god
  ta/
    translate/
      figs-metaphor
      figs-metonymy
    checking/
      intro-checking
```

**URI Format:**

- `en/ult/genesis/1` - Genesis 1 in ULT
- `en/tw/kt/love` - Translation word "love"
- `en/ta/translate/figs-metaphor` - Academy article on metaphors

### Option 2: **Flat Resource Structure**

Simple, flat URIs:

```
en_ult_genesis_1
en_ult_genesis_2
en_tw_kt_love
en_tw_names_paul
en_ta_figs-metaphor
```

---

## Example Implementation

### `resources/list` Method

```typescript
case 'resources/list': {
  const { uri } = body.params || {};

  // If no URI, list top-level (languages)
  if (!uri) {
    return json({
      resources: [
        {
          uri: 'en',
          name: 'English',
          description: 'English translation resources',
          mimeType: 'application/json'
        },
        {
          uri: 'es',
          name: 'Spanish',
          description: 'Spanish translation resources',
          mimeType: 'application/json'
        }
      ]
    });
  }

  // If URI is a language, list resource types
  if (uri === 'en') {
    return json({
      resources: [
        {
          uri: 'en/ult',
          name: 'ULT (UnfoldingWord Literal Text)',
          description: 'Literal Bible translation',
          mimeType: 'application/json'
        },
        {
          uri: 'en/tw',
          name: 'Translation Words',
          description: 'Biblical term definitions',
          mimeType: 'application/json'
        },
        {
          uri: 'en/ta',
          name: 'Translation Academy',
          description: 'Translation training articles',
          mimeType: 'application/json'
        }
      ]
    });
  }

  // If URI is a resource type, list books/articles
  if (uri === 'en/ult') {
    // List all books available in ULT
    return json({
      resources: [
        {
          uri: 'en/ult/genesis',
          name: 'Genesis',
          description: 'Book of Genesis',
          mimeType: 'application/json'
        },
        {
          uri: 'en/ult/john',
          name: 'John',
          description: 'Gospel of John',
          mimeType: 'application/json'
        }
      ]
    });
  }

  // If URI is a book, list chapters
  if (uri.startsWith('en/ult/')) {
    const book = uri.split('/')[2];
    // List chapters for this book
    return json({
      resources: [
        {
          uri: `${uri}/1`,
          name: `${book} Chapter 1`,
          description: `Chapter 1 of ${book}`,
          mimeType: 'text/plain'
        },
        {
          uri: `${uri}/2`,
          name: `${book} Chapter 2`,
          description: `Chapter 2 of ${book}`,
          mimeType: 'text/plain'
        }
      ]
    });
  }

  // For translation words
  if (uri === 'en/tw') {
    return json({
      resources: [
        {
          uri: 'en/tw/kt',
          name: 'Key Terms',
          description: 'Key biblical terms',
          mimeType: 'application/json'
        },
        {
          uri: 'en/tw/names',
          name: 'Names',
          description: 'Biblical names',
          mimeType: 'application/json'
        }
      ]
    });
  }

  if (uri === 'en/tw/kt') {
    // List all key terms
    // This would query our translation words database
    return json({
      resources: [
        {
          uri: 'en/tw/kt/love',
          name: 'Love, Beloved',
          description: 'Translation word article for love',
          mimeType: 'text/markdown'
        },
        {
          uri: 'en/tw/kt/faith',
          name: 'Faith, Believe',
          description: 'Translation word article for faith',
          mimeType: 'text/markdown'
        }
      ]
    });
  }

  // Empty list for leaf nodes (actual content)
  return json({ resources: [] });
}
```

### `resources/read` Method

```typescript
case 'resources/read': {
  const { uri } = body.params || {};

  if (!uri) {
    return json({
      error: {
        code: ErrorCode.InvalidParams,
        message: 'Resource URI is required'
      }
    }, { status: 400 });
  }

  // Parse URI to determine resource type
  const parts = uri.split('/');

  // Handle scripture resources: en/ult/genesis/1
  if (parts.length === 4 && parts[1] === 'ult') {
    const [lang, resourceType, book, chapter] = parts;
    const reference = `${book} ${chapter}`;

    // Use existing scripture service
    const scripture = await fetchScripture({
      reference,
      language: lang,
      organization: 'unfoldingWord',
      format: 'text'
    });

    return json({
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: scripture.scripture?.text || ''
        }
      ]
    });
  }

  // Handle translation words: en/tw/kt/love
  if (parts.length === 4 && parts[1] === 'tw') {
    const [lang, resourceType, category, term] = parts;

    // Use existing translation word service
    const word = await getTranslationWord({
      term,
      language: lang,
      category: category as 'kt' | 'names' | 'other'
    });

    return json({
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: word.content || ''
        }
      ]
    });
  }

  // Handle translation academy: en/ta/translate/figs-metaphor
  if (parts.length === 4 && parts[1] === 'ta') {
    const [lang, resourceType, category, moduleId] = parts;

    // Use existing academy service
    const academy = await fetchTranslationAcademy({
      moduleId,
      language: lang,
      organization: 'unfoldingWord'
    });

    return json({
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: academy.content || ''
        }
      ]
    });
  }

  return json({
    error: {
      code: ErrorCode.InvalidRequest,
      message: `Unknown resource URI: ${uri}`
    }
  }, { status: 400 });
}
```

---

## Benefits of Resources in Our Use Case

### 1. **Better User Experience in Claude**

**With Tools (Current):**

- User: "Show me Genesis 1"
- AI: Calls `fetch_scripture` tool
- AI: Returns scripture text

**With Resources (Proposed):**

- User: "Show me Genesis 1"
- AI: Can directly reference `en/ult/genesis/1` resource
- AI: Can attach resource to conversation
- User: Can browse available resources in Claude's UI

### 2. **Browsing Capability**

Users can:

- Browse all available books: `resources/list` → `en/ult` → see all books
- Browse all translation words: `resources/list` → `en/tw/kt` → see all terms
- Browse all academy articles: `resources/list` → `en/ta/translate` → see all articles

### 3. **Direct Resource Access**

Instead of:

```
Tool: fetch_translation_word({ term: "love" })
```

Users can:

```
Resource: en/tw/kt/love (direct URI access)
```

### 4. **Resource Attachments**

Claude can:

- Attach resources to conversations
- Reference resources directly
- Show resource previews in UI

---

## When to Use Resources vs Tools

### Use **Resources** when:

- ✅ User wants to **browse** available content
- ✅ User wants to **read** specific content directly
- ✅ Content is **static** or **cacheable** (Bible text, word articles, academy articles)
- ✅ Content has a **clear URI structure** (book/chapter, term ID, module ID)

### Use **Tools** when:

- ✅ User wants to **search** or **filter** content
- ✅ User wants to **aggregate** multiple resources
- ✅ Operation requires **computation** or **transformation**
- ✅ Operation is **dynamic** (e.g., "get all helps for this passage")

---

## Recommended Resource Structure

### Hierarchical Structure (Recommended)

```
en/                          # Language
  ult/                       # Resource type
    genesis/                 # Book
      1                      # Chapter
      2
    john/
      3
  tw/                        # Translation Words
    kt/                      # Category
      love                   # Term
      faith
    names/
      paul
  ta/                        # Translation Academy
    translate/               # Category
      figs-metaphor         # Module
      figs-metonymy
    checking/
      intro-checking
  tn/                        # Translation Notes
    genesis/
      1                     # Chapter
        1                    # Verse
        2
  tq/                        # Translation Questions
    genesis/
      1
        1
```

### URI Examples

- `en/ult/genesis/1` - Genesis 1 in ULT
- `en/tw/kt/love` - Translation word "love"
- `en/ta/translate/figs-metaphor` - Academy article on metaphors
- `en/tn/genesis/1/1` - Translation note for Genesis 1:1
- `en/tq/john/3/16` - Translation question for John 3:16

---

## Implementation Priority

### Phase 1: Core Resources (High Value)

1. **Translation Words** (`en/tw/kt/*`, `en/tw/names/*`)
   - High value - users often want to browse terms
   - Clear URI structure
   - Static content (markdown files)

2. **Translation Academy** (`en/ta/translate/*`, `en/ta/checking/*`)
   - High value - users want to browse training articles
   - Clear module ID structure
   - Static content (markdown files)

### Phase 2: Scripture Resources (Medium Value)

3. **Bible Chapters** (`en/ult/*/*`, `en/ust/*/*`)
   - Medium value - tools already work well
   - Adds browsing capability
   - Dynamic content (needs parsing)

### Phase 3: Notes & Questions (Lower Priority)

4. **Translation Notes** (`en/tn/*/*/*`)
5. **Translation Questions** (`en/tq/*/*/*`)
   - Lower priority - tools handle these well
   - More complex URI structure (book/chapter/verse)
   - Dynamic content (TSV parsing)

---

## Example User Flows

### Flow 1: Browsing Translation Words

```
User: "What translation words are available?"
AI: Calls resources/list → en/tw
AI: Shows categories (kt, names, other)
User: "Show me key terms"
AI: Calls resources/list → en/tw/kt
AI: Shows list of all key terms
User: "Tell me about love"
AI: Calls resources/read → en/tw/kt/love
AI: Returns full word article
```

### Flow 2: Browsing Academy Articles

```
User: "What translation concepts can I learn about?"
AI: Calls resources/list → en/ta
AI: Shows categories (translate, checking, process)
User: "Show me translation concepts"
AI: Calls resources/list → en/ta/translate
AI: Shows all translation articles
User: "Tell me about metaphors"
AI: Calls resources/read → en/ta/translate/figs-metaphor
AI: Returns full academy article
```

### Flow 3: Reading Scripture

```
User: "Show me Genesis 1"
AI: Calls resources/read → en/ult/genesis/1
AI: Returns Genesis 1 text
AI: Can attach resource to conversation
```

---

## Technical Considerations

### 1. **Caching**

Resources are perfect for caching:

- Translation words: Cache markdown files
- Academy articles: Cache markdown files
- Scripture: Cache parsed USFM

### 2. **Lazy Loading**

For large resource lists (e.g., all translation words):

- Return paginated results
- Support filtering in `resources/list`
- Use cursor-based pagination

### 3. **Metadata**

Include metadata in resource listings:

```json
{
  "uri": "en/tw/kt/love",
  "name": "Love, Beloved",
  "description": "Translation word article for 'love'",
  "mimeType": "text/markdown",
  "metadata": {
    "category": "kt",
    "term": "love",
    "language": "en",
    "lastUpdated": "2024-01-01"
  }
}
```

### 4. **Error Handling**

Handle missing resources gracefully:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource 'en/tw/kt/nonexistent' not found"
  }
}
```

---

## Comparison: Resources vs Tools

| Feature           | Tools                     | Resources               |
| ----------------- | ------------------------- | ----------------------- |
| **Purpose**       | Perform actions           | Read content            |
| **Use Case**      | "Get helps for John 3:16" | "Show me John 3:16"     |
| **Browsing**      | No                        | Yes                     |
| **Direct Access** | No (requires params)      | Yes (via URI)           |
| **Attachments**   | No                        | Yes (Claude can attach) |
| **Search/Filter** | Yes                       | Limited                 |
| **Aggregation**   | Yes                       | No                      |

---

## Recommendation

**Implement Resources for:**

1. ✅ **Translation Words** - High value, clear structure, static content
2. ✅ **Translation Academy** - High value, clear structure, static content
3. ⚠️ **Scripture** - Medium value, tools work well but resources add browsing

**Keep as Tools:**

- Translation Notes (complex filtering needed)
- Translation Questions (complex filtering needed)
- Aggregation operations (fetch_resources, search_resources)

This gives users the best of both worlds:

- **Resources** for browsing and direct access
- **Tools** for complex queries and aggregations
