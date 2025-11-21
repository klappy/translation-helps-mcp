# UI Integration Plan for MCP Prompts

## Overview

We can integrate the 3 MCP prompts into the existing UI in two locations:

1. **MCP Tools Page** (`/mcp-tools`) - For testing and demonstrating prompts
2. **Chat Interface** (`/chat`) - For actual AI-powered conversations using prompts

---

## 🎯 Integration Strategy

### **1. MCP Tools Page Integration**

#### **What to Add:**

**A new "Prompts" tab** alongside "Core Tools" and "Health Status":

```
[Core Tools] [Prompts] [Health Status]
              ^^^^^^^^
              NEW TAB
```

**Features:**

- List all 3 prompts with descriptions
- Parameter input form for each prompt
- "Execute Prompt" button that chains tools
- Real-time progress indicator showing workflow steps
- Organized result display (matching prompt format)
- Comparison view (show individual tool calls vs. prompt result)

#### **User Experience:**

```
1. User selects "Prompts" tab
2. User sees 3 prompt cards:
   📖 translation-helps-for-passage
   📚 get-translation-words-for-passage
   🎓 get-translation-academy-for-passage

3. User clicks a prompt card
4. Form appears with parameters:
   - Reference: [John 3:16]
   - Language: [en]

5. User clicks "Execute Prompt"
6. Progress indicator shows:
   ✅ Step 1: Fetching scripture... (200ms)
   ✅ Step 2: Fetching questions... (180ms)
   ⏳ Step 3: Fetching word links...
   ⏹️ Step 4: Fetching word articles...
   ⏹️ Step 5: Fetching notes...
   ⏹️ Step 6: Fetching academy articles...

7. Result displays in organized format:
   📖 Scripture Text
   📚 Key Terms (with titles)
   ❓ Translation Questions
   📝 Translation Notes
   🎓 Academy Articles
```

---

### **2. Chat Interface Integration**

#### **What to Add:**

**Prompt Quick Actions** in the suggestions section:

```typescript
const promptSuggestions = [
  {
    icon: "📖",
    title: "Complete Translation Help",
    prompt: "translation-helps-for-passage",
    description: "Get scripture, notes, questions, words, and academy articles",
    example: "Show me complete translation help for John 3:16",
  },
  {
    icon: "📚",
    title: "Dictionary Entries",
    prompt: "get-translation-words-for-passage",
    description: "See key terms with human-readable titles",
    example: "What are the key terms in Romans 1:1?",
  },
  {
    icon: "🎓",
    title: "Training Articles",
    prompt: "get-translation-academy-for-passage",
    description: "Find translation concepts for a passage",
    example: "What translation concepts apply to Matthew 5:13?",
  },
];
```

**Features:**

- Prominent prompt buttons in empty chat state
- Auto-suggest prompts based on user input
- Execute prompts via chat API with workflow explanation
- Format responses according to prompt guidelines

#### **User Experience:**

**Scenario A: User Clicks Prompt Button**

```
1. User sees "📖 Complete Translation Help" button
2. User clicks it
3. Dialog appears: "Enter a Bible reference"
4. User types "John 3:16"
5. Chat executes the prompt workflow
6. AI responds with organized comprehensive results
```

**Scenario B: Natural Language**

```
1. User types: "Help me translate Matthew 5:13"
2. System detects this matches "translation-helps-for-passage"
3. Shows suggestion: "💡 Use 'Complete Translation Help' prompt?"
4. User confirms or just sends message
5. Chat API executes the prompt workflow
6. Results displayed in organized format
```

---

## 🛠️ Technical Implementation

### **Phase 1: MCP Tools Page**

#### **1.1 Add Prompts Tab**

**File:** `ui/src/routes/(app)/mcp-tools/+page.svelte`

```typescript
// Update type to include 'prompts'
type MainCategory = "core" | "prompts" | "health";

const categoryConfig = {
  core: { name: "Core Tools", icon: Database },
  prompts: { name: "MCP Prompts", icon: Workflow }, // NEW
  health: { name: "Health Status", icon: Activity },
} as const;
```

#### **1.2 Create Prompt Definitions**

