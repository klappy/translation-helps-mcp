# Multi-Agent Orchestration

This document provides a detailed guide to the multi-agent chat system in Translation Helps MCP.

**Last Updated:** December 2025  
**Version:** 7.19.29

## Overview

The multi-agent orchestration system uses a lead coordinator (the Orchestrator) to analyze user queries and dispatch specialized agents in parallel. Each agent focuses on a single type of translation resource, ensuring deep expertise and reliable results.

## Architecture

```
                    ┌──────────────────────────┐
                    │       User Query         │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │    Orchestrator Agent    │
                    │  (Llama 4 Scout 17B)     │
                    │                          │
                    │  - Analyze intent        │
                    │  - Choose strategy       │
                    │  - Plan dispatch         │
                    └────────────┬─────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
    ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
    │  Scripture  │       │    Notes    │       │   Words     │
    │    Agent    │       │    Agent    │       │    Agent    │
    └─────────────┘       └─────────────┘       └─────────────┘
           │                     │                     │
           │   ┌─────────────┐   │   ┌─────────────┐   │
           │   │   Academy   │   │   │  Questions  │   │
           │   │    Agent    │   │   │    Agent    │   │
           │   └─────────────┘   │   └─────────────┘   │
           │         │           │         │           │
           │         │   ┌─────────────┐   │           │
           │         │   │   Search    │   │           │
           │         │   │    Agent    │   │           │
           │         │   └─────────────┘   │           │
           │         │         │           │           │
           └─────────┴─────────┼───────────┴───────────┘
                               ▼
                    ┌──────────────────────────┐
                    │       Synthesis          │
                    │  (Combine with citations)│
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │     QA Validation        │
                    │  (Verify citations)      │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │    Streamed Response     │
                    └──────────────────────────┘
```

## The Orchestrator

### Role

The Orchestrator is the lead coordinator that:

1. **Analyzes** user queries to understand what they need
2. **Decides** between prompt workflows or individual agents
3. **Plans** which agents to dispatch with specific tasks
4. **Coordinates** parallel execution
5. **Synthesizes** findings into a unified response

### Decision Rules

**Use Prompt Workflows (`execute_prompt`) for:**

- Comprehensive passage requests ("Help me understand John 3:16")
- "Give me everything" requests ("Complete translation help for Romans 8")
- Requests with clear Bible references

**Use Agent Dispatch (`dispatch_agents`) for:**

- Specific article requests ("Show me the Translation Academy article on metaphor")
- Specific term definitions ("Define 'love'")
- Specific verse lookups ("Show me John 3:16")
- Comprehension questions ("What questions for Genesis 1?")
- Named resources (user mentions specific article/module name)

### Planning Output

When dispatching agents, the Orchestrator outputs:

```json
{
  "reasoning": "User wants to understand John 3:16. Need scripture text and notes.",
  "agents": [
    {
      "agent": "scripture",
      "task": "Fetch John 3:16 in ULT and UST",
      "priority": "high"
    },
    {
      "agent": "notes",
      "task": "Get translation notes for John 3:16",
      "priority": "normal"
    }
  ],
  "needsIteration": false
}
```

## Specialist Agents

### Scripture Agent

**Purpose:** Fetch Bible text in various translations.

**Tool:** `fetch_scripture`

**Capabilities:**

- ULT (Unfoldingword Literal Text) - word-for-word
- UST (Unfoldingword Simplified Text) - meaning-based
- Verse ranges and full chapters
- Multiple languages

**Example Task:** "Fetch John 3:16 in ULT and UST"

### Notes Agent

**Purpose:** Fetch verse-by-verse translation guidance.

**Tool:** `fetch_translation_notes`

**Capabilities:**

- Verse-level translation notes
- Quote and explanation pairs
- Book/chapter introductions
- Context from surrounding verses

**Example Task:** "Get translation notes for Romans 8:1-4"

### Words Agent

**Purpose:** Fetch definitions for biblical terms, names, and places.

**Tool:** `fetch_translation_word`

**Capabilities:**

- Key Terms (kt): grace, faith, salvation
- Names: Abraham, Jerusalem, Moses
- Other: bread, water, house
- Lookup by term, path, or RC link

**Example Task:** "Get the definition for 'covenant'"

### Academy Agent

**Purpose:** Fetch training articles about translation concepts.

**Tool:** `fetch_translation_academy`

**Capabilities:**

- Figures of speech (figs-metaphor, figs-simile)
- Translation principles
- Checking guidelines
- Category browsing

**Example Task:** "Fetch the article on figs-metaphor"

### Questions Agent

**Purpose:** Fetch comprehension questions for passages.

**Tool:** `fetch_translation_questions`

**Capabilities:**

- Verse-level comprehension questions
- Answer suggestions
- Full chapter coverage

**Example Task:** "Get comprehension questions for Genesis 1"

### Search Agent

**Purpose:** Semantic search across all resources.

**Tool:** `search_biblical_resources`

**Capabilities:**

- Full-text semantic search
- Filter by resource type
- Filter by reference
- Returns ranked results

**Example Task:** "Search for 'eternal life' in all resources"

## Execution Flow

### Phase 1: Planning

