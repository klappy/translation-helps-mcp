#!/bin/bash
# Build and publish script for Translation Helps MCP Python SDK

set -e

echo "=========================================="
echo "Building Translation Helps MCP Python SDK"
echo "=========================================="

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist/ build/ *.egg-info 2>/dev/null || true

# Install build tools
echo "Installing build tools..."
pip install build twine -q

# Build the package
echo "Building package..."
python -m build

# Check the package
echo "Checking package..."
twine check dist/*

echo ""
echo "=========================================="
echo "✅ Build successful!"
echo "=========================================="
echo ""
echo "Package files created:"
ls -lh dist/
echo ""
echo "To publish to TestPyPI:"
echo "  twine upload --repository testpypi dist/*"
echo ""
echo "To publish to PyPI:"
echo "  twine upload dist/*"
echo ""
echo "You'll need your PyPI API token."
echo "Get it from: https://pypi.org/manage/account/token/"


