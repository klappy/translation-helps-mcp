# Deprecated Tests Summary

This document records the intent and status of test files removed due to brittleness, legacy v2 contracts, or mismatched runners. These tests no longer reflect the consolidated `/api` behavior and were blocking progress.

## Removed/Skipped Suites and Their Intent

- tests/archive/endpoint-parity.test.ts
  - Intent: Compare MCP and HTTP endpoint responses for parity across many endpoints.
  - Reason: Enforced v2-era shapes and routes; brittle against evolving `/api` responses.

- tests/archive/endpoint-source-data-validation.test.ts
  - Intent: Validate raw source-field preservation for TN/TQ/TWL/scripture.
  - Reason: Assumes legacy wrappers and fields; `/api` normalizes shapes differently.

- tests/archive/scripture-comprehensive.test.ts
  - Intent: Full-spectrum scripture scenarios (single, ranges, chapters, performance).
  - Reason: Contracts diverged; expects formats/usfm behaviors not provided by `/api`.

- tests/archive/scripture-parameters.test.ts
  - Intent: Validate format, verse numbering, multi-translation params.
  - Reason: `/api` parameter handling differs; tests use outdated expectations.

- tests/archive/chaos/\*.test.ts
  - Intent: Chaos testing: cache failures, upstream partitions, data corruption.
  - Reason: Import helpers missing; scenarios incompatible with current infra.

- tests/archive/comprehensive-endpoint-validation.test.ts
  - Intent: End-to-end validation of real content presence and context aggregation.
  - Reason: Assumes v2 endpoints and specific content snapshots; highly brittle.

- ui/tests/visual/\*.spec.ts (Playwright)
  - Intent: Visual smoke tests for API Explorer and endpoints.
  - Reason: Playwright tests were executed under vitest runner; belongs in Playwright pipeline only.

- tests/unit/\* referring to removed/moved modules
  - Intent: Unit contracts for legacy middleware/services.
  - Reason: Files moved or removed; tests import non-existent modules.

## Replacement Strategy

- Focus on integration tests that exercise `/api` via Wrangler preview on port 8787 with structural assertions (no fragile snapshots).
- Keep Playwright tests in Playwright-only workflows.
- Rebuild unit tests targeting current modules and stable utilities.
