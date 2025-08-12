# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [5.4.0](https://github.com/klappy/translation-helps-mcp/compare/v5.3.0...v5.4.0) (2025-08-12)

### Features

- add cache validator middleware for data integrity ([0d7b5b6](https://github.com/klappy/translation-helps-mcp/commit/0d7b5b6866639d16342f33454e3c346804fbba90))
- add circuit breaker and migrate resource-catalog endpoint ([11b0e40](https://github.com/klappy/translation-helps-mcp/commit/11b0e40d4f72d2773373ec4dfafdd5d9e6208d46))
- add consistency utilities and migrate two translation endpoints ([b2f2ed6](https://github.com/klappy/translation-helps-mcp/commit/b2f2ed614a089435438e339d49cc230967e88413))
- add contract tests for fetch-scripture golden reference ([f259b1e](https://github.com/klappy/translation-helps-mcp/commit/f259b1e901c7710bd378abf24b389a687dc66d7f))
- add data fetchers and migrate two more endpoints ([d98bd8e](https://github.com/klappy/translation-helps-mcp/commit/d98bd8ee2d3a07c034c0c08c23d37f1328dd4326))
- add endpoint benchmark and prove pattern benefits ([99a8147](https://github.com/klappy/translation-helps-mcp/commit/99a8147ce1c7009fefd8f7b95bbc4c448c7c4eeb))
- add response validator middleware for API safety ([61831dd](https://github.com/klappy/translation-helps-mcp/commit/61831dd415e2489583262eca54cf0f5f8ee585a0))
- add translation word links endpoint ([83079d2](https://github.com/klappy/translation-helps-mcp/commit/83079d2c3ae8a66c6d364b9e91bb9475269bf5c6))
- complete 100 percent endpoint migration - MISSION ACCOMPLISHED ([e6d8fb8](https://github.com/klappy/translation-helps-mcp/commit/e6d8fb82769f33df6b1ed0259995e89922ac8b31))
- complete 87 percent of endpoint migrations ([c2381ca](https://github.com/klappy/translation-helps-mcp/commit/c2381ca49c43d95b4f8f2f99a73621dfc613fe6e))
- implement response sanitizer and fix X-ray contamination ([b092a8c](https://github.com/klappy/translation-helps-mcp/commit/b092a8c0996455d758e87a3f38762f73e7fdd731))
- migrate health-dcs endpoint and enhance simple pattern ([43225b5](https://github.com/klappy/translation-helps-mcp/commit/43225b574b6d6faddb7251435bcf31fc44a87ac9))
- migrate languages endpoint to simple pattern ([78cda5c](https://github.com/klappy/translation-helps-mcp/commit/78cda5c9544b61af79acd596b70b0a4997fab629))
- migrate three more diverse endpoints ([131a998](https://github.com/klappy/translation-helps-mcp/commit/131a998efd11ae7f2ab07068456b58557649fd23))
- migrate three more translation word endpoints ([12cc3d0](https://github.com/klappy/translation-helps-mcp/commit/12cc3d002b60f716531f60a6276627fd6691fffe))
- migrate translation words and academy endpoints ([7c9dbcb](https://github.com/klappy/translation-helps-mcp/commit/7c9dbcb6f00581e0976b561f6f7d98d2a7268f5e))
- proof of concept for simple architecture ([dd3f435](https://github.com/klappy/translation-helps-mcp/commit/dd3f435074d3ca69f64d0aa62abb4c4c2dc798d4))
- simple endpoint wrapper and health endpoint migration ([88356a6](https://github.com/klappy/translation-helps-mcp/commit/88356a6bd94f7a11bc4ef66cb5e7128ed3cf8f0a))

### Bug Fixes

- add X-Force-Refresh support to ZipResourceFetcher2 catalog fetch ([8314113](https://github.com/klappy/translation-helps-mcp/commit/83141130224d052ab1485bad5ccc339753d97012))
- initialize KV cache for all endpoints to prevent cache misses ([bb58267](https://github.com/klappy/translation-helps-mcp/commit/bb58267d9352db90016cf24b51601610dbf48bdb))
- move prettier to pre-commit to prevent dirty files after push ([1204d1d](https://github.com/klappy/translation-helps-mcp/commit/1204d1dede77945cb9fccef796028c3708f5124d))
- prevent mcp-tools page from polluting API response data ([3031f71](https://github.com/klappy/translation-helps-mcp/commit/3031f71a5120bc522ccb72723f1e6ecf104eeea0))
- remove metadata from response bodies and add contract tests ([cdf3287](https://github.com/klappy/translation-helps-mcp/commit/cdf32877af3812ff996ab930c69f407bc0734782))
- surgical fixes for scripture endpoint stability ([d617bf9](https://github.com/klappy/translation-helps-mcp/commit/d617bf9dababdcbeb1683d557ecac4f10fef052a))
- sync static changelog for website deployment ([be82d49](https://github.com/klappy/translation-helps-mcp/commit/be82d49685e8846f436189b4ea45a097182f2871))
- update contract tests and ensure consistency ([d7b34cc](https://github.com/klappy/translation-helps-mcp/commit/d7b34cc25b74f27b5ec693a4b767e3febb6e4e44))

### Chores

- add standard-version for semi-automated releases ([b7be6e5](https://github.com/klappy/translation-helps-mcp/commit/b7be6e507421da0a25b5d54e8e97bf3082116f15))

### Documentation

- add architecture roadmap and next steps for simplification ([c24741b](https://github.com/klappy/translation-helps-mcp/commit/c24741b28dd19de24c5dcc5d04adbab42a4078d7))
- add comprehensive consistency progress summary ([c457556](https://github.com/klappy/translation-helps-mcp/commit/c457556b6ee330f74221c9650cc656ef57ceabc9))
- add comprehensive endpoint migration guide ([c055ea8](https://github.com/klappy/translation-helps-mcp/commit/c055ea8f554890645edd162ad90c5d5c17779dad))
- add roadmap for next phase after 100 percent completion ([d567b6f](https://github.com/klappy/translation-helps-mcp/commit/d567b6f67764c54fc83a340d875f5e473be0a1a2))
- add victory lap documentation for 100 percent completion ([9aa0f99](https://github.com/klappy/translation-helps-mcp/commit/9aa0f990b3fb6876106f7be2f6e10fdc49b1ff37))
- create concise user-friendly changelog ([872fc5e](https://github.com/klappy/translation-helps-mcp/commit/872fc5ec11277d459f19373c4a0ce6047cf5876c))
- update consistency progress summary ([0ca9259](https://github.com/klappy/translation-helps-mcp/commit/0ca925933df7121eeb365df55ef441c1e1d1946e))

### Tests

- add contract test foundation for v2 endpoints ([fe79eb1](https://github.com/klappy/translation-helps-mcp/commit/fe79eb1d2c9b8321e33eb14b3def298be65abb6f))

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
