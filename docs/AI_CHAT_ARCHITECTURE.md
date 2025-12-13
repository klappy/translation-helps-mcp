# AI Chat Architecture Documentation

This document describes the multi-agent orchestration architecture for the Translation Helps MCP AI Chat system.

**Last Updated:** December 2025  
**Version:** 7.19.29

## Overview

The AI Chat system uses a sophisticated multi-agent architecture powered by **Cloudflare Workers AI (Llama 4 Scout 17B)**. An orchestrator agent analyzes user queries and dispatches specialized agents in parallel, then synthesizes their findings into a well-cited response.

## Architecture Components

### Chat Endpoints

| Endpoint                 | Purpose                                       | Model             |
| ------------------------ | --------------------------------------------- | ----------------- |
| `/api/chat-orchestrated` | Multi-agent orchestration for complex queries | Llama 4 Scout 17B |
| `/api/chat-stream`       | Single-agent with streaming                   | Llama 4 Scout 17B |

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Query                                │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Orchestrator Agent                              │
│         (Analyzes query, plans agent dispatch)               │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
    ┌────────┬────────┬────────┬────────┬────────┬────────┐
    │Scripture│ Notes │ Words │Academy │Questions│ Search │
    │ Agent  │ Agent │ Agent │ Agent  │ Agent  │ Agent  │
    └────┬───┴───┬───┴───┬───┴───┬────┴───┬────┴───┬────┘
         │       │       │       │        │        │
         └───────┴───────┴───┬───┴────────┴────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│           Synthesis + QA Citation Validation                 │
└─────────────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Streamed Response                            │
└─────────────────────────────────────────────────────────────┘
```

## Agent System

### Orchestrator Agent

The lead coordinator that:

1. Analyzes user queries to understand intent
2. Decides between prompt workflows or individual agents
3. Plans which agents to dispatch with specific tasks
4. Coordinates parallel execution
5. Triggers synthesis of findings

**Location:** `ui/src/lib/ai/agents/orchestrator.ts`

**Decision Rules:**

- Use `execute_prompt` for comprehensive passage requests
- Use `dispatch_agents` for specific lookups (terms, articles, verses)
- Article names route to specific agents (not prompt workflows)
- Bible references can use prompt workflows

### Specialist Agents

Each agent is optimized for a single task:

| Agent           | Purpose                      | MCP Tool                      |
| --------------- | ---------------------------- | ----------------------------- |
| Scripture Agent | Fetch Bible text (ULT, UST)  | `fetch_scripture`             |
| Notes Agent     | Translation notes for verses | `fetch_translation_notes`     |
| Words Agent     | Biblical term definitions    | `fetch_translation_word`      |
| Academy Agent   | Translation concept articles | `fetch_translation_academy`   |
| Questions Agent | Comprehension questions      | `fetch_translation_questions` |
| Search Agent    | Semantic search across all   | `search_biblical_resources`   |

**Location:** `ui/src/lib/ai/agents/`

### QA Citation Validator

Automatic verification of response accuracy (v7.18+):

1. Collects citations from agent responses
2. Re-fetches resources to verify content exists
3. Annotates citations with verification status
4. Shows validation summary in X-Ray panel

**Status Indicators:**

- ✅ Verified - Source confirmed
- ⏳ Uncertain - Could not fully verify
- ❌ Invalid - Source not found

**Location:** `ui/src/lib/ai/agents/qa-validator.ts`

## Execution Flow

### Phase 1: Planning

```typescript
// Orchestrator receives user query
const plan = await planAgentDispatch(ai, userMessage, chatHistory, emit);