```typescript
const planningResult = await planAgentDispatch(
  ai,
  userMessage,
  chatHistory,
  emit,
);

// Returns either:
// { type: 'agents', plan: OrchestratorPlan }
// { type: 'prompt', promptName, reference, language }
```

### Phase 2: Parallel Execution

Agents run concurrently for speed:

```typescript
const agentResults = await executeAgentsInParallel(
  ai,
  plan.agents,
  mcpTools,
  executeToolFn,
  emit,
  parallelExecution, // true by default
);
```

### Phase 3: Gap Detection

Before synthesis, check for missed resources:

```typescript
const missedAgents = detectMissedAgents(userMessage, dispatchedAgents);

if (missedAgents.length > 0) {
  // Dispatch additional agents to fill gaps
  const additionalResults = await executeAgentsInParallel(...);
  agentResults.push(...additionalResults);
}
```

### Phase 4: Synthesis

Combine agent findings with proper citations:

```typescript
const synthesisContext = buildSynthesisContext(agentResults);

const response = await synthesizeWithLLM(
  ai,
  userMessage,
  synthesisContext,
  emit,
);
```

### Phase 5: QA Validation

Verify all citations are accurate:

```typescript
const validated = await validateCitations(
  ai,
  response,
  citations,
  executeToolFn,
  emit,
);

// Adds verification indicators:
// ✅ Verified - Source confirmed
// ⏳ Uncertain - Could not fully verify
// ❌ Invalid - Source not found
```

## Synthesis Rules

The synthesis phase follows strict rules:

1. **Only use agent data** - No outside knowledge
2. **Cite everything** - Every quote/fact needs a citation
3. **Use numbered citations** - `[1]`, `[2]`, `[3]`
4. **Clickable format** - `[[article|Resource]]`
5. **Acknowledge failures** - If an agent failed, say so
6. **Follow-up questions** - Use letters `a)`, `b)`, `c)`

### Citation Format

```markdown
God's love for the world is shown in this verse:

> "For God so loved the world, that he gave his One and Only Son" [1]

The term "love" here means sacrificial care focused on others' good. [2]

**Citations:**
[1] [[John 3:16|ULT]] ⏳
[2] [[love|Translation Words]] ⏳

**Follow-up Questions:**
a) What does "only begotten" mean in Greek?
b) How is this verse used elsewhere in John?
```

## Configuration

### Orchestration Options

```typescript
interface OrchestrationConfig {
  maxIterations: number; // Default: 2
  confidenceThreshold: number; // Default: 0.5
  enableStreaming: boolean; // Default: true
  parallelExecution: boolean; // Default: true
  baseUrl: string; // API base URL
}
```

### Model Configuration

All agents use Cloudflare Workers AI:

```typescript
const WORKERS_AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
```

## Streaming Events

The system emits SSE events for real-time UI updates:

| Event                   | Purpose                  |
| ----------------------- | ------------------------ |
| `orchestrator:thinking` | Orchestrator's reasoning |
| `orchestrator:plan`     | Planned agent dispatch   |
| `agent:start`           | Agent begins execution   |
| `agent:thinking`        | Agent's progress updates |
| `agent:tool_call`       | Tool being called        |
| `agent:complete`        | Agent finished           |
| `synthesis:delta`       | Synthesis streaming      |
| `qa:validation`         | Citation verification    |
| `xray`                  | Debugging data           |

## Error Handling

### Agent Failures

When an agent fails:

1. Error is logged with context
2. Orchestrator continues with remaining agents
3. Synthesis acknowledges missing data
4. User gets partial but honest response

### Graceful Degradation

- Single agent failure doesn't crash the system
- Partial data still produces useful response
- Clear indication of what couldn't be fetched
- X-Ray panel shows error details

## Performance

### Typical Response Times

| Phase                      | Duration      |
| -------------------------- | ------------- |
| Planning                   | 50-100ms      |
| Agent Execution (parallel) | 200-500ms     |
| Synthesis                  | 100-200ms     |
| QA Validation              | 50-150ms      |
| **Total**                  | **400-950ms** |

### Optimization Strategies

1. **Parallel execution** - Agents run concurrently
2. **Early streaming** - Response streams as generated
3. **Cached tools** - KV/R2 caching reduces latency
4. **Edge inference** - Same edge network

## Files Reference

```
ui/src/lib/ai/
├── agents/
│   ├── orchestrator.ts      # Lead coordinator
│   ├── scripture-agent.ts   # Bible text
│   ├── notes-agent.ts       # Translation notes
│   ├── words-agent.ts       # Term definitions
│   ├── academy-agent.ts     # Training articles
│   ├── questions-agent.ts   # Comprehension questions
│   ├── search-agent.ts      # Semantic search
│   ├── qa-validator.ts      # Citation verification
│   └── types.ts             # Shared types
├── orchestrated-chat.ts     # Main orchestration
└── workers-ai-client.ts     # AI interface
```

## Related Documentation

- [AI Chat Architecture](./AI_CHAT_ARCHITECTURE.md) - System overview
- [Agents Reference](./AGENTS_REFERENCE.md) - Detailed agent docs
- [Event-Driven Indexing](./EVENT_DRIVEN_INDEXING.md) - Search pipeline
