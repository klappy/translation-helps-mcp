# Scripture & USFM Processing Guide

Complete guide to scripture extraction and USFM text processing for clean, LLM-ready Bible text.

## 🎯 **OVERVIEW**

The Translation Helps MCP provides clean, readable Bible text from multiple translations with robust USFM processing. All USFM markup, alignment data, and formatting codes are automatically removed to produce quotable text perfect for LLM consumption.

**Key Capabilities:**

- **Multiple Bible translations** - Automatically discovers ALL available translations
- **Clean text extraction** - Removes USFM markup while preserving meaning
- **Flexible references** - Single verses, ranges, full chapters
- **LLM-optimized** - Perfect for AI assistants without markup noise

---

## 📚 **API USAGE**

### Multiple Bible Translations

The API automatically discovers and returns ALL available Bible translations:

```json
{
  "scriptures": [
    { "text": "For God so loved the world...", "translation": "ULT" },
    { "text": "God loved the people of the world so much...", "translation": "UST" },
    { "text": "God loved the people in the world so much...", "translation": "T4T" },
    { "text": "For God loved the world in this way...", "translation": "UEB" }
  ]
}
```

### Reference Formats

```bash
# Single verse
/fetch-resources?reference=John%203:16

# Verse range
/fetch-resources?reference=John%203:16-18

# Full chapter
/fetch-resources?reference=John%203
```

### Complete Example

**Request:**

```bash
curl "https://your-site.netlify.app/api/fetch-resources?reference=Titus%202:6&language=en&organization=unfoldingWord"
```

**Response:**

```json
{
  "scripture": {
    "text": "6 In the same way, exhort the younger men to be sensible.",
    "translation": "ULT"
  },
  "scriptures": [
    {
      "text": "6 In the same way, exhort the younger men to be sensible.",
      "translation": "ULT"
    },
    {
      "text": "6 As for the younger men, urge them likewise to control themselves well.",
      "translation": "UST"
    },
    {
      "text": "6 As for the younger men, similarly, urge them to control themselves in all that they say and do.",
      "translation": "T4T"
    }
  ]
}
```

---

## 🔧 **TECHNICAL IMPLEMENTATION**

### The USFM Challenge

Raw USFM contains extensive markup that must be carefully removed:

**Raw USFM:**

```
\v 1 \zaln-s |x-strong="G39720" x-lemma="Παῦλος" x-morph="Gr,N,,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="Παῦλος"\*\w Paul|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*\zaln-s |x-strong="G14010" x-lemma="δοῦλος" x-morph="Gr,N,,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="δοῦλος"\*\w a|x-occurrence="1" x-occurrences="1"\w* \w servant|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*...
```

**Clean Output:**

```
1 Paul, a servant of God and an apostle of Jesus Christ...
```

### Text Extraction Pipeline

```javascript
// 1. Dynamic Resource Discovery
const resources = await fetchScriptureResources(reference, language, organization);

// 2. Extract USFM Content
const usfmContent = await fetchUSFMFile(resourceUrl);

// 3. Clean and Extract
const cleanText = extractVerseText(usfmContent, chapter, verse);

// 4. Validate Output
if (!verifyCleanExtraction(cleanText)) {
  throw new Error("USFM markers detected in output");
}
```

### Core Extraction Patterns

#### 1. Remove Alignment Markers

```javascript
function removeAlignmentMarkers(text) {
  // Remove zaln alignment wrappers completely
  text = text.replace(/\\zaln-s[^\\]*\\zaln-e\*/g, "");
  text = text.replace(/\\zaln-[se][^\\]*/g, "");

  // Remove word-level attributes
  text = text.replace(/\|x-[^\\|]*/g, "");

  return text;
}
```

#### 2. Clean USFM Markers

