# Translation Helps MCP Server

A powerful MCP (Model Context Protocol) server that provides access to Door43 Content Service (DCS) translation resources including scripture text, translation notes, translation questions, and translation words.

## 🚀 Features

- **Multi-Resource Support**: Scripture text, translation notes, translation questions, translation words, and translation word links
- **Multi-Language Support**: English, Spanish, French, Russian, and more
- **Multi-Organization Support**: unfoldingWord, STR, ru_gl, and others
- **Smart Caching**: Multi-level caching with request deduplication
- **Reference Parsing**: Handles various Bible reference formats
- **USFM Processing**: Clean text extraction from USFM format
- **Epic Test Suite**: Comprehensive testing interface with bulk testing capabilities

## 🎯 Epic Test UI

The project includes a modern, engaging test interface available at `/api/test-ui` that provides:

### Individual Testing Mode

- **Real-time endpoint health checks** with visual status indicators
- **Interactive form** for testing specific references and resources
- **Beautiful results display** with organized resource sections
- **Error handling** with clear feedback

### Bulk Testing Suite

- **30+ pre-configured test cases** covering various reference types
- **Multiple test configurations**: Quick (10), Standard (30), Comprehensive (50+)
- **Custom test case support** via JSON input
- **Real-time progress tracking** with visual progress bars
- **Comprehensive results aggregation** with success rates and error summaries
- **Detailed test reporting** with individual test results

### Test Case Categories

- **Single verses**: John 3:16, Genesis 1:1, Psalm 23:1
- **Verse ranges**: Matthew 5:1-12, 1 Corinthians 13:4-7
- **Full chapters**: Genesis 1, Psalm 23, Matthew 5
- **Multiple languages**: English, Spanish, French, Russian, German, Italian
- **Edge cases**: 1 John, 2 Peter, 3 John, 1 Samuel, 2 Kings
- **Complex references**: Large verse ranges and chapter spans

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/translation-helps-mcp.git
cd translation-helps-mcp

# Install dependencies
npm install

# Start development server
npm run dev
```

The server will be available at `http://localhost:8889/.netlify/functions/`

## 🧪 Testing

### Quick Test

Visit the test UI at: `http://localhost:8889/.netlify/functions/test-ui`

### API Testing

```bash
# Health check
curl http://localhost:8889/.netlify/functions/health

# Fetch resources for John 3:16
curl "http://localhost:8889/.netlify/functions/fetch-resources?reference=John%203:16&language=en&organization=unfoldingWord"

# Get available languages
curl "http://localhost:8889/.netlify/functions/get-languages?organization=unfoldingWord"
```

## 📚 API Endpoints

### Core Endpoints

- `GET /health` - Server health check
- `GET /fetch-resources` - Fetch all resources for a reference
- `GET /fetch-scripture` - Fetch scripture text only
- `GET /fetch-translation-notes` - Fetch translation notes only
- `GET /fetch-translation-questions` - Fetch translation questions only
- `GET /fetch-translation-words` - Fetch translation words only
- `GET /fetch-translation-word-links` - Fetch translation word links only
- `GET /get-languages` - Get available languages for an organization
- `GET /extract-references` - Extract Bible references from text

### Test Endpoints

- `GET /test-ui` - Epic test interface with individual and bulk testing

## 🔧 Configuration

Environment variables (set in `.env` or Netlify environment):

- `DCS_API_URL` - Door43 Content Service API URL
- `CACHE_ENABLED` - Enable/disable caching
- `LOG_LEVEL` - Logging level (debug, info, warn, error)

## 🏗️ Architecture

The project follows a modular architecture with:

- **Netlify Functions** for serverless deployment
- **Shared utilities** for common functionality
- **Type-safe interfaces** for all data structures
- **Comprehensive error handling** with graceful degradation
- **Performance optimization** through caching and parallel requests

## 🚀 Deployment

### Netlify (Recommended)

1. Fork the repository
2. Connect to Netlify
3. Deploy with one click
4. Functions will be available at `https://your-site.netlify.app/.netlify/functions/`

### Local Development

```bash
npm run dev  # Starts on port 8889
npm run build  # Build for production
npm start  # Start production server
```

## 📖 Documentation

- [Getting Started Guide](GETTING_STARTED.md)
- [Quick Start Guide](QUICK_START_GUIDE.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- [Comprehensive Documentation](docs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Door43 Content Service for providing the translation resources
- Netlify for the serverless platform
- The MCP community for the protocol specification

---

**Ready to test?** Visit the [Epic Test Suite](http://localhost:8889/.netlify/functions/test-ui) and experience the most engaging testing interface of 2025! 🎉
