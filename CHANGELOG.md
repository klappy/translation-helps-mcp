# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UI 3.7.0] - 2025-01-20

### 🐛 Bug Fixes

- **Page Refresh Support**: Fixed all pages to work correctly on browser refresh
  - Updated route file generation script to fetch actual server-rendered content instead of copying homepage
  - Added automatic post-build script to create proper HTML files for all routes
  - Fixed `/rag-manifesto`, `/mcp-tools`, `/performance`, `/api`, `/chat`, and `/test` pages to load correctly on direct navigation
  - Added Playwright test verification for page refresh functionality
  - Configured preview server reuse for testing

### 🏗️ Improvements

- **Build Process**: Enhanced build process to automatically generate refreshable route files
- **Navigation**: Renamed "API vs RAG" to "RAG Manifesto" for better clarity and branding
- **Testing**: Added end-to-end testing for page refresh scenarios

## [4.0.0] - 2025-01-20

### 🏗️ **MAJOR ARCHITECTURAL REFACTORING** - Unified Service Architecture

**BREAKING CHANGES:**

- **API Response Format Changes**: Scripture endpoints now return improved object structure instead of legacy array format
- **Version Consistency**: All endpoints now report consistent version from package.json (no more fallbacks)

### ✨ New Features

- **Unified Shared Services**: Complete refactoring to extract and unify core logic into shared services
  - `scripture-service.ts` - Unified scripture fetching and USFM parsing
  - `translation-notes-service.ts` - Consolidated translation notes processing
  - `translation-questions-service.ts` - Unified question extraction and parsing
  - `translation-words-service.ts` - Centralized word definitions and links
  - `languages-service.ts` - Consistent language catalog management
  - `resources-service.ts` - Unified multi-resource aggregation
  - `references-service.ts` - Shared Bible reference extraction
  - `word-links-service.ts` - Translation word link processing
  - `browse-words-service.ts` - Word browsing and search functionality

### 🚀 Performance Improvements

- **Lightning-Fast Cache Performance**: 1-2ms response times for cached data
- **Memory Cache Optimization**: Transformed response caching for instant retrieval
- **Consistent Cache Keys**: Unified cache key generation across all services

### 🔧 Technical Improvements

- **Single Source of Truth**: All Netlify functions and MCP tools now use identical shared services
- **Consistent Error Handling**: Unified error responses and logging across all endpoints
- **Maintainability**: Core logic changes now automatically propagate to all consumers
- **Version Management**: Automatic version synchronization from package.json

### 🧪 Testing

- **Regression Test Fixes**: Updated all tests to match improved v4.0.0 API structure
- **API Compatibility**: Verified consistent behavior between Netlify functions and MCP tools

### 📚 Architecture Benefits

- **100% Code Reuse**: Eliminated duplicate implementations between endpoints
- **Future-Proof**: New features automatically benefit all consumers
- **Developer Experience**: Single location to update core functionality
- **Production Ready**: Robust error handling and caching strategies

## [3.6.0] - 2025-01-22

### ⚡ Performance Improvements

- **USFM Parsing Optimizations**: Major performance improvements for verse ranges and chapter ranges
  - **Verse Range Optimization**: Eliminated redundant chapter parsing for multi-verse requests
    - 2 verses: 50% fewer operations
    - 10 verses (e.g., Matthew 5:3-12): 90% fewer operations
    - 50 verses (long passages): 98% fewer operations
  - **Chapter Range Optimization**: New `extractChapterRange()` function for efficient multi-chapter extraction
    - 3 chapters: 67% fewer USFM processing operations
    - 10 chapters: 90% fewer USFM processing operations
  - **Algorithmic Improvements**: Smart caching of chapter parsing eliminates redundant work
    - Verse ranges now find chapter once vs N times (N = verse count)
    - Chapter ranges now split USFM once vs N times (N = chapter count)
  - **Real-World Impact**: Faster API responses, reduced CPU usage, improved mobile performance

### 🧪 Testing

- **Comprehensive Scripture Test Suite**: Added 51 tests covering all scripture fetching scenarios
  - Single verses, verse ranges, full chapters, chapter ranges
  - Book abbreviations (Jn, Gen, Mt, etc.)
  - Old Testament and New Testament with smart fallback logic
  - Edge cases, error handling, performance validation
  - USFM parsing validation to ensure clean text extraction
