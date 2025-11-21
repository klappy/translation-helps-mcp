# Publishing to PyPI

This guide explains how to publish the Translation Helps MCP Python SDK to PyPI.

## Prerequisites

1. **PyPI Account**: Create an account at https://pypi.org/account/register/
2. **TestPyPI Account** (optional, for testing): https://test.pypi.org/account/register/
3. **API Token**: Generate an API token at https://pypi.org/manage/account/token/

## Pre-Publication Checklist

- [x] Package name is available on PyPI
- [x] Version number is set correctly in `pyproject.toml`
- [x] README.md is complete and accurate
- [x] LICENSE file is included
- [x] All dependencies are specified in `pyproject.toml`
- [x] Package structure is correct
- [x] Tests pass (run `python test_sdk_comprehensive.py`)

## Building the Package

1. **Install build tools:**

   ```bash
   pip install build twine
   ```

2. **Clean previous builds:**

   ```bash
   rm -rf dist/ build/ *.egg-info
   ```

3. **Build the package:**

   ```bash
   python -m build
   ```

   This creates:
   - `dist/translation-helps-mcp-client-1.0.0.tar.gz` (source distribution)
   - `dist/translation_helps_mcp_client-1.0.0-py3-none-any.whl` (wheel)

## Testing the Build

1. **Check the package:**

   ```bash
   twine check dist/*
   ```

2. **Test install locally:**

   ```bash
   pip install dist/translation_helps_mcp_client-1.0.0-py3-none-any.whl
   python -c "from translation_helps import TranslationHelpsClient; print('✅ Package works!')"
   ```

3. **Test on TestPyPI (recommended):**

   ```bash
   twine upload --repository testpypi dist/*
   ```

   Then test install:

   ```bash
   pip install --index-url https://test.pypi.org/simple/ translation-helps-mcp-client
   ```

## Publishing to PyPI

1. **Upload to PyPI:**

   ```bash
   twine upload dist/*
   ```

   You'll be prompted for:
   - Username: `__token__`
   - Password: Your PyPI API token

2. **Verify publication:**
   - Check https://pypi.org/project/translation-helps-mcp-client/
   - Test installation: `pip install translation-helps-mcp-client`

## Version Management

When updating the package:

1. Update version in `pyproject.toml`:

   ```toml
   version = "1.0.1"  # or "1.1.0", "2.0.0", etc.
   ```

2. Update version in `translation_helps/__init__.py`:

   ```python
   __version__ = "1.0.1"
   ```

3. Rebuild and upload:
   ```bash
   python -m build
   twine upload dist/*
   ```

## Troubleshooting

- **"Package already exists"**: Version number must be incremented
- **"Invalid credentials"**: Check your API token
- **"Build failed"**: Check that all required files are present (README.md, LICENSE, etc.)

## Post-Publication

- [ ] Update documentation with PyPI installation instructions
- [ ] Announce the release
- [ ] Monitor for issues and feedback
