# Translation Helps Python Chatbot Example

This is a complete working example of a chatbot that uses the Translation Helps MCP SDK with OpenAI to answer questions about Bible translation resources.

## Prerequisites

- Python 3.8 or higher
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Setup

1. **Install the Python SDK from PyPI:**

   ```bash
   pip install translation-helps-mcp-client>=1.1.1
   ```

   This example uses version 1.1.1+ which includes optional adapter utilities for converting MCP tools/prompts to provider formats.

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

### Quick Start (Easiest Methods)

**Option 1: Use Windows Python Launcher (Recommended for Windows):**

```bash
# After running fix_py_launcher.py (see below), you can use:
py chatbot.py

# Or specify version explicitly:
py -3.11 chatbot.py

# Or use the batch file
run.bat
```

**First-time setup:** If `py chatbot.py` doesn't work, run the launcher fix:

```bash
python fix_py_launcher.py
```

This configures the Python launcher to use Python 3.11 as default.

### Command-Line Options

The chatbot supports several CLI flags to control output verbosity:

```bash
# Default mode - shows essential messages
py chatbot.py

# Verbose mode - shows connection status and tool counts
py chatbot.py --verbose
# or
py chatbot.py -v

# Debug mode - shows detailed tool execution progress
py chatbot.py --debug
# or
py chatbot.py -d

# Quiet mode - minimal output (errors and responses only)
py chatbot.py --quiet
# or
py chatbot.py -q

# Override server URL
py chatbot.py --server-url https://your-server.com/api/mcp

# Combine flags
py chatbot.py --debug --server-url https://your-server.com/api/mcp
```

**Output Levels:**

- **Default**: Shows chatbot ready message and assistant responses
- **Verbose (`-v`)**: Adds connection status and tool/prompt counts
- **Debug (`-d`)**: Adds detailed tool execution progress (calling, completed, warnings, errors)
- **Quiet (`-q`)**: Only shows errors and final responses (no status messages)

**Option 2: Fix your PATH (Best long-term solution):**
If `python` command finds the wrong Python (like Inkscape's Python), see [FIX_PYTHON_PATH.md](FIX_PYTHON_PATH.md) for instructions.

After fixing PATH:

```bash
python chatbot.py
```

### Alternative Methods (If PATH isn't fixed)

**Option 3: Use helper script:**

```bash
python run_chatbot.py
```

**Option 4: Use specific Python path:**

```bash
"C:\Users\LENOVO\AppData\Local\Programs\Python\Python311\python.exe" chatbot.py
```

**Option 5: Install in current Python:**

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
2. **SDK connects to MCP server** - Gets available tools and prompts
3. **Adapter utility prepares tools** - Uses `prepare_tools_for_provider()` to convert MCP tools/prompts to OpenAI format
4. **OpenAI receives question + available tools** - OpenAI sees all MCP tools (fetch_scripture, fetch_translation_notes, etc.) plus converted prompts
5. **OpenAI decides which tools to call** - OpenAI might call `fetch_scripture` with `reference="John 3:16"` or `prompt_translation-helps-for-passage`
6. **Python SDK executes tool calls** - SDK calls the MCP server at `/api/mcp` which routes to the actual endpoint
7. **Tool results fed back to OpenAI** - OpenAI receives the data and generates a natural language response
8. **User receives final answer** - OpenAI provides a comprehensive answer using the fetched data

### Using Adapter Utilities

This chatbot uses the SDK's **optional adapter utilities** to convert MCP tools and prompts to OpenAI format:

```python
from translation_helps.adapters import prepare_tools_for_provider

# Automatically handles conversion based on provider
openai_tools = prepare_tools_for_provider("openai", tools, prompts)
```

**Note:** The adapters are optional. You could also:

- Use `convert_all_to_openai()` for more control
- Write your own conversion logic
- Use MCP tools/prompts directly if using an MCP-compatible interface

## Code Structure

- `chatbot.py` - Main chatbot implementation
- `requirements.txt` - Python dependencies
- `.env.example` - Environment variable template

## Troubleshooting

### Python Launcher Issues

**Problem:** `py chatbot.py` tries to use Python 3.13 which doesn't exist

**Solution:** Run the launcher fix script:

```bash
python fix_py_launcher.py
```

This creates/updates `py.ini` to set Python 3.11 as the default. After running it, `py chatbot.py` will work without specifying the version.

**Verify it worked:**

```bash
py --version  # Should show Python 3.11.x
py -0         # Should show 3.11 marked with *
```

### Python PATH Issues

**Problem:** `python` command uses Inkscape's Python (no pip, no packages)

**Symptoms:**

- `ModuleNotFoundError: No module named 'translation_helps'`
- `python -m pip` fails or says "No module named pip"
- `python --version` shows Python but packages aren't found

**Solutions:**

1. **Use Python Launcher (Quick Fix):**

   ```bash
   py -3.11 chatbot.py
   ```

2. **Fix PATH (Permanent Fix):**
   See [FIX_PYTHON_PATH.md](FIX_PYTHON_PATH.md) for detailed instructions

3. **Use Helper Script:**
   ```bash
   python run_chatbot.py
   ```

### Other Issues

- **"Module not found: translation_helps"**:
  - Install: `py -3.11 -m pip install translation-helps-mcp-client`
  - Or use: `python install_deps.py`
- **"Client not connected"**: Make sure you've called `await mcp_client.connect()` before using the client

- **"Invalid API key"**: Check that your `OPENAI_API_KEY` is set correctly in the `.env` file

- **"Module not found: openai"**: Run `py -3.11 -m pip install -r requirements.txt` to install dependencies