- **Multi-Organization Support**: Tests validate fallback between translation organizations
  - Primary: unfoldingWord (New Testament)
  - Fallback: Door43, STR, WA, translate (Old Testament coverage)

## [3.5.1] - 2025-01-20

### 🔧 Fixed

- **Netlify Blobs Production Support**: Fixed Netlify Blobs not working in production environment
  - Added manual blob store configuration with API credentials (`NETLIFY_SITE_ID`, `NETLIFY_API_TOKEN`)
  - Added proper local development detection to gracefully fallback to in-memory cache
  - Improved cache initialization logging with environment detection
  - Confirmed working: Cache hits now persist across function invocations in production
  - Performance improvement: ~40% faster response times on cache hits (1297ms → 780ms)

### 📚 Documentation

- **Added Netlify Blobs Setup Guide**: Complete documentation for production blob configuration
- **Updated README**: Added reference to blob setup guide with accurate status

## [3.5.0] - 2025-01-20

### 🚀 Enhanced Caching System Release

This release introduces a comprehensive multi-level caching system with Netlify Blobs support, version-aware cache keys, and production-ready performance optimizations.

#### ✨ Added

- **Enhanced Cache Manager**: Complete rewrite of caching system with app version-aware keys
  - **Version-Aware Keys**: Automatic cache invalidation on deployments (`v3.5.0:cache-key`)
  - **Netlify Blobs Support**: Persistent storage with graceful memory fallback
  - **24-Hour Safety Cap**: Maximum TTL protection while preserving original cache times
  - **Multi-Level Caching**: Function-level, CDN, and browser cache coordination
- **Smart Cache Helpers**: Utility functions for consistent caching across endpoints
  - **`withConservativeCache()`**: All-in-one caching wrapper with proper headers
  - **`buildDCSCacheKey()`**: Standardized cache key generation for DCS resources
  - **`buildTransformedCacheKey()`**: Deterministic keys for processed responses
- **Cache Bypass System**: Debug-friendly cache override functionality
  - **Header Support**: `X-Bypass-Cache: true` for fresh data requests
  - **Query Parameter**: `?bypass=true` alternative method
  - **Proper Headers**: `no-cache, no-store, must-revalidate` responses
- **Enhanced HTTP Headers**: Production-ready cache control headers
  - **Cache Status**: `X-Cache-Status` (HIT/MISS/BYPASSED/ERROR)
  - **Cache Type**: `X-Cache-Type` (netlify-blobs/memory/error)
  - **Version Info**: `X-Cache-Version` for cache debugging
  - **Expiration**: `X-Cache-Expires` for cache lifecycle tracking

#### 🔧 Technical Improvements

- **Cache TTL Optimization**: Preserved original cache times with safety enhancements
  - **Organizations**: 1 hour (maintained)
  - **Languages**: 1 hour (maintained)
  - **Resources**: 5 minutes (maintained)
  - **File Content**: 10 minutes (maintained)
  - **Metadata**: 30 minutes (maintained)
  - **Transformed Responses**: 10 minutes (new type)
- **Production Compatibility**: Fixed Request object construction for Netlify runtime
- **Memory Management**: Improved cache cleanup and orphan key prevention
- **Error Handling**: Graceful degradation when Netlify Blobs unavailable

#### 📚 Documentation

- **Implementation Guide**: Comprehensive caching strategy documentation
- **Migration Checklist**: Step-by-step guide for applying pattern to new endpoints
- **Production Testing**: Verified multi-level caching in live environment
- **Cache Headers Reference**: Complete header documentation and examples

#### 🎯 Performance Impact

- **CDN Integration**: Verified Netlify Edge CDN caching (`cache-status: hit`)
- **Browser Optimization**: Proper `Cache-Control: public, max-age=3600` headers
- **Function Efficiency**: Memory cache reduces API calls by up to 100% within TTL
- **Debug Performance**: Cache bypass maintains ~285ms fresh fetch capability

## [3.4.0] - 2025-01-17

### 🧪 Major Testing Infrastructure Release

This release introduces a comprehensive testing suite to prevent regressions and ensure API endpoint parity.

#### ✨ Added

