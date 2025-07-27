# Translation Helps MCP Documentation

## Overview
This directory contains comprehensive documentation for the Translation Helps MCP system.

## Key Documents

### 📋 [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)
Critical architectural decisions and lessons learned during development. **Read this first** to understand why the system is built the way it is and avoid repeating past mistakes.

### 🔧 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
Comprehensive troubleshooting guide for common issues, debugging techniques, and emergency fixes. Essential for operations and support.

### 🚀 [MCP_LLM_REFERENCE_IMPLEMENTATION.md](./MCP_LLM_REFERENCE_IMPLEMENTATION.md)
Reference implementation guide for integrating MCP with Large Language Models. Shows best practices for creating a natural, conversational interface while maintaining data integrity.

### 📦 [MCP_PROTOCOL.md](./MCP_PROTOCOL.md)
Technical specification of the Model Context Protocol used in this system.

### 🌐 [API_REFERENCE.md](./API_REFERENCE.md)
Complete API documentation for all endpoints.

### 💾 [CACHING_STRATEGY.md](./CACHING_STRATEGY.md)
Details about the caching implementation and performance optimizations.

### 🔐 [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)
Guide for deploying to Cloudflare Pages.

### 🏗️ [DYNAMIC_ARCHITECTURE.md](./DYNAMIC_ARCHITECTURE.md)
(Deprecated) Previous attempt at dynamic data pipeline - kept for historical context.

## Quick Links

- **Having Issues?** → Start with [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Making Changes?** → Read [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) first
- **Building Integration?** → Follow [MCP_LLM_REFERENCE_IMPLEMENTATION.md](./MCP_LLM_REFERENCE_IMPLEMENTATION.md)

## Core Principles

1. **MCP-Only Data**: The system only provides data from MCP tools, no external knowledge
2. **Dynamic Discovery**: Tools are discovered at runtime, not hardcoded
3. **LLM-Driven Formatting**: Let the LLM format responses naturally
4. **Transparency**: X-ray debugging shows exactly what's happening
5. **Proper Citations**: Every piece of information is properly attributed
