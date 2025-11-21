# Release Notes

## JS SDK v1.1.0 - Optimized System Prompts

### New Features

- **Optimized System Prompts**: Added `getSystemPrompt()` and `detectRequestType()` functions
  - 60-70% token reduction compared to legacy prompts
  - Contextual rules based on request type
  - Automatic request type detection from endpoint calls and messages

### Usage

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

### Breaking Changes

None - this is a feature addition.

### Migration

No migration needed. Existing code continues to work. New prompts are opt-in.

---

## Python SDK v1.2.0 - Optimized System Prompts

### New Features

- **Optimized System Prompts**: Added `get_system_prompt()` and `detect_request_type()` functions
  - 60-70% token reduction compared to legacy prompts
  - Contextual rules based on request type
  - Automatic request type detection from endpoint calls and messages

### Usage

```python
from translation_helps.prompts import get_system_prompt, detect_request_type

# Auto-detect request type
prompt = get_system_prompt(None, endpoint_calls, message)

# Or manually specify
prompt = get_system_prompt('comprehensive')
```

### Breaking Changes

None - this is a feature addition.

### Migration

No migration needed. Existing code continues to work. New prompts are opt-in.

---

## Benefits

- **Cost Savings**: 60-70% reduction in system prompt tokens
- **Faster Responses**: Smaller prompts = faster API calls
- **Better Consistency**: Same prompts across all clients
- **Easier Maintenance**: Update prompts once, all clients benefit

## Compatibility

- ✅ Fully backward compatible
- ✅ No breaking changes
- ✅ Existing code continues to work
- ✅ New prompts are opt-in
