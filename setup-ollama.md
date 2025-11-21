# Ollama Setup Guide for Windows

Ollama is not currently installed on your system. Here's how to install it:

## 🚀 Quick Install (5 minutes)

### Step 1: Download Ollama

1. Open your browser
2. Go to: **https://ollama.com/download/windows**
3. Click "Download for Windows"
4. Wait for `OllamaSetup.exe` to download (~500MB)

### Step 2: Install Ollama

1. Run `OllamaSetup.exe` from your Downloads folder
2. Follow the installation wizard (click Next → Next → Install)
3. Ollama will install to: `C:\Users\LENOVO\AppData\Local\Programs\Ollama`
4. Ollama service starts automatically after installation

### Step 3: Verify Installation

Open a **new** terminal window (important!) and run:

```bash
ollama --version
```

You should see something like: `ollama version 0.x.x`

### Step 4: Pull the Mistral 7B Model

```bash
ollama pull mistral:7b
```

This will download ~4.1GB. Progress will be shown.

Wait for: `✓ success`

### Step 5: Verify Model

```bash
ollama list
```

You should see `mistral:7b` in the list.

### Step 6: Test the CLI

```bash
cd C:\Users\LENOVO\Git\Github\translation-helps-mcp-2
npm run cli:start
```

## 🎯 What You'll Get

After installation:

- ✅ Ollama service running in background
- ✅ Mistral 7B model ready to use
- ✅ Complete offline AI capability
- ✅ Zero API costs forever
- ✅ Full privacy (everything local)

## 📊 Storage Requirements

- **Ollama Installation**: ~500MB
- **Mistral 7B Model**: ~4.1GB
- **Total**: ~4.6GB

Make sure you have at least **5GB free space**.

## ⚡ Alternative: Quick Test Without Ollama

If you want to test the CLI immediately without Ollama, you can use OpenAI (requires internet):

```bash
# Set OpenAI API key
export OPENAI_API_KEY=your-api-key

# Use OpenAI provider
npm run cli:start -- --provider openai
```

But remember: This defeats the purpose of offline-first! 😊

## 🆘 Troubleshooting

### "Ollama not found" after installation

1. **Close and reopen** your terminal (important!)
2. Check if Ollama service is running:
   - Look for Ollama icon in system tray (bottom-right)
   - Or open Task Manager → check for "Ollama" process

### Model download fails

1. Check internet connection
2. Check disk space: `dir C:\Users\LENOVO\.ollama\models`
3. Retry: `ollama pull mistral:7b`

### Service not starting

1. Open Ollama from Start Menu
2. Right-click Ollama icon in system tray
3. Select "Restart"

## 🎓 After Setup

Once Ollama is installed and model is pulled, you can:

```bash
# Start the CLI
npm run cli:start

# Try these queries:
You: What does Romans 12:2 mean?
You: Show me translation notes for John 3:16
You: What are the key terms in Genesis 1:1?
```

## 📚 More Information

- **Ollama Documentation**: https://ollama.com/docs
- **Available Models**: https://ollama.com/library
- **Our CLI Guide**: See `clients/cli/README.md`

---

**Ready to install?** Follow steps 1-6 above, then come back and run the CLI! 🚀
