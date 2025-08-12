# Archived Tests

These tests have been archived because they don't follow our new testing principles.

## Why These Tests Were Archived

### Complexity Over Simplicity
Many of these tests were overly complex, testing edge cases that rarely occur in practice. Our new approach follows the 80/20 rule - test the 20% of scenarios that cover 80% of real usage.

### Old Patterns
These tests were written for the old RouteGenerator system and complex endpoint patterns. With our new simple, consistent architecture, these tests are no longer relevant.

### Performance Over Practicality
Some tests focused on micro-optimizations and performance monitoring that added complexity without meaningful value. Our new tests focus on user-facing functionality.

## New Testing Principles

1. **Simple** - If a test needs extensive setup, it's too complex
2. **Fast** - Tests should run in seconds, not minutes
3. **Focused** - Test one thing well, not everything poorly
4. **Practical** - Test real user scenarios, not theoretical edge cases
5. **Maintainable** - Easy to update when the code changes

## What Replaced These Tests

- **Contract Tests** - Ensure API behavior consistency
- **Unit Tests** - Test individual functions and validators
- **Integration Tests** - Test real user workflows
- **Smoke Tests** - Quick health checks

## Note

These tests are preserved for historical reference. Do not use them as examples for new tests. Follow the patterns in the active test directories instead.
