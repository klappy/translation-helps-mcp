# USFM Text Preparation for LLM Consumption

This guide details how to extract and prepare clean, quotable text from USFM (Unified Standard Format Markers) for Large Language Model consumption. Based on proven patterns from the translation-helps project.

## Overview

USFM files contain Bible text with extensive markup for alignment data, cross-references, and formatting. This markup must be carefully removed to produce clean text that LLMs can accurately quote without hallucination.

## The Challenge

Raw USFM contains:

- Alignment markers (`\zaln-s`, `\zaln-e`)
- Word-level alignment data
- Verse and chapter markers
- Formatting codes
- Cross-references
- Study notes markup

**Example of raw USFM:**

```
\v 1 \zaln-s |x-strong="G39720" x-lemma="Παῦλος" x-morph="Gr,N,,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="Παῦλος"\*\w Paul|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*\zaln-s |x-strong="G14010" x-lemma="δοῦλος" x-morph="Gr,N,,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="δοῦλος"\*\w a|x-occurrence="1" x-occurrences="1"\w* \w servant|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*...
```

**What LLMs need:**

```
1 Paul, a servant of God and an apostle of Jesus Christ...
```

## Unified Extraction Approach

### Key Principle: Server-Side Regex Extraction

After extensive testing, the translation-helps project discovered that browser-based CSS extraction (`innerText`) is unreliable for USFM. The solution is a unified server-side approach using regex patterns.

### The Extraction Pipeline

```javascript
/**
 * Complete USFM to clean text pipeline
 */
function extractCleanTextFromUSFM(usfmContent, chapter, verse) {
  // Step 1: Parse USFM to semantic HTML (if parser available)
  // Step 2: Apply regex-based extraction
  // Step 3: Extract specific reference if needed

  return cleanText;
}
```

## Core Extraction Patterns

### 1. Remove Alignment Markers

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

### 2. Clean USFM Markers

```javascript
function cleanUSFMMarkers(text) {
  // Remove common USFM markers but preserve text
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

### 3. Extract Verse Text

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

### 4. Clean Word Markers

```javascript
function cleanWordMarkers(text) {
  // Remove \w word markers but keep the content
  text = text.replace(/\\w\s+([^|\\]*)\|[^\\]*\\w\*/g, "$1");
  text = text.replace(/\\w\s+([^|\\]*)\\w\*/g, "$1");

  // Remove standalone markers
  text = text.replace(/\\w\s+/g, "");
  text = text.replace(/\\w\*/g, "");

  return text;
}
```

## HTML-Based Extraction (When Available)

When USFM has been parsed to semantic HTML:

```javascript
function extractFromSemanticHTML(htmlContent) {
  // Remove all hidden elements according to USFM display rules
  let html = htmlContent;

  // Elements that should be hidden
  const hiddenElements = [
    "marker", // USFM markers
    "attributes", // Alignment attributes
    "number", // Verse numbers (we'll add back separately)
    "zaln", // Alignment wrappers
    "word", // Word wrappers (keep content)
  ];

  hiddenElements.forEach((tag) => {
    // Remove opening and closing tags but preserve content for some
    if (tag === "zaln" || tag === "word") {
      html = html.replace(new RegExp(`<${tag}[^>]*>`, "g"), "");
      html = html.replace(new RegExp(`</${tag}>`, "g"), "");
    } else {
      // Remove entire element
      html = html.replace(new RegExp(`<${tag}[^>]*>.*?</${tag}>`, "gs"), "");
    }
  });

  // Extract text from content elements
  html = html.replace(/<content[^>]*>/g, "").replace(/<\/content>/g, "");

  // Remove all remaining tags
  html = html.replace(/<[^>]*>/g, " ");

  // Clean whitespace
  return html.replace(/\s+/g, " ").trim();
}
```

## Reference Parsing

```javascript
function parseScriptureReference(reference) {
  // Handle various reference formats
  const patterns = {
    // "Genesis 1:1" or "Gen 1:1"
    bookChapterVerse: /^(\d?\s*\w+)\s+(\d+):(\d+)$/,
    // "Genesis 1" or "Gen 1"
    bookChapter: /^(\d?\s*\w+)\s+(\d+)$/,
    // "1:1" (when book is known from context)
    chapterVerse: /^(\d+):(\d+)$/,
    // "Genesis 1:1-5" (verse range)
    verseRange: /^(\d?\s*\w+)\s+(\d+):(\d+)-(\d+)$/,
  };

  // Try each pattern
  for (const [type, pattern] of Object.entries(patterns)) {
    const match = reference.match(pattern);
    if (match) {
      switch (type) {
        case "bookChapterVerse":
          return { book: match[1], chapter: parseInt(match[2]), verse: parseInt(match[3]) };
        case "bookChapter":
          return { book: match[1], chapter: parseInt(match[2]), verse: null };
        case "chapterVerse":
          return { book: null, chapter: parseInt(match[1]), verse: parseInt(match[2]) };
        case "verseRange":
          return {
            book: match[1],
            chapter: parseInt(match[2]),
            verseStart: parseInt(match[3]),
            verseEnd: parseInt(match[4]),
          };
      }
    }
  }

  throw new Error(`Unable to parse reference: ${reference}`);
}
```

## LLM-Specific Formatting

### 1. Verse Number Formatting

```javascript
function formatVerseForLLM(verseNum, verseText) {
  // Simple, consistent format that LLMs can recognize
  return `${verseNum} ${verseText}`;
}
```

### 2. Multi-Verse Formatting

```javascript
function formatMultipleVerses(verses) {
  // Each verse on its own line with clear numbering
  return verses.map((v) => `${v.number} ${v.text}`).join("\n");
}
```

### 3. Context Window Preparation

```javascript
function prepareScriptureContext(book, chapter, verses) {
  const header = `${book} ${chapter}`;
  const content = formatMultipleVerses(verses);

  return `${header}\n\n${content}`;
}
```

## Quality Checks

### 1. Verify Clean Extraction

```javascript
function verifyCleanExtraction(text) {
  const usfmMarkers = [
    /\\[a-z]+/, // Any USFM marker
    /\|x-/, // Alignment attributes
    /\\zaln/, // Alignment markers
    /\*\w+\*/, // Word end markers
  ];

  for (const marker of usfmMarkers) {
    if (marker.test(text)) {
      console.warn("USFM markers still present in extracted text");
      return false;
    }
  }

  return true;
}
```

### 2. Size Reduction Check

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

## Error Handling

### 1. Fallback Extraction

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

### 2. Validation Pipeline

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

## Best Practices for LLM Integration

1. **Always verify extraction** - Check for remaining USFM markers
2. **Use consistent formatting** - Simple "verse_number text" format
3. **Preserve punctuation exactly** - Critical for accurate quotes
4. **Handle edge cases** - Missing verses, alternate versification
5. **Cache aggressively** - Extraction is CPU intensive
6. **Log extraction metrics** - Monitor efficiency and quality
7. **Fail gracefully** - Provide meaningful error messages

## Testing Extraction

```javascript
// Test suite for USFM extraction
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

This comprehensive approach ensures clean, quotable scripture text for LLM consumption while handling the complexities of USFM format.
