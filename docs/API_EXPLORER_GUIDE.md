# API Explorer Guide

## Overview

The API Explorer is a visual interface for testing and exploring all v2 endpoints in Translation Helps MCP. It provides an intuitive way to:

- Test endpoints with real-time responses
- Explore available parameters
- View response data and headers
- Generate cURL commands
- Track response times

## Access

Visit `/api-explorer` in your browser when the dev server is running:

```
http://localhost:8174/api-explorer
```

## Features

### 1. Endpoint Navigation

- Endpoints organized by category (Scripture, Translation Helps, Discovery, Utility)
- Click any endpoint to view details
- Active endpoint highlighted in blue

### 2. Parameter Input

- All parameters displayed with descriptions
- Required parameters marked with red asterisk
- Smart defaults for common parameters
- Boolean parameters use checkboxes

### 3. Real-time Testing

- Execute requests directly from the browser
- View response status, headers, and body
- Response time tracking
- Error messages clearly displayed

### 4. cURL Generation

- Automatic cURL command generation
- Copy commands for terminal use
- Perfect for automation and scripting

## Example Workflow

1. **Select Endpoint**: Click "Fetch Scripture" from the sidebar
2. **Set Parameters**:
   - reference: "John 3:16"
   - language: "en"
   - resource: "ult,ust"
3. **Execute**: Click "Execute Request"
4. **View Results**: See the scripture response with metadata
5. **Copy cURL**: Use the generated command in scripts

## UI Design

The Explorer follows modern UI/UX principles:

- Clean, intuitive interface
- Responsive design
- Dark/light theme support
- Accessible color contrasts
- Clear visual hierarchy

## Benefits

1. **For Developers**
   - Quick API testing without external tools
   - Visual parameter documentation
   - Instant feedback on changes

2. **For Bible Translation Teams**
   - Easy access to translation resources
   - No technical knowledge required
   - Visual confirmation of data

3. **For Integration**
   - Generate integration code quickly
   - Test parameter combinations
   - Validate response structures

## Tips

- Use browser DevTools to inspect network requests
- Bookmark frequently used parameter combinations
- Export responses for documentation
- Test error scenarios by providing invalid inputs

## Future Enhancements

- Save favorite requests
- Export to Postman/Insomnia
- Request history
- Response diff comparison
- API key management UI
