# Translation Helps MCP Documentation

This directory contains comprehensive documentation for the Translation Helps MCP system.

**Last Updated:** December 2025

## Core Documentation

### [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)

**Complete implementation guide** covering setup, deployment, best practices, and lessons learned. This is the primary "how to implement" reference with:

- Quick start instructions
- Core endpoint data shapes and flags
- Performance optimization patterns
- Version management
- Real-world implementation wisdom

### [UW_TRANSLATION_RESOURCES_GUIDE.md](./UW_TRANSLATION_RESOURCES_GUIDE.md)

**Comprehensive resource reference** explaining what the translation resources are, how they work conceptually, and their relationships. This is the primary "what resources are" reference covering:

- Resource ecosystem concepts
- Translation workflows
- Technical specifications
- Integration patterns

## Architecture Documentation

### [ARCHITECTURE.md](./ARCHITECTURE.md)

System architecture overview covering layers, data flow, caching strategy, and deployment.

### [AI_CHAT_ARCHITECTURE.md](./AI_CHAT_ARCHITECTURE.md)

**Multi-agent orchestration architecture** for the AI chat system:

- Orchestrator and specialist agents
- Cloudflare Workers AI integration
- QA citation validation
- Streaming events and UI components

### [MULTI_AGENT_ORCHESTRATION.md](./MULTI_AGENT_ORCHESTRATION.md)

Detailed guide to the multi-agent chat system:

- Agent responsibilities and prompts
- Planning and dispatch flow
- Synthesis and citation rules

### [EVENT_DRIVEN_INDEXING.md](./EVENT_DRIVEN_INDEXING.md)

Event-driven search indexing pipeline:

- Two-queue architecture (unzip + index)
- R2 events and Cloudflare Queues
- Chunking strategies
- AI Search integration

### [AGENTS_REFERENCE.md](./AGENTS_REFERENCE.md)

Reference for each specialist agent:

- Purpose and capabilities
- Tool mappings
- Example inputs/outputs

## Technical References

### [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

Comprehensive troubleshooting guide for common issues, debugging techniques, and emergency fixes. Essential for operations and support.

### [HYBRID_SEARCH_FEATURE.md](./HYBRID_SEARCH_FEATURE.md)

AI Search integration documentation:

- Cloudflare AI Search setup
- Search API parameters
- Content cleaning pipeline
- Metadata extraction

### [CACHE_ARCHITECTURE.md](./CACHE_ARCHITECTURE.md)

Caching strategy and implementation:

- Cache types and TTLs
- KV and R2 storage
- Cache bypass mechanisms

### [MCP_LLM_REFERENCE_IMPLEMENTATION.md](./MCP_LLM_REFERENCE_IMPLEMENTATION.md)

Reference implementation guide for integrating MCP with Large Language Models.

### [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

Production deployment guidance covering Cloudflare Pages setup, environment configuration, and monitoring.

### [EXPERIMENTAL_PROMOTION_CRITERIA.md](./EXPERIMENTAL_PROMOTION_CRITERIA.md)

Defines requirements for promoting features from experimental to core production status.

## Additional Resources

### [performance/](./performance/)

Performance reports and optimization analysis.

### [quickstarts/](./quickstarts/)

Quick-start guides for specific use cases and integration patterns.

### [testing/](./testing/)

Testing documentation and test utilities.

### [archive/](./archive/)

Historical documentation and deprecated guides kept for reference. Includes:

- Old architecture decisions
- Completed migrations
- Deprecated guides

## Quick Start Paths

### For Developers

1. **Understanding Resources** → [UW Translation Resources Guide](./UW_TRANSLATION_RESOURCES_GUIDE.md)
2. **System Architecture** → [Architecture](./ARCHITECTURE.md)
3. **Implementation** → [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
4. **Deployment** → [Deployment Guide](./DEPLOYMENT_GUIDE.md)

### For AI/Chat Development

1. **Chat Architecture** → [AI Chat Architecture](./AI_CHAT_ARCHITECTURE.md)
2. **Agent System** → [Multi-Agent Orchestration](./MULTI_AGENT_ORCHESTRATION.md)
3. **Agent Reference** → [Agents Reference](./AGENTS_REFERENCE.md)

### For Search Development

1. **Search Feature** → [Hybrid Search Feature](./HYBRID_SEARCH_FEATURE.md)
2. **Indexing Pipeline** → [Event-Driven Indexing](./EVENT_DRIVEN_INDEXING.md)

### For Troubleshooting

1. **Common Issues** → [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. **Cache Issues** → [Cache Architecture](./CACHE_ARCHITECTURE.md)

## Documentation Principles

1. **Clear Separation**: "What resources are" (UW Guide) vs "How to implement" (Implementation Guide)
2. **Markdown by Default**: All endpoints support `format=md` for LLM consumption
3. **Raw Data Preservation**: Core endpoints proxy Door43 content with minimal transformation
4. **Architecture Documentation**: Key systems have dedicated architecture docs
5. **Comprehensive Examples**: Real-world scenarios with actual data shapes
