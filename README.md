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

### 1. Multi-Organization Support

- Fetch resources from any organization on Door43
- Dynamic discovery of available languages per organization
- Support for all Door43 content types

### 2. Resource Types

- **Scripture**: Bible text in USFM format
- **Translation Notes**: Verse-by-verse study notes
- **Translation Questions**: Comprehension questions
- **Translation Words**: Key term definitions
- **Translation Academy**: Translation principles

### 3. LLM Optimization

- Clean text extraction from USFM format
- Removal of alignment markers and metadata
- Preservation of punctuation for accurate quoting
- Optimized context preparation

### 4. Performance Features

- Multi-level caching strategy
- Request deduplication
- Efficient resource aggregation
- Minimal API calls

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
