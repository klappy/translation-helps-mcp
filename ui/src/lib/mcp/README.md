# Chat MCP Server

This directory contains the Model Context Protocol (MCP) server implementation for the chat functionality, providing self-discovery and structured tool calling for AI assistants.

## Overview

The Chat MCP Server provides a standardized interface for AI assistants to interact with the Bible translation resources and chat functionality. It follows the MCP specification for tool discovery and execution.

## Available Tools

### 1. `chat_query`

Send a message to the AI Bible assistant and get a contextual response.

**Parameters:**

- `message` (string, required): The user's message or question
- `context` (string, optional): Additional context or Bible references to include
- `language` (string, optional, default: "en"): Language code for responses
- `style` (enum, optional, default: "detailed"): Response style preference ("detailed", "concise", "technical")

**Example:**

```json
{
	"name": "chat_query",
	"arguments": {
		"message": "What does John 3:16 say about God's love?",
		"language": "en",
		"style": "detailed"
	}
}
```

### 2. `bible_lookup`

Look up Bible references and get scripture text, translation notes, and insights.

**Parameters:**

- `reference` (string, required): Bible reference (e.g., "John 3:16")
- `language` (string, optional, default: "en"): Language code
- `organization` (string, optional, default: "unfoldingWord"): Organization
- `resources` (array, optional, default: ["scripture", "notes", "questions", "words"]): Resource types to fetch

**Example:**

```json
{
	"name": "bible_lookup",
	"arguments": {
		"reference": "Titus 1:1",
		"language": "en",
		"organization": "unfoldingWord",
		"resources": ["scripture", "notes"]
	}
}
```

### 3. `word_study`

Perform a word study on a specific term with definitions and usage examples.

**Parameters:**

- `term` (string, required): The word or term to study
- `language` (string, optional, default: "en"): Language code
- `context` (string, optional): Biblical context or reference for the word study

**Example:**

```json
{
	"name": "word_study",
	"arguments": {
		"term": "grace",
		"language": "en",
		"context": "Ephesians 2:8"
	}
}
```

## Integration with AI Assistants

### Claude Desktop Configuration

Add to your Claude Desktop MCP configuration:

```json
{
	"mcpServers": {
		"chat-assistant": {
			"command": "node",
			"args": ["/path/to/chat-server.js"],
			"env": {
				"LANGUAGE": "en",
				"ORGANIZATION": "unfoldingWord"
			}
		}
	}
}
```

### Cursor Configuration

Add to your `.cursor/mcp.json`:

```json
{
	"mcpServers": {
		"chat-assistant": {
			"command": "node",
			"args": ["./src/lib/mcp/chat-server.js"],
			"env": {
				"LANGUAGE": "en",
				"ORGANIZATION": "unfoldingWord"
			}
		}
	}
}
```

## Response Format

All tools return responses in the MCP standard format:

```json
{
	"content": [
		{
			"type": "text",
			"text": "JSON-formatted response data"
		}
	]
}
```

## Benefits of MCP Integration

1. **Self-Discovery**: AI assistants can automatically discover available tools and their parameters
2. **Structured Data**: Responses are consistently formatted and machine-readable
3. **Type Safety**: Parameter validation ensures correct data types
4. **Extensibility**: Easy to add new tools and capabilities
5. **Standardization**: Follows the MCP specification for interoperability

## Future Enhancements

- Integration with real Bible API functions
- Support for streaming responses
- Advanced context management
- Multi-language support
- Custom response formatting options
