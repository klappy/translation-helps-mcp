# Shared Prompts - DEPRECATED

⚠️ **This package has been moved into the SDKs.**

The prompts functionality is now part of:

- **JS SDK**: `@translation-helps/mcp-client` - Import from `@translation-helps/mcp-client/prompts`
- **Python SDK**: `translation-helps-mcp-client` - Import from `translation_helps.prompts`

## Migration

### TypeScript/JavaScript

```typescript
// Old (separate package)
import { getSystemPrompt } from "@translation-helps/shared-prompts";

// New (from SDK)
import { getSystemPrompt } from "@translation-helps/mcp-client";
```

### Python

```python
# Old (separate package)
from translation_helps_prompts import get_system_prompt

# New (from SDK)
from translation_helps.prompts import get_system_prompt
```

## Why the Change?

Including prompts in the SDKs provides:

- ✅ One less package to install
- ✅ Natural fit: SDK provides tools, prompts help use them with AI
- ✅ Versioned together with SDK
- ✅ Clients already have the SDK installed
