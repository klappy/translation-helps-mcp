# Translation Helps MCP Documentation

This directory contains comprehensive documentation for the Translation Helps MCP system.

**Last Updated:** August 2025

## 📖 **Core Documentation**

### 🚀 [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)

**Complete implementation guide** covering setup, deployment, best practices, and lessons learned. This is the primary "how to implement" reference with:

- Quick start instructions
- Core endpoint data shapes and flags
- Performance optimization patterns
- Version management
- Real-world implementation wisdom

### 🌐 [UW_TRANSLATION_RESOURCES_GUIDE.md](./UW_TRANSLATION_RESOURCES_GUIDE.md)

**Comprehensive resource reference** explaining what the translation resources are, how they work conceptually, and their relationships. This is the primary "what resources are" reference covering:

- Resource ecosystem concepts
- Translation workflows
- Technical specifications
- Integration patterns

## 🔧 **Technical References**

### 📋 [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)

Critical architectural decisions and lessons learned during development. **Read this first** to understand why the system is built the way it is and avoid repeating past mistakes.

### 🔧 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

Comprehensive troubleshooting guide for common issues, debugging techniques, and emergency fixes. Essential for operations and support.

### 🚀 [MCP_LLM_REFERENCE_IMPLEMENTATION.md](./MCP_LLM_REFERENCE_IMPLEMENTATION.md)

Reference implementation guide for integrating MCP with Large Language Models. Shows best practices for creating a natural, conversational interface while maintaining data integrity.

### 🚀 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

Production deployment guidance covering Cloudflare Pages setup, environment configuration, and monitoring.

### 🔬 [EXPERIMENTAL_PROMOTION_CRITERIA.md](./EXPERIMENTAL_PROMOTION_CRITERIA.md)

Defines requirements for promoting features from experimental to core production status.

### 📊 [CODEBASE_AUDIT.md](./CODEBASE_AUDIT.md)

Technical audit findings and recommendations for code quality improvements.

## 📁 **Additional Resources**

### 📈 [performance/](./performance/)

Performance reports and optimization analysis.

### 🧪 [quickstarts/](./quickstarts/)

Quick-start guides for specific use cases and integration patterns.

### 🧪 [testing/](./testing/)

Testing documentation and test utilities.

### 📦 [archive/](./archive/)

Historical documentation and deprecated guides kept for reference.

## 🚀 **Quick Start Paths**

### **For Developers**

1. **Understanding Resources** → [UW Translation Resources Guide](./UW_TRANSLATION_RESOURCES_GUIDE.md)
2. **Implementation** → [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
3. **Deployment** → [Deployment Guide](./DEPLOYMENT_GUIDE.md)

### **For Users**

1. **Getting Started** → [Implementation Guide - Quick Start](./IMPLEMENTATION_GUIDE.md#-quick-start-5-minutes)
2. **Troubleshooting** → [Troubleshooting Guide](./TROUBLESHOOTING.md)

### **For Contributors**

1. **Architecture** → [Architecture Decisions](./ARCHITECTURE_DECISIONS.md)
2. **Experimental Features** → [Promotion Criteria](./EXPERIMENTAL_PROMOTION_CRITERIA.md)

## 📋 **Documentation Principles**

1. **Clear Separation**: "What resources are" (UW Guide) vs "How to implement" (Implementation Guide)
2. **JSON by Default**: All examples show structured JSON responses with optional TSV for exact testing
3. **Raw Data Preservation**: Core endpoints proxy Door43 content with minimal optional filtering
4. **Experimental Distinction**: Advanced features live in separate lab environment
5. **Comprehensive Examples**: Real-world scenarios with actual data shapes
