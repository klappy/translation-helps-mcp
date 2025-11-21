# Translation Helps MCP Examples

This directory contains example applications demonstrating how to use the Translation Helps MCP SDKs.

## Available Examples

### Python Chatbot (`python-chatbot/`)

A complete chatbot implementation using the Python SDK and OpenAI that answers questions about Bible translation resources.

**Features:**

- Interactive chat interface
- Automatic tool selection by OpenAI
- Support for all MCP tools (scripture, notes, questions, words, academy)
- Error handling and graceful degradation

**Quick Start:**

```bash
cd python-chatbot
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
python chatbot.py
```

See the [python-chatbot README](python-chatbot/README.md) for detailed instructions.

## Contributing

If you create a new example, please:

1. Create a new directory under `examples/`
2. Include a `README.md` with setup instructions
3. Include a `requirements.txt` or equivalent dependency file
4. Test your example before submitting
