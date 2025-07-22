# Translation Helps MCP - Complete Implementation Guide

This guide covers everything from setup to advanced integration of the Translation Helps MCP server.

## 🚀 **Quick Start (5 Minutes)**

Get the Translation Helps MCP Server running locally and integrated with your AI assistant.

### Prerequisites

- **Node.js 18+** and npm
- **Git** for cloning the repository
- **AI Assistant** that supports MCP (Claude, Cursor, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/klappy/translation-helps-mcp.git
cd translation-helps-mcp

# Install dependencies
npm install

# Install UI dependencies
cd ui && npm install && cd ..

# Start the development server
npm run dev
```

### Verify Installation

```bash
# Test the health endpoint
curl http://localhost:5173/api/health

# Test a scripture fetch
curl "http://localhost:5173/api/fetch-scripture?reference=John%203:16&language=en&organization=unfoldingWord"
```

### MCP Integration

**For Cursor/Claude Desktop:**

Add to your MCP configuration file (`.cursor/mcp.json` or similar):

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "node",
      "args": ["path/to/translation-helps-mcp/src/index.js"]
    }
  }
}
```

**For HTTP MCP (Serverless):**

Use the production endpoint directly:

```json
{
  "mcpServers": {
    "translation-helps": {
      "type": "http",
      "url": "https://translation-helps-mcp.pages.dev/api/mcp"
    }
  }
}
```

## 📚 **Core Features & Usage**

### Available Tools

1. **fetchScripture** - Get Bible text in any language
2. **fetchTranslationNotes** - Get verse-specific translation notes
3. **fetchTranslationQuestions** - Get comprehension questions
4. **getTranslationWord** - Get word definitions and explanations
5. **fetchResources** - Get all resources for a verse (comprehensive)
6. **getLanguages** - List available languages and organizations
7. **getContext** - Get contextual information for passages

### Example Usage

**Fetch Scripture:**

```javascript
// Via API
curl "http://localhost:5173/api/fetch-scripture?reference=Genesis%201:1&language=en&organization=unfoldingWord"

// Via MCP
{
  "tool": "fetchScripture",
  "arguments": {
    "reference": "Genesis 1:1",
    "language": "en",
    "organization": "unfoldingWord"
  }
}
```

**Get All Resources:**

```javascript
// Gets scripture, notes, questions, and word definitions
{
  "tool": "fetchResources",
  "arguments": {
    "reference": "John 3:16",
    "language": "en",
    "organization": "unfoldingWord"
  }
}
```

### Supported Organizations

- **unfoldingWord** - English, Spanish, and many other languages
- **Wycliffe** - Various language projects
- **Other organizations** - Check via `getLanguages` tool

## 🏗️ **Architecture Overview**

### Modern Stack

- **SvelteKit** - Full-stack web framework
- **TypeScript** - Type-safe development
- **Platform-Agnostic Functions** - Works on Cloudflare Workers, Netlify, and locally
- **HTTP MCP** - Stateless MCP over HTTP (revolutionary!)

### Project Structure

```
translation-helps-mcp/
├── src/                              # Core MCP server and functions
│   ├── index.ts                      # MCP server entry point
│   ├── functions/                    # Platform-agnostic business logic
│   │   ├── platform-adapter.ts      # Platform abstraction
│   │   ├── handlers/                 # API endpoint handlers
│   │   └── services/                 # Business logic services
│   └── tools/                        # MCP tool definitions
├── ui/                               # SvelteKit web application
│   ├── src/routes/api/              # API endpoints (SvelteKit format)
│   └── src/lib/                     # Shared UI components
├── tests/                           # Test suites
└── docs/                           # Documentation
```

### Key Design Principles

1. **Platform Agnostic** - Same code runs everywhere
2. **Performance First** - Aggressive caching, minimal bundle size
3. **Type Safety** - Full TypeScript coverage
4. **Error Resilience** - Graceful fallbacks for missing resources
5. **Standards Compliant** - Follows MCP specification exactly

## 🔧 **Development Setup**

### Local Development

```bash
# Start development server with hot reload
npm run dev

# Run in different modes
npm run dev                    # SvelteKit dev server (port 5173)
npm run build && npm start     # Production build preview
npm run mcp:dev               # MCP server only (for debugging)
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:smoke             # Quick smoke tests
npm run test:regression        # Full regression suite
npm run test:endpoints         # API endpoint tests
```

### Environment Setup

**No environment variables required!** All APIs are public.

**Optional Configuration:**

- Set `NODE_ENV=development` for verbose logging
- Configure custom ports via standard Node.js environment variables

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

## 🎯 **Integration Patterns**

### MCP Tool Usage

**Basic Pattern:**

```javascript
// Always provide required parameters
const result = await callTool("fetchScripture", {
  reference: "John 3:16", // Required: Bible reference
  language: "en", // Required: Language code
  organization: "unfoldingWord", // Required: Organization
});
```

**Error Handling:**

```javascript
try {
  const result = await callTool("fetchResources", params);
  // Handle successful response
} catch (error) {
  // Handle API errors, missing resources, etc.
  console.warn("Resource not available:", error.message);
}
```

**Batch Operations:**

```javascript
// Get multiple resources efficiently
const [scripture, notes, questions] = await Promise.all([
  callTool("fetchScripture", params),
  callTool("fetchTranslationNotes", params),
  callTool("fetchTranslationQuestions", params),
]);
```

### API Integration

**Direct HTTP Usage:**

```javascript
// RESTful API endpoints available at /api/*
const response = await fetch(
  "/api/fetch-resources?" +
    new URLSearchParams({
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
    })
);

const data = await response.json();
```

**Caching Strategy:**

```javascript
// Responses are automatically cached for 5 minutes
// No need to implement your own caching layer
// Cache keys based on: endpoint + parameters
```

## 🧪 **Testing & Validation**

### Manual Testing

**Web Interface:**

- Visit `http://localhost:5173` for interactive testing
- Use the built-in API tester at `/test`
- Check performance at `/performance`

**Command Line:**

```bash
# Test core endpoints
curl http://localhost:5173/api/health
curl "http://localhost:5173/api/get-languages?organization=unfoldingWord"
curl "http://localhost:5173/api/fetch-scripture?reference=Genesis%201:1&language=en&organization=unfoldingWord"
```

### Automated Testing

**Continuous Integration:**

```bash
# Full test suite (runs on CI)
npm run test:ci

# Performance benchmarks
npm run test:performance

# Load testing
npm run test:load
```

**Test Coverage:**

- API endpoint functionality
- MCP tool compliance
- Error handling and edge cases
- Performance regression detection
- Cross-platform compatibility

## 📊 **Performance Guidelines**

### Response Time Targets

- **Languages**: < 1 second
- **Scripture**: < 2 seconds
- **Translation Resources**: < 2 seconds
- **Cached Responses**: < 100ms

### Optimization Features

1. **Intelligent Caching** - 5-minute TTL for translation resources
2. **Request Deduplication** - Prevents duplicate API calls
3. **Parallel Loading** - Multiple resources loaded simultaneously
4. **Graceful Degradation** - Missing resources don't break responses
5. **Edge Deployment** - Cloudflare Workers for global performance

### Monitoring

```javascript
// Built-in performance metrics
const metrics = await fetch("/api/health");
// Returns: response times, cache hit rates, error counts
```

## 🚨 **Troubleshooting**

### Common Issues

**1. "No translation resources found"**

- Check organization name (case-sensitive)
- Verify language code format (lowercase)
- Some books may not exist in all languages

**2. Slow initial responses**

- First request to any resource requires API calls
- Subsequent requests use cache (much faster)
- Cold starts on serverless platforms add ~1-2s

**3. CORS errors in browser**

- All endpoints include proper CORS headers
- Check for proxy/firewall interference
- Verify you're using correct protocol (http/https)

**4. MCP connection issues**

- Verify MCP server path in configuration
- Check Node.js version compatibility (18+)
- Look for import/export errors in console

### Debug Mode

```bash
# Enable verbose logging
NODE_ENV=development npm run dev

# MCP server debug mode
npm run mcp:debug

# Check server logs
tail -f logs/translation-helps-mcp.log
```

### Performance Issues

```bash
# Profile API performance
npm run profile

# Test with different load levels
npm run test:load -- --users 50 --duration 60s

# Check cache hit rates
curl http://localhost:5173/api/health | jq .cache
```

## 🔗 **Related Documentation**

- **[Translation Helps Complete Guide](TRANSLATION_HELPS_COMPLETE_GUIDE.md)** - Technical patterns and implementation wisdom
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[Archive](ARCHIVE.md)** - Historical context and deprecated features

## 🎓 **Next Steps**

### For Developers

1. **Explore the API** - Use the web interface to understand capabilities
2. **Read the patterns** - Check Translation Helps Complete Guide for best practices
3. **Contribute** - Submit PRs for improvements and new features

### For Users

1. **Configure MCP** - Add to your AI assistant configuration
2. **Try examples** - Test with different languages and organizations
3. **Integrate** - Use in your Bible study and translation workflows

### For Deployers

1. **Deploy to production** - Follow the Deployment Guide
2. **Monitor performance** - Set up alerts for response times
3. **Scale up** - Consider Cloudflare KV for high-traffic scenarios

---

**🎯 Success Metrics:** You'll know everything is working when you can fetch John 3:16 in multiple languages with sub-2s response times and explore translation notes that enhance your understanding!
