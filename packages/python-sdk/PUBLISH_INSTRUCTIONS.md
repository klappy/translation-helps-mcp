# Publishing to PyPI - Instructions

## Quick Publish

### Option 1: Using Environment Variable (Recommended)

1. **Get your PyPI API token:**
   - Go to: https://pypi.org/manage/account/token/
   - Create a new API token (scope: "Entire account" or "Project: translation-helps-mcp-client")

2. **Set environment variable:**

   ```bash
   # Windows (PowerShell)
   $env:PYPI_API_TOKEN="pypi-your-token-here"

   # Windows (CMD)
   set PYPI_API_TOKEN=pypi-your-token-here

   # Linux/Mac
   export PYPI_API_TOKEN="pypi-your-token-here"
   ```

3. **Publish:**
   ```bash
   python publish_package.py
   ```

### Option 2: Enter Token When Prompted

1. **Run the publish script:**

   ```bash
   python publish_package.py
   ```

2. **When prompted, enter your PyPI API token**

### Option 3: Using .pypirc File

1. **Create `~/.pypirc` file:**

   ```ini
   [distutils]
   index-servers = pypi

   [pypi]
   username = __token__
   password = pypi-your-api-token-here
   ```

2. **Publish:**
   ```bash
   python -m twine upload dist/*
   ```

## Troubleshooting

### 403 Forbidden Error

- **Invalid token**: Make sure you copied the entire token (starts with `pypi-`)
- **Wrong scope**: Token must have upload permissions
- **Token expired**: Create a new token

### Package Already Exists

- **Version conflict**: The version 1.0.0 already exists on PyPI
- **Solution**: Increment version in `pyproject.toml` and `translation_helps/__init__.py`

### Control Characters Warning

- This happens when pasting the token
- Make sure there are no extra spaces or line breaks
- Try typing the token manually or using environment variable

## Verify Publication

After successful upload, check:

- https://pypi.org/project/translation-helps-mcp-client/
- Test installation: `pip install translation-helps-mcp-client`
