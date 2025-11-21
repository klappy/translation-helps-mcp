# Getting Started with Offline Translation Helps

Quick start guide for using Translation Helps completely offline with local AI.

## 🎯 Goal

Set up a system that works **completely offline** for Bible translation work:

- ✅ No internet required after setup
- ✅ No API costs
- ✅ Complete privacy
- ✅ Fast responses

## 📋 What You'll Need

### Hardware

- **Computer**: Windows, Mac, or Linux
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 5-10GB free space

### Software (One-Time Setup)

- **Node.js**: v18 or higher
- **Ollama**: Local AI runtime

## 🚀 Setup (30 minutes)

### Step 1: Install Ollama (5 min)

**Windows:**

1. Download from [ollama.com/download/windows](https://ollama.com/download/windows)
2. Run installer
3. Ollama starts automatically

**Mac:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Linux:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Verify installation:**

```bash
ollama --version
```

### Step 2: Download AI Model (10 min)

Choose one:

```bash
# Recommended: Mistral 7B (4.1GB, best quality/speed balance)
ollama pull mistral:7b

# Alternative: Llama 3.2 3B (2GB, faster but less capable)
ollama pull llama3.2:3b

# Alternative: Llama 3.1 8B (4.7GB, highest quality)
ollama pull llama3.1:8b
```

**Verify model:**

```bash
ollama list
```

### Step 3: Install CLI (5 min)

```bash
# Navigate to project
cd translation-helps-mcp

# Install CLI
npm run cli:install

# Build CLI
npm run cli:build
```

### Step 4: Download Translation Resources (10 min)

**Important: Do this while online!**

```bash
# Download English resources (~600MB)
npm run cli:start sync en

# Optional: Download other languages
npm run cli:start sync es  # Spanish
npm run cli:start sync fr  # French
```

**Verify downloads:**

```bash
npm run cli:start cache stats
```

### Step 5: Test Offline (1 min)

```bash
# 1. Disconnect from internet (or turn off WiFi)

# 2. Start the CLI
npm run cli:start

# 3. Try a query
You: What does Romans 12:2 mean?

# You should see a response! 🎉
```

## 🎓 First Translation Session

### Example Workflow

```
You: Show me Romans 12:2

AI: Here's Romans 12:2 from the ULT:
"And do not be conformed to this age, but be transformed by
the renewal of the mind..."

You: What are the difficult phrases in this verse?

AI: There are 3 challenging phrases:
1. "do not be conformed" - ...
2. "renewal of the mind" - ...
3. "will of God" - ...

You: Explain "renewal of the mind"

AI: [Provides detailed explanation with translation notes]

You: What are the key terms?

AI: Key terms in this passage:
- Mind, Mindful, Remind
- Age, Aged, Old
- God
- Will of God
- Good, Right, Pleasant
[With definitions...]
```

### Useful Queries

```
Show me [passage]
What are the difficult phrases in [passage]?
What are the key terms in [passage]?
Explain [concept/phrase]
Help me translate [passage]
What translation principles apply to [passage]?
```

## 🔧 Daily Use

### Starting a Session

```bash
# Navigate to project
cd translation-helps-mcp

# Start CLI
npm run cli:start

# Or if globally linked:
th-cli
```

### During Session

- Type naturally - the AI understands context
- Reference passages: "Romans 12:2", "Genesis 1:1-3"
- Ask follow-up questions
- Use `/help` for commands

### Ending Session

```
You: /exit
```

## 📤 Sharing Resources (Team Workflows)

### One Person Has Internet, Others Don't

**Person with Internet:**

```bash
# Export resources to USB drive
npm run cli:start export en --output /media/usb/

# Give USB drive to team members
```

**Team Members:**

```bash
# Import from USB
npm run cli:start import /media/usb/share-package-en-*.zip

# Start using
npm run cli:start
```

See [SHARING_GUIDE.md](SHARING_GUIDE.md) for more scenarios.

## 🎛️ Advanced Configuration

### Using Different AI Models

```bash
# List available models
npm run cli:start --list-models

# Use specific model
npm run cli:start --model llama3.1:8b
```

### Cache Configuration

```bash
# Show cache providers
npm run cli:start cache providers

# Show cache statistics
npm run cli:start cache stats
```

### Using OpenAI Instead (requires internet)

```bash
# Set API key
export OPENAI_API_KEY=your-key

# Use OpenAI
npm run cli:start --provider openai
```

## 💡 Tips

### Save Disk Space

```bash
# Download minimal resources (ULT + TN only)
npm run cli:start export --bundle en/ult,en/tn
```

### Faster Responses

- Use smaller models (llama3.2:3b)
- More RAM = better performance
- SSD vs HDD makes a big difference

### Better Answers

- Provide context in your questions
- Reference specific verses
- Ask follow-up questions
- Be specific about what you need

## 🆘 Troubleshooting

### "Ollama not available"

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
# Windows: Restart from system tray
# Mac/Linux: ollama serve
```

### "Resource not found"

```bash
# Check what's downloaded
npm run cli:start cache stats

# Sync resources
npm run cli:start sync en
```

### "Cannot connect to MCP server"

```bash
# Verify tsx is available
npx tsx --version

# Check Node.js version
node --version  # Should be 18+
```

### Slow Responses

- Using a large model? Try smaller: `--model llama3.2:3b`
- Low RAM? Close other applications
- First query is slow (model loading), subsequent queries faster

## 📊 What's Using My Disk Space?

```bash
# Check cache size
npm run cli:start cache stats

# Location of cached data
# Windows: C:\Users\{you}\.translation-helps-mcp\cache\
# Mac:     /Users/{you}/.translation-helps-mcp/cache/
# Linux:   /home/{you}/.translation-helps-mcp/cache/
```

### Typical Sizes

| Item              | Size       |
| ----------------- | ---------- |
| Ollama app        | ~500MB     |
| Mistral 7B model  | ~4.1GB     |
| English resources | ~600MB     |
| **Total**         | **~5.2GB** |

### Cleaning Up

```bash
# Clear specific resources
npm run cli:start cache clear en

# Clear all cache
npm run cli:start cache clear
```

## 📚 Next Steps

- Read [CLI README](../clients/cli/README.md) for full CLI documentation
- Read [Offline Architecture](OFFLINE_ARCHITECTURE.md) for technical details
- Read [Sharing Guide](SHARING_GUIDE.md) for team workflows
- Read [Cache Architecture](CACHE_ARCHITECTURE.md) for cache system details

## 🌟 Success!

You now have a **complete offline translation toolkit** that:

- Works anywhere, anytime
- Costs nothing to run
- Keeps your work private
- Responds in seconds
- Requires no internet

Happy translating! 📖