- **Exhaustive Testing Suite**: Complete test coverage for all API and MCP endpoints
  - **Smoke Tests**: Quick health checks for core functionality
  - **Parity Tests**: Comprehensive endpoint comparison between API and MCP wrappers
  - **Regression Tests**: Targeted tests for previously fixed bugs
  - **Performance Tests**: Response time validation
  - **Error Handling Tests**: Robust error scenario coverage
- **Automated Test Runner**: Node.js ES module script for sequential test execution
- **Test Documentation**: Comprehensive README for test suite usage
- **Package.json Integration**: New test scripts for easy execution
- **Response Normalization**: JSON comparison utilities for accurate test validation

#### 🔧 Technical Improvements

- **MCP Wrapper Refactoring**: Eliminated code duplication by calling existing API functions directly
- **Enhanced Error Handling**: Improved error responses and validation
- **Test Infrastructure**: Vitest-based testing framework with environment configuration
- **CI/CD Ready**: Test suite designed for automated deployment pipelines

#### 📚 Testing Coverage

- Scripture fetching (single and multiple translations)
- Translation notes and questions
- Translation words and word links
- Resource browsing and aggregation
- Language discovery
- Reference extraction
- Error scenarios and edge cases

#### 🛡️ Regression Prevention

Tests now catch and prevent:

- Double JSON wrapping
- Missing scripture data
- Hardcoded file paths
- Fake citations
- Empty resource responses
- Book code mapping errors
- Response format mismatches

## [3.3.1] - 2025-01-16

### 🤖 AI Model Migration: Browser LLM → OpenAI GPT-4o-mini

This release migrates from browser-based AI models to OpenAI's GPT-4o-mini for improved performance, reliability, and cost-effectiveness.

#### ✨ Added

- **OpenAI GPT-4o-mini Integration**: Replaced browser-based AI with OpenAI's optimized model
- **Enhanced User Experience**: Clearer messaging about AI capabilities and limitations
- **Production-Ready AI**: Reliable, consistent AI responses with better reasoning capabilities
- **Cost-Optimized Solution**: Balanced performance and cost for production use cases

#### 🔧 Changed

- **AI Model Architecture**: Migrated from browser LLM to OpenAI API integration
- **User Interface Messaging**: Updated all references to reflect OpenAI GPT-4o-mini usage
- **Error Handling**: Improved fallback mechanisms and user feedback
- **Development Mode**: Enhanced mock responses for development and testing
- **Environment Configuration**: OpenAI API key configured in Netlify environment variables

#### 🐛 Fixed

- **AI Response Reliability**: Eliminated browser-based AI limitations and inconsistencies
- **User Expectations**: Clear communication about AI model capabilities
- **Development Workflow**: Improved mock response system for testing
- **Production Deployment**: Proper environment variable configuration

#### 📚 Documentation

- **Updated User Interface**: Clear messaging about OpenAI GPT-4o-mini usage
- **Model Information**: Transparent communication about AI capabilities and limitations
- **Deployment Guide**: Updated with OpenAI API key configuration instructions

#### 🏗️ Technical Improvements

- **Removed Browser LLM Dependencies**: Cleaned up all browser-based AI references
- **OpenAI API Integration**: Proper API key management and error handling
- **Environment Variable Management**: Secure configuration via Netlify CLI
- **Production Deployment**: Streamlined deployment process with proper configuration

## [3.1.0] - 2025-01-XX

### 🧠 LLM-First AI Response Architecture

This release introduces a fundamental shift in how the AI processes and responds to user queries, moving from brittle regex-based parsing to a more intelligent, LLM-driven approach.

#### ✨ Added

- **LLM-First Response Generation**: AI now processes raw context data directly, leveraging natural language understanding
- **Simplified BrowserLLM Service**: Removed complex regex parsing in favor of intelligent LLM processing
- **Enhanced Context Prompting**: Improved prompt engineering for better AI responses
- **Robust Development Setup**: Fixed TypeScript configuration and build process issues

#### 🔧 Changed

- **AI Response Architecture**: Replaced brittle regex parsing with LLM-native content processing
- **BrowserLLM Service**: Simplified from complex parsing methods to direct LLM interaction
- **Development Workflow**: Improved build process and cache management
- **Code Organization**: Removed unnecessary parsing utilities in favor of LLM intelligence

#### 🐛 Fixed

- **Development Setup Fragility**: Resolved TypeScript configuration issues after cache clearing
- **Browser Caching Issues**: Fixed persistent old code loading due to aggressive caching
- **Build Process**: Proper SvelteKit build configuration and TypeScript compilation
- **AI Response Formatting**: Translation word data now displays properly without manual parsing

