# Translation Helps MCP Documentation

Welcome to the Translation Helps MCP documentation. This guide provides comprehensive information about the API, resources, and implementation details.

## 📚 Core Documentation

### Essential Guides

- **[UW Translation Resources Guide](UW_TRANSLATION_RESOURCES_GUIDE.md)** - Complete reference for understanding unfoldingWord translation resources (tN, tW, tWL, tQ, tA)
- **[Implementation Guide](IMPLEMENTATION_GUIDE.md)** - Technical implementation details for working with the API
- **[API Documentation Guide](API_DOCUMENTATION_GUIDE.md)** - API endpoints, parameters, and response formats
- **[Scripture USFM Guide](SCRIPTURE_USFM_GUIDE.md)** - Understanding USFM format and scripture handling

### Development Guides

- **[Architecture Guide](ARCHITECTURE_GUIDE.md)** - System architecture and design patterns
- **[Debugging Guide](DEBUGGING_GUIDE.md)** - Troubleshooting and debugging techniques
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[Git Commit Best Practices](GIT_COMMIT_BEST_PRACTICES.md)** - Version control guidelines

### Quick Start Guides

- **[Quick Start Guides](quickstarts/)** - Step-by-step tutorials for common use cases
  - [Scripture Reader](quickstarts/scripture-reader-quickstart.md)
  - [Translation Workflow](quickstarts/translation-workflow-quickstart.md)
  - [Translation Checking](quickstarts/translation-checking-quickstart.md)
  - [AI Assistant](quickstarts/ai-assistant-quickstart.md)
  - [Offline Mobile](quickstarts/offline-mobile-quickstart.md)

## 🔧 Technical References

- **[OpenAPI Specification](openapi.yaml)** - Machine-readable API specification
- **[Performance Report](performance/PERFORMANCE_REPORT.md)** - Performance metrics and optimization details
- **[Experimental Promotion Criteria](EXPERIMENTAL_PROMOTION_CRITERIA.md)** - Requirements for promoting experimental features

## 📂 Project Structure

- `/src` - Source code
  - `/functions` - Core functionality and handlers
  - `/config` - Configuration-driven endpoint system
  - `/experimental` - Experimental features (isolated)
- `/ui` - Web interface
  - MCP Tools page - Primary interface for testing and exploring endpoints
- `/tests` - Test suite with real data validation
- `/docs` - This documentation
  - `/archive` - Historical documentation for reference

## 🚀 Getting Started

1. **Understand the Resources**: Start with the [UW Translation Resources Guide](UW_TRANSLATION_RESOURCES_GUIDE.md)
2. **Explore the API**: Use the MCP Tools page in the UI to test endpoints
3. **Implement**: Follow the [Implementation Guide](IMPLEMENTATION_GUIDE.md) for integration
4. **Debug**: Use the [Debugging Guide](DEBUGGING_GUIDE.md) when issues arise

## 📝 Key Concepts

- **Translation Notes (tN)** - Verse-by-verse translation helps
- **Translation Words (tW)** - Important biblical term definitions
- **Translation Words Links (tWL)** - Maps verses to translation words
- **Translation Questions (tQ)** - Comprehension checking questions
- **Translation Academy (tA)** - Translation principles and concepts

## 🔄 Last Updated

January 2025 - Simplified documentation structure focusing on core functionality
