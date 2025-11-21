# SDK Prompts Integration - Decision & Implementation

## Decision: Include Prompts in SDKs ✅

**Decision**: Include optimized prompts as part of the existing SDKs rather than a separate package.

## Why SDKs Instead of Separate Package?

### ✅ Benefits

1. **One Less Package**: Clients already install the SDK - no additional dependency
2. **Natural Fit**: SDK provides tools, prompts help use them with AI - they belong together
3. **Versioned Together**: Prompts and SDK features evolve together
4. **Easier Discovery**: Clients find prompts when exploring SDK features
5. **Consistent Pattern**: SDKs already have optional utilities (like `adapters`) - prompts fit this pattern

### ❌ Separate Package Drawbacks

1. **Extra Dependency**: Clients would need to install another package
2. **Version Mismatch Risk**: Prompts and SDK could get out of sync
3. **Discovery Issue**: Clients might not know prompts exist
4. **Maintenance Overhead**: Another package to publish and maintain

## Implementation

### JS SDK (`@translation-helps/mcp-client`)

**Location**: `packages/js-sdk/src/prompts.ts`

**Usage**:

```typescript
import {
  getSystemPrompt,
  detectRequestType,
} from "@translation-helps/mcp-client";

// Auto-detect request type
const prompt = getSystemPrompt(undefined, endpointCalls, message);

// Or manually specify
const prompt = getSystemPrompt("comprehensive");
```

**Exports**: Added to `packages/js-sdk/src/index.ts`

### Python SDK (`translation-helps-mcp-client`)

**Location**: `packages/python-sdk/translation_helps/prompts.py`

**Usage**:

```python
from translation_helps.prompts import get_system_prompt, detect_request_type

# Auto-detect request type
prompt = get_system_prompt(None, endpoint_calls, message)

# Or manually specify
prompt = get_system_prompt('comprehensive')
```

**Exports**: Added to `packages/python-sdk/translation_helps/__init__.py`

## Migration for Existing Clients

### Svelte UI

```typescript
// Before (inline)
import { SYSTEM_PROMPT_CORE, getContextualRules } from "./+server.ts";

// After (from SDK)
import { getSystemPrompt } from "@translation-helps/mcp-client";
const prompt = getSystemPrompt(requestType, endpointCalls, message);
```

### Python Chatbot

```python
# Before (inline constant)
SYSTEM_PROMPT = """You are a Bible study assistant..."""  # ~1,200 tokens

# After (from SDK)
from translation_helps.prompts import get_system_prompt
prompt = get_system_prompt(None, endpoint_calls, message)  # ~400 tokens
```

### CLI Client

```typescript
// Before (inline)
this.messages.push({
  role: "system",
  content: `You are a Bible study assistant...`, // ~800 tokens
});

// After (from SDK)
import { getSystemPrompt } from "@translation-helps/mcp-client";
this.messages.push({
  role: "system",
  content: getSystemPrompt("default"), // ~400 tokens
});
```

## Benefits Summary

### Token Reduction

- **Python Chatbot**: 67% reduction (1,200 → 400 tokens)
- **CLI Client**: 50% reduction (800 → 400 tokens)
- **Svelte UI**: Already optimized, now shared

### Cost Savings

- Estimated $120-150/year savings (assuming 100k requests)
- Faster response times
- Better consistency across clients

### Developer Experience

- ✅ One package to install
- ✅ Discoverable in SDK documentation
- ✅ Type-safe (TypeScript) / Type-hinted (Python)
- ✅ Consistent API across languages

## Next Steps

1. ✅ Prompts integrated into both SDKs
2. ⏳ Update SDK documentation
3. ⏳ Migrate Python chatbot to use SDK prompts
4. ⏳ Migrate CLI client to use SDK prompts
5. ⏳ Migrate Svelte UI to use SDK prompts
6. ⏳ Publish updated SDK versions

## Files Changed

### JS SDK

- ✅ `packages/js-sdk/src/prompts.ts` (new)
- ✅ `packages/js-sdk/src/index.ts` (updated exports)

### Python SDK

- ✅ `packages/python-sdk/translation_helps/prompts.py` (new)
- ✅ `packages/python-sdk/translation_helps/__init__.py` (updated exports)

### Deprecated

- ⚠️ `packages/shared-prompts/` (marked as deprecated, can be removed later)
