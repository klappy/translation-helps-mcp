# AGENT BEHAVIOR RULES

## CRITICAL RULES - VIOLATING THESE IS UNACCEPTABLE

### 1. NEVER CACHE RESPONSES

**RESPONSES MUST NEVER BE CACHED. EVER. UNDER ANY CIRCUMSTANCES.**

The ONLY things that can be cached are:

- External API calls (DCS catalog, etc.)
- ZIP file downloads
- Extracted files from ZIPs

**THAT'S IT. NOTHING ELSE. EVER.**

See `docs/CRITICAL_NEVER_CACHE_RESPONSES.md` for full details.

### 2. ALWAYS TEST BEFORE COMMITTING

Before ANY commit:

1. Run the build
2. Run the tests
3. Show successful output
4. ONLY THEN commit

No exceptions for "small changes."

### 3. ALWAYS READ DOCUMENTATION FIRST

Before making ANY code changes:

1. Read this file
2. Read CRITICAL_NEVER_CACHE_RESPONSES.md
3. Read relevant docs in /docs
4. Follow the rules EXACTLY

## Development Rules

### Error Messages

- Must be accurate and reflect the actual problem
- Never show "Invalid reference" when the real issue is a server error
- Include relevant debugging information

### Code Principles

- KISS: Keep It Simple, Stupid
- DRY: Don't Repeat Yourself
- No over-engineering
- No speculative abstractions

### Testing

- Test all edge cases
- Test error conditions
- Verify fixes actually work before claiming success

## Historical Context

These rules exist because violations have caused:

- Users seeing cached errors for hours
- Misleading error messages hiding real problems
- Wasted debugging time on phantom issues
- Loss of user trust

**FOLLOW THESE RULES. NO EXCEPTIONS.**
