# Changelog Management Guide

## Keeping Changelogs Reasonable

### Problem

Standard-version generates changelogs from ALL commits since the last tag, which can result in extremely verbose changelogs (1000+ lines) that overwhelm users with implementation details they don't care about.

### Solution

After running `npm run release`, manually edit the CHANGELOG.md to be more concise:

1. **Group Related Changes**: Combine multiple commits about the same feature
2. **Focus on User Impact**: What does this mean for people using the API?
3. **Remove Internal Details**: Skip commits about tests, linting, formatting
4. **Use Clear Categories**:
   - **Added**: New features
   - **Changed**: Changes to existing functionality
   - **Fixed**: Bug fixes
   - **Removed**: Deprecated features removed
   - **Security**: Security fixes

### Example Transformation

**Before (verbose)**:

```
- feat: add user-agent to DCSApiClient
- fix: edge runtime compatibility in httpClient
- fix: linting errors in translation-notes-service
- fix: more linting errors
- chore: format code
- fix: empty catch blocks
- test: add user-agent tests
```

**After (concise)**:

```
### Added
- User-Agent headers for all API calls

### Fixed
- Edge runtime compatibility issues
- Various TypeScript linting errors
```

### Best Practices

1. **Edit After Generation**: Let standard-version generate the verbose version, then edit it down
2. **Keep Technical Details in Git**: The full commit history is always in Git for developers
3. **Think Like a User**: What would someone using your API want to know?
4. **Highlight Breaking Changes**: These should be prominent and clear
5. **Add Context**: Don't just say "fixed bug" - explain what was broken

### Maintaining Multiple Versions

- `CHANGELOG.md` - The concise, user-friendly version
- `CHANGELOG-VERBOSE.md` - The full auto-generated version (optional backup)
- Always sync to `ui/static/CHANGELOG.md` for the website

### Future Improvements

Consider using `conventional-changelog` with custom templates to automatically generate more concise changelogs, or write a script that filters commits by type and importance.
