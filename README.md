# Translation Helps MCP Server

A high-performance, serverless API for aggregating Bible translation resources from Door43. Built with Netlify Functions, TypeScript, and SvelteKit. **v3.3.0**

> **Reference Implementation**: This project includes a demo chat interface showing how to integrate the API with a local AI model. The chat demo runs entirely on your device - no servers required for the AI processing!

## 🚀 Live Demo

**Production API**: https://translation-helps-mcp.netlify.app

**Test UI**: https://translation-helps-mcp.netlify.app/test

## ✨ Features

- **📖 Scripture API**: Fetch Bible verses in multiple translations (ULT, UST, T4T, UEB)
- **📝 Translation Notes**: Get detailed translation notes and explanations
- **🔤 Translation Words**: Access word-by-word translation helps (by term or reference)
- **❓ Translation Questions**: Retrieve translation questions and answers
- **🌍 Multi-language Support**: Works with any language available on Door43
- **⚡ High Performance**: Smart caching with 59-89% performance improvements
- **🔧 MCP Integration**: Model Context Protocol support for AI assistants
- **📱 Modern UI**: Beautiful SvelteKit interface for testing and exploration

## 🏗️ Architecture

- **Backend**: Netlify Functions (serverless)
- **Frontend**: SvelteKit with Tailwind CSS
- **Caching**: Netlify Blobs with in-memory fallback
- **Language**: TypeScript
- **Deployment**: Netlify

## 📚 API Endpoints

### Core Endpoints

| Endpoint                           | Description                               | Example                                                           |
| ---------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| `/api/fetch-scripture`             | Get Bible verses in multiple translations | `?reference=John+3:16&language=en&organization=unfoldingWord`     |
| `/api/fetch-translation-notes`     | Get translation notes for verses          | `?reference=Titus+1:1&language=en&organization=unfoldingWord`     |
| `/api/fetch-translation-words`     | Get word-by-word translation helps        | `?word=grace&language=en` or `?reference=Genesis+1:1&language=en` |
| `/api/fetch-translation-questions` | Get translation questions and answers     | `?reference=Matthew+5:1&language=en&organization=unfoldingWord`   |
| `/api/get-languages`               | List available languages                  | `?organization=unfoldingWord`                                     |
| `/api/fetch-resources`             | Get available resources for a language    | `?language=en&organization=unfoldingWord`                         |

### Utility Endpoints

| Endpoint                  | Description                        |
| ------------------------- | ---------------------------------- |
| `/api/health`             | Health check with cache status     |
| `/api/extract-references` | Extract Bible references from text |

## 🚀 Quick Start

### Using the API

```bash
# Get John 3:16 in all available translations
curl "https://translation-helps-mcp.netlify.app/.netlify/functions/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all"

# Get translation notes for Titus 1:1
curl "https://translation-helps-mcp.netlify.app/.netlify/functions/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord"

# Look up a specific word (e.g., "grace")
curl "https://translation-helps-mcp.netlify.app/.netlify/functions/fetch-translation-words?word=grace&language=en&organization=unfoldingWord"

# Get all translation words for a verse
curl "https://translation-helps-mcp.netlify.app/.netlify/functions/fetch-translation-words?reference=John+3:16&language=en&organization=unfoldingWord"
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/klappy/translation-helps-mcp.git
cd translation-helps-mcp

# Install dependencies
npm install
cd ui && npm install && cd ..

# Start development server
npm run dev

# Build for production
npm run build:all

# Deploy to Netlify
npm run deploy
```

## 📊 Performance

The API includes intelligent caching that provides significant performance improvements:

- **Cache Miss**: ~1.5-2.0 seconds (downloading files)
- **Cache Hit**: ~0.15-0.8 seconds (serving from cache)
- **Performance Improvement**: 59-89% faster on subsequent requests

## 🔧 Configuration

### Environment Variables

| Variable        | Description            | Default                         |
| --------------- | ---------------------- | ------------------------------- |
| `DCS_API_URL`   | Door43 API base URL    | `https://git.door43.org/api/v1` |
| `CACHE_ENABLED` | Enable/disable caching | `true`                          |
| `LOG_LEVEL`     | Logging level          | `info`                          |

