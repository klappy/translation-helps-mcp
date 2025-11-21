# Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-20

### Added

- **Optimized System Prompts** - New `getSystemPrompt()` and `detectRequestType()` functions
  - 60-70% token reduction compared to legacy prompts
  - Contextual rules based on request type (comprehensive, list, explanation, term, concept, default)
  - Automatic request type detection from endpoint calls and message patterns
  - Full TypeScript support with exported types (`RequestType`, `EndpointCall`)
  - See README for usage examples

### Changed

- Updated README with "Optimized System Prompts" section and usage examples

## [1.0.0] - Initial Release

### Added

- `TranslationHelpsClient` - Main client class for MCP server interactions
- `fetchScripture()` - Fetch Bible scripture text
- `fetchTranslationNotes()` - Fetch translation notes for passages
- `fetchTranslationQuestions()` - Fetch comprehension questions
- `fetchTranslationWord()` - Fetch translation word articles
- `fetchTranslationWordLinks()` - Fetch word links for passages
- `fetchTranslationAcademy()` - Fetch translation academy articles
- `getLanguages()` - Get available languages
- `listTools()` - List available MCP tools
- `listPrompts()` - List available MCP prompts
- `callTool()` - Call any MCP tool directly
- `getPrompt()` - Get prompt templates
- Full TypeScript definitions
- Browser compatibility (no Node.js dependencies)
- Metrics and debugging support