#### 📚 Documentation

- **Updated Architecture**: Documentation reflects new LLM-first approach
- **Development Setup**: Improved instructions for local development
- **AI Response System**: Clear explanation of new simplified architecture

#### 🏗️ Technical Improvements

- **Removed Brittle Code**: Eliminated complex regex patterns and manual parsing
- **Enhanced LLM Integration**: Better prompt engineering for context-aware responses
- **Improved Build Process**: Fixed TypeScript configuration and SvelteKit build issues
- **Cache Management**: Proper development cache clearing and build process

## [3.0.0] - 2025-01-XX

### ⚠️ BREAKING CHANGES

This release introduces significant changes to the Translation Words API that are not backwards compatible.

#### Breaking API Changes

- **Translation Words Response Structure**: The `fetch-translation-words` endpoint now returns additional fields by default:
  - `title`: Article title (defaults to `true`)
  - `subtitle`: Article subtitle (defaults to `true`)
  - `content`: Full article content (defaults to `true`)
  - Previous API consumers expecting only `term` and `definition` fields will need to update their code

#### Migration Guide

If you need the previous behavior, explicitly set the new parameters to `false`:

```
GET /.netlify/functions/fetch-translation-words?word=grace&includeTitle=false&includeSubtitle=false&includeContent=false
```

### ✨ Added

- **Word Lookup by Term**: New capability to search for specific biblical terms directly (e.g., "grace", "faith", "love")
- **Enhanced MCP Tools**:
  - `browseTranslationWords`: Browse available translation word articles
  - `getTranslationWord`: Get specific word definitions with enhanced content
  - `getWordsForReference`: Find all translation words in a Bible reference
- **MCP Tools UI Page**: New `/mcp-tools` page demonstrating all available MCP tools
- **Section Control Parameters**: Control which parts of translation word articles are returned
- **E2E Tests**: Added comprehensive tests for word lookup functionality

### 🔧 Changed

- **Translation Words API Enhancement**: Extended to support both reference-based and term-based lookups
- **Response Structure**: Translation word responses now include richer content with title, subtitle, and full content
- **API Documentation**: Updated to reflect new capabilities and parameters

### 📚 Documentation

- Added `docs/WORD_LOOKUP_FEATURE.md` with comprehensive API documentation
- Updated README with new features and breaking change warnings
- Enhanced MCP tools documentation with new word lookup capabilities

### 🔧 Technical

- Improved resource aggregator to handle word-specific queries
- Enhanced TypeScript types for translation word responses
- Added comprehensive error handling for word lookups

## [2.1.0] - 2025-01-XX

### 🎯 Enhanced Reference Implementation & Performance

This release focuses on improving the user experience and clarifying the demo's capabilities as a reference implementation.

#### ✨ Added

- **Performance Analysis Page**: Live demo capabilities with real-time metrics
- **Cost Efficiency Analysis**: Comprehensive cost comparisons and savings calculations
- **Reference Implementation Messaging**: Clear communication about demo limitations
- **Local AI Model Emphasis**: Highlighting that AI runs on user's device
- **MCP Branding**: Updated branding to emphasize Model Context Protocol technology
- **Enhanced Debugging UI**: Consolidated debug information under single toggle
- **Filtering Capabilities**: Advanced filtering for performance data display

#### 🔧 Changed

- **Chat Interface Messaging**: Updated to reflect reference implementation nature
- **Welcome Messages**: More realistic expectations about AI capabilities
- **Branding**: Emphasized "Translation Helps MCP Server" over generic "API"
- **UI Styling**: Improved performance page styling and responsiveness
- **Navigation**: Added performance page to main navigation

#### 🐛 Fixed

- **White Text Issues**: Resolved illegible text on white backgrounds in performance page
- **Math Error**: Corrected "$0.0001 is 1/100th of a penny" (was incorrectly stated as 1/10th)
- **Welcome Message Formatting**: Fixed bullet point rendering issues in chat interface
- **Debug Panel**: Consolidated scattered debug information into organized toggle
- **Chat Styling**: Improved overall chat interface user experience

#### 📚 Documentation

