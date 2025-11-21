# Publishing Checklist - SDKs v1.1.0 (JS) / v1.2.0 (Python)

## Pre-Publishing ✅

### JS SDK v1.1.0

- [x] Version updated: `1.0.0` → `1.1.0` in `package.json`
- [x] Code built: `npm run build` completed successfully
- [x] Exports verified: `dist/index.d.ts` includes `prompts.js` export
- [x] README updated: Added "Optimized System Prompts" section
- [x] Types exported: `RequestType`, `EndpointCall` available
- [x] Functions exported: `getSystemPrompt`, `detectRequestType` available

### Python SDK v1.2.0

- [x] Version updated: `1.1.1` → `1.2.0` in `pyproject.toml`
- [x] Version updated: `1.1.1` → `1.2.0` in `translation_helps/__init__.py`
- [x] README updated: Added "Optimized System Prompts" section
- [x] Module created: `translation_helps/prompts.py` exists
- [x] Exports added: `get_system_prompt`, `detect_request_type`, `RequestType` in `__init__.py`

## Ready to Publish ✅

Both SDKs are ready for publishing. Follow the steps in `PUBLISHING_GUIDE.md`.

## Quick Publish Commands

### JS SDK

```bash
cd packages/js-sdk
npm run build          # Already done ✅
npm publish            # Ready to publish
```

### Python SDK

```bash
cd packages/python-sdk
python -m build        # Build package
twine check dist/*     # Verify build
twine upload dist/*    # Publish to PyPI
```

## After Publishing

1. Update UI project: `npm install @translation-helps/mcp-client@1.1.0`
2. Update Python chatbot: `pip install --upgrade translation-helps-mcp-client`
3. Update CLI client: `npm install @translation-helps/mcp-client@1.1.0`
4. Test all integrations
5. Monitor for issues
