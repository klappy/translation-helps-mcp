# Translation Helps Python Chatbot Example

This is a complete working example of a chatbot that uses the Translation Helps MCP SDK with OpenAI to answer questions about Bible translation resources.

## Prerequisites

- Python 3.8 or higher
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Setup

1. **Install the Python SDK from PyPI:**

   ```bash
   pip install translation-helps-mcp-client
   ```

   Or if you're developing locally, install from the repository:

   ```bash
   cd ../../packages/python-sdk
   pip install -e .
   cd ../../../examples/python-chatbot
   ```

2. **Install other dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

## Running the Chatbot

**Important:** Make sure you're using the same Python interpreter where you installed the dependencies.

**Option 1: Use the install script (recommended):**

```bash
python install_deps.py
# Then use the Python path it shows to run the chatbot
```

**Option 2: Find the correct Python:**

```bash
python find_python.py
# Then use the Python path it shows
```

**Option 3: Use the specific Python path directly:**

```bash
# Windows (adjust path as needed)
"C:\Users\LENOVO\AppData\Local\Programs\Python\Python311\python.exe" chatbot.py
```

**Option 4: Install dependencies in your current Python:**

```bash
python -m pip install -r requirements.txt
python chatbot.py
```

## Testing the SDK

To test that the SDK is installed correctly (without OpenAI):

```bash
python test_sdk.py
```

**Note:** If you get a "ModuleNotFoundError", make sure you're using the same Python interpreter where you installed the package. You can:

1. **Find the correct Python:**

   ```bash
   python find_python.py
   ```

2. **Or install the SDK in your current Python:**

   ```bash
   python -m pip install translation-helps-mcp-client
   ```

3. **Or use the specific Python path directly:**
   ```bash
   # Windows (adjust path as needed)
   "C:\Users\LENOVO\AppData\Local\Programs\Python\Python311\python.exe" test_sdk.py
   ```

## Example Questions

Try asking:

- "What does John 3:16 say?"
- "What are the translation notes for Ephesians 2:8-9?"
- "What does the word 'love' mean in the Bible?"
- "Get comprehensive translation help for Romans 1:1"

## How It Works

1. **User asks a question** - e.g., "What does John 3:16 say?"
2. **OpenAI receives question + available tools** - OpenAI sees all MCP tools (fetch_scripture, fetch_translation_notes, etc.)
3. **OpenAI decides which tools to call** - OpenAI might call `fetch_scripture` with `reference="John 3:16"`
4. **Python SDK executes tool calls** - SDK calls the MCP server at `/api/mcp` which routes to the actual endpoint
5. **Tool results fed back to OpenAI** - OpenAI receives the scripture text and generates a natural language response
6. **User receives final answer** - OpenAI provides a comprehensive answer using the fetched data

## Code Structure

- `chatbot.py` - Main chatbot implementation
- `requirements.txt` - Python dependencies
- `.env.example` - Environment variable template

## Troubleshooting

- **"Module not found: translation_helps"**:
  - Make sure you've installed the SDK from `packages/python-sdk` using `pip install -e .`
  - Verify you're using the same Python environment: `python --version` and `pip --version` should use the same Python
  - Try: `python -c "import translation_helps; print('SDK installed correctly')"` to verify
- **"Client not connected"**: Make sure you've called `await mcp_client.connect()` before using the client

- **"Invalid API key"**: Check that your `OPENAI_API_KEY` is set correctly in the `.env` file

- **"Module not found: openai"**: Run `pip install -r requirements.txt` to install dependencies
