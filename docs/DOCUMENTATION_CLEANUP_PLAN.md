# Documentation Cleanup Plan

## Current State Analysis

We have 50+ documentation files, many of which are:

- Outdated (referencing old architecture)
- Temporary (tracking specific fixes)
- Redundant (multiple guides for the same thing)
- Completed (migration guides for completed work)

## Categories to Clean Up

### 1. To Archive (Completed/Outdated)

These documents served their purpose but are now historical:

- `ENDPOINT_FIX_PLAN.md` - Completed
- `ENDPOINT_FIX_TRACKING.md` - Completed
- `MIGRATION_PROGRESS.md` - 100% complete
- `CONSISTENCY_PROGRESS_SUMMARY.md` - 100% complete
- `ENDPOINT_VALIDATION_REPORT.md` - Old validation
- `*_ENDPOINT_COMPARISON.md` files - Old comparisons
- `CHAT_PAGE_FIX.md` - Specific fix completed
- `CHAT_ROBUSTNESS_SOLUTION.md` - Implemented
- `CONTEXT_HANDOFF_FOR_NEW_CHAT.md` - One-time handoff
- `RECOVERY_PLAN.md` - Old recovery plan
- `ZIP_ROLLOUT_PLAN.md` - Rollout completed
- `ZIP_INTEGRATION_MIGRATION_GUIDE.md` - Migration done
- `LINTING_FIXES_NEEDED.md` - Old todo list

### 2. To Update (Needs Current Info)

These docs are valuable but need updates:

- `API_DOCUMENTATION_GUIDE.md` - Update for v2 endpoints
- `ARCHITECTURE_GUIDE.md` - Update with new patterns
- `IMPLEMENTATION_GUIDE.md` - Update with simpleEndpoint
- `DEBUGGING_GUIDE.md` - Add v2 endpoint debugging
- `TROUBLESHOOTING.md` - Update common issues

### 3. To Consolidate (Multiple Similar Docs)

Merge these into single authoritative docs:

**Architecture Docs:**

- `ARCHITECTURE_GUIDE.md`
- `ARCHITECTURE_DECISIONS.md`
- `ARCHITECTURE_ROADMAP.md`
- `DYNAMIC_ARCHITECTURE.md`
  → Consolidate into single `ARCHITECTURE.md`

**Endpoint Docs:**

- `ENDPOINT_BEHAVIOR_SPECIFICATION.md`
- `ENDPOINT_MIGRATION_GUIDE.md`
- `CONSISTENCY_PATTERNS.md`
  → Consolidate into `API_ENDPOINTS.md`

**Performance Docs:**

- `performance/PERFORMANCE_REPORT.md`
- `ZIP_PERFORMANCE_TEST.md`
  → Consolidate into `PERFORMANCE.md`

### 4. To Keep As-Is (Still Relevant)

These are current and valuable:

- `AGENT_BEHAVIOR_RULES.md` - Critical rules
- `CRITICAL_NEVER_CACHE_RESPONSES.md` - Critical rule
- `DEPLOYMENT_GUIDE.md` - Still accurate
- `GIT_COMMIT_BEST_PRACTICES.md` - Good practices
- `VICTORY_LAP.md` - Recent celebration
- `NEXT_PHASE_ROADMAP.md` - Current roadmap
- `IMMEDIATE_NEXT_STEPS.md` - Current tasks
- `quickstarts/` - User-facing guides
- `openapi.yaml` - API spec

### 5. To Create (Missing Documentation)

New docs we need:

- `API_V2_REFERENCE.md` - Complete v2 endpoint reference
- `DEVELOPER_GUIDE.md` - How to add new endpoints
- `TESTING_GUIDE.md` - How to test endpoints
- `CHANGELOG_V2.md` - What changed in v2

## Execution Plan

1. **Phase 1: Archive Old Docs**
   - Move completed/outdated docs to `archive/completed-migrations/`
   - Add README explaining what each archived doc was for

2. **Phase 2: Consolidate Similar Docs**
   - Create new consolidated docs
   - Archive the originals
   - Update all references

3. **Phase 3: Update Existing Docs**
   - Update with v2 patterns
   - Remove references to RouteGenerator
   - Add new examples

4. **Phase 4: Create New Docs**
   - Write missing documentation
   - Focus on developer experience
   - Include examples and templates

## Success Criteria

- Under 20 docs in main docs/ folder
- Clear organization by topic
- All docs current and accurate
- Easy to find what you need
- No redundancy or confusion