```typescript
const mcpPrompts = [
  {
    name: "translation-helps-for-passage",
    title: "Complete Translation Help",
    icon: "📖",
    description:
      "Get comprehensive help: scripture, notes, questions, word articles, and training resources",
    parameters: [
      {
        name: "reference",
        type: "text",
        required: true,
        placeholder: "e.g., John 3:16",
      },
      {
        name: "language",
        type: "text",
        required: false,
        default: "en",
        placeholder: "Language code",
      },
    ],
    workflow: [
      { step: 1, tool: "fetch_scripture", description: "Fetch scripture text" },
      {
        step: 2,
        tool: "fetch_translation_questions",
        description: "Get translation questions",
      },
      {
        step: 3,
        tool: "fetch_translation_word_links",
        description: "Get word links",
      },
      {
        step: 4,
        tool: "fetch_translation_word",
        description: "Fetch word articles (N calls)",
        multiple: true,
      },
      {
        step: 5,
        tool: "fetch_translation_notes",
        description: "Get translation notes",
      },
      {
        step: 6,
        tool: "fetch_translation_academy",
        description: "Get academy articles (M calls)",
        multiple: true,
      },
    ],
  },
  {
    name: "get-translation-words-for-passage",
    title: "Dictionary Entries",
    icon: "📚",
    description: "Get translation word definitions with human-readable titles",
    parameters: [
      {
        name: "reference",
        type: "text",
        required: true,
        placeholder: "e.g., Romans 1:1",
      },
      { name: "language", type: "text", required: false, default: "en" },
    ],
    workflow: [
      {
        step: 1,
        tool: "fetch_translation_word_links",
        description: "Get word links",
      },
      {
        step: 2,
        tool: "fetch_translation_word",
        description: "Fetch word articles",
        multiple: true,
      },
    ],
  },
  {
    name: "get-translation-academy-for-passage",
    title: "Training Articles",
    icon: "🎓",
    description: "Find Translation Academy articles referenced in notes",
    parameters: [
      {
        name: "reference",
        type: "text",
        required: true,
        placeholder: "e.g., Matthew 5:13",
      },
      { name: "language", type: "text", required: false, default: "en" },
    ],
    workflow: [
      {
        step: 1,
        tool: "fetch_translation_notes",
        description: "Get translation notes",
      },
      {
        step: 2,
        tool: "fetch_translation_academy",
        description: "Fetch academy articles",
        multiple: true,
      },
    ],
  },
];
```

#### **1.3 Create Prompt Executor Component**

**New File:** `ui/src/lib/components/PromptExecutor.svelte`

```svelte
<script lang="ts">
  export let prompt: any;

  let parameters: Record<string, any> = {};
  let isExecuting = false;
  let currentStep = 0;
  let results: any = null;
  let workflowLogs: Array<{step: number, status: 'pending' | 'running' | 'complete' | 'error', duration?: number, data?: any}> = [];

  async function executePrompt() {
    isExecuting = true;
    currentStep = 0;
    workflowLogs = prompt.workflow.map((w, i) => ({ step: i + 1, status: 'pending' }));

    try {
      // Call backend endpoint that executes the prompt
      const response = await fetch('/api/execute-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptName: prompt.name,
          parameters
        })
      });

      const data = await response.json();
      results = data;
    } catch (error) {
      console.error('Prompt execution failed:', error);
    } finally {
      isExecuting = false;
    }
  }
</script>

<div class="prompt-executor">
  <h2>{prompt.icon} {prompt.title}</h2>
  <p>{prompt.description}</p>

  <!-- Parameter Form -->
  <form on:submit|preventDefault={executePrompt}>
    {#each prompt.parameters as param}
      <label>
        {param.name}
        {#if param.required}<span class="required">*</span>{/if}
        <input
          type={param.type}
          bind:value={parameters[param.name]}
          placeholder={param.placeholder}
          required={param.required}
        />
      </label>
    {/each}

    <button type="submit" disabled={isExecuting}>
      {isExecuting ? 'Executing...' : 'Execute Prompt'}
    </button>
  </form>

  <!-- Workflow Progress -->
  {#if isExecuting || results}
    <div class="workflow-progress">
      <h3>Workflow Progress</h3>
      {#each workflowLogs as log}
        <div class="workflow-step" class:complete={log.status === 'complete'} class:running={log.status === 'running'}>
          {#if log.status === 'complete'}✅{:else if log.status === 'running'}⏳{:else}⏹️{/if}
          Step {log.step}: {prompt.workflow[log.step - 1].description}
          {#if log.duration}({log.duration}ms){/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Results Display -->
  {#if results}
    <div class="results">
      <h3>Results</h3>
      <!-- Format according to prompt type -->
      {#if prompt.name === 'translation-helps-for-passage'}
        <div class="comprehensive-results">
          <section>
            <h4>📖 Scripture Text</h4>
            <blockquote>{results.scripture}</blockquote>
          </section>

          <section>
            <h4>📚 Key Terms</h4>
            <ul>
              {#each results.words as word}
                <li><strong>{word.title}</strong> ({word.term})</li>
              {/each}
            </ul>
          </section>

          <section>
            <h4>❓ Translation Questions</h4>
            <!-- ... -->
          </section>

          <section>
            <h4>📝 Translation Notes</h4>
            <!-- ... -->
          </section>

          <section>
            <h4>🎓 Academy Articles</h4>
            <!-- ... -->
          </section>
        </div>
      {:else}
        <!-- Format for other prompts -->
        <pre>{JSON.stringify(results, null, 2)}</pre>
      {/if}
    </div>
  {/if}
</div>
```

