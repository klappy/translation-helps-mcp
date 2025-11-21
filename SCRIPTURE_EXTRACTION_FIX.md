# Scripture Extraction Fix - Critical Bug Resolution

## Problem

The scripture tool was successfully downloading and caching USFM files from Door43, but the **text was not being extracted** and passed to the CLI. The logs showed:

```
[INFO] ✅ Extracted text: 85 characters  ← Successfully extracted
[INFO] 📤 Returning scripture result with 4 translations  ← Service returns data
[INFO] Scripture fetched successfully {"textLength":0}  ← BUT textLength is 0!
```

The CLI then showed:

```
⚠️  No scripture text in response
```

## Root Cause

The `fetchScripture` service returns **multiple translations in an array** (`result.scriptures[]`), but the tool handler was only checking for `result.scripture` (singular), which doesn't exist when multiple translations are returned.

**Before:**

```typescript
text: result.scripture?.text || "",  // ❌ Always empty when multiple translations
```

## Solution

**Fixed `src/tools/fetchScripture.ts`:**

1. **Extract from array:** Check both `result.scripture` and `result.scriptures[0]`
2. **Validation:** Throw error if no text is found
3. **Logging:** Added detailed logs to show what's being extracted

```typescript
// Extract scripture text - service returns either .scripture or .scriptures[]
const scriptureText =
  result.scripture?.text || result.scriptures?.[0]?.text || "";

if (!scriptureText) {
  throw new Error("Scripture service returned no text");
}
```

## Additional Improvements

### AI Hallucination Prevention

The 1B model was making up scripture even when data was provided. Added:

1. **Response Validation:** Check if AI response includes the actual scripture provided
2. **Warning System:** Alert user when AI is hallucinating
3. **Stronger System Prompt:** Emphasize the harm of making up data

**CLI now warns:**

```
⚠️  WARNING: AI response doesn't match the scripture data provided!
The AI may be hallucinating. Using a larger model (7B+) is recommended.
```

## Testing

Run the CLI and test with a Bible reference:

```bash
npm run cli:start -- --model llama3.2:1b

You: Show me Romans 1:1
```

**Expected Results:**

1. ✅ Scripture downloads from Door43 (4 translations)
2. ✅ Text is extracted from USFM (85-217 chars per translation)
3. ✅ Tool handler extracts `scriptures[0].text` correctly
4. ✅ CLI receives actual scripture text (not empty)
5. ✅ AI gets the real scripture in context
6. ⚠️ If AI hallucinates, CLI warns the user

**Check Logs For:**

```
[INFO] ✍️  Extracted scripture from result {
  hasScripture: false,
  hasScriptures: true,
  scripturesCount: 4,
  textLength: 85,  ← Should be > 0 now!
  translation: 'ULT'
}
```

## Files Changed

- `src/tools/fetchScripture.ts` - Fixed extraction logic
- `clients/cli/src/chat-interface.ts` - Added validation + stronger prompts

## Status

✅ **FIXED** - Scripture text should now flow correctly from Door43 → Cache → Service → Tool → CLI → AI
