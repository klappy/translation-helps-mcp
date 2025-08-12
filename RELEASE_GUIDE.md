# Release Guide for Translation Helps MCP

## Quick Version Bump Process

After making commits, use these commands to bump version and update changelog:

### 1. For Features (minor version bump)

```bash
npm run release:minor
```

Example: 5.3.0 → 5.4.0

### 2. For Bug Fixes (patch version bump)

```bash
npm run release:patch
```

Example: 5.3.0 → 5.3.1

### 3. For Breaking Changes (major version bump)

```bash
npm run release:major
```

Example: 5.3.0 → 6.0.0

### 4. Automatic Detection (reads commit messages)

```bash
npm run release
```

- `feat:` commits → minor bump
- `fix:` commits → patch bump
- `BREAKING CHANGE:` → major bump

## What Happens Automatically

1. Updates version in `package.json`
2. Updates version in `package-lock.json`
3. Runs `npm run sync-version` to update UI version files
4. Updates `CHANGELOG.md` with your commits
5. Creates a release commit: `chore(release): X.Y.Z`
6. Tags the release: `vX.Y.Z`

## After Running Release

Push changes and tags to GitHub:

```bash
git push --follow-tags origin main
```

## Important Notes

- The release process will fail if there are uncommitted changes
- It reads your conventional commits to generate the changelog
- The `.versionrc.json` file controls the behavior
- Don't manually edit versions - let the tool do it

## Troubleshooting

If you see emoji errors at the end, ignore them - the release still worked!

---

Remember: This process ensures consistent versioning and helps future developers understand what changed in each release.