```javascript
function cleanUSFMMarkers(text) {
  const markersToRemove = [
    /\\id\s+\w+/g, // Book ID
    /\\h\s+[^\\]*/g, // Headers
    /\\toc\d\s+[^\\]*/g, // Table of contents
    /\\mt\d?\s+/g, // Main title
    /\\ms\d?\s+/g, // Section headings
    /\\mr\s+/g, // Section references
    /\\r\s+/g, // Parallel references
    /\\d\s+/g, // Descriptive titles
    /\\sp\s+/g, // Speaker identification
    /\\qa\s+/g, // Acrostic headings
  ];

  markersToRemove.forEach((pattern) => {
    text = text.replace(pattern, "");
  });

  return text;
}
```

#### 3. Extract Specific Verse

```javascript
function extractVerseText(usfmText, chapter, verse) {
  try {
    // Find the chapter
    const chapterPattern = new RegExp(`\\\\c\\s+${chapter}\\b`);
    const chapterParts = usfmText.split(chapterPattern);

    if (chapterParts.length < 2) {
      throw new Error(`Chapter ${chapter} not found`);
    }

    let chapterContent = chapterParts[1];

    // Limit to current chapter only
    const nextChapterMatch = chapterContent.match(/\\c\s+\d+/);
    if (nextChapterMatch) {
      chapterContent = chapterContent.substring(0, nextChapterMatch.index);
    }

    // Find the verse
    const versePattern = new RegExp(`\\\\v\\s+${verse}\\b`);
    const verseParts = chapterContent.split(versePattern);

    if (verseParts.length < 2) {
      throw new Error(`Verse ${verse} not found in chapter ${chapter}`);
    }

    let verseContent = verseParts[1];

    // Limit to current verse only
    const nextVerseMatch = verseContent.match(/\\v\s+\d+/);
    if (nextVerseMatch) {
      verseContent = verseContent.substring(0, nextVerseMatch.index);
    }

    // Clean the verse content
    verseContent = removeAlignmentMarkers(verseContent);
    verseContent = cleanUSFMMarkers(verseContent);
    verseContent = cleanWordMarkers(verseContent);

    // Final cleanup
    verseContent = verseContent.replace(/\s+/g, " ").trim();

    // Return with verse number prefix
    return `${verse} ${verseContent}`;
  } catch (error) {
    console.error(`Error extracting verse ${chapter}:${verse}:`, error);
    throw error;
  }
}
```

#### 4. Clean Word Markers

```javascript
function cleanWordMarkers(text) {
  // Remove word markers but preserve text content
  text = text.replace(/\\w\s*([^\\]*?)(?:\|[^\\]*)?\s*\\w\*/g, "$1");

  // Remove add/nd markers
  text = text.replace(/\\add\s*/g, "");
  text = text.replace(/\\add\*/g, "");
  text = text.replace(/\\nd\s*/g, "");
  text = text.replace(/\\nd\*/g, "");

  // Remove footnotes completely
  text = text.replace(/\\f\s*\+[^\\]*\\f\*/g, "");

  return text;
}
```

### Validation & Quality Assurance

#### 1. Clean Text Verification

```javascript
function verifyCleanExtraction(text) {
  // Check for remaining USFM markers
  const usfmPatterns = [
    /\\[a-zA-Z]+/, // Backslash commands
    /\|x-[^|]*/, // Attribute markers
    /\*[^*]*\*/, // Asterisk wrappers
    /\\zaln-/, // Alignment markers
  ];

  for (const pattern of usfmPatterns) {
    if (pattern.test(text)) {
      console.warn(`USFM marker detected: ${pattern} in "${text}"`);
      return false;
    }
  }

  return true;
}
```

#### 2. Extraction Efficiency Check

```javascript
function checkExtractionEfficiency(originalSize, cleanSize) {
  const reduction = ((originalSize - cleanSize) / originalSize) * 100;

  if (reduction < 90) {
    console.warn(`Low extraction efficiency: ${reduction.toFixed(1)}% reduction`);
    console.warn("Check for remaining USFM markers");
  }

  return reduction;
}
```

### Error Handling & Fallbacks

#### Multi-Method Validation Pipeline

