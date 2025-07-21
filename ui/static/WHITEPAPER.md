# The Aqueduct: A Stateless RAG Architecture for Bible Translation

## Executive Summary

In the age of AI-powered tools, the Bible translation community is fragmenting. LLMs demand structured, versioned, and context-rich knowledge. But most translation tools, content systems, and QA pipelines were never built with LLMs in mind. The result? Drift. Dead links. Duplication. Divergence.

**The Aqueduct** is a stateless, cache-driven, LLM-native RAG (Retrieval-Augmented Generation) architecture. It lets any tool, bot, or interface dynamically pull the right version of the right resource at the right time—without requiring centralized infrastructure or shared databases.

## 1. The Core Problem

### 1.1 Versioned Truth Is Plural

Translation workflows require simultaneous access to:

- The _latest edits_
- The _latest checked release_
- A _frozen, known-good snapshot_

Most RAG systems assume a single ground truth. That assumption breaks Bible workflows.

### 1.2 Multimodal Resources Drift

Text, audio, glossaries, notes, maps—resources intended to align often live on different platforms and versions. Drift creeps in over time.

### 1.3 Tool Ecosystem Fragmentation

Each org builds their own tools. Each team builds their own pipelines. There's no common context layer. No universal index. Just isolation.

## 2. Stateless RAG: The Aqueduct Model

The Aqueduct isn't a new platform. It's a protocol-driven method built from three insights:

- **Model Context Protocol (MCP):** A method for LLMs to request versioned, traceable, multimodal context.
- **Cache-first + zero storage:** Statelessness ensures no user data storage and ultralight deployment.
- **Multimodal durability via IPFS:** Multimedia, source files, and indexed manifests are pinned for long-term access and offline use.

### Diagram (not rendered in markdown)

```
[Source Springs] --> [MCP Reservoir Cache] --> [LLM/Bot Outflows]
(Git, IPFS, APIs)      (Stateless cache)        (Codex, WhatsApp, CLI)
```

## 3. Canonical Truth = Plural

Aqueduct supports:

- `"latest"`: always evolving
- `"checked"`: field-tested releases
- `"frozen"`: fixed for translation continuity

A simple query param or manifest flag lets LLMs load the correct source for the user's context.

## 4. Not a Platform

The Aqueduct is:

- **Not a new platform**
- **Not a shared infrastructure**
- **Not a database or knowledge repo**

It's a method for aligning disparate resources _without_ enforcing centralization.

## 5. Real-World Use Cases

- Codex editor pulls "checked" notes + "latest" Bible + glossary via MCP.
- WhatsApp bot loads "frozen" verse version + multimedia via IPFS fallback.
- QA dashboard shows AI-generated alerts using only cached MCP context.

## 6. What's in the Box

- **MCP Server**: Cache-first proxy with content negotiation and version awareness
- **Manifest standard**: Lightweight YAML/JSON for versioning, source traceability
- **IPFS archival tool**: Auto-pin critical assets for offline + long-term use
- **Codex plug-in + WhatsApp starter**: Use the Aqueduct now

## 7. Philosophical Foundations

The Aqueduct is a reimagining of the Open Components Ecosystem (OCE) for an AI-native world. It assumes:

- **Tools will remain diverse**
- **Resources will remain distributed**
- **Truth must remain plural**
- But _context can still flow._

---
