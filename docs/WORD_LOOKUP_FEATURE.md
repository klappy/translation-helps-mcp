# Word Lookup Feature

## Overview

The Translation Helps MCP server now supports two modes for looking up translation words:

1. **Word Lookup by Term**: Find articles about specific biblical terms (e.g., "grace", "love", "faith")
2. **Reference-based Lookup**: Find all translation words mentioned in a specific Bible verse

## API Endpoints

### Translation Words API

**Endpoint**: `/.netlify/functions/fetch-translation-words`

#### Word Lookup by Term

```bash
curl "https://your-site.netlify.app/.netlify/functions/fetch-translation-words?word=grace&language=en"
```

**Parameters**:

- `word` (required): The term to look up (e.g., "grace", "love", "faith")
- `language` (optional): Language code (default: "en")
- `organization` (optional): Organization (default: "unfoldingWord")

**Response**:

```json
{
  "translationWords": [
    {
      "term": "grace",
      "title": "grace, gracious",
      "content": "The meaning of the Greek word translated as 'grace'...",
      "definition": "Favor or kindness shown to someone who does not deserve it..."
    }
  ],
  "citation": {
    "resource": "en_tw",
    "organization": "unfoldingWord",
    "language": "en",
    "url": "https://git.door43.org/unfoldingWord/en_tw",
    "version": "master"
  }
}
```

#### Reference-based Lookup

```bash
curl "https://your-site.netlify.app/.netlify/functions/fetch-translation-words?reference=John%203:16&language=en"
```

**Parameters**:

- `reference` (required): Bible reference (e.g., "John 3:16", "Genesis 1:1")
- `language` (optional): Language code (default: "en")
- `organization` (optional): Organization (default: "unfoldingWord")

**Response**:

```json
{
  "translationWords": [
    {
      "term": "God",
      "definition": "The supreme being who created and rules the universe...",
      "title": "God"
    },
    {
      "term": "love",
      "definition": "A strong feeling of affection and care for someone...",
      "title": "love"
    }
    // ... more translation words
  ],
  "citation": {
    "resource": "en_tw",
    "organization": "unfoldingWord",
    "language": "en",
    "url": "https://git.door43.org/unfoldingWord/en_tw",
    "version": "master"
  }
}
```

## MCP Tools

### Browse Translation Words

**Tool**: `translation_helps_browse_words`

Browse available translation word articles by category.

**Parameters**:

- `language` (optional): Language code (default: "en")
- `category` (optional): Filter by category ("kt", "other", "names")
- `organization` (optional): Organization (default: "unfoldingWord")

### Get Translation Word

**Tool**: `translation_helps_get_word`

Get a specific translation word article by term or path.

**Parameters**:

- `term` (optional): Word/term to look up (e.g., "grace")
- `path` (optional): Direct path to the article
- `language` (optional): Language code (default: "en")
- `organization` (optional): Organization (default: "unfoldingWord")

### Get Words for Reference

**Tool**: `translation_helps_words_for_reference`

Find all translation word articles linked to a specific Bible reference.

**Parameters**:

- `reference` (required): Bible reference (e.g., "John 3:16")
- `language` (optional): Language code (default: "en")
- `organization` (optional): Organization (default: "unfoldingWord")

## Implementation Details

### Word Lookup Algorithm

The word lookup feature uses a simple but effective approach:

1. **Repository Crawling**: Crawls the translation words repository structure to find available articles
2. **Pattern Matching**: Uses common patterns to locate articles for specific terms
3. **Fallback Strategy**: If exact match not found, searches in common categories (kt, other, names)
4. **LLM Integration**: Lets the LLM handle the final matching and interpretation

### File Structure

Translation word articles are typically stored in the following structure:

```
en_tw/
├── kt/           # Key terms
│   ├── grace.md
│   ├── love.md
│   └── ...
├── other/        # Other important terms
│   ├── apostle.md
│   └── ...
└── names/        # Biblical names
    ├── jesus.md
    └── ...
```

### Error Handling

- **Missing Term**: Returns appropriate error message if term not found
- **Invalid Reference**: Validates Bible references before processing
- **Network Issues**: Graceful handling of API failures
- **Rate Limiting**: Respects API rate limits

## Testing

### Manual Testing

1. **Word Lookup**: Test with various terms like "grace", "love", "faith"
2. **Reference Lookup**: Test with different Bible references
3. **Edge Cases**: Test with invalid inputs, missing terms, etc.

### Automated Testing

Run the end-to-end tests:

```bash
cd ui
npm run test:e2e
```

### API Testing

Test the API endpoints directly:

```bash
# Test word lookup
curl "http://localhost:8888/.netlify/functions/fetch-translation-words?word=grace"

# Test reference lookup
curl "http://localhost:8888/.netlify/functions/fetch-translation-words?reference=John%203:16"
```

## Future Enhancements

1. **Improved Search**: Add fuzzy matching and semantic search
2. **Caching**: Implement caching for frequently accessed articles
3. **Multi-language**: Better support for non-English languages
4. **Related Terms**: Show related translation words
5. **Usage Examples**: Include more usage examples in responses

## Troubleshooting

### Common Issues

1. **"Missing reference parameter"**: Make sure to provide either `word` or `reference` parameter
2. **No results found**: Check if the term exists in the translation words repository
3. **Slow responses**: Consider implementing caching for better performance

### Debug Information

Enable debug mode to see detailed API call information:

```bash
curl "http://localhost:8888/.netlify/functions/fetch-translation-words?word=grace&debug=true"
```

## Contributing

When adding new features to the word lookup functionality:

1. Update this documentation
2. Add appropriate tests
3. Test both word and reference lookup modes
4. Verify MCP tool integration
5. Update the UI if necessary
