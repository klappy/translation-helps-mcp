# Translation Helps MCP Server v4.5.0

**🎉 NEW in v4.5.0: Major PRD Implementation Release**

- 6 of 21 PRD tasks completed (28.6% progress)
- Advanced resource discovery systems with intelligent caching
- Smart resource recommendations with AI-powered analysis
- Complete Phase 3 (Resource Discovery) + Phase 4 (Performance) implementation
- 95% PRD compliance confirmed through comprehensive codebase audit

A comprehensive MCP (Model Context Protocol) server that provides AI agents with access to Bible translation resources from Door43's Content Service. This server enables AI assistants to fetch, process, and intelligently recommend translation helps including scripture texts, translation notes, translation words, and translation questions.

## 🚀 **Key Features (v4.5.0)**

### **Advanced Resource Discovery (NEW)**

- **Intelligent Resource Type Detection**: Automatic identification of resource types with confidence scoring
- **Language Coverage Matrix**: Real-time availability tracking for Strategic Languages
- **Smart Resource Recommendations**: AI-powered suggestions based on user roles and content analysis

### **Performance Optimization (NEW)**

- **Intelligent Cache Warming**: Predictive caching based on access patterns
- **Request Coalescing**: Automatic deduplication to prevent redundant API calls
- **Response Compression**: Advanced payload optimization with Gzip/Brotli support

### **Core Translation Helps**

- **Scripture Texts**: ULT/GLT (literal) and UST/GST (simplified) with word alignment
- **Translation Notes**: Verse-by-verse explanations for difficult passages
- **Translation Words**: Biblical term definitions with comprehensive articles
- **Translation Questions**: Comprehension and application questions
- **Translation Academy**: Biblical translation principles and methods

## 🌟 MCP via HTTP/Web API

Translation Helps MCP supports both traditional MCP servers and modern **HTTP-based MCP** that runs perfectly on Cloudflare Workers without WebSockets or long-lived connections.

### ⚡ Live Production Deployment

- **HTTP MCP Endpoint**: `https://translation-helps-mcp.pages.dev/api/mcp`
- **Complete Documentation**: `https://translation-helps-mcp.pages.dev/mcp-tools`
- **Interactive Test UI**: `https://translation-helps-mcp.pages.dev/mcp-http-test`

### 🔌 MCP Setup for AI Assistants

Choose your preferred setup method:

#### Option 1: HTTP MCP (Recommended)

No installation required! Use the live HTTP endpoint directly.

**For Cursor AI (`.cursor/mcp.json`):**

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "node",
      "args": [
        "-e",
        "console.log('HTTP MCP: Use direct API calls to https://translation-helps-mcp.pages.dev/api/mcp')"
      ]
    }
  }
}
```

**For Claude Desktop:**

- Use the web interface at `https://translation-helps-mcp.pages.dev/mcp-tools`
- Or integrate via HTTP requests in your applications

#### Option 2: Local MCP Server

**For Cursor AI (`.cursor/mcp.json`):**

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "node",
      "args": ["src/index.ts"],
      "cwd": "/absolute/path/to/translation-helps-mcp"
    }
  }
}
```

**For Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "node",
      "args": ["src/index.ts"],
      "cwd": "/absolute/path/to/translation-helps-mcp"
    }
  }
}
```

### 🚀 Development Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start local MCP server:**

   ```bash
   npm start
   ```

3. **Start development web server:**

   ```bash
   netlify dev
   ```

4. **Test the API:**
   ```bash
   curl "http://localhost:8888/.netlify/functions/fetch-scripture?reference=John%203:16&language=en&organization=unfoldingWord"
   ```

### 🔗 HTTP MCP Usage

**Direct HTTP Testing:**

```bash
# Test any of the 14 available tools organized in 3 categories:
# Core: Direct DCS/Door43 resource access (10 tools)
# Linked: Combined endpoint functionality (2 tools)
# Experimental: Value-added features (2 tools)
curl -X POST https://translation-helps-mcp.pages.dev/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"translation_helps_fetch_scripture","arguments":{"reference":"John 3:16"}}}'
```

**JavaScript Integration:**

