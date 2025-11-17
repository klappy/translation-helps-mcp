# MCP Server Capabilities: What Goes in `tools: {}` and `prompts: {}`

## Quick Answer

The empty objects `{}` are **correct and standard**. They indicate that the server supports tools and prompts. The presence of the key is what matters, not the contents.

However, these objects **can** contain optional configuration properties if needed.

---

## What the Empty Objects Mean

In the MCP protocol, declaring capabilities works like this:

```typescript
capabilities: {
  tools: {},      // ← "I support tools"
  prompts: {}    // ← "I support prompts"
}
```

**The empty object `{}` means:**

- ✅ "I support this capability"
- ✅ "I have no special configuration or restrictions"
- ✅ "Use default behavior"

This is the **standard pattern** for most MCP servers.

---

## Optional Configuration Properties

If you need to configure behavior, you can add properties to these objects:

### Tools Capability

```typescript
capabilities: {
  tools: {
    listChanged: true; // Optional: Enable notifications when tools are added/removed
  }
}
```

**Available properties:**

- `listChanged` (boolean, optional): If `true`, the server will send notifications when tools are added, removed, or updated after initialization. Useful for dynamic servers that add tools at runtime.

### Prompts Capability

```typescript
capabilities: {
  prompts: {
    listChanged: true; // Optional: Enable notifications when prompts are added/removed
  }
}
```

**Available properties:**

- `listChanged` (boolean, optional): If `true`, the server will send notifications when prompts are added, removed, or updated after initialization. Useful for dynamic servers that add prompts at runtime.

---

## When to Use Configuration

### Use Empty Objects `{}` When:

- ✅ Your tools/prompts are **static** (defined at startup, don't change)
- ✅ You don't need **change notifications**
- ✅ You want **default behavior**

**This is our case!** Our tools and prompts are defined at startup and don't change.

### Use Configuration When:

- ⚠️ Your tools/prompts are **dynamic** (added/removed at runtime)
- ⚠️ You want clients to be **notified** when tools/prompts change
- ⚠️ You need **custom behavior**

---

## Example: Dynamic Server

If you had a server that adds tools dynamically:

```typescript
const server = new Server(
  { name: "dynamic-server", version: "1.0.0" },
  {
    capabilities: {
      tools: {
        listChanged: true, // ← Enable change notifications
      },
      prompts: {
        listChanged: true,
      },
    },
  },
);

// Later, add a new tool dynamically
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Return updated tool list
  return { tools: [...existingTools, newTool] };
});

// The server will automatically notify clients that the tool list changed
```

---

## Our Current Implementation

Our server uses empty objects because:

1. **Static Tools**: All 10 tools are defined at startup
2. **Static Prompts**: All 3 prompts are defined at startup
3. **No Dynamic Changes**: Tools/prompts don't change at runtime
4. **Default Behavior**: We don't need special configuration

**Our current code is correct:**

```typescript
capabilities: {
  tools: {},    // ✅ Correct - supports tools, no special config needed
  prompts: {}  // ✅ Correct - supports prompts, no special config needed
}
```

---

## MCP Protocol Specification

According to the MCP specification:

- **Presence of key** = Capability is supported
- **Empty object `{}`** = Capability supported with default behavior
- **Object with properties** = Capability supported with custom configuration

The empty object is the **standard, recommended pattern** for most servers.

---

## Summary

| Question                          | Answer                                                 |
| --------------------------------- | ------------------------------------------------------ |
| **Are empty objects correct?**    | ✅ Yes, they're the standard pattern                   |
| **What do they mean?**            | "I support tools/prompts with default behavior"        |
| **Can we add properties?**        | ✅ Yes, but only if needed (e.g., `listChanged: true`) |
| **Do we need to add properties?** | ❌ No, empty objects are perfect for our use case      |
| **Should we change anything?**    | ❌ No, our current implementation is correct           |

---

## References

- [MCP Specification](https://modelcontextprotocol.io/docs/specification)
- [MCP SDK README](https://github.com/modelcontextprotocol/typescript-sdk)
- Our implementation: `src/index.ts` and `ui/src/routes/api/mcp/+server.ts`
