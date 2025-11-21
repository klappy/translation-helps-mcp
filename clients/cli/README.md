# Translation Helps CLI

Command-line interface for Bible translation helps with **offline-first AI** using Ollama.

## ✨ Features

- 🤖 **Local AI with Ollama** - Works completely offline, no API costs
- 📦 **Resource Management** - Sync, import, and export translation helps
- 💬 **Interactive Chat** - REPL-style interface with streaming responses
- 🌐 **Offline Capable** - Full functionality without internet after sync
- 📤 **Resource Sharing** - Export and share resources via USB/Bluetooth
- ⚙️ **Pluggable Caches** - Configurable cache provider system

## 📋 Requirements

- **Node.js**: 18.0.0 or higher
- **Ollama**: For local AI (recommended)
  - Installer: ~500MB
  - Model storage: 2-5GB depending on model
  - Minimum RAM: 8GB (16GB recommended)

## 🚀 Quick Start

### 1. Install Ollama

**Windows:**
Download and install from [ollama.com](https://ollama.com/download/windows)

**Mac:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Linux:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull an AI Model

```bash
# Recommended: Mistral 7B (4.1GB, excellent quality)
ollama pull mistral:7b

# Alternative: Llama 3.2 3B (2GB, faster but less capable)
ollama pull llama3.2:3b

# Alternative: Llama 3.1 8B (4.7GB, most capable)
ollama pull llama3.1:8b
```

### 3. Install CLI

```bash
# Navigate to CLI directory
cd clients/cli

# Install dependencies
npm install

# Build
npm run build

# Link globally (optional)
npm link
```

### 4. Sync Translation Resources (Optional - for offline use)

```bash
# Download all English resources (~600MB)
th-cli sync en

# Download specific language
th-cli sync es
```

### 5. Start Chatting

```bash
# Start interactive chat
th-cli

# Or use from repo root
npm run cli:start
```

## 💬 Usage

### Interactive Chat

Once started, you can:

```
You: What does Romans 12:2 mean?

AI: [Streaming response about Romans 12:2 with translation notes, key terms, etc.]

You: Show me the translation notes for this verse

AI: [Provides detailed translation notes]
```

### Special Commands

Within the chat, use these commands:

- `/help` - Show available commands
- `/status` - Show AI provider, connection status, cache info
- `/config` - Display configuration
- `/providers` - Show active cache providers
- `/model <name>` - Switch Ollama model (e.g., `/model llama3.1:8b`)
- `/offline` - Toggle offline mode indicator
- `/clear` - Clear conversation history
- `/exit` - Quit the chat

### CLI Options

```bash
# Use specific Ollama model
th-cli --model llama3.1:8b

# Force OpenAI provider (requires API key in config)
th-cli --provider openai

# Force offline mode
th-cli --offline

# List available Ollama models
th-cli --list-models

# Show configuration
th-cli config

# Reset configuration to defaults
th-cli config --reset
```

## 📦 Offline Workflows

### Scenario 1: Personal Offline Use

```bash
# 1. While online, download resources
th-cli sync en

# 2. Disconnect from internet
# 3. Use completely offline
th-cli --offline
```

### Scenario 2: Sharing via USB Drive

**User A (online):**

```bash
# Export English resources
th-cli export en --output /path/to/usb-drive/
```

**User B (offline):**

```bash
# Import from USB drive
th-cli import /path/to/usb-drive/share-package-en-*.zip

# Start using
th-cli
```

### Scenario 3: Missionary Field Deployment

**Organization:**

```bash
# Create custom bundle with multiple languages
th-cli export --bundle en/ult,en/tn,es/ult,es/tn,fr/ult,fr/tn

# Copy to multiple USB drives
```

**Field Workers:**

```bash
# Import bundle
th-cli import ~/usb-drive/share-bundle-*.zip

# Work completely offline
th-cli --offline
```

### Scenario 4: Low-Bandwidth Sharing

```bash
# Split large export into smaller chunks
th-cli export en --split 10MB

# Send parts separately via limited connection
# Recipient imports and it auto-reassembles
th-cli import share-en.part*.zip
```

## 🎛️ Configuration

Configuration is stored in `~/.translation-helps-cli/config.json`

**Default Configuration:**

```json
{
  "aiProvider": "ollama",
  "ollamaModel": "mistral:7b",
  "ollamaBaseUrl": "http://localhost:11434",
  "openaiModel": "gpt-4o-mini",
  "offlineMode": false,
  "cachePath": "~/.translation-helps-mcp/cache",
  "exportPath": "~/.translation-helps-mcp/cache/exports",
  "cacheProviders": ["memory", "fs"],
  "cacheProvidersOrder": ["memory", "fs", "door43"],
  "languages": []
}
```

**To use OpenAI:**

```bash
# Set API key
export OPENAI_API_KEY=your-api-key

# Or add to config.json:
# "openaiApiKey": "your-api-key"

# Use OpenAI provider
th-cli --provider openai
```

## 📊 Disk Space Requirements

- **Per Language**: ~500-800MB
- **English (full set)**: ~600MB
- **Minimal (ULT + TN only)**: ~150MB
- **Ollama Models**:
  - Llama 3.2 3B: ~2GB
  - Mistral 7B: ~4.1GB
  - Llama 3.1 8B: ~4.7GB

## 🔧 Troubleshooting

### Ollama Not Running

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama service (usually auto-starts)
ollama serve
```

### Model Not Found

```bash
# List installed models
ollama list

# Pull a model if not installed
ollama pull mistral:7b
```

### Missing Cached Resources

```bash
# Check what's downloaded
th-cli cache stats

# Sync resources
th-cli sync en
```

### Connection Errors

```bash
# Check MCP server connection
th-cli config

# Verify tsx is available
npx tsx --version
```

## 🗺️ Future Roadmap

- **Desktop App**: Electron/Tauri GUI
- **Additional Commands**: More resource management features
- **Sync Commands**: Better resource syncing and update checking
- **Cache Commands**: Advanced cache provider configuration

## 📝 Development

```bash
# Development mode with auto-reload
npm run dev

# Build
npm run build

# Run built version
npm start
```

## 📄 License

MIT License - See LICENSE file in root directory

## 🤝 Contributing

See main project README for contribution guidelines.