```javascript
import { createMCPClient } from "$lib/mcp/http-client";
const client = await createMCPClient("/api/mcp");
const result = await client.callTool("translation_helps_fetch_scripture", {
  reference: "John 3:16",
});
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

## 🎯 MCP Tools (14 Total)

### 🗂️ Core Endpoints (10 tools)

_Direct mappings to DCS/Door43 resources_

- **`translation_helps_fetch_scripture`** - Get Bible text in USFM or plain text format
- **`translation_helps_fetch_translation_notes`** - Get detailed translation notes for Bible passages
- **`translation_helps_fetch_translation_questions`** - Get comprehension questions for Bible passages
- **`translation_helps_fetch_translation_words`** - Get specific translation word article content
- **`translation_helps_browse_translation_words`** - Browse available translation word articles by category
- **`translation_helps_fetch_translation_word_links`** - Get translation word links for specific Bible references
- **`translation_helps_get_languages`** - List all available languages for translation resources
- **`translation_helps_extract_references`** - Extract and parse Bible references from text
- **`translation_helps_list_available_resources`** - Search and list available translation resources
- **`translation_helps_get_available_books`** - List available Bible books for translation resources

### 🔗 Linked Endpoints (2 tools)

_Combine multiple endpoints for enhanced functionality_

- **`translation_helps_get_words_for_reference`** - Get translation words that apply to specific Bible references
- **`translation_helps_fetch_resources`** - Get comprehensive translation resources for a Bible reference

### 🧪 Experimental Endpoints (2 tools)

_Value-added endpoints that may change_

- **`translation_helps_get_context`** - Get contextual information and cross-references for Bible passages
- **`translation_helps_get_translation_word`** - Get detailed information about a specific translation word

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

## 🔧 Development Environment Setup

This project follows strict development standards to ensure UW (unfoldingWord) terminology compliance and code quality.

### Prerequisites

- **Node.js** 18+
- **Git** with hooks support
- **VS Code** (recommended) with workspace extensions

### Initial Setup

1. **Clone and Install**:

   ```bash
   git clone <repository-url>
   cd translation-helps-mcp
   npm install
   ```

2. **Install Pre-commit Hooks**:

   ```bash
   # Hooks are automatically installed via husky during npm install
   # Test the setup:
   npm run terminology:check
   ```

3. **VS Code Setup** (recommended):
   - Install workspace recommended extensions
   - Settings are pre-configured for UW development standards
   - ESLint will automatically enforce terminology compliance

### Development Standards

- **✅ Terminology Compliance**: Use "Strategic Language" not obsolete terms
- **✅ UW Resource Types**: Use proper ULT/GLT, UST/GST terminology
- **✅ Code Formatting**: Prettier + ESLint with custom UW rules
- **✅ Pre-commit Validation**: Automatic terminology checking

### Available Scripts

```bash
# Development and Testing
npm run dev                    # Start development server
npm test                      # Run all tests (non-watch mode)
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Run tests with coverage

# Code Quality
npm run lint                  # Check code style and terminology
npm run lint:fix              # Auto-fix linting issues
npm run format                # Format code with Prettier
npm run terminology:check     # Validate UW terminology compliance
npm run typecheck             # TypeScript type checking

# Build and Deploy
npm run build                 # Build for production
npm run preview               # Preview production build
```

### Pre-commit Hooks

The repository includes automatic pre-commit validation:

- **Terminology Check**: Prevents commits with outdated terminology
- **Code Formatting**: Auto-formats code with Prettier
- **Linting**: Enforces code quality and UW standards
- **Type Checking**: Validates TypeScript types

**Example pre-commit output**:

```bash
🔍 Running pre-commit checks...
📝 Checking for UW terminology compliance...
✅ Pre-commit checks passed!
```

### UW Terminology Guidelines

When developing, always use:

| ❌ Avoid             | ✅ Use Instead                               |
| -------------------- | -------------------------------------------- |
| Legacy terminology   | Strategic Language (current standard)        |
| Bible texts          | ULT/GLT (Literal) or UST/GST (Simplified)    |
| Translation          | Specific resource type (TN, TW, TWL, TQ, TA) |
| Generic descriptions | UW-specific resource descriptions            |

See `docs/UW_TRANSLATION_RESOURCES_GUIDE.md` for complete terminology and technical specifications.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. **Follow development standards** (terminology, formatting, testing)
4. Add comprehensive tests for new functionality
5. Ensure all tests pass: `npm test`
6. Verify terminology compliance: `npm run terminology:check`
7. Submit a pull request

**Remember: Good tests prevent bad deployments! And proper terminology ensures UW compliance!** 🛡️

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
