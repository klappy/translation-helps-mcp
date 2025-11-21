# Quick Publish Guide

## Option 1: Use the Build Script (Recommended)

### Windows:

```cmd
build_and_publish.bat
```

### Linux/Mac:

```bash
chmod +x build_and_publish.sh
./build_and_publish.sh
```

## Option 2: Manual Steps

### 1. Install Build Tools

```bash
pip install build twine
```

### 2. Clean Previous Builds

```bash
rm -rf dist build *.egg-info
```

### 3. Build Package

```bash
python -m build
```

### 4. Check Package

```bash
twine check dist/*
```

### 5. Publish to PyPI

**Test on TestPyPI first (recommended):**

```bash
twine upload --repository testpypi dist/*
```

**Then publish to PyPI:**

```bash
twine upload dist/*
```

## PyPI Credentials

When prompted:

- **Username**: `__token__`
- **Password**: Your PyPI API token

Get your API token from: https://pypi.org/manage/account/token/

## After Publishing

The package will be available at:
https://pypi.org/project/translation-helps-mcp-client/

Install with:

```bash
pip install translation-helps-mcp-client
```