```javascript
async function validateAndExtract(usfmContent, chapter, verse) {
  const methods = [
    { name: "semantic", fn: () => extractWithSemanticParser(usfmContent, chapter, verse) },
    { name: "regex", fn: () => extractVerseText(usfmContent, chapter, verse) },
    { name: "emergency", fn: () => emergencyExtraction(usfmContent, chapter, verse) },
  ];

  for (const method of methods) {
    try {
      const result = await method.fn();

      if (verifyCleanExtraction(result)) {
        return result;
      }

      console.warn(`${method.name} extraction had USFM markers, trying next method`);
    } catch (error) {
      console.warn(`${method.name} extraction failed:`, error.message);
    }
  }

  throw new Error("All extraction methods failed");
}
```

#### Emergency Extraction (Last Resort)

```javascript
function emergencyExtraction(usfmText, chapter, verse) {
  console.warn(`Using emergency extraction for ${chapter}:${verse}`);

  try {
    // Most aggressive cleaning - remove everything that looks like markup
    let text = usfmText;

    // Remove all backslash commands
    text = text.replace(/\\[a-zA-Z]+[0-9]*\s*[^\\]*/g, " ");

    // Remove all attributes
    text = text.replace(/\|[^|\\]+/g, "");

    // Remove all markup-like content
    text = text.replace(/\*[^*]+\*/g, "");

    // Extract verse if possible
    const verseMatch = text.match(new RegExp(`${verse}\\s+([^0-9]+)`));
    if (verseMatch) {
      return `${verse} ${verseMatch[1].trim()}`;
    }

    throw new Error("Unable to extract verse even with emergency method");
  } catch (error) {
    console.error("Emergency extraction failed:", error);
    throw error;
  }
}
```

---

## 🏆 **BEST PRACTICES**

### For LLM Integration

- **Always verify extraction** - Check for remaining USFM markers
- **Use consistent formatting** - Simple "verse_number text" format
- **Preserve punctuation exactly** - Critical for accurate quotes
- **Handle edge cases** - Missing verses, alternate versification
- **Cache aggressively** - Extraction is CPU intensive
- **Fail gracefully** - Provide meaningful error messages

### For Performance

- **Dynamic discovery** uses DCS Ingredients Array Pattern for resource resolution
- **3-tier text extraction** with fallback strategies
- **Request caching** with 5-minute TTL for improved performance
- **Parallel fetching** when multiple translations available

### Testing Extraction Quality

```javascript
const testCases = [
  {
    name: "Simple verse",
    usfm: "\\v 1 In the beginning God created the heavens and the earth.",
    expected: "1 In the beginning God created the heavens and the earth.",
  },
  {
    name: "Verse with alignment",
    usfm: '\\v 1 \\zaln-s |x-strong="G39720"\\*\\w Paul\\w*\\zaln-e\\* a servant',
    expected: "1 Paul a servant",
  },
  {
    name: "Complex formatting",
    usfm: "\\v 15 \\w Jesus\\w* \\add said\\add* to them\\f + \\ft Some manuscripts lack \\fqa said\\fqa*\\f*",
    expected: "15 Jesus said to them",
  },
];

function testExtraction() {
  testCases.forEach((test) => {
    const result = extractVerseText(test.usfm, 1, parseInt(test.usfm.match(/\\v (\d+)/)[1]));
    console.assert(result === test.expected, `Failed: ${test.name}`);
  });
}
```

---

## ✅ **SUCCESS CRITERIA**

You know the extraction is working correctly when:

- **Clean output:** No USFM markers (`\v`, `\w`, `\zaln-s`, etc.) remain
- **Preserved meaning:** All actual Bible text is retained
- **Proper formatting:** Simple "verse_number text" format
- **High efficiency:** >90% size reduction from original USFM
- **Multiple translations:** All available versions are discovered and processed
- **Performance:** <2s response times with caching

---

**Core Philosophy:** Server-side regex extraction provides reliable, consistent results across all platforms and browsers. This unified approach ensures clean, quotable scripture text perfect for LLM consumption.
