# Translation Helps MCP Server - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This guide will help you get the Translation Helps MCP Server running locally and integrated with your AI assistant.

---

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Redis (optional, for caching)
- A text editor (VS Code recommended)
- An MCP-compatible AI assistant (Claude Desktop, Cursor, etc.)

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/klappy/translation-helps-mcp.git
cd translation-helps-mcp
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required
DCS_API_URL=https://git.door43.org/api/v1

# Optional
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=true
LOG_LEVEL=info
MAX_CONCURRENT_REQUESTS=10
```

### 4. Build the Project

```bash
npm run build
```

### 5. Test the Server Locally

```bash
npm run dev
```

You should see:

```
Translation Helps MCP Server v1.0.0
Listening on stdio transport...
Ready to handle requests
```

---

## 🔌 Integration with AI Assistants

### Claude Desktop Configuration

1. Open Claude Desktop settings
2. Navigate to Developer → MCP Settings
3. Edit the configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the Translation Helps server:

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "node",
      "args": ["/absolute/path/to/translation-helps-mcp/dist/index.js"],
      "env": {
        "DCS_API_URL": "https://git.door43.org/api/v1",
        "CACHE_ENABLED": "true"
      }
    }
  }
}
```

4. Restart Claude Desktop

### Cursor Configuration

1. Open Cursor settings
2. Go to Settings → Extensions → MCP
3. Edit `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "node",
      "args": ["./node_modules/translation-helps-mcp/dist/index.js"],
      "env": {
        "DCS_API_URL": "https://git.door43.org/api/v1",
        "CACHE_ENABLED": "true",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

---

## 💬 Using the MCP Server

Once integrated, you can ask your AI assistant questions like:

### Basic Scripture Lookup

```
"Show me John 3:16 with translation notes"
```

The AI will use:

```typescript
translation_helps_fetch_resources({
  reference: "John 3:16",
  resources: ["scripture", "notes"],
});
```

### Multi-Language Support

```
"What does Romans 8:28 say in Spanish with all translation helps?"
```

### Context-Aware Study

```
"I'm studying the concept of faith in Hebrews 11. Give me the full context."
```

### Resource Search

```
"What translation resources are available in French?"
```

---

## 🧪 Testing Your Installation

### 1. Command Line Test

```bash
# Test the server directly
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npm run start

# Should return list of available tools
```

### 2. Test Individual Tools

```bash
# Create a test script
cat > test-tool.js << 'EOF'
const { spawn } = require('child_process');

const server = spawn('node', ['dist/index.js']);

const request = {
  jsonrpc: "2.0",
  method: "tools/call",
  params: {
    name: "translation_helps_fetch_resources",
    arguments: {
      reference: "John 3:16"
    }
  },
  id: 1
};

server.stdin.write(JSON.stringify(request) + '\n');

server.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});
EOF

node test-tool.js
```

### 3. Run Unit Tests

```bash
npm test
```

### 4. Run Integration Tests

```bash
npm run test:integration
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Server Not Starting

```bash
# Check Node version
node --version  # Should be 18+

# Check for port conflicts
lsof -i :3000

# Verify build
npm run build
```

#### 2. MCP Connection Failed

```bash
# Test server directly
npm run start

# Check logs
tail -f logs/mcp-server.log

# Verify config path in AI assistant
```

#### 3. Resources Not Loading

```bash
# Test DCS API connectivity
curl https://git.door43.org/api/v1/repos/unfoldingWord/en_ult/contents

# Check cache
redis-cli ping

# Clear cache
npm run cache:clear
```

#### 4. Slow Response Times

```bash
# Enable debug logging
LOG_LEVEL=debug npm run start

# Monitor performance
npm run monitor
```

### Debug Mode

```bash
# Run with full debugging
DEBUG=* npm run dev

# Or specific modules
DEBUG=mcp:*,cache:* npm run dev
```

---

## 📊 Monitoring

### Health Check Endpoint

```bash
# Check server health
curl http://localhost:3000/health

# Response
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "cache": "connected",
  "dcs": "reachable"
}
```

### Metrics

```bash
# View metrics
curl http://localhost:3000/metrics

# Prometheus format metrics
# mcp_requests_total{tool="fetch_resources"} 1234
# mcp_request_duration_seconds{tool="fetch_resources"} 0.234
# mcp_cache_hits_total 5678
# mcp_cache_misses_total 1234
```

---

## 🔧 Development Workflow

### 1. Making Changes

```bash
# Start development mode with auto-reload
npm run dev

# In another terminal, run tests in watch mode
npm run test:watch
```

### 2. Adding a New Tool

```bash
# Use the tool generator
npm run generate:tool my_new_tool

# This creates:
# - src/tools/myNewTool.ts
# - src/tools/myNewTool.test.ts
# - Updates tool registry
```

### 3. Testing Your Changes

```bash
# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run all tests
npm run test

# Build for production
npm run build
```

### 4. Debugging Tips

```typescript
// Add debug logs in your code
import { logger } from "./utils/logger";

logger.debug("Fetching resources", { reference, options });

// Use breakpoints in VS Code
// Launch configuration is included in .vscode/launch.json
```

---

## 🚢 Production Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t translation-helps-mcp .

# Run container
docker run -p 3000:3000 \
  -e DCS_API_URL=https://git.door43.org/api/v1 \
  -e REDIS_URL=redis://redis:6379 \
  translation-helps-mcp
```

### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DCS_API_URL=https://git.door43.org/api/v1
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n translation-helps
```

---

## 📚 Additional Resources

### Documentation

- [Full API Documentation](./docs/API.md)
- [Architecture Overview](./MCP_TRANSLATION_HELPS_ARCHITECTURE.md)
- [Contributing Guide](./CONTRIBUTING.md)

### Examples

- [Example Tool Implementations](./examples/)
- [Client Integration Examples](./examples/clients/)
- [Advanced Usage Patterns](./docs/advanced-usage.md)

### Community

- [GitHub Issues](https://github.com/klappy/translation-helps-mcp/issues)
- [Discussions](https://github.com/klappy/translation-helps-mcp/discussions)
- [Discord Server](https://discord.gg/translation-helps)

---

## 🆘 Getting Help

### Quick Links

- 🐛 [Report a Bug](https://github.com/klappy/translation-helps-mcp/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/klappy/translation-helps-mcp/issues/new?template=feature_request.md)
- 💬 [Ask a Question](https://github.com/klappy/translation-helps-mcp/discussions/new)

### Support Channels

1. **GitHub Issues** - For bugs and feature requests
2. **Discussions** - For questions and community help
3. **Stack Overflow** - Tag with `translation-helps-mcp`
4. **Email** - support@translation-helps-mcp.org

---

## 🎉 Next Steps

1. **Explore the Tools**: Try different Bible references and see the responses
2. **Check the Examples**: Look at `/examples` for advanced usage
3. **Read the Docs**: Deep dive into the architecture
4. **Contribute**: We welcome contributions!

Welcome to the Translation Helps MCP Server community! 🙏

---

_Last Updated: [Current Date]_  
_Version: 1.0.0_
