#!/bin/bash
# Execute V2 Replacement - Move V2 to be the main API

set -e

echo "🚀 Starting V2 Replacement Process..."
echo "This will:"
echo "  1. Move all v2 endpoints to be the main API"
echo "  2. Remove ALL old v1 endpoints"
echo "  3. Update the codebase for v6.0.0"
echo ""
echo "⚠️  This is a BREAKING CHANGE!"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

echo ""
echo "📦 Step 1: Moving V2 endpoints to root..."

# Move all v2 endpoints to the main API directory
for dir in ui/src/routes/api/v2/*; do
    if [ -d "$dir" ]; then
        basename=$(basename "$dir")
        echo "  Moving $basename..."
        git mv "$dir" "ui/src/routes/api/$basename" || true
    fi
done

# Remove the now-empty v2 directory
rmdir ui/src/routes/api/v2 || true

echo ""
echo "🗑️  Step 2: Removing old v1 endpoints..."

# Remove all old v1 endpoints
old_endpoints=(
    "fetch-scripture"
    "fetch-translation-notes"
    "fetch-translation-questions"
    "fetch-translation-words"
    "fetch-translation-academy"
    "fetch-translation-word-links"
    "fetch-ult-scripture"
    "fetch-ust-scripture"
    "browse-translation-academy"
    "browse-translation-words"
    "get-available-books"
    "get-context"
    "get-languages"
    "get-translation-word"
    "get-words-for-reference"
    "resource-catalog"
    "resource-recommendations"
    "language-coverage"
    "list-available-resources"
    "extract-references"
)

for endpoint in "${old_endpoints[@]}"; do
    if [ -d "ui/src/routes/api/$endpoint" ]; then
        echo "  Removing $endpoint..."
        git rm -rf "ui/src/routes/api/$endpoint" || true
    fi
done

# Remove test and chat endpoints
echo "  Removing test endpoints..."
git rm -rf ui/src/routes/api/test-* 2>/dev/null || true
git rm -rf ui/src/routes/api/chat* 2>/dev/null || true
git rm -rf ui/src/routes/api/benchmark-* 2>/dev/null || true

# Remove mock data
echo "  Removing mock data..."
git rm -rf src/lib/mockData 2>/dev/null || true

echo ""
echo "📝 Step 3: Committing changes..."
git add -A
git commit -m "feat!: V2 becomes the primary API

BREAKING CHANGE: Complete API overhaul
- All v2 endpoints moved to /api/*
- All v1 endpoints removed
- Self-discoverable via /api/mcp-config
- ZIP-based architecture
- Real DCS data only"

echo ""
echo "🎯 Step 4: Version bump..."
echo "Run this command to bump to v6.0.0:"
echo ""
echo "npm version major"
echo ""
echo "✅ V2 Replacement Complete!"
echo ""
echo "Next steps:"
echo "1. Run the version bump command above"
echo "2. Test all endpoints at their new locations"
echo "3. Run visual tests"
echo "4. Push changes and deploy v6.0.0"
