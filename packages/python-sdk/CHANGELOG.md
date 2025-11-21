# Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-11-20

### Added

- **Optimized System Prompts** - New `get_system_prompt()` and `detect_request_type()` functions
  - 60-70% token reduction compared to legacy prompts
  - Contextual rules based on request type (comprehensive, list, explanation, term, concept, default)
  - Automatic request type detection from endpoint calls and message patterns
  - Full Python type hints with `RequestType` type
  - Available in `translation_helps.prompts` module
  - See README for usage examples

### Changed

- Updated README with "Optimized System Prompts" section and usage examples

## [1.1.1] - Previous Release

### Fixed

- Bug fixes and stability improvements

## [1.1.0] - Previous Release

### Added

- Adapter utilities for converting MCP tools/prompts to different AI provider formats
- `prepare_tools_for_provider()` - Declarative helper for provider-specific conversion
- `convert_tools_to_openai()` - Convert MCP tools to OpenAI format
- `convert_prompts_to_openai()` - Convert MCP prompts to OpenAI format
- `convert_tools_to_anthropic()` - Convert MCP tools to Anthropic format
- `provider_supports_prompts()` - Check provider capabilities
- `get_prompt_strategy()` - Get conversion strategy
- `detect_prompts_support_from_client()` - Dynamic prompts support detection

## [1.0.0] - Initial Release

### Added

- `TranslationHelpsClient` - Main client class for MCP server interactions
- `fetch_scripture()` - Fetch Bible scripture text
- `fetch_translation_notes()` - Fetch translation notes for passages
- `fetch_translation_questions()` - Fetch comprehension questions
- `fetch_translation_word()` - Fetch translation word articles
- `fetch_translation_word_links()` - Fetch word links for passages
- `fetch_translation_academy()` - Fetch translation academy articles
- `get_languages()` - Get available languages
- `list_tools()` - List available MCP tools
- `list_prompts()` - List available MCP prompts
- `call_tool()` - Call any MCP tool directly
- `get_prompt()` - Get prompt templates
- `check_prompts_support()` - Dynamically check prompts support
- `get_capabilities()` - Get server capabilities
- Context manager support (`async with`)
- Full Python type hints
