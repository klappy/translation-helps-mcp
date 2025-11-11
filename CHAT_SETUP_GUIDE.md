# Chat Setup Guide

This guide explains how to configure the AI-powered Bible chat assistant with your OpenAI API key.

## 🔑 API Key Setup

The chat feature uses **OpenAI GPT-4o-mini** to provide intelligent Bible study assistance while strictly adhering to Translation Helps MCP data.

### Local Development

The chat endpoint uses **SvelteKit's built-in environment variable system** which automatically loads from `ui/.env`:

#### **Setup (Works for Both Dev Servers)**

1. **Create `ui/.env` file:**
   ```bash
   # Create the file in the ui directory
   cd ui
   echo "OPENAI_API_KEY=your-key-here" > .env
   ```

2. **Add your OpenAI API key to `ui/.env`:**
   ```env
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

**This works for:**
- ✅ `npm run dev` (Vite on port 8174)
- ✅ `npm run dev:cf` (Wrangler on port 8787)
- ✅ Both read `ui/.env` automatically
- ✅ File is gitignored and safe

**Get an OpenAI API key:**

If you don't have one:
- Visit: https://platform.openai.com/api-keys
- Sign in or create an account
- Click "Create new secret key"
- Copy the key immediately (you won't see it again!)
- Paste it into `ui/.env`

3. **Restart your development server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

4. **Test the chat:**
   - Visit: http://localhost:8174/chat
   - Try asking: "Show me John 3:16 in ULT"
   - The AI should respond with scripture and citations

### Production Deployment

For Cloudflare Pages production deployment:

1. **Set the secret in Cloudflare:**
   ```bash
   npx wrangler pages secret put OPENAI_API_KEY --project-name=translation-helps-mcp
   ```

2. **Or via Cloudflare Dashboard:**
   - Go to: Cloudflare Dashboard → Pages → translation-helps-mcp → Settings → Environment variables
   - Add variable: `OPENAI_API_KEY` = `your-key-here`
   - Set for: Production and Preview environments

## 🎯 How the Chat Works

The chat assistant follows **strict rules** to ensure accuracy:

### 1. **Scripture Quoting Rules**
- ✅ Quotes scripture EXACTLY word-for-word
- ❌ NEVER paraphrases or edits scripture
- ✅ Always includes translation name (e.g., "ULT v86")

### 2. **Citation Requirements**
- Every quote includes source: `[Resource - Reference]`
- Examples:
  - Scripture: `[ULT v86 - John 3:16]`
  - Notes: `[TN v86 - John 3:16]`
  - Questions: `[TQ v86 - John 3:16]`

### 3. **Data Source Constraints**
- ✅ Only uses MCP server data
- ❌ Never uses training data about the Bible
- ❌ Never adds external interpretations
- ✅ Says "data not available" when appropriate

### 4. **MCP Integration**
The chat automatically:
- Discovers available MCP endpoints
- Calls them based on user questions
- Extracts and cites data properly
- Provides transparency through X-Ray panel

## 🧪 Testing

Try these example prompts:

1. **Fetch Scripture:**
   ```
   Show me John 3:16 in ULT
   ```

2. **Translation Notes:**
   ```
   What do the Translation Notes say about Titus 1:2?
   ```

3. **Translation Words:**
   ```
   Define 'grace' from Translation Words
   ```

4. **Complex Query:**
   ```
   Compare how ULT and UST translate John 3:16, then explain any key terms using Translation Words
   ```

## 🔍 X-Ray Panel

Click the "🔍 X-Ray" button to see:
- Which MCP endpoints were called
- How long each call took
- What data was fetched
- Cache hit/miss status

This provides full transparency into how the AI assistant is using the translation resources.

## 🐛 Troubleshooting

### Chat shows "OpenAI API key not configured"

**Solution:**
1. Check that `ui/.dev.vars` exists
2. Verify your API key starts with `sk-`
3. Restart the dev server
4. Check terminal for error messages

### Chat doesn't load or shows error

**Solution:**
1. Check terminal logs for errors
2. Verify dev server is running on port 8174
3. Try refreshing the page
4. Check browser console for errors

### API key works but responses are slow

**Normal behavior:**
- First response may be slower (cold start)
- Subsequent responses should be faster (caching)
- X-Ray panel shows timing breakdown

### Chat gives wrong information

**Expected behavior:**
- Chat should ONLY use MCP server data
- If it uses external knowledge, that's a bug
- File an issue with the prompt and response

## 💰 Cost Considerations

The chat uses **GPT-4o-mini**, which is OpenAI's most cost-effective model:

- **Input:** ~$0.15 per 1M tokens
- **Output:** ~$0.60 per 1M tokens
- **Typical query:** < $0.01

For development and testing, costs should be minimal (<$1/month for moderate use).

## 🔒 Security

**IMPORTANT:**
- ✅ `ui/.dev.vars` is gitignored - never commits to repo
- ✅ API keys never sent to client browser
- ✅ All OpenAI calls happen server-side
- ⚠️ Never share your `.dev.vars` file
- ⚠️ Rotate keys if accidentally exposed

## 📚 Additional Resources

- **OpenAI API Docs:** https://platform.openai.com/docs/api-reference
- **MCP Protocol:** https://modelcontextprotocol.io/
- **Translation Resources Guide:** See `docs/UW_TRANSLATION_RESOURCES_GUIDE.md`

---

Need help? Open an issue on GitHub or check the main README for more documentation links.

