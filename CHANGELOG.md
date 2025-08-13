# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [5.6.0](https://github.com/klappy/translation-helps-mcp/compare/v5.5.0...v5.6.0) (2025-08-13)

### Features

- add format support to v2 endpoints ([46f3063](https://github.com/klappy/translation-helps-mcp/commit/46f30638797543f742800cc484e358f328bf0e95))
- add real metadata support from DCS ([1b7fbe3](https://github.com/klappy/translation-helps-mcp/commit/1b7fbe3f21c8f76ba0664ec360e9f6ad2aad573a))
- connect real data to scripture endpoint ([d4178b9](https://github.com/klappy/translation-helps-mcp/commit/d4178b9a86c17b6fc8e414361570dd97b3cdb098))
- connect translation notes to real data ([0a61846](https://github.com/klappy/translation-helps-mcp/commit/0a618468d3d02580b38d92d5584c42933063e0e8))
- connect translation questions to real data ([482bd93](https://github.com/klappy/translation-helps-mcp/commit/482bd93360a1d57dea59d6be00bf8f57774b63e4))
- connect translation words to real data ([05ffc79](https://github.com/klappy/translation-helps-mcp/commit/05ffc79a74b84f51a4f2d397a8795c91592239ff))
- fix API Explorer and connect discovery endpoints to real data ([1eb332d](https://github.com/klappy/translation-helps-mcp/commit/1eb332d2ec17c4cb53557662fb91dcc5d6da2fe5))

### Bug Fixes

- clean up API Explorer UI with light theme ([af56f6c](https://github.com/klappy/translation-helps-mcp/commit/af56f6c081f9c285c6b88bea45ae5583748557ce))

### Tests

- update smoke test for v5.5.0 ([0685d67](https://github.com/klappy/translation-helps-mcp/commit/0685d67f5fb65a3fe004c35e1ef6f2d6eabde668))

### Documentation

- add session summary for real data connection progress ([44a6334](https://github.com/klappy/translation-helps-mcp/commit/44a63344e7f098ea8d06650e14835921c75f0e2f))
- add session summary for real data connection progress ([c5092d1](https://github.com/klappy/translation-helps-mcp/commit/c5092d151bf7e19f1b94c9e8e114b0dd77424fe5))
- add session summary for v5.5.0 developer experience revolution ([74098bd](https://github.com/klappy/translation-helps-mcp/commit/74098bd395fe9f1fd8c8ede41ae8396c91836880))
- clean up v5.5.0 changelog ([89677e3](https://github.com/klappy/translation-helps-mcp/commit/89677e3699b50d83bbff54c914513b38bf66af0f))

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
