# Changelog

All notable changes to the Translation Helps API will be documented in this file.

## [1.3.0] - 2024-12-20

### Added

- **Multi-Translation Scripture Support**: API now returns ALL available Bible translations (ULT, UST, T4T, UEB, etc.) in a new `scriptures` array
- **Dynamic Bible Resource Discovery**: Automatically finds all available Bible translations using the DCS catalog API
- **Clean Text Extraction**: Implemented proper USFM text extraction that removes all markup and alignment data
- **Verse Range Support**: Can now request ranges like "Titus 1:1-3" or entire chapters
- **Enhanced Scripture Response**: Each translation includes both clean text and translation identifier

### Changed

- Scripture fetching now uses the **Ingredients Array Pattern** for reliable resource resolution
- Removed `rawUsfm` field from responses (clean text only)
- Scripture field structure now includes translation identifier
- Book number mapping is no longer hardcoded - uses ingredients array from catalog

### Fixed

- Fixed missing book numbers for Titus and Philemon
- Fixed USFM extraction to properly handle verse ranges and full chapters
- Fixed issues with hardcoded file naming conventions

### Technical Improvements

- Migrated from hardcoded book-to-file mappings to dynamic ingredients-based resolution
- Implemented comprehensive USFM text cleaning utilities
- Added support for emergency text extraction fallbacks
- Improved error handling and logging throughout the scripture pipeline

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
