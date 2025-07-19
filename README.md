# Translation Helps MCP

An MCP (Model Context Protocol) server that provides biblical translation resources from Door43 through simple, structured tools. Perfect for AI-powered Bible translation projects.

## 🚀 Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the development server:**

   ```bash
   netlify dev
   ```

3. **Test the API:**
   ```bash
   curl "http://localhost:8888/.netlify/functions/fetch-scripture?reference=John%203:16&language=en&organization=unfoldingWord"
   ```

## 🧪 Comprehensive Test Suite ⭐ NEW!

Translation Helps MCP includes an **exhaustive test suite** that ensures stability and prevents regressions. This testing infrastructure was built to eliminate the bugs and regressions that were plaguing development:

### Test Types

- **🏥 Smoke Tests** - Quick health checks and basic functionality validation
- **🔄 API/MCP Parity Tests** - Ensure identical responses between API and MCP endpoints
- **🐛 Regression Tests** - Catch previously fixed bugs and prevent regressions
- **⚡ Performance Tests** - Validate response times and concurrent request handling
- **🛡️ Error Handling Tests** - Test edge cases and error conditions

### Running Tests

```bash
# Run all tests with comprehensive reporting
npm test

# Quick smoke test (fastest - ~30 seconds)
npm run test:smoke

# Full parity validation (~5-10 minutes)
npm run test:parity

# Regression testing (~2-3 minutes)
npm run test:regression

# Unit tests (~1 minute)
npm run test:unit

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

The test suite validates:

✅ **Full API/MCP Parity** - All endpoints return identical responses  
✅ **No Double JSON Wrapping** - Clean, structured responses  
✅ **Actual Data Return** - Scripture, notes, questions, and words  
✅ **Ingredient File Path Usage** - No hardcoded paths  
✅ **Book Code Mapping** - Correct 3-letter book codes  
✅ **Response Structure Validation** - Consistent formats  
✅ **Error Handling** - Graceful failure modes  
✅ **Performance Benchmarks** - Response time validation

For detailed test documentation, see [`tests/README.md`](tests/README.md).

## 🛠️ Architecture

Translation Helps MCP uses a **unified architecture** that eliminates code duplication:

- **Single Implementation**: Each feature has one implementation in API functions
- **MCP Wrappers**: All MCP endpoints are lightweight wrappers calling API functions
- **Identical Responses**: Test page and chat responses are guaranteed identical
- **Zero Maintenance Overhead**: All fixes happen in one place

### API/MCP Endpoint Mapping

| API Endpoint                   | MCP Endpoint                       | Purpose                            |
| ------------------------------ | ---------------------------------- | ---------------------------------- |
| `fetch-scripture`              | `mcp-fetch-scripture`              | Get Bible verses                   |
| `fetch-translation-notes`      | `mcp-fetch-translation-notes`      | Get translator notes               |
| `fetch-translation-questions`  | `mcp-fetch-translation-questions`  | Get comprehension questions        |
| `fetch-translation-word-links` | `mcp-fetch-translation-word-links` | Get word connections               |
| `fetch-translation-words`      | `mcp-fetch-translation-words`      | Get word definitions               |
| `fetch-resources`              | `mcp-fetch-resources`              | Get all resources for reference    |
| `get-languages`                | `mcp-get-languages`                | Get available languages            |
| `extract-references`           | `mcp-extract-references`           | Extract Bible references from text |
| `browse-translation-words`     | `mcp-browse-translation-words`     | Browse word categories             |

## 🎯 MCP Tools

### Core Translation Tools

- **`fetchScripture`** - Get Bible verses in multiple translations
- **`fetchTranslationNotes`** - Get detailed translator notes
- **`fetchTranslationQuestions`** - Get comprehension questions
- **`fetchTranslationWords`** - Get word definitions and usage
- **`fetchTranslationWordLinks`** - Get word connections and relationships

### Utility Tools

- **`getLanguages`** - List available languages
- **`extractReferences`** - Parse Bible references from text
- **`browseTranslationWords`** - Browse by category
- **`fetchResources`** - Get comprehensive resource data

## 📝 Usage Examples

### Basic Scripture Lookup

```bash
curl "http://localhost:8888/.netlify/functions/fetch-scripture?reference=John%203:16&language=en&organization=unfoldingWord"
```

### Translation Notes

```bash
curl "http://localhost:8888/.netlify/functions/fetch-translation-notes?reference=John%203:16&language=en&organization=unfoldingWord"
```

### Translation Words

```bash
curl "http://localhost:8888/.netlify/functions/fetch-translation-words?word=love&language=en&organization=unfoldingWord"
```

## 🚀 UI Demos

The project includes interactive UI demos:

- **Scripture Lookup** - `/` - Search and display Bible verses
- **Translation Tools** - Comprehensive translation resources
- **API Testing** - `/api` - Test all endpoints
- **Performance Dashboard** - `/performance` - Monitor API performance

## 🔧 Development

### Prerequisites

- Node.js 18+
- Netlify CLI

### Development Workflow

1. **Start development server:**

   ```bash
   netlify dev
   ```

2. **Run tests during development:**

   ```bash
   npm run test:watch
   ```

3. **Check API health:**
   ```bash
   curl http://localhost:8888/.netlify/functions/health
   ```

### Testing Philosophy

The test suite follows these principles:

1. **Prevent Regressions** - Every fixed bug gets a test
2. **Ensure Parity** - API and MCP must be identical
3. **Fast Feedback** - Smoke tests run in ~30 seconds
4. **Comprehensive Coverage** - All endpoints tested
5. **Clear Reporting** - Failures are easy to understand
6. **CI/CD Ready** - Tests work in automated environments

## 📚 Resources

- **Door43 Content Service** - [https://dcs.bible](https://dcs.bible)
- **unfoldingWord** - [https://www.unfoldingword.org](https://www.unfoldingword.org)
- **MCP Protocol** - [https://modelcontextprotocol.io](https://modelcontextprotocol.io)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

**Remember: Good tests prevent bad deployments!** 🛡️

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
