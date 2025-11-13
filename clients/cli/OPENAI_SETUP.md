# OpenAI Setup Guide

This guide explains how to configure the CLI to use OpenAI instead of Ollama.

## Prerequisites

1. **OpenAI API Key**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Internet Connection**: OpenAI requires internet access (unlike Ollama which works offline)

## Setup Methods

### Method 1: Environment Variable (Recommended)

Set the `OPENAI_API_KEY` environment variable:

**Linux/macOS:**

```bash
export OPENAI_API_KEY=sk-your-api-key-here
npm run cli:start
```

**Windows (PowerShell):**

```powershell
$env:OPENAI_API_KEY="sk-your-api-key-here"
npm run cli:start
```

**Windows (CMD):**

```cmd
set OPENAI_API_KEY=sk-your-api-key-here
npm run cli:start
```

### Method 2: Command Line Option

Set the API key when starting the CLI:

```bash
npm run cli:start -- --openai-key sk-your-api-key-here
```

### Method 3: Interactive CLI Command

Start the CLI and set the key interactively:

```bash
npm run cli:start

You: /set-openai-key sk-your-api-key-here
✅ OpenAI API key set
```

### Method 4: Configuration File

The API key is automatically saved to `~/.translation-helps-cli/config.json` when you use Method 2 or 3.

## Switching to OpenAI

### Option 1: Command Line

Start with OpenAI provider:

```bash
npm run cli:start -- --provider openai --openai-key sk-your-api-key-here
```

### Option 2: Interactive CLI

Start the CLI, then switch providers:

```bash
npm run cli:start

You: /set-openai-key sk-your-api-key-here
✅ OpenAI API key set

You: /provider openai
✅ Switched to provider: openai
  Model: gpt-4o-mini
```

## Verify Setup

Check your current provider and API key status:

```bash
You: /provider
🤖 Current AI Provider:

  Provider: openai
  Model: gpt-4o-mini
  API Key: Set
```

Or check full configuration:

```bash
You: /config
📋 Current Configuration:

  AI Provider: openai
  OpenAI Model: gpt-4o-mini
  OpenAI API Key: Set
  ...
```

## Switching Models

OpenAI supports different models. Switch models with:

```bash
You: /model gpt-4o
✅ Switched to model: gpt-4o
```

Common OpenAI models:

- `gpt-4o` - Latest GPT-4 model (most capable)
- `gpt-4o-mini` - Faster, cheaper GPT-4 variant (default)
- `gpt-4-turbo` - Previous GPT-4 Turbo model
- `gpt-3.5-turbo` - Faster, cheaper option

## Switching Back to Ollama

To switch back to Ollama (offline mode):

```bash
You: /provider ollama
✅ Switched to provider: ollama
  Model: mistral:7b
```

## Troubleshooting

### "OpenAI API key not set"

**Solution:** Set the API key using one of the methods above.

### "Failed to switch provider"

**Possible causes:**

1. API key is invalid or expired
2. No internet connection
3. OpenAI API is down

**Solutions:**

1. Verify your API key at [OpenAI Platform](https://platform.openai.com/api-keys)
2. Check your internet connection
3. Try again later

### "OpenAI error: Invalid API key"

**Solution:**

1. Verify your API key is correct
2. Check if your API key has expired
3. Ensure you're using the correct format: `sk-...`

## Configuration File Location

The API key is stored in:

- **Linux/macOS:** `~/.translation-helps-cli/config.json`
- **Windows:** `C:\Users\<username>\.translation-helps-cli\config.json`

**Note:** The API key is stored in plain text. Keep this file secure!

## Security Best Practices

1. **Don't commit API keys** to version control
2. **Use environment variables** in production
3. **Rotate API keys** regularly
4. **Set usage limits** in OpenAI dashboard
5. **Monitor usage** to prevent unexpected charges

## Cost Considerations

OpenAI charges per token (input + output). Costs vary by model:

- `gpt-4o-mini`: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- `gpt-4o`: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens
- `gpt-3.5-turbo`: ~$0.50 per 1M input tokens, ~$1.50 per 1M output tokens

**Tip:** Use `gpt-4o-mini` for most tasks to save costs while maintaining good quality.

## Comparison: Ollama vs OpenAI

| Feature     | Ollama            | OpenAI                    |
| ----------- | ----------------- | ------------------------- |
| **Offline** | ✅ Yes            | ❌ No (requires internet) |
| **Cost**    | ✅ Free           | 💰 Pay per use            |
| **Speed**   | ⚡ Fast (local)   | 🌐 Depends on network     |
| **Privacy** | ✅ 100% local     | ⚠️ Data sent to OpenAI    |
| **Models**  | Limited selection | Wide selection            |
| **Quality** | Varies by model   | Generally high            |

**Recommendation:** Use Ollama for offline work and privacy-sensitive tasks. Use OpenAI when you need the best quality or specific models.
