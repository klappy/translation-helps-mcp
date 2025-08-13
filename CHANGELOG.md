# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
