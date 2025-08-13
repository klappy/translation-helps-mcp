#!/bin/bash
# Script to clean up exposed secrets from Git history
# WARNING: This rewrites history - make sure you have backups!

echo "🔐 Git History Secret Cleanup Script"
echo "===================================="
echo ""
echo "⚠️  WARNING: This will rewrite Git history!"
echo "⚠️  All collaborators will need to re-clone after this."
echo ""
read -p "Have you backed up your repository? (yes/no): " backup_confirm

if [ "$backup_confirm" != "yes" ]; then
    echo "❌ Please backup your repository first!"
    echo "   Run: git clone --mirror https://github.com/klappy/translation-helps-mcp.git translation-helps-mcp-backup"
    exit 1
fi

echo ""
echo "📦 Step 1: Installing BFG Repo-Cleaner..."
if ! command -v bfg &> /dev/null; then
    if command -v brew &> /dev/null; then
        brew install bfg
    else
        echo "Please install BFG manually:"
        echo "  - Download from: https://rtyley.github.io/bfg-repo-cleaner/"
        echo "  - Or use: java -jar bfg.jar (if you download the JAR)"
        exit 1
    fi
fi

echo ""
echo "📝 Step 2: Creating secrets.txt file with patterns to remove..."
cat > secrets.txt << 'EOF'
sk-[a-zA-Z0-9]{48}
OPENAI_API_KEY=sk-[a-zA-Z0-9]{48}
EOF

echo ""
echo "🧹 Step 3: Running BFG to clean secrets..."
echo "This will remove all OpenAI API keys from history"
bfg --replace-text secrets.txt

echo ""
echo "🗑️  Step 4: Cleaning up Git repository..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "📊 Step 5: Verifying the cleanup..."
echo "Checking if the problematic commit still contains secrets..."
git show c17b0e844ed78affb65078817f0c51a9560ad2cc:netlify.toml 2>/dev/null | grep -E "sk-[a-zA-Z0-9]{48}" || echo "✅ Secret removed from history!"

echo ""
echo "🏷️  Step 6: Next steps:"
echo "1. Force push to GitHub:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "2. Delete and re-create protected tags if needed:"
echo "   git tag -d v3.2.0"
echo "   git push origin :refs/tags/v3.2.0"
echo "   git tag v3.2.0 <new-commit-sha>"
echo "   git push origin v3.2.0"
echo ""
echo "3. Contact all collaborators to re-clone the repository"
echo ""
echo "4. Ensure the exposed API key has been rotated"

# Clean up
rm -f secrets.txt