- **Updated README**: Reflects new reference implementation focus
- **Performance Documentation**: Comprehensive performance analysis and cost breakdown
- **Demo Limitations**: Clear documentation of what the demo can and cannot do

## [2.0.0] - 2025-07-18

### 🚀 Major Release - Complete Rewrite

This is a complete rewrite of the Translation Helps API with significant improvements in performance, architecture, and user experience.

#### ✨ Added

- **Complete TypeScript Migration**: Full type safety throughout the codebase
- **SvelteKit Frontend**: Modern, responsive UI with comprehensive testing tools
- **Netlify Functions Backend**: Serverless architecture for better scalability
- **Intelligent Caching System**: Netlify Blobs with in-memory fallback
- **Performance Monitoring**: Real-time cache status and performance metrics
- **Comprehensive API Documentation**: Detailed endpoint documentation with examples
- **Modern UI Components**: Beautiful, accessible interface with Tailwind CSS
- **Bulk Testing Suite**: Advanced testing capabilities for performance validation
- **Health Check Endpoint**: Detailed system status with cache information
- **CORS Support**: Proper cross-origin resource sharing configuration
- **Error Handling**: Graceful error handling with detailed error messages

#### 🔧 Changed

- **Architecture**: Migrated from monolithic to serverless microservices
- **Performance**: 59-89% performance improvements through intelligent caching
- **Deployment**: Streamlined deployment process with Netlify
- **Code Organization**: Modular, maintainable code structure
- **API Response Format**: Standardized, consistent response structures
- **Development Workflow**: Improved local development experience

#### 🐛 Fixed

- **Memory Leaks**: Proper resource cleanup and memory management
- **Error Recovery**: Graceful fallback when external services are unavailable
- **Caching Issues**: Reliable cache invalidation and TTL management
- **API Consistency**: Standardized error responses and status codes
- **Performance Bottlenecks**: Optimized file downloads and processing

#### 📚 Documentation

- **Comprehensive README**: Complete project overview and usage instructions
- **API Documentation**: Detailed endpoint documentation with examples
- **Performance Metrics**: Caching performance analysis and benchmarks
- **Deployment Guide**: Step-by-step deployment instructions
- **Contributing Guidelines**: Clear contribution process and standards

#### 🏗️ Technical Improvements

- **Type Safety**: Full TypeScript implementation with strict typing
- **Code Quality**: ESLint and Prettier configuration for consistent code style
- **Testing**: Comprehensive test suite with automated testing
- **Build Process**: Optimized build pipeline with proper asset handling
- **Dependencies**: Updated to latest stable versions with security patches

#### 🎯 User Experience

- **Modern Interface**: Beautiful, responsive UI with intuitive navigation
- **Real-time Feedback**: Live performance metrics and status indicators
- **Comprehensive Testing**: Advanced testing tools for API validation
- **Error Messages**: Clear, actionable error messages
- **Accessibility**: WCAG compliant interface design

## [1.3.0] - 2025-01-15

### Initial Release

#### ✨ Added

- Basic API endpoints for fetching Bible translation resources
- Support for scripture text, translation notes, and translation words
- Multi-language support for English resources
- Basic caching implementation
- Simple health check endpoint

#### 🔧 Features

- Door43 Content Service integration
- USFM text processing
- Bible reference parsing
- Basic error handling

#### 📚 Documentation

- Basic README with installation instructions
- API endpoint documentation
- Development setup guide

---

## Version History

- **v2.0.0**: Complete rewrite with TypeScript, SvelteKit, and Netlify Functions
- **v1.3.0**: Initial release with basic functionality

## Migration Guide

### From v1.3.0 to v2.0.0

The v2.0.0 release is a complete rewrite with significant architectural changes:

1. **New API Base URL**: All endpoints now use the new Netlify Functions structure
2. **Enhanced Response Format**: Improved JSON structure with additional metadata
3. **Performance Improvements**: Significant performance gains through caching
4. **Modern UI**: New SvelteKit interface for testing and exploration

### Breaking Changes

- API response format has been standardized and enhanced
- Some endpoint paths have been updated for consistency
- Error response format has been improved for better client handling

### New Features

- Intelligent caching system with 59-89% performance improvements
- Modern web interface for testing and exploration
- Comprehensive health monitoring
- Enhanced error handling and recovery

---

For detailed migration instructions, see the [Migration Guide](docs/MIGRATION_GUIDE.md).