### Netlify Configuration

The project includes a `netlify.toml` file with optimized settings for:

- Function timeout and memory allocation
- CORS headers
- Cache control
- Redirects

## 🎯 Use Cases

### For Bible Translators

- Access multiple translation resources in one API
- Get contextual translation helps
- Retrieve word-by-word guidance
- Find answers to common translation questions

### For Developers

- Integrate Bible translation resources into applications
- Build translation tools and workflows
- Create educational content
- Develop AI-powered translation assistants

### For AI Assistants

- MCP integration for context-aware Bible translation help
- Structured data for training and inference
- Multi-language support for global applications

## 🏛️ Supported Organizations

Currently supports resources from:

- **unfoldingWord**: Open Bible translation resources
- **Door43**: Community-driven translation platform

## 📈 API Response Format

### Scripture Response

```json
{
  "reference": "John 3:16",
  "language": "en",
  "organization": "unfoldingWord",
  "scriptures": [
    {
      "text": "For God so loved the world...",
      "translation": "ULT",
      "citation": "John 3:16"
    }
  ],
  "responseTime": 895
}
```

### Translation Notes Response

```json
{
  "reference": "Titus 1:1",
  "language": "en",
  "organization": "unfoldingWord",
  "notes": [
    {
      "reference": "Titus 1:1",
      "note": "This is a greeting...",
      "quote": "Paul, a servant of God"
    }
  ],
  "responseTime": 387
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Changelog

### v3.3.0 (2025-01-XX)

- **OpenAI Chat Service**: Added new llmChatService.js with OpenAI GPT-4o-mini integration
- **Dependency Cleanup**: Removed @mlc-ai/web-llm and @xenova/transformers packages
- **Worker Removal**: Deleted llm-worker.ts file for simplified architecture
- **Enhanced Performance**: Reduced bundle size and faster startup times
- **Better Reliability**: Switched from local ML models to cloud-based OpenAI service

### v3.1.0 (2025-01-XX)

- **LLM-First AI Architecture**: Replaced brittle regex parsing with intelligent LLM-driven response generation
- **Simplified AI Service**: Streamlined BrowserLLM service to leverage natural language understanding
- **Enhanced Development Setup**: Fixed TypeScript configuration and build process issues
- **Improved Caching**: Better cache management and development workflow

### v3.0.0 (2025-01-XX)

- **Word Lookup Feature**: Added support for looking up translation words by term (e.g., "grace") in addition to reference-based lookups
- **MCP Tools**: Added new MCP tools for browsing and getting translation words
- **API Enhancement**: Translation words endpoint now supports both `word` and `reference` parameters
- **Reference Implementation**: Enhanced chat demo with clear messaging about capabilities
- **Local AI Emphasis**: Highlighted that AI model runs on user's device
- **MCP Branding**: Updated branding to emphasize Model Context Protocol technology
- **Performance Page**: Added comprehensive performance analysis and cost efficiency metrics
- **UI Improvements**: Fixed styling issues and improved user experience
- **Documentation**: Updated to reflect reference implementation focus

### v2.0.0 (2025-07-18)

- **Major Refactor**: Complete rewrite with TypeScript and SvelteKit
- **Performance**: Added intelligent caching with 59-89% performance improvements
- **Architecture**: Migrated to Netlify Functions with serverless deployment
- **UI**: Modern SvelteKit interface with comprehensive testing tools
- **MCP Support**: Added Model Context Protocol integration
- **Documentation**: Comprehensive README and API documentation

### v1.3.0 (Previous)

- Initial release with basic API functionality

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **unfoldingWord** for providing open Bible translation resources
- **Door43** for the community-driven translation platform
- **Netlify** for the serverless hosting platform
- **SvelteKit** for the modern web framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/klappy/translation-helps-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/klappy/translation-helps-mcp/discussions)
- **Email**: christopher@klapp.name

---

**Made with ❤️ for the Bible translation community**
