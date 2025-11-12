# AI Hallucination Fix - Version 2

## Problem

The AI models (both `mistral:7b` and `llama3.2:1b`) were **completely ignoring** the Door43 scripture data provided and instead quoting from their training data (KJV, NIV, etc.).

**Evidence from logs:**

- ✅ Scripture was fetched correctly: `"1 I, Paul, who serve Christ Jesus, am writing this letter..."`
- ❌ AI responded with: `"Romans 1:1 (KJV) states: 'Paul, a servant of Jesus Christ, called to be an apostle...'"`
- ❌ AI completely ignored the provided text

## Root Cause

Smaller language models have a strong tendency to use their training data instead of provided context, especially when:

1. The data is only in system messages (less prominent)
2. The instructions aren't explicit enough
3. The model "knows" the verse from training

## Solution

### 1. **Direct Scripture Injection in User Message**

Instead of only putting scripture in the system message, we now inject it **directly into the user message** with explicit instructions:

```typescript
// Scripture now appears in BOTH system and user messages
userContent += `\n\n🚨 REQUIRED SCRIPTURE TEXT (Quote this EXACTLY):\n"${scriptureText}"\n\n`;
userContent += `\n🚨 CRITICAL INSTRUCTIONS:\n`;
userContent += `1. You MUST quote the scripture text shown above EXACTLY, word-for-word\n`;
// ... more explicit instructions
```

### 2. **Stronger System Prompt**

Updated system prompt to:

- Explicitly tell AI to IGNORE training data
- List specific translations to NEVER use (KJV, NIV, NLT, etc.)
- Emphasize the harm of making up scripture
- Instruct to refuse to answer rather than invent

### 3. **Enhanced Validation**

Improved hallucination detection:

- Checks if AI quoted the correct scripture
- Detects common wrong translations (KJV phrases, etc.)
- Shows side-by-side comparison: correct vs. AI's wrong response
- Provides clear warnings when hallucination is detected

## Changes Made

### `clients/cli/src/chat-interface.ts`

1. **System Prompt** (lines 31-52):
   - Added explicit "IGNORE training data" instructions
   - Listed forbidden translations (KJV, NIV, NLT, etc.)
   - Emphasized harm of hallucination

2. **User Message Enhancement** (lines 266-300):
   - Extract scripture text from context
   - Inject scripture directly into user message
   - Add explicit step-by-step instructions
   - Make it impossible to miss the required text

3. **Validation** (lines 314-378):
   - Detect wrong translations (KJV, NIV, etc.)
   - Check if correct scripture was quoted
   - Show side-by-side comparison
   - Provide actionable warnings

## Testing

Run the CLI and test:

```bash
npm run cli:start -- --model llama3.2:1b

You: show me Romans 1:1
```

**Expected Behavior:**

1. ✅ Scripture is fetched and displayed in console
2. ✅ Scripture is injected into user message with explicit instructions
3. ✅ AI should quote the provided scripture EXACTLY
4. ⚠️ If AI hallucinates, validation will catch it and show a warning

**What to Look For:**

- **Good Response:** AI quotes: `"1 I, Paul, who serve Christ Jesus, am writing this letter..."`
- **Bad Response:** AI quotes: `"Paul, a servant of Jesus Christ..."` (KJV) → Will trigger warning

## Limitations

**Smaller models (1B-3B) may still hallucinate** because:

- They have limited instruction-following capability
- Training data is very strong (Bible verses are common in training)
- Context window attention may not prioritize provided data

**Recommendations:**

- Use 7B+ models for production
- Consider fine-tuning on instruction-following
- Use temperature=0 for more deterministic responses
- Consider using a larger context window

## Status

✅ **IMPLEMENTED** - Scripture is now injected directly into user messages with explicit instructions. Validation will catch hallucinations and warn users.

**Next Steps:**

- Test with different models
- Consider adding a "refuse to answer" mode if data is missing
- Monitor hallucination rates across models
