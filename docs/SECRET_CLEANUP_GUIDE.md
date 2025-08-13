# Secret Cleanup Guide

This guide explains how to remove exposed secrets from Git history when GitHub blocks pushes.

## Problem

GitHub detected an OpenAI API key in historical commit `c17b0e844ed78affb65078817f0c51a9560ad2cc` (netlify.toml:13) which is preventing tag pushes.

## Solution Options

### Option 1: BFG Repo-Cleaner (Recommended)

BFG is faster and easier than git filter-branch. Use the provided script:

```bash
chmod +x scripts/cleanup-secrets.sh
./scripts/cleanup-secrets.sh
```

### Option 2: Git Filter-Branch (Built-in)

If you can't use BFG, use git's built-in filter-branch:

```bash
# 1. Backup your repository first!
git clone --mirror https://github.com/klappy/translation-helps-mcp.git translation-helps-mcp-backup

# 2. Remove the file from specific commit
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch netlify.toml' \
  --prune-empty --tag-name-filter cat -- --all

# 3. Or remove specific content from all files
git filter-branch --force --tree-filter \
  'find . -type f -exec sed -i "" "s/sk-[a-zA-Z0-9]\{48\}/REDACTED/g" {} +' \
  --prune-empty --tag-name-filter cat -- --all

# 4. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push
git push origin --force --all
git push origin --force --tags
```

### Option 3: GitHub's Built-in Tool

GitHub provides a tool to allow specific secrets while you clean up:

1. Visit the URL from the error message:

   ```
   https://github.com/klappy/translation-helps-mcp/security/secret-scanning/unblock-secret/31FR3fpIh1WvUXGFfR7bVpolkht
   ```

2. Choose "Allow secret" temporarily

3. Push your tags

4. Clean up the history later

## Important Considerations

### Before Cleaning

1. **Rotate the exposed key immediately** - Any exposed key should be considered compromised
2. **Backup your repository** - History rewriting is destructive
3. **Notify collaborators** - They'll need to re-clone after history rewrite
4. **Check CI/CD** - Update any automated systems that might break

### After Cleaning

1. **Force push all branches**:

   ```bash
   git push origin --force --all
   ```

2. **Force push all tags**:

   ```bash
   git push origin --force --tags
   ```

3. **Update protected branches** - You may need to temporarily disable branch protection

4. **Verify the cleanup**:

   ```bash
   # Check if secret is gone from history
   git log -p -S"sk-" --all
   ```

5. **Tell collaborators to re-clone**:
   ```bash
   # Old clones will have conflicts, fresh clone is cleanest
   git clone https://github.com/klappy/translation-helps-mcp.git
   ```

## Alternative: Start Fresh with Clean History

If the repository has many secrets or you want a clean slate:

1. Create a new repository
2. Copy current code (without .git)
3. Initialize fresh Git history
4. Push to new repository
5. Archive old repository

## Preventing Future Exposures

1. **Use .gitignore** for sensitive files:

   ```
   .env
   .env.local
   *.key
   *.pem
   ```

2. **Use git-secrets** pre-commit hook:

   ```bash
   brew install git-secrets
   git secrets --install
   git secrets --register-aws  # or other providers
   ```

3. **Use environment variables** instead of hardcoding

4. **Review before committing**:
   ```bash
   git diff --staged
   ```

## GitHub Secret Scanning

GitHub automatically scans for exposed secrets. When detected:

1. You'll get security alerts
2. Push protection blocks pushes
3. You must rotate exposed keys
4. Clean history or bypass temporarily

Learn more: https://docs.github.com/en/code-security/secret-scanning
