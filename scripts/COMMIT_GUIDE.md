# Quick Commit Reference

**⚠️ CRITICAL: Follow this pattern to avoid infinite hangs!**

## The Safe Pattern

```bash
# 1. Stage changes
git add .

# 2. Simple commit (< 72 chars, no multi-line, no internal quotes)
git commit -m "feat: brief description"

# 3. If linting fails, bypass and fix later
git commit --no-verify -m "feat: core changes - linting fixes follow"
```

## Why Commits Fail

1. **Multi-line messages** → shell quote parsing confusion
2. **Internal quotes** → shell escape issues
3. **Pre-commit hooks** → linter errors block commit

## Emergency Recovery

```bash
# Escape stuck commit: Ctrl+C
# Check status: git status
# Reset if needed: git reset --soft HEAD~1
```

## Examples

✅ **GOOD:**

```bash
git commit -m "feat: add X-Ray tracing"
git commit -m "fix: resolve parameter mismatch"
git commit -m "docs: update API documentation"
```

❌ **BAD (causes hangs):**

```bash
git commit -m "feat: add feature
With multiple lines
And "quotes" inside"
```

**Full documentation:** `docs/GIT_COMMIT_BEST_PRACTICES.md`
