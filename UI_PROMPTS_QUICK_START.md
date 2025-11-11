# UI Prompts Integration - Quick Start

## 🎯 Two Integration Points

### 1. **MCP Tools Page** (`/mcp-tools`) - For Testing

Add a new "Prompts" tab where users can:

- Select a prompt
- Fill in parameters (reference, language)
- Watch the workflow execute step-by-step
- See organized results

### 2. **Chat Interface** (`/chat`) - For AI Conversations

Add prompt quick actions that:

- Show as clickable buttons
- Auto-trigger based on user message
- Execute full workflows
- Return formatted results to AI

---

## 🚀 Quick Implementation

### **Step 1: MCP Tools - Add Prompts Tab** (2 hours)

**File:** `ui/src/routes/(app)/mcp-tools/+page.svelte`

```diff
- type MainCategory = 'core' | 'health';
+ type MainCategory = 'core' | 'prompts' | 'health';

  const categoryConfig = {
    core: { name: 'Core Tools', icon: Database },
+   prompts: { name: 'MCP Prompts', icon: Workflow },
    health: { name: 'Health Status', icon: Activity }
  };
```

### **Step 2: Create Prompt Executor** (4 hours)

**New File:** `ui/src/lib/components/PromptExecutor.svelte`

```svelte
<script lang="ts">
  export let promptName: string;

  let reference = '';
  let language = 'en';
  let results = null;

  async function execute() {
    const res = await fetch('/api/execute-prompt', {
      method: 'POST',
      body: JSON.stringify({ promptName, parameters: { reference, language } })
    });
    results = await res.json();
  }
</script>

<form on:submit|preventDefault={execute}>
  <input bind:value={reference} placeholder="John 3:16" required />
  <input bind:value={language} placeholder="en" />
  <button>Execute</button>
</form>

{#if results}
  <!-- Display formatted results -->
{/if}
```

### **Step 3: Create Backend Endpoint** (6 hours)

**New File:** `ui/src/routes/api/execute-prompt/+server.ts`

```typescript
export const POST: RequestHandler = async ({ request }) => {
  const { promptName, parameters } = await request.json();
  const { reference, language = "en" } = parameters;

  if (promptName === "translation-helps-for-passage") {
    // Chain 6+ tool calls
    const scripture = await fetch(
      `/api/fetch-scripture?reference=${reference}`,
    );
    const questions = await fetch(
      `/api/translation-questions?reference=${reference}`,
    );
    const wordLinks = await fetch(
      `/api/fetch-translation-word-links?reference=${reference}`,
    );

    // ... fetch word articles, notes, academy articles

    return json({ scripture, questions, words, notes, academy });
  }

  // ... other prompts
};
```

### **Step 4: Chat Integration** (4 hours)

**File:** `ui/src/routes/(app)/chat/ChatInterface.svelte`

```diff
  const suggestions = [
    // ... existing suggestions
+   {
+     title: '📖 Complete Translation Help',
+     prompt: 'Show me complete translation help for John 3:16',
+     isPrompt: true
+   }
  ];
```

---

## 📊 What Users Will See

### **MCP Tools Page:**

```
┌────────────────────────────────────┐
│ [Core Tools] [Prompts✨] [Health] │
├────────────────────────────────────┤
│                                    │
│ 📖 Complete Translation Help       │
│ ┌────────────────────────────────┐│
│ │ Reference: [John 3:16_________]││
│ │ Language:  [en________________]││
│ │ [Execute Prompt]               ││
│ └────────────────────────────────┘│
│                                    │
│ Workflow:                          │
│ ✅ Scripture (180ms)              │
│ ✅ Questions (120ms)              │
│ ⏳ Word links...                  │
│                                    │
│ Results:                           │
│ 📖 Scripture: "For God so loved..." │
│ 📚 Terms: Love, God, World...      │
│ ❓ Questions: Why did God...       │
│                                    │
└────────────────────────────────────┘
```

### **Chat Interface:**

```
┌────────────────────────────────────┐
│ Quick Actions:                     │
│ [📖 Complete Help] [📚 Terms]     │
│                                    │
│ User: Help me translate John 3:16 │
│                                    │
│ AI: I'll use the Complete          │
│     Translation Help workflow...   │
│                                    │
│     📖 Scripture:                  │
│     "For God so loved..."          │
│                                    │
│     📚 Key Terms:                  │
│     • Love, Beloved                │
│     • God                          │
│     • Son of God, Son              │
│                                    │
│     ❓ Questions:                  │
│     1. Why did God give His Son?   │
│                                    │
│     📝 Notes:                      │
│     "loved the world" - emphasizes │
│     God's love for ALL people      │
│                                    │
└────────────────────────────────────┘
```

---

## 🎁 Key Benefits

### **For Testing (MCP Tools):**

✅ Visual workflow execution  
✅ Step-by-step progress  
✅ Organized result display  
✅ Easy to debug

### **For Users (Chat):**

✅ One-click comprehensive help  
✅ Natural language triggers  
✅ Human-readable results  
✅ No manual tool chaining

---

## ⏱️ Time Estimate

- **MCP Tools Integration:** 12 hours (1.5 days)
- **Chat Integration:** 8 hours (1 day)
- **Testing & Polish:** 8 hours (1 day)
- **Total:** ~3.5 days

---

## 🔗 Full Documentation

See [UI_PROMPTS_INTEGRATION_PLAN.md](./UI_PROMPTS_INTEGRATION_PLAN.md) for:

- Complete technical specifications
- Detailed UI/UX designs
- Backend implementation details
- Phase-by-phase breakdown
- Success metrics

---

## ✅ Next Steps

1. Review the full integration plan
2. Decide: Start with MCP Tools or Chat first?
3. Create feature branch: `git checkout -b feature/ui-prompts-integration`
4. Begin implementation
5. Test with real data
6. Deploy to staging
7. Gather user feedback

**Ready to make your UI prompt-aware! 🚀**
