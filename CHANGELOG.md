# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [6.1.0](https://github.com/klappy/translation-helps-mcp/compare/v6.0.0...v6.1.0) (2025-08-13)

### ⚠ BREAKING CHANGES

- /api/chat moved to /api/experimental/query-router

* Create /api/chat-stream endpoint using OpenAI GPT-4o-mini
* Implement self-discoverable endpoint selection via /api/mcp-config
* Let LLM intelligently choose which endpoints to call
* Let LLM select optimal response format (md/text/json)
* Enforce strict content rules (no paraphrasing, citations required)
* Move pattern-matching chat to /api/experimental/query-router
* Add comprehensive documentation (AI_CHAT_RULES.md, AI_CHAT_ARCHITECTURE.md)
* Create tests to prevent regressions
* Document streaming as future enhancement
* Support OPENAI_API_KEY configuration

### Features

- Add chat showcase endpoint and metadata consistency ([77f83ce](https://github.com/klappy/translation-helps-mcp/commit/77f83ce253922f6b439f821309d37bca975b1055))
- Add translation attribution to scripture quotes ([4d53aa2](https://github.com/klappy/translation-helps-mcp/commit/4d53aa265118e2ddd811423effcc6b568f6cdfcd))
- Implement AI-powered chat with OpenAI GPT-4o-mini ([a5bdcb1](https://github.com/klappy/translation-helps-mcp/commit/a5bdcb1743c8568d6ed6e86e39d9f469de3aebd3))
- implement verse range support for translation notes and questions ([5aed14d](https://github.com/klappy/translation-helps-mcp/commit/5aed14dcb4142e4485ae5df5f2e62fffc99cdb78))

### Bug Fixes

- Wire up ChatInterface to use new AI-powered chat-stream endpoint ([3c382bb](https://github.com/klappy/translation-helps-mcp/commit/3c382bb7c64c0510422901568c056cd05553c331))

### Documentation

- Add chat purpose analysis diagrams ([9235b13](https://github.com/klappy/translation-helps-mcp/commit/9235b13e7d3312c3dc6e6402e5689692c7488f1d))
- Add v6.0.0 release notes to changelog ([a6be206](https://github.com/klappy/translation-helps-mcp/commit/a6be2066d635b69f17009d00217cbab623add1d6))
- Add V6.0.0 release summary ([7a06b71](https://github.com/klappy/translation-helps-mcp/commit/7a06b71aa284559a8c24588aa6dd05b7a47799f6))

## [6.0.0](https://github.com/klappy/translation-helps-mcp/compare/v5.7.0...v6.0.0) (2025-01-10)

### 🚨 BREAKING CHANGES

This major release completes the V2 API migration by replacing all V1 endpoints with their V2 implementations. While endpoint paths remain the same, response formats and behavior have changed significantly.

### What's Changed

#### Complete V2 Replacement

- **Direct Migration** - V2 endpoints moved to root `/api/` path, replacing V1
- **No Deprecation Period** - Clean cut-over with no parallel V1/V2 operation
- **Self-Discoverable** - API is now fully self-documenting via `/api/mcp-config`

#### Enhanced Features

- **X-Ray Tracing** - Detailed performance visibility via response headers
  - `X-Cache-Status`: Shows hit/miss/partial for cache performance
  - `X-XRay-Trace`: Base64 encoded full trace data
  - `X-Trace-Id`, `X-Trace-Service`, `X-Trace-API-Calls`, etc.
- **Real Data Only** - All mock data removed, 100% real Bible translation data
- **Cleaner Responses** - Simplified JSON structure, removed redundancy
- **Better Errors** - Detailed error responses with context and traces

#### Response Format Changes

- Scripture responses no longer have redundant `citation` object
- Removed duplicate fields between top-level and metadata
- Fixed `foundResources` to show actual resources instead of nulls
- Simplified scripture items to just `text` and `translation`

### Migration Guide

Since the API is self-discoverable, migration is straightforward:

1. Fetch `/api/mcp-config` to discover all endpoints
2. Update to use new response formats (see examples in API docs)
3. Leverage X-ray tracing headers for debugging
4. Remove any V1-specific workarounds

### Full Endpoint List

See `/api/mcp-config` for the complete, up-to-date endpoint registry with parameters and examples.

## [5.7.0](https://github.com/klappy/translation-helps-mcp/compare/v5.6.0...v5.7.0) (2025-09-17)

### 🚀 ZIP-Based Architecture Revolution

This release introduces a revolutionary ZIP-based data architecture that dramatically improves performance and reliability while adding powerful new features for debugging and monitoring.

### What's New

#### ZIP-Based Data Flow

- **90% Fewer API Calls** - Download entire resource repositories as ZIPs
- **Edge-Compatible** - New `edgeZipFetcher` works in Cloudflare Workers
- **Efficient Caching** - Cache ZIPs and extracted files in Cloudflare KV
- **Offline-Ready** - Once cached, resources work without internet

#### X-Ray Tracing System

- **Complete Visibility** - Track every API call, cache hit/miss, and timing
- **Response Headers** - Performance data exposed via X-headers
- **Visual UI** - New XRayTraceView component shows trace timeline
- **Debug-Friendly** - Identify bottlenecks and cache effectiveness

#### Format Support Enhancement

- **Automated Addition** - All v2 endpoints now support formats consistently
- **Smart Formatting** - ResponseFormatter handles real DCS data structures
- **LLM-Optimized** - Output formatted for AI consumption

#### Real Data Integration

- **No More Mocks** - 100% real Bible translation data from DCS
- **Dynamic Discovery** - Use catalog ingredients for resource lookup
- **Proper Metadata** - Real licenses, copyright, contributors from source

### Technical Improvements

- Consistent parameter usage across all endpoints
- Enhanced error responses with detailed context
- Proper User-Agent with version tracking
- Feature parity between mcp-tools and api-explorer
- Visual regression testing with Playwright

### Performance Impact

- Initial requests: ~2-3s (downloading ZIPs)
- Subsequent requests: <50ms (cache hits)
- Dramatically reduced DCS API load
- Better reliability during DCS outages

## [5.6.0](https://github.com/klappy/translation-helps-mcp/compare/v5.5.0...v5.6.0) (2025-08-13)

### 🎯 Real Data Integration

This release connects all major v2 endpoints to real Bible translation data from Door43 Content Service (DCS), eliminating mock data and providing actual translation resources.

### What's New

#### Real Data Connection

- **Scripture Endpoints** - Fetch actual USFM scripture from DCS repositories
- **Translation Notes** - Parse real TSV files with translation notes
- **Translation Questions** - Access actual comprehension questions for passages
- **Translation Words** - Retrieve word definitions from Markdown files
- **Language Discovery** - Dynamic language list from DCS catalog
- **Book Discovery** - Real-time available books per language/resource

#### Enhanced Response Formats

- **Multiple Formats** - All v2 endpoints now support `?format=json|md|text`
- **Markdown Output** - Beautiful formatted output for LLM consumption
- **Plain Text** - Simple, clean format for basic text processing
- **Consistent Structure** - Same data across all formats

#### Real Metadata Support

- **Actual Licenses** - Real license information from DCS (CC BY-SA 4.0, etc.)
- **Copyright Info** - Proper copyright attribution from source
- **Contributors** - Lists of actual contributors to resources
- **Publisher Details** - Real publisher information (unfoldingWord, etc.)
- **Version Tracking** - Actual resource versions from repositories

### Developer Experience

- **API Explorer UI Fix** - Clean, light theme with proper styling
- **Fallback Mechanism** - Graceful degradation to mock data when DCS is unavailable
- **Edge Runtime** - All fetchers are edge-compatible for serverless deployment

### Technical Details

- Enhanced data fetchers with real DCS integration
- USFM, TSV, and Markdown parsing for different resource types
- Centralized response formatting utility
- Real metadata extraction from DCS catalog and repositories

## [5.5.0](https://github.com/klappy/translation-helps-mcp/compare/v5.4.0...v5.5.0) (2025-08-12)

### 🚀 Developer Experience Revolution

This release transforms the developer experience with powerful new tools and a simplified testing philosophy.

### What's New

#### API Explorer

- **Visual API Testing** - Interactive web interface at `/api-explorer`
- **Real-time Testing** - Execute requests and see responses instantly
- **cURL Generation** - Copy commands for automation
- **Parameter Documentation** - Visual guide for all endpoint parameters

#### Endpoint Generator

- **Instant Endpoint Creation** - Run `npm run create-endpoint`
- **Pattern Enforcement** - Automatically follows established patterns
- **Test Generation** - Creates matching test files
- **Interactive CLI** - Guided endpoint configuration

#### Test Suite Revolution (80/20 Rule)

- **70% Test Reduction** - Archived complex, over-engineered tests
- **Simple Test Structure** - Focus on what matters to users
- **Fast Execution** - All tests run in < 30 seconds
- **Clear Organization** - unit/, integration/, contracts/

### Developer Improvements

- **API Explorer Guide** - Complete documentation for visual testing
- **Simplified Test Patterns** - Examples that are easy to follow
- **Clean Documentation** - Removed outdated and confusing guides
- **Better Smoke Tests** - Updated for new response structures

### Philosophy

Following the 80/20 rule: Test the 20% of scenarios that cover 80% of real usage.
No edge cases, no over-engineering, just practical tests that ensure our API works.

## [5.4.0](https://github.com/klappy/translation-helps-mcp/compare/v5.3.0...v5.4.0) (2025-08-12)

### 🎉 100% API Consistency Achieved!

This release marks a major milestone: **all 23 API endpoints have been migrated to a consistent, simple architecture**.

### What's New

#### Complete API Consistency

- **100% of endpoints** now follow the same simple pattern
- **75% less code** - from complex abstractions to direct implementations
- **Unified error handling** - consistent error responses across all endpoints
- **Standardized responses** - predictable data shapes everywhere

#### New Architecture Components

- **Simple Endpoint Wrapper** - Reduces boilerplate by 90%
- **Circuit Breaker Pattern** - Prevents cascading failures
- **Response Validator** - Ensures clean response data
- **Cache Validator** - Prevents bad data from being cached
- **Contract Tests** - Locks in API behavior to prevent regressions

#### Developer Experience Improvements

- **Clear documentation** - Consolidated architecture and API guides
- **Endpoint generator** - Create new endpoints in minutes
- **Performance benchmarks** - Prove the benefits of simplicity

### Bug Fixes

- Fixed X-ray trace data leaking into response bodies
- Improved cache stability with force-refresh support
- Enhanced pre-commit hooks for cleaner commits
- Resolved metadata contamination in UI tools

### Documentation

- New consolidated `ARCHITECTURE.md` guide
- Complete `API_ENDPOINTS.md` reference
- Victory lap celebrating 100% consistency
- Roadmap for next phase improvements

### Migration Note

All v1 endpoints remain functional. The v2 endpoints provide the same functionality with better consistency, performance, and developer experience.

## [5.3.0] - 2025-08-12

### Added

- **User-Agent Headers**: All API calls now include a descriptive User-Agent header to identify our application to the DCS team
- **Semi-Automated Releases**: Integrated `standard-version` for consistent versioning and changelog management
- **Release Guide**: Added comprehensive documentation for the release process

### Fixed

- Multiple TypeScript linting errors across the codebase
- Edge runtime compatibility issues in chat endpoints
- Empty catch blocks in health endpoint

### Changed

- Improved code quality with proper TypeScript types replacing `any`
- Updated ESLint configuration to handle underscore-prefixed parameters

## [5.2.0] - 2025-08-11

### Added

- **ZIP-based Resource Caching**: Dramatically improved performance by caching entire resource repositories as ZIP files
  - Reduces API calls by ~90%
  - Enables offline functionality after initial download
  - Integrated with Cloudflare KV for persistent storage
- **Chaos Engineering Test Suite**: Comprehensive tests for network failures, cache corruption, and edge cases
- **Performance Monitoring**: X-Ray tracing for detailed performance insights
- **Load Testing Infrastructure**: K6-based load testing for baseline, peak, stress, and spike scenarios

### Fixed

- Scripture verse range formatting and alignment
- Translation notes and questions markdown rendering
- Cache invalidation issues that were causing stale data

### Changed

- Migrated from response caching to file-level caching only
- Improved error handling and resilience across all endpoints
- Enhanced health check system with categorized monitoring

## [5.1.0] - 2025-08-01

### Added

- **Dynamic Architecture**: New zero-configuration data pipeline that adapts to API changes automatically
- **MCP (Model Context Protocol) Integration**: Full support for AI assistants and LLM tools
- **Resource Recommendations**: Smart suggestions for related translation resources
- **Language Coverage API**: Comprehensive language support analysis

### Fixed

- Cloudflare Workers compatibility issues
- Version management across different environments
- API response format inconsistencies

### Changed

- Complete refactor to anti-fragile architecture
- Improved terminology compliance to use Strategic Language throughout
- Enhanced API documentation with interactive examples

## [5.0.0] - 2025-07-15

### ⚠ BREAKING CHANGES

- New endpoint structure with consistent naming conventions
- Response format standardization across all endpoints
- Removed deprecated endpoints

### Added

- **Three-tier endpoint system**: Core, Extended, and Experimental categories
- **Unified response format**: Consistent structure across all API responses
- **Interactive API documentation**: Live testing interface at `/mcp-tools`
- **Chat interface**: AI-powered Bible translation assistant at `/chat`

### Fixed

- Major performance bottlenecks in scripture fetching
- Memory leaks in cache management
- Cross-origin resource sharing (CORS) issues

### Changed

- Migrated to Cloudflare Pages for improved performance
- Restructured codebase for better maintainability
- Updated all dependencies to latest stable versions

## [4.4.0] - 2025-07-21

### Fixed

- Critical JavaScript runtime errors in browser environment
- Node.js module imports that were breaking client-side functionality

### Added

- Categorized health monitoring system
- Live health status integration in UI navigation

## [4.3.0] - 2025-07-01

### Added

- Initial public release
- Core Bible translation resource APIs
- Basic caching system
- Health monitoring endpoints

---

For a complete list of all changes and commits, see the [GitHub releases page](https://github.com/klappy/translation-helps-mcp/releases).