// Returns either:
// { type: 'agents', plan: { reasoning, agents, needsIteration } }
// { type: 'prompt', promptName, reference, language }
```

### Phase 2: Parallel Execution

```typescript
// Agents execute in parallel
const agentResults = await executeAgentsInParallel(
  ai,
  plan.agents,
  mcpTools,
  executeToolFn,
  emit,
  parallelExecution,
);
```

### Phase 3: Gap Detection

Before synthesis, the system checks for missed resources:

```typescript
// Detect if any obvious resources were missed
const missedAgents = detectMissedAgents(userMessage, dispatchedAgents);
if (missedAgents.length > 0) {
  // Dispatch additional agents
}
```

### Phase 4: Synthesis

```typescript
// Synthesize findings with proper citations
const response = await synthesizeResponse(ai, userMessage, agentResults, emit);
```

### Phase 5: QA Validation

```typescript
// Validate citations
const validated = await validateCitations(
  ai,
  response,
  citations,
  executeToolFn,
  emit,
);
```

## Streaming Events

The orchestrated chat emits SSE events for real-time UI updates:

| Event                   | Payload                               | Purpose                       |
| ----------------------- | ------------------------------------- | ----------------------------- |
| `orchestrator:thinking` | `{ delta: string }`                   | Orchestrator's reasoning      |
| `orchestrator:plan`     | `{ plan: OrchestratorPlan }`          | Planned agent dispatch        |
| `agent:start`           | `{ agent: string, task: string }`     | Agent begins execution        |
| `agent:thinking`        | `{ agent: string, delta: string }`    | Agent's progress              |
| `agent:tool_call`       | `{ agent: string, tool: string }`     | Tool being called             |
| `agent:complete`        | `{ agent: string, success, summary }` | Agent finished                |
| `synthesis:delta`       | `{ delta: string }`                   | Synthesis streaming           |
| `qa:validation`         | `{ validations: [] }`                 | Citation verification results |
| `xray`                  | `{ tools, timings, agents }`          | Debugging data                |

## MCP Prompt Integration

The orchestrator can execute pre-defined prompt workflows:

### Available Prompts

1. **translation-helps-for-passage**
   - Chains: scripture + notes + questions + words + academy
   - Use for: "Help me translate X", "Give me everything for X"

2. **get-translation-words-for-passage**
   - Fetches all word definitions for a passage
   - Use for: "What terms are in X?"

3. **get-translation-academy-for-passage**
   - Finds academy articles referenced in notes
   - Use for: "What concepts should I know for X?"

## Configuration

### Model Configuration

```typescript
const WORKERS_AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
```

### Orchestration Options

```typescript
interface OrchestrationConfig {
  maxIterations: number; // Default: 2
  confidenceThreshold: number; // Default: 0.5
  enableStreaming: boolean; // Default: true
  parallelExecution: boolean; // Default: true
}
```

### Environment Requirements

```toml
# wrangler.toml
[ai]
binding = "AI"
```

Workers AI is accessed via `platform.env.AI` in SvelteKit handlers.

## UI Components

### ThinkingBubble

Shows real-time agent activity:

- Orchestrator's planning process
- Per-agent progress and tool calls
- Expandable agent thought streams

**Location:** `ui/src/routes/(app)/chat/ThinkingBubble.svelte`

### X-Ray Panel

Debugging panel showing:

- Tool calls with timing
- Agent execution details
- Citation validations
- Total response time

### Chat Interface

Main chat component with:

- Message history
- Streaming response display
- Clickable citations
- Follow-up question suggestions

**Location:** `ui/src/routes/(app)/chat/ChatInterface.svelte`

## Error Handling

### Agent Failures

When an agent fails:

1. Error is logged with context
2. Orchestrator continues with remaining agents
3. Synthesis acknowledges missing data
4. User sees partial but honest response

### Tool Call Failures

When MCP tools fail:

1. Agent catches error
2. Returns failure status with error message
3. Synthesis works with available data
4. X-Ray shows tool error details

### Graceful Degradation

- Single agent failure doesn't crash the system
- Partial data still produces useful response
- Clear indication of what couldn't be fetched

## Performance Characteristics

### Typical Response Times

| Phase                      | Duration      |
| -------------------------- | ------------- |
| Planning                   | 50-100ms      |
| Agent Execution (parallel) | 200-500ms     |
| Synthesis                  | 100-200ms     |
| QA Validation              | 50-150ms      |
| **Total**                  | **400-950ms** |

### Optimization Strategies

1. **Parallel Agent Execution** - Agents run concurrently
2. **Early Streaming** - Response streams as synthesis generates
3. **Cached MCP Tools** - KV/R2 caching reduces tool latency
4. **Edge Inference** - Workers AI runs on same edge network

## Migration from OpenAI

The system migrated from OpenAI GPT-4o-mini to Cloudflare Workers AI in v7.11:

### Key Changes

| Aspect       | Before (v7.10)  | After (v7.11+)    |
| ------------ | --------------- | ----------------- |
| Model        | GPT-4o-mini     | Llama 4 Scout 17B |
| Hosting      | External API    | Edge-native       |
| Tool Calling | OpenAI format   | Workers AI format |
| Latency      | ~500ms external | ~50ms edge        |
| Code Size    | 1984 lines      | 396 lines         |

### Benefits

- No external API calls (runs on same edge)
- Native tool calling with structured output
- 80% code reduction
- Lower latency
- No API key management

## Critical Design Decisions

### 1. MCP Self-Discovery

Endpoints are discovered dynamically via `/api/mcp`:

```typescript
const mcpTools = await listTools(`${baseUrl}/api/mcp`);
```

### 2. Agent Isolation

Each agent has:

- Single responsibility
- Own system prompt
- Specific tool knowledge
- Independent failure handling

### 3. Citation-First Synthesis

Every piece of information MUST:

- Come from an agent's findings
- Include proper citation
- Be verifiable via QA validator

### 4. No External Knowledge

The orchestrator's system prompt explicitly states:

> "You have NO biblical knowledge. You ONLY know what your team reports back."

## Files Reference

```
ui/src/lib/ai/
├── agents/
│   ├── orchestrator.ts      # Lead coordinator
│   ├── scripture-agent.ts   # Bible text fetching
│   ├── notes-agent.ts       # Translation notes
│   ├── words-agent.ts       # Term definitions
│   ├── academy-agent.ts     # Training articles
│   ├── questions-agent.ts   # Comprehension questions
│   ├── search-agent.ts      # Semantic search
│   ├── qa-validator.ts      # Citation verification
│   ├── types.ts             # Shared type definitions
│   └── index.ts             # Agent exports
├── orchestrated-chat.ts     # Main orchestration logic
├── workers-ai-client.ts     # Workers AI interface
├── system-prompt.ts         # Legacy single-agent prompt
└── types.ts                 # AI type definitions
```
