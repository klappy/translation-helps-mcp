# translation-helps-mcp-client

Official Python client SDK for the Translation Helps MCP Server.

## Installation

```bash
pip install translation-helps-mcp-client
```

## Quick Start

```python
import asyncio
from translation_helps import TranslationHelpsClient
# Import your AI provider's SDK
# from anthropic import Anthropic

async def main():
    # Create a client instance
    async with TranslationHelpsClient() as mcp_client:
        # Get available tools and prompts
        tools = await mcp_client.list_tools()
        prompts = await mcp_client.list_prompts()

        # Convert to your AI provider's format
        available_tools = [{
            "name": tool["name"],
            "description": tool.get("description"),
            "input_schema": tool.get("inputSchema"),
        } for tool in tools]

        # Note: Prompts provide instructions/templates - refer to your provider's docs for usage

        # Send user query to AI WITH available tools
        # The AI will decide which tools to call!
        # response = await ai_client.messages.create(
        #     model="your-model",
        #     messages=[{"role": "user", "content": "What does John 3:16 say?"}],
        #     tools=available_tools
        # )

        # When AI requests a tool call, execute it via SDK:
        # result = await mcp_client.call_tool(tool_name, tool_args)
        # Feed result back to AI for final response

asyncio.run(main())
```

## Usage with Context Manager

```python
import asyncio
from translation_helps import TranslationHelpsClient

async def main():
    async with TranslationHelpsClient() as client:
        scripture = await client.fetch_scripture({
            "reference": "John 3:16"
        })
        print(scripture)

asyncio.run(main())
```

## API Reference

### `TranslationHelpsClient`

Main client class for interacting with the Translation Helps MCP server.

#### Constructor

```python
TranslationHelpsClient(options: Optional[ClientOptions] = None)
```

**Options:**

- `serverUrl: Optional[str]` - Server URL (default: production server)
- `timeout: Optional[int]` - Request timeout in ms (default: 30000)
- `headers: Optional[Dict[str, str]]` - Custom headers

#### Methods

##### `async connect() -> None`

Initialize connection to the MCP server. Automatically called by convenience methods.

##### `async close() -> None`

Close the HTTP client connection.

##### `async fetch_scripture(options: FetchScriptureOptions) -> str`

Fetch Bible scripture text.

```python
text = await client.fetch_scripture({
    "reference": "John 3:16",
    "language": "en",
    "organization": "unfoldingWord",
    "format": "text",  # or "usfm"
    "includeVerseNumbers": True
})
```

##### `async fetch_translation_notes(options: FetchTranslationNotesOptions) -> Dict`

Fetch translation notes for a passage.

```python
notes = await client.fetch_translation_notes({
    "reference": "John 3:16",
    "language": "en",
    "includeIntro": True,
    "includeContext": True
})
```

##### `async fetch_translation_questions(options: FetchTranslationQuestionsOptions) -> Dict`

Fetch translation questions for a passage.

```python
questions = await client.fetch_translation_questions({
    "reference": "John 3:16",
    "language": "en"
})
```

##### `async fetch_translation_word(options: FetchTranslationWordOptions) -> Dict`

Fetch translation word article by term or reference.

```python
# By term
word = await client.fetch_translation_word({
    "term": "love",
    "language": "en"
})

# By reference (gets words used in passage)
words = await client.fetch_translation_word({
    "reference": "John 3:16",
    "language": "en"
})
```

##### `async fetch_translation_word_links(options: FetchTranslationWordLinksOptions) -> Dict`

Fetch translation word links for a passage.

```python
links = await client.fetch_translation_word_links({
    "reference": "John 3:16",
    "language": "en"
})
```

##### `async fetch_translation_academy(options: FetchTranslationAcademyOptions) -> Any`

Fetch translation academy articles.

```python
articles = await client.fetch_translation_academy({
    "reference": "John 3:16",
    "language": "en",
    "format": "json"  # or "markdown"
})
```

##### `async get_languages(options: Optional[GetLanguagesOptions] = None) -> Dict`

Get available languages and organizations.

```python
languages = await client.get_languages({
    "organization": "unfoldingWord"
})
```

##### `async list_tools() -> List[MCPTool]`

List all available MCP tools.

##### `async list_prompts() -> List[MCPPrompt]`

List all available MCP prompts.

##### `async call_tool(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]`

Call any MCP tool directly.

##### `async get_prompt(name: str, arguments: Optional[Dict[str, Any]] = None) -> Dict[str, Any]`

Get a prompt template.

## Examples

### Basic Usage

```python
import asyncio
from translation_helps import TranslationHelpsClient

async def main():
    client = TranslationHelpsClient()
    await client.connect()

    # Fetch scripture
    scripture = await client.fetch_scripture({
        "reference": "John 3:16"
    })

    # Fetch comprehensive helps
    notes = await client.fetch_translation_notes({
        "reference": "John 3:16"
    })

    questions = await client.fetch_translation_questions({
        "reference": "John 3:16"
    })

    words = await client.fetch_translation_word({
        "reference": "John 3:16"
    })

    await client.close()

asyncio.run(main())
```

### Error Handling

```python
try:
    scripture = await client.fetch_scripture({
        "reference": "John 3:16"
    })
except Exception as e:
    print(f"Failed to fetch scripture: {e}")
```

### Custom Server URL

```python
client = TranslationHelpsClient({
    "serverUrl": "https://your-custom-server.com/api/mcp",
    "timeout": 60000  # 60 seconds
})
```

## License

MIT

## Links

- [Documentation](https://translation-helps-mcp-945.pages.dev)
- [GitHub Repository](https://github.com/unfoldingWord/translation-helps-mcp)
- [MCP Protocol](https://modelcontextprotocol.io)
