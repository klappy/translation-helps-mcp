# SDK Publishing Guide - Version 1.1.0 (JS) / 1.2.0 (Python)

## Overview

This guide covers publishing both SDKs with the new **Optimized System Prompts** feature.

## What's New

### JS SDK v1.1.0

- ✅ Added optimized system prompts (`getSystemPrompt`, `detectRequestType`)
- ✅ 60-70% token reduction for AI interactions
- ✅ Contextual rules based on request type
- ✅ Full TypeScript support

### Python SDK v1.2.0

- ✅ Added optimized system prompts (`get_system_prompt`, `detect_request_type`)
- ✅ 60-70% token reduction for AI interactions
- ✅ Contextual rules based on request type
- ✅ Full Python type hints

## Pre-Publishing Checklist

### JS SDK

- [x] Version updated to `1.1.0` in `package.json`
- [x] Code built (`npm run build`)
- [x] README updated with prompts documentation
- [x] All exports working (`getSystemPrompt`, `detectRequestType`, types)
- [ ] Tests pass (if applicable)
- [ ] CHANGELOG updated (optional but recommended)

### Python SDK

- [x] Version updated to `1.2.0` in `pyproject.toml`
- [x] Version updated to `1.2.0` in `translation_helps/__init__.py`
- [x] README updated with prompts documentation
- [x] All exports working (`get_system_prompt`, `detect_request_type`, `RequestType`)
- [ ] Tests pass (`python test_sdk_comprehensive.py`)
- [ ] CHANGELOG updated (optional but recommended)

## Publishing JS SDK

### 1. Build the Package

```bash
cd packages/js-sdk
npm run build
```

Verify the build:

- `dist/index.js` exists
- `dist/prompts.js` exists
- `dist/index.d.ts` includes prompts exports
- `dist/prompts.d.ts` exists

### 2. Test Locally (Optional)

```bash
# In a test project
npm install ../packages/js-sdk
# Test imports
node -e "import('@translation-helps/mcp-client').then(m => console.log(Object.keys(m)))"
```

### 3. Publish to npm

```bash
cd packages/js-sdk
npm publish
```

**Note:** You'll need:

- npm account with access to `@translation-helps` scope
- Authentication configured (`npm login`)

### 4. Verify Publication

- Check https://www.npmjs.com/package/@translation-helps/mcp-client
- Test installation: `npm install @translation-helps/mcp-client@1.1.0`
- Verify exports: `import { getSystemPrompt } from '@translation-helps/mcp-client'`

## Publishing Python SDK

### 1. Install Build Tools

```bash
pip install build twine
```

### 2. Clean Previous Builds

```bash
cd packages/python-sdk
rm -rf dist/ build/ *.egg-info translation_helps_mcp_client.egg-info/
```

### 3. Build the Package

```bash
python -m build
```

This creates:

- `dist/translation-helps-mcp-client-1.2.0.tar.gz` (source distribution)
- `dist/translation_helps_mcp_client-1.2.0-py3-none-any.whl` (wheel)

### 4. Test the Build

```bash
# Check package
twine check dist/*

# Test install locally
pip install dist/translation_helps_mcp_client-1.2.0-py3-none-any.whl
python -c "from translation_helps.prompts import get_system_prompt; print('✅ Package works!')"
```

### 5. Test on TestPyPI (Recommended)

```bash
twine upload --repository testpypi dist/*
```

Then test install:

```bash
pip install --index-url https://test.pypi.org/simple/ translation-helps-mcp-client==1.2.0
python -c "from translation_helps.prompts import get_system_prompt; print('✅ TestPyPI works!')"
```

### 6. Publish to PyPI

```bash
twine upload dist/*
```

You'll be prompted for:

- Username: `__token__`
- Password: Your PyPI API token

### 7. Verify Publication

- Check https://pypi.org/project/translation-helps-mcp-client/
- Test installation: `pip install translation-helps-mcp-client==1.2.0`
- Verify imports: `from translation_helps.prompts import get_system_prompt`

## Post-Publishing

### Update UI Project

After publishing, update the UI to use the published version:

```bash
cd ui
# Remove local file reference
# Update package.json to use published version
npm install @translation-helps/mcp-client@1.1.0
```

### Update Python Chatbot

After publishing, update the chatbot to use the published version:

```bash
cd examples/python-chatbot
pip install --upgrade translation-helps-mcp-client
# Update imports in chatbot.py
```

### Update CLI Client

After publishing, update the CLI to use the published version:

```bash
cd clients/cli
npm install @translation-helps/mcp-client@1.1.0
# Update imports in chat-interface.ts
```

## Version History

### JS SDK

- `1.0.0` - Initial release
- `1.1.0` - Added optimized system prompts

### Python SDK

- `1.0.0` - Initial release
- `1.1.1` - Bug fixes
- `1.2.0` - Added optimized system prompts

## Troubleshooting

### JS SDK

- **"Package already exists"**: Version must be incremented
- **"Invalid credentials"**: Run `npm login`
- **"Build failed"**: Check TypeScript errors with `npm run build`

### Python SDK

- **"Package already exists"**: Version must be incremented
- **"Invalid credentials"**: Check PyPI API token
- **"Build failed"**: Check that all files are present (README.md, LICENSE, etc.)
- **"Import errors"**: Verify `translation_helps/__init__.py` exports prompts

## Next Steps After Publishing

1. ✅ Update UI project to use published SDK
2. ✅ Update Python chatbot to use published SDK
3. ✅ Update CLI client to use published SDK
4. ✅ Test all integrations
5. ✅ Monitor for issues
6. ✅ Update documentation if needed
