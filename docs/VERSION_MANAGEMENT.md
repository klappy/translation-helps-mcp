# Version Management - Single Source of Truth

## 🎯 The Problem We Solved

Previously, version numbers were scattered across **14+ different files** throughout the codebase:

- `package.json` (root)
- `ui/package.json`
- `src/index.ts`
- `ui/src/routes/api/mcp/+server.ts`
- `src/functions/handlers/health.ts`
- `src/functions/handlers/get-languages.ts`
- `src/functions/utils.ts`
- `netlify/functions/_shared/utils.ts`
- `src/functions/cache.ts`
- Various `version.json` files
- And more...

This led to:

- ❌ Version drift between different parts of the system
- ❌ Manual updates required in multiple places
- ❌ Inconsistent version reporting across endpoints
- ❌ High chance of missing a version reference during releases

## ✅ The Solution: Single Source of Truth

### Primary Source: Root `package.json`

**The root `package.json` is now the ONLY place where you need to update the version.**

```json
{
  "name": "translation-helps-mcp",
  "version": "4.1.0", // ← SINGLE SOURCE OF TRUTH
  "description": "MCP Server for aggregating Bible translation resources from Door43"
}
```

### How It Works

All other parts of the system now **dynamically read** the version from the root `package.json`:

#### 1. **MCP Server** (`src/index.ts`)

```typescript
function getVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  } catch (error) {
    return "4.1.0"; // Fallback only
  }
}
```

#### 2. **HTTP MCP Bridge** (`ui/src/routes/api/mcp/+server.ts`)

```typescript
serverInfo: {
  name: 'translation-helps-mcp',
  version: getVersion() // ← Reads from root package.json
}
```

#### 3. **Health Endpoint** (`src/functions/handlers/health.ts`)

```typescript
const version = getVersion(); // ← Reads from root package.json
```

#### 4. **All Platform Handlers**

Every handler now reads version dynamically rather than using hardcoded values.

## 🔄 Version Sync Script

To keep the UI `package.json` in sync (required for npm), we have an automatic sync script:

```bash
npm run sync-version
```

This script:

1. Reads version from root `package.json`
2. Updates `ui/package.json` to match
3. Ensures consistency across npm workspaces

## 🚀 Release Process

### Old Way (Error-Prone):

1. Update `package.json` ❌
2. Update `ui/package.json` ❌
3. Update `src/index.ts` ❌
4. Update `src/functions/handlers/health.ts` ❌
5. Update `src/functions/handlers/get-languages.ts` ❌
6. Update MCP server version ❌
7. Update utils files ❌
8. Update cache fallbacks ❌
9. Update version.json files ❌
10. ... miss 3 other places and ship inconsistent versions ❌

### New Way (Bulletproof):

1. **Update ONLY `package.json`** ✅
2. **Run `npm run sync-version`** ✅
3. **Done!** ✅

All endpoints, servers, and handlers automatically get the new version.

## 🧪 Testing

You can verify version consistency across all endpoints:

```bash
# Test MCP HTTP Bridge
curl -X POST https://your-app.pages.dev/api/mcp \
  -d '{"method":"initialize"}'

# Test Health Endpoint
curl https://your-app.pages.dev/api/health

# Test Languages Endpoint
curl https://your-app.pages.dev/api/get-languages
```

All should return the same version number from root `package.json`.

## 📁 Files Cleaned Up

**Removed redundant version files:**

- ❌ `src/functions/version.json` (deleted)
- ❌ `netlify/functions/_shared/version.json` (deleted)

**Modified to read from root:**

- ✅ `src/index.ts`
- ✅ `ui/src/routes/api/mcp/+server.ts`
- ✅ `src/functions/handlers/health.ts`
- ✅ `src/functions/handlers/get-languages.ts`
- ✅ `src/functions/utils.ts`
- ✅ `netlify/functions/_shared/utils.ts`
- ✅ `src/functions/cache.ts`
- ✅ `ui/src/lib/version.ts`

## 🎯 Benefits

- ✅ **One source of truth**: Only update version in one place
- ✅ **Automatic consistency**: All endpoints report same version
- ✅ **Bulletproof releases**: No more missed version references
- ✅ **Simplified maintenance**: Reduced cognitive overhead
- ✅ **Runtime accuracy**: Version always reflects actual deployed code

## 🔧 Implementation Notes

### Fallback Strategy

Each `getVersion()` function includes a fallback:

```typescript
return "4.1.0"; // Only as absolute fallback
```

This ensures the system remains functional even if the `package.json` read fails for any reason.

### Path Resolution

Different contexts use appropriate path resolution:

- **Root functions**: `process.cwd() + "package.json"`
- **UI context**: `process.cwd() + "../package.json"`
- **Platform functions**: Auto-detect based on working directory

This version management system ensures we never ship inconsistent versions again! 🎉
