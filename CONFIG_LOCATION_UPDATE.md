# Configuration File Location Update

## Summary

The CLI configuration file location has been updated from a **global home directory** location to a **project-local** location, following standard practices for project-specific tools.

## Changes

### Before (Global Config)

- **Location**: `~/.translation-helps-cli/config.json` (or `C:\Users\USERNAME\.translation-helps-cli\config.json` on Windows)
- **Problem**: Global config doesn't make sense for a project-specific CLI tool
- **Issue**: Not version-controllable, shared across all projects

### After (Project-Local Config)

- **Location**: `.translation-helps-cli.json` in the project root
- **Benefits**:
  - ✅ Standard location for project-specific tools (like `.eslintrc.json`, `.prettierrc`)
  - ✅ Can be committed to git (if non-sensitive) or gitignored (if sensitive)
  - ✅ Per-project configuration
  - ✅ Follows Node.js/CLI tool conventions

## Migration

The system automatically migrates existing global configs:

1. **First run**: If global config exists, it's automatically migrated to project-local
2. **Backward compatibility**: System still checks global config if project-local doesn't exist
3. **Priority**: Project-local > Global > Defaults

## Configuration Priority

```
1. Project-local: .translation-helps-cli.json (preferred)
2. Global: ~/.translation-helps-cli/config.json (fallback, backward compatibility)
3. Defaults: Hard-coded defaults
```

## File Locations

### Project Files (Version Controlled)

- `.translation-helps-cli.json` - CLI configuration (can be gitignored if needed)
- `.env` - API keys (always gitignored)

### Global Files (User-Specific)

- `~/.translation-helps-cli/config.json` - Legacy global config (will be migrated)

## Standard Practices

This follows the same pattern as other popular tools:

| Tool           | Config Location               | Type             |
| -------------- | ----------------------------- | ---------------- |
| **ESLint**     | `.eslintrc.json`              | Project-local    |
| **Prettier**   | `.prettierrc`                 | Project-local    |
| **TypeScript** | `tsconfig.json`               | Project-local    |
| **Jest**       | `jest.config.json`            | Project-local    |
| **Our CLI**    | `.translation-helps-cli.json` | Project-local ✅ |

## .gitignore

The config file is added to `.gitignore` by default, but you can:

- **Keep it gitignored** (recommended if it contains user-specific settings)
- **Commit it** (if you want to share project-wide settings with the team)

Example `.gitignore` entry:

```
# CLI configuration (project-local)
.translation-helps-cli.json
```

## Example Config File

```json
{
  "aiProvider": "openai",
  "ollamaModel": "mistral:7b",
  "ollamaBaseUrl": "http://localhost:11434",
  "openaiModel": "gpt-4o-mini",
  "offlineMode": false,
  "cachePath": "C:\\Users\\LENOVO\\.translation-helps-mcp\\cache",
  "exportPath": "C:\\Users\\LENOVO\\.translation-helps-mcp\\cache\\exports",
  "cacheProviders": ["memory", "fs"],
  "cacheProvidersOrder": ["memory", "fs", "door43"],
  "zipFetcherProvider": "fs",
  "languages": []
}
```

## Benefits

1. **Per-Project Settings**: Each project can have its own configuration
2. **Version Control**: Can be committed to share settings with the team
3. **Standard Location**: Follows Node.js/CLI tool conventions
4. **Easy to Find**: Right in the project root where developers expect it
5. **Migration Support**: Automatically migrates from old global location

## Testing

To test the migration:

1. **Run the CLI** - It will automatically migrate your global config
2. **Check project root** - You should see `.translation-helps-cli.json`
3. **Verify settings** - All your previous settings should be preserved

## Related Files

- `clients/cli/src/config.ts` - Configuration manager
- `.gitignore` - Config file is gitignored by default
- `docs/ZIP_FETCHER_PLUGIN_SYSTEM.md` - ZIP fetcher configuration
