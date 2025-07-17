# Translation Helps MCP Server

A Model Context Protocol (MCP) server providing access to Bible translation resources through Netlify Functions. This server enables AI assistants and other applications to fetch scripture, translation notes, questions, and other biblical resources for any language and organization.

## Overview

This project implements an MCP server that provides:

- Access to scripture in multiple languages and versions
- Translation notes, questions, and word definitions
- Support for multiple organizations (unfoldingWord, Wycliffe, etc.)
- Clean text extraction optimized for LLM consumption
- Efficient caching and performance optimization

## Architecture

The MCP server is deployed as Netlify Functions, providing a serverless API that can be consumed by:

- AI assistants (Claude, GPT, etc.) via MCP protocol
- Web applications
- Mobile applications
- Desktop applications

## Key Features

- **Multi-Translation Scripture Support**: Fetches ALL available Bible translations (ULT, UST, T4T, UEB, etc.) dynamically
- **Clean Text Extraction**: Returns only the readable Bible text without USFM markup or alignment data
- **Flexible Reference Support**: Single verses, verse ranges (e.g., "John 3:16-18"), or entire chapters
- **Translation Notes**: Contextual study notes for verses
- **Translation Questions**: Comprehension and discussion questions
- **Translation Words**: Key biblical terms with definitions
- **Dynamic Resource Discovery**: Uses the DCS Ingredients Array pattern for reliable resource resolution
- **High-Performance Caching**: Multi-level caching with request deduplication
- **CORS Support**: Ready for browser-based applications
- **TypeScript**: Full type safety and modern JavaScript features

## API Endpoints

### Core Functions

#### `GET /fetch-resources`

Fetches and aggregates all available resources for a scripture reference.

```javascript
// Example request
{
  "organization": "unfoldingWord",
  "language": "en",
  "reference": "Genesis 1:1"
}

// Returns scripture text, notes, questions, and words
```

#### `GET /get-languages`

Lists all available languages for an organization.

```javascript
// Example request
{
  "organization": "unfoldingWord"
}

// Returns array of language codes and names
```

#### `GET /health`

Health check endpoint for monitoring.

## Documentation

- [MCP Data Fetching Patterns](MCP_DATA_FETCHING_PATTERNS.md) - Comprehensive guide to API integration patterns
- [USFM LLM Preparation Guide](USFM_LLM_PREPARATION_GUIDE.md) - How to extract clean text for AI consumption
- [Netlify Functions Architecture](NETLIFY_FUNCTIONS_ARCHITECTURE.md) - Technical architecture details
- [Implementation Checklist](MCP_IMPLEMENTATION_CHECKLIST.md) - Development roadmap

## Quick Start

### Prerequisites

- Node.js 18+
- Netlify CLI
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/translation-helps-mcp.git
cd translation-helps-mcp

# Install dependencies
npm install

# Start local development
netlify dev
```

### Testing Locally

```bash
# Test health endpoint
curl http://localhost:8888/.netlify/functions/health

# Test language fetching
curl "http://localhost:8888/.netlify/functions/get-languages?organization=unfoldingWord"

# Test resource fetching
curl "http://localhost:8888/.netlify/functions/fetch-resources?organization=unfoldingWord&language=en&reference=John%203:16"
```

## Deployment

### Deploy to Netlify

1. Fork this repository
2. Connect to Netlify
3. Deploy with default settings

### Environment Variables

No environment variables required - all data is fetched from public APIs.

## MCP Tool Integration

### Available Tools

1. **fetch-resources** - Fetch scripture and study resources
2. **get-languages** - List available languages
3. **get-organizations** - List content organizations
4. **extract-references** - Parse scripture references from text

### Example MCP Configuration

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

## Data Sources

All data is fetched from the Door43 Content Service (DCS):

- Catalog API: `https://git.door43.org/api/v1/catalog`
- Resource files: `https://git.door43.org/{org}/{lang}_{resource}/`

## Contributing

1. Read the [Development Guidelines](docs/development-guidelines.md)
2. Check the [Implementation Checklist](MCP_IMPLEMENTATION_CHECKLIST.md)
3. Submit pull requests with clear descriptions

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on patterns from the [translation-helps](https://github.com/unfoldingWord/translation-helps-rcl) project
- Powered by the [Door43](https://door43.org) platform
- Uses the [Model Context Protocol](https://github.com/modelcontextprotocol/specification)

## Support

For issues and questions:

- Open an issue on GitHub
- Check the documentation
- Review the implementation examples

## API Response Format

```json
{
  "reference": {
    "book": "JHN",
    "bookName": "John",
    "chapter": 3,
    "verse": 16,
    "citation": "John 3:16"
  },
  "scripture": {
    "text": "For God so loved the world...",
    "translation": "ULT"
  },
  "scriptures": [
    {
      "text": "For God so loved the world...",
      "translation": "ULT"
    },
    {
      "text": "God loved the people of the world so much...",
      "translation": "UST"
    },
    {
      "text": "God loved the people in the world so much...",
      "translation": "T4T"
    },
    {
      "text": "For God loved the world in this way...",
      "translation": "UEB"
    }
  ],
  "translationNotes": [...],
  "translationQuestions": [...],
  "translationWords": [...],
  "metadata": {
    "resourcesFound": {
      "scripture": true,
      "scriptures": 4,
      "notes": 15,
      "questions": 3,
      "words": 5
    }
  }
}
```
