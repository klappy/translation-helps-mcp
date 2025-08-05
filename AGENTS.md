# 🤖 **AGENT NAVIGATION GUIDE**

**For LLMs, AI Agents, and Automated Systems**

This guide helps AI agents efficiently navigate the `translation-helps-mcp` documentation to provide accurate, contextual assistance to users working with Bible translation resources.

---

## 🎯 **FIRST: READ THE DEFINITIVE GUIDE**

**⚠️ CRITICAL:** Before helping with any technical questions, translation resources, or implementation details, **ALWAYS** consult:

📖 **[`docs/UW_TRANSLATION_RESOURCES_GUIDE.md`](docs/UW_TRANSLATION_RESOURCES_GUIDE.md)** (1,758 lines)

**This is the single source of truth containing:**

- Complete resource ecosystem concepts (ULT, UST, Translation Notes, Translation Words, etc.)
- Technical specifications and file formats (USFM, TSV, JSON, etc.)
- API documentation and integration patterns
- Alignment systems and parsing details
- Real-world use cases and implementation examples
- Resource Container (RC) architecture
- Door43 Content Service (DCS) API details

**🚨 DO NOT GUESS** about translation resource formats, alignments, or API structures. This guide contains authoritative, detailed explanations with examples.

---

## 📚 **DOCUMENTATION HIERARCHY**

### **🎯 PRIMARY REFERENCES (Use These First)**

1. **[`docs/UW_TRANSLATION_RESOURCES_GUIDE.md`](docs/UW_TRANSLATION_RESOURCES_GUIDE.md)** - **THE DEFINITIVE GUIDE**
   - Resource formats, APIs, alignment systems, technical specs
   - Use for: Any questions about translation resources, file formats, alignment, APIs

2. **[`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md)** - Setup & Implementation
   - Project setup, getting started, API usage, version management
   - Use for: Installation, configuration, basic usage questions

3. **[`docs/ARCHITECTURE_GUIDE.md`](docs/ARCHITECTURE_GUIDE.md)** - System Architecture
   - Caching, performance, platform adapters, error handling
   - Use for: System design, performance optimization, architecture decisions

### **🔧 SPECIALIZED GUIDES**

4. **[`docs/DEBUGGING_GUIDE.md`](docs/DEBUGGING_GUIDE.md)** - Troubleshooting
   - Common issues, diagnostic commands, debugging patterns
   - Use for: Error resolution, performance issues, troubleshooting

5. **[`docs/SCRIPTURE_USFM_GUIDE.md`](docs/SCRIPTURE_USFM_GUIDE.md)** - Scripture Processing
   - USFM extraction, validation, LLM preparation
   - Use for: Scripture text processing, USFM format questions

6. **[`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)** - Deployment
   - Cloudflare Workers, serverless deployment, production setup
   - Use for: Production deployment, hosting questions

7. **[`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md)** - Complete Implementation Guide
   - **Best Practices & Lessons Learned** - Hard-won implementation wisdom
   - **Core Endpoint Data Shapes** - Exact response formats and flags
   - **Version Management** - Single source of truth approach

### **📋 REFERENCE FILES**

8. **[`docs/CODEBASE_AUDIT.md`](docs/CODEBASE_AUDIT.md)** - Code Quality
   - Recent audit findings, cleanup recommendations
   - Use for: Code quality questions, optimization opportunities

9. **[`docs/README.md`](docs/README.md)** - Documentation Overview
   - Documentation structure and organization guide
   - Use for: Understanding documentation layout

---

## 🚨 **CRITICAL AGENT GUIDELINES**

### **⚡ IMMEDIATE PRIORITIES**

1. **NEVER make assumptions** about translation resource formats - consult the definitive guide
2. **ALWAYS check the UW_TRANSLATION_RESOURCES_GUIDE.md** for technical specifications
3. **Use real examples** from the definitive guide rather than creating hypothetical ones
4. **Reference actual API endpoints** documented in the guide, not imagined ones

### **🎯 CONTEXT-SPECIFIC GUIDANCE**

**When users ask about:**

| **Topic**                              | **Primary Reference**                          | **Key Sections**              |
| -------------------------------------- | ---------------------------------------------- | ----------------------------- |
| **Resource formats** (USFM, TSV, JSON) | `UW_TRANSLATION_RESOURCES_GUIDE.md`            | Technical Specifications      |
| **Alignment systems**                  | `UW_TRANSLATION_RESOURCES_GUIDE.md`            | Alignment Syntax Structure    |
| **API integration**                    | `UW_TRANSLATION_RESOURCES_GUIDE.md`            | Integration Patterns and APIs |
| **Translation Notes/Words**            | `UW_TRANSLATION_RESOURCES_GUIDE.md`            | Supporting Resources          |
| **Setup/Installation**                 | `IMPLEMENTATION_GUIDE.md`                      | Getting Started               |
| **Performance issues**                 | `DEBUGGING_GUIDE.md` + `ARCHITECTURE_GUIDE.md` | Performance sections          |
| **USFM processing**                    | `SCRIPTURE_USFM_GUIDE.md`                      | Technical Implementation      |
| **Production deployment**              | `DEPLOYMENT_GUIDE.md`                          | Cloudflare Workers            |

### **🔍 RESEARCH APPROACH**

**For technical questions:**

1. Search `UW_TRANSLATION_RESOURCES_GUIDE.md` first
2. Cross-reference with specialized guides
3. Check implementation examples in the guides
4. Verify against actual codebase if needed

**For troubleshooting:**

1. Check `DEBUGGING_GUIDE.md` for common issues
2. Reference `ARCHITECTURE_GUIDE.md` for system behavior
3. Use diagnostic commands from debugging guide

---

## 📖 **TRANSLATION DOMAIN KNOWLEDGE**

**Essential concepts** (detailed in UW_TRANSLATION_RESOURCES_GUIDE.md):

- **Strategic Languages**: Bridge languages (English, Spanish, etc.) used by Mother Tongue Translators
- **Heart Languages**: Target languages being translated into
- **Resource Types**: ULT (Literal Text), UST (Simplified Text), Translation Notes, Translation Words, etc.
- **Alignment**: Word-level connections between original and strategic languages
- **Resource Containers (RC)**: Standardized packaging format for translation resources
- **Door43 Content Service (DCS)**: Primary API and hosting platform

---

## 🎯 **QUICK REFERENCE: COMMON AGENT TASKS**

### **API Integration Questions**

👉 **Go to:** `UW_TRANSLATION_RESOURCES_GUIDE.md` → "Integration Patterns and APIs" section

### **Resource Format Questions**

👉 **Go to:** `UW_TRANSLATION_RESOURCES_GUIDE.md` → "Technical Specifications" section

### **Setup/Configuration Help**

👉 **Go to:** `IMPLEMENTATION_GUIDE.md` → Getting Started sections

### **Performance Optimization**

👉 **Go to:** `ARCHITECTURE_GUIDE.md` → Performance Optimizations section

### **Error Troubleshooting**

👉 **Go to:** `DEBUGGING_GUIDE.md` → Common Issues & Fixes section

---

## 🚀 **SUCCESS CRITERIA FOR AGENTS**

**✅ Good Agent Response:**

- References specific documentation sections
- Uses examples from the definitive guide
- Provides accurate technical specifications
- Acknowledges translation domain context

**❌ Poor Agent Response:**

- Makes up resource formats or API endpoints
- Ignores translation-specific requirements
- Provides generic answers without domain context
- Contradicts information in the definitive guide

---

**🎓 Remember: This MCP server aggregates Bible translation resources. Understanding the translation domain and resource ecosystem is essential for providing accurate assistance.**