#### **1.4 Create Backend Endpoint**

**New File:** `ui/src/routes/api/execute-prompt/+server.ts`

```typescript
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, platform }) => {
  const { promptName, parameters } = await request.json();

  // Execute the prompt workflow
  switch (promptName) {
    case "translation-helps-for-passage":
      return await executeTranslationHelpsPrompt(parameters, platform);
    case "get-translation-words-for-passage":
      return await executeWordsPrompt(parameters, platform);
    case "get-translation-academy-for-passage":
      return await executeAcademyPrompt(parameters, platform);
    default:
      return json({ error: "Unknown prompt" }, { status: 400 });
  }
};

async function executeTranslationHelpsPrompt(params: any, platform: any) {
  const { reference, language = "en" } = params;
  const results: any = {};

  // Step 1: Fetch scripture
  const scripture = await fetch(
    `${baseUrl}/api/fetch-scripture?reference=${reference}&language=${language}`,
  );
  results.scripture = await scripture.json();

  // Step 2: Fetch questions
  const questions = await fetch(
    `${baseUrl}/api/translation-questions?reference=${reference}&language=${language}`,
  );
  results.questions = await questions.json();

  // Step 3: Fetch word links
  const links = await fetch(
    `${baseUrl}/api/fetch-translation-word-links?reference=${reference}&language=${language}`,
  );
  const linksData = await links.json();

  // Step 4: Fetch word articles for each term
  results.words = [];
  for (const link of linksData.translationWordLinks || []) {
    const word = await fetch(
      `${baseUrl}/api/fetch-translation-word?term=${link.term}&language=${language}`,
    );
    const wordData = await word.json();

    // Extract title from markdown (first H1)
    const titleMatch = wordData.content?.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : link.term;

    results.words.push({
      term: link.term,
      title: title,
      category: link.category,
    });
  }

  // Step 5: Fetch notes
  const notes = await fetch(
    `${baseUrl}/api/translation-notes?reference=${reference}&language=${language}`,
  );
  results.notes = await notes.json();

  // Step 6: Fetch academy articles from supportReferences
  results.academyArticles = [];
  const supportRefs = extractSupportReferences(results.notes);
  for (const ref of supportRefs) {
    const academy = await fetch(
      `${baseUrl}/api/fetch-translation-academy?rcLink=${encodeURIComponent(ref)}&language=${language}`,
    );
    const academyData = await academy.json();
    results.academyArticles.push(academyData);
  }

  return json(results);
}

function extractSupportReferences(notesData: any): string[] {
  const refs = new Set<string>();
  // Extract RC links from notes
  for (const note of notesData.notes || []) {
    if (note.supportReference) {
      refs.add(note.supportReference);
    }
  }
  return Array.from(refs);
}
```

---

### **Phase 2: Chat Interface**

#### **2.1 Add Prompt Suggestions**

**File:** `ui/src/routes/(app)/chat/ChatInterface.svelte`

Update the `suggestions` array:

```typescript
const suggestions = [
  // Existing suggestions...

  // Add prompt-based suggestions
  {
    title: "📖 Complete Translation Help",
    prompt: "Show me complete translation help for John 3:16",
    description:
      "Get scripture, notes, questions, word definitions, and training articles all at once.",
    isPrompt: true,
    promptName: "translation-helps-for-passage",
  },
  {
    title: "📚 Key Terms with Titles",
    prompt:
      "What are the key biblical terms in Romans 1:1? Show me their dictionary titles.",
    description:
      "See dictionary entry titles (not technical IDs) for all key terms.",
    isPrompt: true,
    promptName: "get-translation-words-for-passage",
  },
  {
    title: "🎓 Translation Concepts",
    prompt:
      "What translation concepts and training articles apply to Matthew 5:13?",
    description: "Find Translation Academy articles referenced in the notes.",
    isPrompt: true,
    promptName: "get-translation-academy-for-passage",
  },
];
```

#### **2.2 Enhance Chat API**

**File:** `ui/src/routes/api/chat/+server.ts`

Add prompt awareness:

