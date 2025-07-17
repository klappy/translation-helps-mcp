# Quick Wins Reference

## Most Important Takeaways from Epic Session

_Quick reference for the patterns that save hours of debugging_

---

## 🚨 **Nuclear Debugging Protocol**

When changes aren't reflecting, execute in this order:

1. **Kill All Caches**:

   ```typescript
   get(key: string): any { return null; }  // Always miss
   ```

2. **Bump Version**:

   ```json
   { "version": "1.2.6" } // Force cache busting
   ```

3. **Nuclear Build**:

   ```bash
   rm -rf dist && npm run build
   ```

4. **Add Obvious Debug**:
   ```typescript
   console.log("🎯🎯🎯 THIS IS RUNNING! 🎯🎯🎯");
   ```

**If debug message doesn't appear → Wrong file is executing!**

---

## 🔍 **Duplicate File Hunting**

Always check for multiple implementations:

```bash
find . -name "*ResourceAggregator*" -type f
find . -name "*resource-aggregator*" -type f
grep -r "import.*ResourceAggregator" .
```

**Common Issue**: Source vs compiled versions conflict

---

## ⚡ **Parallel Tool Execution**

Never search sequentially when you can search simultaneously:

```bash
# ✅ GOOD: All at once
find . -name "*.ts" | grep resource &
grep -r "fetchScripture" . &
ls -la dist/netlify/functions/ &

# ❌ BAD: One at a time (slow)
find . -name "*.ts" | grep resource
grep -r "fetchScripture" .
ls -la dist/netlify/functions/
```

---

## 🎨 **UI CORS Solution**

**Never serve HTML as static files**. Always serve through Netlify functions:

```typescript
// netlify/functions/test-ui.ts
const testUIHTML = `<!DOCTYPE html>...`;
return {
  statusCode: 200,
  headers: { "Content-Type": "text/html" },
  body: testUIHTML,
};
```

**Result**: Same origin = No CORS issues

---

## 📦 **Translation Pipeline Fix**

The TWL/TW pipeline was broken due to resource filtering. **Critical pattern**:

```typescript
// ✅ EXCLUDE OBS resources from Bible queries
matches = name.endsWith("_twl") && !subject.includes("obs");
```

**Before**: 0 results  
**After**: 11+ results ✅

---

## 🔄 **Build Verification Pattern**

Always verify changes are actually compiled:

```bash
ls -la src/services/ResourceAggregator.ts    # Source timestamp
npm run build                                # Rebuild
ls -la dist/src/services/ResourceAggregator.js  # Compiled timestamp
grep -n "debug message" dist/src/services/ResourceAggregator.js  # Verify content
```

---

## 🤖 **Task Master Quick Commands**

Essential workflow commands:

```bash
task-master list               # See all tasks
task-master next              # What to work on
task-master show <id>         # Task details
task-master update-subtask --id=<id> --prompt="findings"
task-master set-status --id=<id> --status=done
```

---

## 🕵️ **Debug Message Strategy**

Use obvious, searchable indicators:

```typescript
// ✅ GOOD: Impossible to miss
console.log("🎯🎯🎯 NATE'S METHOD RUNNING! 🎯🎯🎯");

// ❌ BAD: Easy to overlook
console.log("debug");
```

**If you don't see your emoji message → Method not executing!**

---

## 📊 **Success Metrics Achieved**

| Component              | Before | After        | Status     |
| ---------------------- | ------ | ------------ | ---------- |
| Translation Words      | 0      | 10+          | ✅ Fixed   |
| Translation Word Links | 0      | 11+          | ✅ Fixed   |
| Translation Notes      | 0      | 4            | ✅ Working |
| Translation Questions  | 0      | 1            | ✅ Working |
| Testing UI             | None   | Professional | ✅ Built   |

---

## 🎯 **Most Important Learnings**

1. **Caching masks bugs** → Disable during debugging
2. **Multiple file versions are common** → Always hunt for duplicates
3. **Parallel searching saves time** → Use multiple tools simultaneously
4. **Obvious debug indicators work** → Use emojis and obvious messages
5. **Serve UIs from same origin** → Avoid CORS entirely
6. **Build verification is critical** → Check timestamps and content

---

## 🚨 **Red Flags to Watch For**

- **Changes not reflecting** → Caching or wrong file
- **Import errors** → Version conflicts
- **CORS errors** → Serving from wrong origin
- **Debug messages missing** → Code not executing
- **Timeouts** → Infinite loops or complex operations

---

## 🎉 **When This Works**

You'll know the patterns are working when:

- ✅ Debug messages appear immediately
- ✅ Changes reflect without delays
- ✅ Build timestamps match edit times
- ✅ No CORS errors in testing UI
- ✅ Resource counts are non-zero

---

**Remember**: _"When in doubt, go nuclear. Clear everything and rebuild from known good state."_

---

## 📚 **Full Documentation**

For complete details, see:

- **[Epic Session Learnings](EPIC_DEBUGGING_SESSION_LEARNINGS.md)** - Complete masterclass
- **[Implementation Summary](../IMPLEMENTATION_SUMMARY.md)** - Project overview
- **[Debugging Reference](QUICK_DEBUGGING_REFERENCE.md)** - Extended debugging guide
