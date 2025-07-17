# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-17

### Added

- Complete MCP (Model Context Protocol) tool handlers suite
  - `searchResources.ts` - Search for available Bible translation resources
  - `getLanguages.ts` - Get available languages with resource types
  - `getContext.ts` - Get contextual information for Bible references
  - `extractReferences.ts` - Extract Bible references from text
- New utility services and libraries
  - `logger.ts` - Centralized logging utility
  - `tokenCounter.ts` - Text token estimation for LLM usage
  - `referenceFormatter.ts` - Bible reference citation formatting
  - `referenceParser.ts` - Parse various Bible reference formats
  - `ResourceAggregator.ts` - Service for aggregating Bible translation resources
- Project infrastructure setup with TypeScript, Netlify Functions, and MCP SDK
- Organized directory structure (src/services/, src/utils/, src/types/, src/parsers/, tests/)
- Beautiful web UI for testing API endpoints
- Production deployment on Netlify

### Fixed

- **Critical**: Resolved all TypeScript build errors (27 → 0 errors)
  - Fixed union type assertions in resource aggregator
  - Improved error handling with proper type guards
  - Resolved index signature compatibility issues
  - Added schema defaults for optional parameters
- Fixed CORS configuration for all API endpoints
- Improved error handling across all Netlify Functions

### Changed

- Enhanced package.json with MCP SDK and development dependencies
- Updated .gitignore with TypeScript and build output patterns
- Improved Netlify configuration with proper redirects and headers

### Infrastructure

- TypeScript build system fully functional
- Netlify Functions deployment working
- MCP server architecture implemented
- Complete API testing interface deployed

## [1.0.0] - 2025-01-16

### Added

- Initial project setup with Netlify Functions
- Basic API endpoints structure
- Health check endpoint
- Fetch resources endpoint (initial implementation)
- Get languages endpoint (initial implementation)
- Basic web interface for API testing
