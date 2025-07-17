# Scripture Extraction Guide

This guide documents the enhanced scripture extraction features in Translation Helps API v1.3.0.

## Overview

The API now provides clean, readable Bible text from multiple translations with support for single verses, verse ranges, and full chapters.

## Key Features

### 1. Multiple Bible Translations

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

### 2. Clean Text Extraction

All USFM markup, alignment data, and formatting codes are removed:

- ✅ Clean, readable text
- ✅ Preserved verse numbers
- ✅ Proper punctuation
- ❌ No USFM markers (`\v`, `\w`, `\zaln-s`, etc.)
- ❌ No alignment data
- ❌ No Greek/Hebrew references

### 3. Flexible Reference Support

#### Single Verse

```
/fetch-resources?reference=John%203:16
```

#### Verse Range

```
/fetch-resources?reference=John%203:16-18
```

#### Full Chapter

```
/fetch-resources?reference=John%203
```

## How It Works

### Dynamic Resource Discovery

1. **Catalog Search**: Queries DCS catalog for all Bible resources
2. **Ingredients Array**: Uses the ingredients pattern to find correct files
3. **Multiple Translations**: Fetches all available translations, not just ULT

### Text Extraction Pipeline

1. **Fetch USFM**: Gets raw USFM content using ingredients path
2. **Extract Target**: Isolates requested verse(s) or chapter
3. **Clean Markup**: Removes all USFM tags and alignment data
4. **Validate Output**: Ensures no markup remains in final text

## Example Usage

### Request

```
GET /fetch-resources?reference=Titus%202:6&language=en&organization=unfoldingWord
```

### Response

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
    },
    {
      "text": "6 In the same way, encourage the younger men to use good sense.",
      "translation": "UEB"
    }
  ]
}
```

## Benefits

1. **Comparative Study**: Compare how different translations render the same passage
2. **Clean Text**: Perfect for LLM consumption without markup noise
3. **Flexibility**: Support for various reference formats
4. **Reliability**: Dynamic discovery means new translations are automatically included

## Technical Details

- Uses **DCS Ingredients Array Pattern** for resource resolution
- Implements **3-tier text extraction** with fallback strategies
- Validates extracted text to ensure no USFM markup remains
- Caches results for improved performance
