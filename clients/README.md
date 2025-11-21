# Translation Helps MCP Clients

This directory contains client applications that connect to the Translation Helps MCP server.

## Available Clients

### CLI Client (`cli/`)

Command-line interface for interacting with translation helps offline using local AI (Ollama) or OpenAI.

**Features:**

- 🤖 Local-first AI with Ollama (offline capable)
- 📦 Resource sync and offline management
- 💬 Interactive chat interface
- 📤 Import/export resources for sharing
- ⚙️ Configurable cache providers
- 🌐 Works completely offline after initial sync

See [`cli/README.md`](cli/README.md) for installation and usage instructions.

### TypeScript Example Client (`typescript-example/`)

Example TypeScript client demonstrating how to use the `@translation-helps/mcp-client` SDK with AI providers (Anthropic Claude, OpenAI, etc.).

**Features:**

- 📦 Uses official `@translation-helps/mcp-client` SDK
- 🤖 Integrates with multiple AI providers (Anthropic, OpenAI)
- 🔧 Demonstrates correct MCP tool calling flow
- 💡 Complete example code with error handling
- 📚 Well-documented with architecture diagrams

**Perfect for:**

- Learning how to build MCP clients
- Understanding the MCP tool calling pattern
- Starting point for your own client implementation

See [`typescript-example/README.md`](typescript-example/README.md) for installation and usage instructions.

### Future Clients

- **Desktop Client** (Electron/Tauri) - Planned
- **Mobile Client** (iOS/Android) - Planned

## Architecture

All clients share a common architecture:

- **MCP Protocol**: Standard Model Context Protocol for server communication
- **Offline-First**: Full functionality without internet after resource sync
- **Pluggable Caches**: Configurable cache provider system
- **Resource Sharing**: Import/export capabilities for peer-to-peer sharing

## Contributing

When adding a new client:

1. Create a subdirectory: `clients/your-client/`
2. Follow the offline-first architecture
3. Reuse shared business logic where possible
4. Document setup and usage thoroughly

## Directory Structure

```
clients/
├── README.md              # This file
├── cli/                   # Command-line client
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── typescript-example/    # TypeScript example client
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
└── shared/                # Shared code (future)
```