```typescript
export const POST: RequestHandler = async ({ request, platform }) => {
  const { message, history, usePrompt } = await request.json();

  // Detect if message matches a prompt pattern
  const detectedPrompt = detectPromptFromMessage(message);

  if (detectedPrompt) {
    // Execute the prompt workflow and format results
    const promptResults = await executePromptWorkflow(
      detectedPrompt,
      message,
      platform,
    );

    // Generate AI response with the prompt results
    return streamAIResponse(message, history, promptResults);
  }

  // Regular chat flow...
};

function detectPromptFromMessage(message: string): string | null {
  const lower = message.toLowerCase();

  if (lower.includes("complete") && lower.includes("translation help")) {
    return "translation-helps-for-passage";
  }
  if (lower.includes("key terms") || lower.includes("dictionary entries")) {
    return "get-translation-words-for-passage";
  }
  if (
    lower.includes("translation concepts") ||
    lower.includes("academy") ||
    lower.includes("training")
  ) {
    return "get-translation-academy-for-passage";
  }

  return null;
}
```

---

## 🎨 UI/UX Design

### **MCP Tools - Prompts Tab**

```
┌─────────────────────────────────────────────────────────┐
│  [Core Tools]  [Prompts ✨]  [Health Status]           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📖 Complete Translation Help                           │
│  Get comprehensive help: scripture, notes, questions... │
│  [Try This Prompt →]                                    │
│                                                          │
│  📚 Dictionary Entries                                  │
│  Get translation word definitions with readable titles  │
│  [Try This Prompt →]                                    │
│                                                          │
│  🎓 Training Articles                                   │
│  Find Translation Academy articles for a passage        │
│  [Try This Prompt →]                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **Prompt Executor Modal**

```
┌─────────────────────────────────────────────────────────┐
│  📖 Complete Translation Help                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Reference *                                            │
│  [John 3:16________________]                            │
│                                                          │
│  Language                                               │
│  [en_______________________]                            │
│                                                          │
│  [Execute Prompt]                                       │
│                                                          │
│  ──── Workflow Progress ────                            │
│  ✅ Step 1: Fetch scripture (180ms)                    │
│  ✅ Step 2: Fetch questions (120ms)                    │
│  ✅ Step 3: Fetch word links (200ms)                   │
│  ⏳ Step 4: Fetching word articles (8 remaining...)    │
│  ⏹️ Step 5: Fetch notes                                │
│  ⏹️ Step 6: Fetch academy articles                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **Chat Interface - Prompt Buttons**

```
┌─────────────────────────────────────────────────────────┐
│  Translation Helps Chat                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Quick Actions:                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ 📖 Complete  │ │ 📚 Dictionary│ │ 🎓 Training  │   │
│  │    Help      │ │   Entries    │ │   Articles   │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                          │
│  Type a message or click a quick action...              │
│  ┌────────────────────────────────────────┐ [Send]     │
│  │                                        │             │
│  └────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Implementation Phases

### **Phase 1: MCP Tools (Week 1)**

- ✅ Day 1-2: Add "Prompts" tab to mcp-tools page
- ✅ Day 3-4: Create PromptExecutor component
- ✅ Day 5: Create `/api/execute-prompt` endpoint
- ✅ Day 6-7: Testing and refinement

### **Phase 2: Chat Interface (Week 2)**

- ✅ Day 1-2: Add prompt suggestions to chat
- ✅ Day 3-4: Enhance chat API with prompt detection
- ✅ Day 5: Format prompt results in chat responses
- ✅ Day 6-7: Testing and refinement

### **Phase 3: Polish (Week 3)**

- ✅ Day 1-2: UI/UX improvements
- ✅ Day 3-4: Performance optimization
- ✅ Day 5-7: Documentation and examples

---

## 🎯 Success Metrics

### **MCP Tools Page:**

- Users can execute prompts with 2 clicks
- Workflow progress is clearly visible
- Results are formatted and organized
- Tool calls can be inspected individually

### **Chat Interface:**

- Prompt suggestions are discoverable
- Natural language triggers prompts automatically
- AI responses use prompt-formatted data
- Users get comprehensive answers in one response

---

## 🔮 Future Enhancements

1. **Prompt Builder** - Let users create custom prompts
2. **Prompt Templates** - Save frequently used configurations
3. **Comparison Mode** - Show "with prompt" vs "without prompt"
4. **Export Results** - Download prompt results as PDF/Markdown
5. **Shared Prompts** - Share prompt results via URL

---

## 📚 Related Documentation

- [MCP Prompts Guide](./MCP_PROMPTS_GUIDE.md)
- [How to Use Prompts](./HOW_TO_USE_PROMPTS.md)
- [MCP Protocol Compliance](./MCP_PROTOCOL_COMPLIANCE.md)

---

**Ready to implement? This plan provides everything needed to bring MCP prompts into your UI! 🚀**
