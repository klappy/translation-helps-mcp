# Migration Guide: Shared Prompts

This guide helps you migrate each client to use the shared prompts package.

## Benefits After Migration

- ✅ 60-70% token reduction
- ✅ Single source of truth
- ✅ Consistent behavior across all clients
- ✅ Easier maintenance

## Migration Steps

### 1. Svelte UI (`ui/src/routes/api/chat-stream/+server.ts`)

**Current State**: Has optimized prompt inline

**Migration**:

```typescript
// Before
import {
  SYSTEM_PROMPT_CORE,
  getContextualRules,
  detectRequestType,
} from "./+server.ts";

// After
import { getSystemPrompt } from "@translation-helps/shared-prompts";

// In callOpenAI and callOpenAIStream:
const requestType = detectRequestType(endpointCalls, message);
const systemPrompt = getSystemPrompt(requestType, endpointCalls, message);
```

**Benefits**: Already optimized, just needs to use shared package

---

### 2. Python Chatbot (`examples/python-chatbot/chatbot.py`)

**Current State**: Has full legacy prompt (~1,200 tokens)

**Migration**:

```python
# Before
SYSTEM_PROMPT = """You are a Bible study assistant..."""  # ~1,200 tokens

# After
from translation_helps_prompts import get_system_prompt, detect_request_type

# In main function:
request_type = detect_request_type(endpoint_calls, message)
system_prompt = get_system_prompt(request_type, endpoint_calls, message)
```

**Benefits**:

- 67% token reduction
- Consistent with other clients
- Automatic request type detection

**Steps**:

1. Install package: `pip install translation-helps-prompts` (or copy `python/prompts.py`)
2. Replace `SYSTEM_PROMPT` constant
3. Add request type detection before OpenAI call

---

### 3. CLI Client (`clients/cli/src/chat-interface.ts`)

**Current State**: Has system prompt in constructor (~800 tokens)

**Migration**:

```typescript
// Before
this.messages.push({
  role: "system",
  content: `You are a Bible study assistant...`, // ~800 tokens
});

// After
import { getSystemPrompt } from "@translation-helps/shared-prompts";

// In constructor or when building messages:
const systemPrompt = getSystemPrompt("default"); // or detect from context
this.messages.push({
  role: "system",
  content: systemPrompt,
});
```

**Benefits**:

- Token reduction
- Consistent with UI
- Can add request type detection for better contextual rules

**Steps**:

1. Install package: `npm install @translation-helps/shared-prompts`
2. Replace inline prompt
3. Optionally add request type detection

---

## Testing After Migration

1. **Token Count**: Verify token reduction in logs/metrics
2. **Response Quality**: Compare responses before/after
3. **Consistency**: Ensure all clients behave similarly
4. **Edge Cases**: Test different request types

## Rollback Plan

If issues arise, each client can temporarily revert to its original prompt while issues are resolved.
