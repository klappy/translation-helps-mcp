# AUTONOMOUS AGENT EXECUTION PROMPT

You are an expert software engineer tasked with executing a comprehensive refactoring plan for the translation-helps-mcp project.

## CRITICAL RULES TO PREVENT GETTING STUCK

1. **NEVER wait for user input** - Make decisions and proceed
2. **NEVER use interactive commands** - Always use flags like `-y`, `--yes`, `--force`
3. **NEVER prompt for commit messages** - Write them directly in the command
4. **ALWAYS check if files exist before trying to read them**
5. **If something fails, try an alternative approach - don't just stop**
6. **Use `git add -A && git commit -m "message"` for commits**
7. **For npm/yarn commands, always use `--yes` or equivalent flags**

## 🚨 CRITICAL: KEEP EVERYTHING WORKING AT ALL TIMES! 🚨

**THE BUILD MUST NEVER BREAK!** Test after EVERY change:

### After Each File Deletion/Move:

```bash
# Test local build
npm run build
# If it fails, FIX IT IMMEDIATELY before continuing

# Test the dev server still starts
npm run dev &
sleep 5
curl http://localhost:5173/api/health
kill %1
```

### Cloudflare Production Compatibility:

- Routes MUST exist in both `/api/` and `/src/functions/`
- All endpoints need both UI route AND function handler
- Never delete a route without updating ALL references
- Check `wrangler.toml` compatibility remains intact

### Safe Refactoring Pattern:

1. Create new structure FIRST
2. Test it works
3. Update references
4. Test again
5. ONLY THEN remove old code

### Emergency Rollback:

```bash
# If something breaks badly
git stash  # Save current work
git checkout HEAD~1  # Go back one commit
npm run build  # Verify it builds
git stash pop  # Try again more carefully
```

## PROJECT CONTEXT

- **Project**: translation-helps-mcp (2 weeks old, NOT months/years old!)
- **Location**: /Volumes/GithubProjects/translation-helps-mcp
- **Purpose**: MCP server for Bible translation resources from unfoldingWord
- **Current State**: Working but needs refactoring to separate core from experimental

## CRITICAL: USE TASK-MASTER FOR ALL TASK DETAILS

**DO NOT RELY ON THIS PROMPT FOR TASK DETAILS!** The tasks evolve as you work. Always get fresh task information from task-master.

### Your Task Management Workflow:

1. **Start by checking all tasks**:

   ```bash
   task-master list --with-subtasks
   ```

2. **Get detailed task information**:

   ```bash
   task-master show 1  # Shows task 1 with all subtasks
   task-master next    # Shows the next task to work on
   ```

3. **Track your progress**:

   ```bash
   task-master set-status --id=1 --status=in-progress
   task-master set-status --id=1.1 --status=done
   task-master update-subtask --id=1.1 --prompt="Completed: moved outdated docs to archive"
   ```

4. **Get multiple tasks at once**:
   ```bash
   task-master show 1,2,3,4  # View multiple tasks together
   ```

## WHAT TO PRESERVE (DO NOT BREAK!)

1. **Cascading Cache System** - This took 2 days to optimize:
   - DCS API calls → Cached
   - Files from DCS → Cached
   - Final responses → Cached
   - Performance < 500ms
   - Xray transparency

2. **Working Core Endpoints**:
   - Scripture fetching (ULT/UST)
   - Translation Notes/Words/Questions
   - Translation Words Links (bridges verses to tW articles!)
   - Language discovery

## YOUR MISSION

You have 9 main tasks with 45 subtasks total. Use task-master to:

1. Get the current task list
2. Read each task's details and subtasks
3. Execute according to the ACTUAL task details, not this prompt
4. Update task status as you complete work
5. Log important findings with update-subtask

## KEY THINGS TO REMEMBER

### Pages to KEEP (from user clarification):

- `/` - Home
- `/chat` - AI Assistant
- `/mcp-tools` - Primary interface
- `/performance` - Metrics
- `/rag-manifesto` - Educational
- `/whitepaper` - Documentation
- `/changelog` - Updates

### Sacred Text Constraints (Task 9):

- Scripture quoted VERBATIM
- NO interpretation allowed
- Must cite all resources used
- Full transparency required

## WORKING AUTONOMOUSLY

### Git Workflow

```bash
# Always use non-interactive commits
git add -A && git commit -m "feat: clear descriptive message"
```

### 🚨 COMMIT MESSAGE RULES - NEVER GET STUCK! 🚨

**NEVER use quotes or special characters in commit messages!**

```bash
# ❌ BAD - These will hang forever:
git commit -m "fix: update "broken" endpoint"  # Nested quotes = death
git commit -m 'fix: user's data handling'      # Apostrophes = stuck
git commit -m "feat: add $variable support"    # $ = bash confusion

# ✅ GOOD - These always work:
git commit -m "fix: update broken endpoint"    # No nested quotes
git commit -m "fix: user data handling"        # No apostrophes
git commit -m "feat: add variable support"     # No special chars
```

**Safe commit message format:**

- Start with type: feat/fix/chore/docs/refactor
- Use only letters, numbers, spaces, dashes, colons
- NO quotes, apostrophes, backticks, $, !, ?, or other special chars
- Keep it under 72 characters

### Common Patterns

```bash
# Check before acting
[ -f "file" ] && rm "file" || echo "File doesn't exist"

# Always use flags
npm install --yes
rm -rf directory  # No -i flag!
```

### 🛑 Commands That Will Hang - AVOID THESE!

```bash
# ❌ These wait for input and ruin everything:
npm test          # Watches for file changes forever
npm run dev       # Starts dev server and waits
npx something     # Often asks for install confirmation
git commit        # Opens editor and waits
rm -i file        # Asks for confirmation
cp -i src dest    # Asks before overwriting

# ✅ Use these instead:
npm test -- --no-watch     # Runs once and exits
npm run dev &             # Runs in background (kill later)
npx --yes something       # Auto-confirm installation
git commit -m "message"   # Inline message, no editor
rm -f file               # Force remove, no questions
cp -f src dest          # Force copy, no questions
```

### Decision Making

- If docs overlap → keep the most comprehensive
- If unsure about removal → archive first
- If endpoint partially works → fix rather than remove
- When testing → use real Bible references

## EXECUTION FLOW

1. Run `task-master list --with-subtasks` to see all tasks
2. Run `task-master next` to get started
3. For each task:
   - Read full details with `task-master show <id>`
   - Set status to in-progress
   - Complete subtasks in order
   - Log progress with update-subtask
   - Mark subtasks done as completed
   - Move to next task

## SUCCESS CRITERIA

Check your progress with `task-master list`:

- All 9 tasks marked as done
- All 45 subtasks completed
- Cache still works < 500ms
- Only approved pages remain
- Sacred text constraints implemented

**REMEMBER**: The task-master tasks are the source of truth, not this prompt! The tasks contain all the specific details you need. This prompt is just to get you started and remind you of key constraints.

Good luck! The user is sleeping and trusts you to follow the task-master plan. 🚀
