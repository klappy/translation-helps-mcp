# Translation Helps MCP Client SDKs

Official client SDKs for the Translation Helps MCP Server, available in multiple languages.

## Available SDKs

### TypeScript/JavaScript (`@translation-helps/mcp-client`)

```bash
npm install @translation-helps/mcp-client
```

**Documentation:** [packages/js-sdk/README.md](./js-sdk/README.md)

**Quick Example:**

```typescript
import { TranslationHelpsClient } from "@translation-helps/mcp-client";

const client = new TranslationHelpsClient();
await client.connect();

const scripture = await client.fetchScripture({
  reference: "John 3:16",
  language: "en",
});
```

### Python (`translation-helps-mcp-client`)

```bash
pip install translation-helps-mcp-client
```

**Documentation:** [packages/python-sdk/README.md](./python-sdk/README.md)

**Quick Example:**

```python
from translation_helps import TranslationHelpsClient

async def main():
    async with TranslationHelpsClient() as client:
        scripture = await client.fetch_scripture({
            "reference": "John 3:16",
            "language": "en"
        })
        print(scripture)
```

## Features

Both SDKs provide:

- ✅ **Type-safe interfaces** - Full TypeScript/Python type definitions
- ✅ **Convenience methods** - High-level methods for common operations
- ✅ **Low-level access** - Direct tool/prompt calling when needed
- ✅ **Error handling** - Proper error types and messages
- ✅ **Connection management** - Automatic initialization and cleanup
- ✅ **Remote server support** - Connect to HTTP-based MCP servers

## Development

### TypeScript SDK

```bash
cd packages/js-sdk
npm install
npm run build
```

### Python SDK

```bash
cd packages/python-sdk
pip install -e ".[dev]"
```

## Publishing

### TypeScript SDK

```bash
cd packages/js-sdk
npm publish --access public
```

### Python SDK

```bash
cd packages/python-sdk
python -m build
twine upload dist/*
```

## License

MIT
