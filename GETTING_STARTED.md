# Getting Started with Translation Helps MCP Server

This guide will help you get the Translation Helps MCP server running locally and understand how to use it.

## Prerequisites

- Node.js 18 or higher
- Git
- Netlify CLI (optional, for local testing)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/klappy/translation-helps-mcp.git
cd translation-helps-mcp
npm install
```

### 2. Run Locally

```bash
# Using Netlify CLI (recommended)
npm run dev

# Or directly with Node
npm start
```

The server will be available at `http://localhost:8888/.netlify/functions/`

### 3. Test the API

```bash
# Check health
curl http://localhost:8888/.netlify/functions/health

# Get languages for unfoldingWord
curl "http://localhost:8888/.netlify/functions/get-languages?organization=unfoldingWord"

# Fetch resources for John 3:16
curl "http://localhost:8888/.netlify/functions/fetch-resources?organization=unfoldingWord&language=en&reference=John%203:16"
```

## Understanding the API

### Core Concepts

1. **Organizations**: Content publishers (unfoldingWord, Wycliffe, etc.)
2. **Languages**: Available translations (en, es, fr, etc.)
3. **Resources**: Different types of biblical content
   - Scripture (Bible text)
   - Translation Notes (study notes)
   - Translation Questions (comprehension questions)
   - Translation Words (key term definitions)

### API Endpoints

#### Health Check

```bash
GET /health
```

Returns server status.

#### Get Organizations

```bash
GET /get-organizations
```

Lists all available content organizations.

#### Get Languages

```bash
GET /get-languages?organization={org}
```

Lists languages available for an organization.

#### Fetch Resources

```bash
GET /fetch-resources?organization={org}&language={lang}&reference={ref}
```

Fetches all available resources for a Bible reference.

## Example Usage

### JavaScript/Node.js

```javascript
// Simple fetch example
async function getScripture(reference) {
  const params = new URLSearchParams({
    organization: "unfoldingWord",
    language: "en",
    reference: reference,
  });

  const response = await fetch(
    `http://localhost:8888/.netlify/functions/fetch-resources?${params}`
  );

  const data = await response.json();
  console.log(data.scripture.text);
}

// Usage
getScripture("John 3:16");
```

### Python

```python
import requests

def get_scripture(reference, language='en'):
    params = {
        'organization': 'unfoldingWord',
        'language': language,
        'reference': reference
    }

    response = requests.get(
        'http://localhost:8888/.netlify/functions/fetch-resources',
        params=params
    )

    data = response.json()
    print(data['scripture']['text'])

# Usage
get_scripture('John 3:16')
```

### cURL Examples

```bash
# English scripture
curl "http://localhost:8888/.netlify/functions/fetch-resources?organization=unfoldingWord&language=en&reference=Genesis%201:1"

# Spanish scripture
curl "http://localhost:8888/.netlify/functions/fetch-resources?organization=unfoldingWord&language=es&reference=Juan%203:16"

# Get all Spanish resources
curl "http://localhost:8888/.netlify/functions/get-languages?organization=unfoldingWord"
```

## MCP Integration

### For AI Assistants

If you're building an AI assistant that uses MCP:

```javascript
// MCP tool configuration
const tools = [
  {
    name: "fetch-translation-resources",
    description: "Fetch Bible translation resources",
    parameters: {
      organization: { type: "string", default: "unfoldingWord" },
      language: { type: "string", default: "en" },
      reference: { type: "string", required: true },
    },
  },
];

// Tool handler
async function handleFetchResources({ organization, language, reference }) {
  const response = await fetch(
    `${API_URL}/fetch-resources?organization=${organization}&language=${language}&reference=${reference}`
  );
  return await response.json();
}
```

### For Cursor/Claude Desktop

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "node",
      "args": ["path/to/translation-helps-mcp/src/index.js"],
      "env": {}
    }
  }
}
```

## Understanding the Response

### Successful Response Structure

```json
{
  "reference": {
    "book": "JHN",
    "chapter": 3,
    "verse": 16,
    "bookName": "John"
  },
  "scripture": {
    "text": "16 For God so loved the world, that he gave his only Son...",
    "version": "ULT",
    "copyright": "Public Domain"
  },
  "translationNotes": [
    {
      "reference": "3:16",
      "quote": "loved",
      "note": "This is the kind of love that comes from God..."
    }
  ],
  "translationQuestions": [
    {
      "reference": "3:16",
      "question": "What did God give because of his love for the world?",
      "answer": "God gave his only Son."
    }
  ],
  "translationWords": [
    {
      "term": "love",
      "definition": "To love is to choose to act consistently...",
      "seeAlso": ["beloved", "love", "loved", "lover", "lovely", "loving"]
    }
  ],
  "metadata": {
    "organization": "unfoldingWord",
    "language": "en",
    "timestamp": "2024-01-27T10:00:00.000Z"
  }
}
```

### Error Response Structure

```json
{
  "error": {
    "code": "INVALID_REFERENCE",
    "message": "Invalid scripture reference format",
    "details": {
      "reference": "invalid ref",
      "suggestion": "Use format like 'John 3:16' or 'Genesis 1:1-3'"
    }
  }
}
```

## Development Tips

### 1. Caching

The server implements intelligent caching. During development:

- Cache TTL is 5 minutes for most resources
- Clear cache by restarting the server
- Check response headers for cache status

### 2. Reference Formats

Supported reference formats:

- `John 3:16` - Single verse
- `Genesis 1:1-5` - Verse range
- `Matthew 5` - Entire chapter
- `1 Corinthians 13:4-7` - Books with numbers

### 3. Performance

For best performance:

- Request only needed resources
- Use appropriate language codes
- Cache responses in your application

### 4. Rate Limiting

- No strict rate limits for development
- Be respectful of the upstream APIs
- Implement client-side caching

## Troubleshooting

### Common Issues

1. **404 Not Found**
   - Check organization spelling (case-sensitive)
   - Verify language code exists
   - Ensure reference format is correct

2. **Empty Resources**
   - Not all resources exist for all books
   - Some languages have limited resources
   - Check different organizations

3. **Slow Responses**
   - First request may be slow (cold start)
   - Subsequent requests should be cached
   - Check network connectivity

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

## Next Steps

1. **Deploy to Netlify**
   - Fork the repository
   - Connect to Netlify
   - Deploy with one click

2. **Customize**
   - Add new endpoints
   - Modify response format
   - Add authentication if needed

3. **Contribute**
   - Report issues
   - Submit pull requests
   - Improve documentation

## Resources

- [DCS API Documentation](https://git.door43.org/api/swagger)
- [USFM Documentation](https://ubsicap.github.io/usfm/)
- [MCP Specification](https://github.com/modelcontextprotocol/specification)
- [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)

## Support

- GitHub Issues: [Report bugs or request features]
- Documentation: Check the `/docs` folder
- Examples: See `/examples` for more code samples

Happy coding! 🚀
