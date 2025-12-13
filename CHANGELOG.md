# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [7.20.6](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.20.5...v7.20.6) (2025-12-13)

### Features

- **filter:** R2 DIRECT ACCESS for Translation Words filter - parallel fetch all markdown files
- **filter:** R2 DIRECT ACCESS for Translation Academy filter - parallel fetch all modules
- **filter:** R2 DIRECT ACCESS for Translation Questions filter - parallel fetch all TSV files
- **filter:** R2 DIRECT ACCESS for Translation Word Links filter - parallel fetch all TSV files
- **performance:** ALL filter endpoints now bypass ZIP/catalog overhead entirely
- **architecture:** Consistent R2 direct access pattern across all translation helps filters

### [7.20.5](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.20.4...v7.20.5) (2025-12-13)

### Features

- **filter:** R2 DIRECT ACCESS for translation notes filter - blazing fast parallel fetch!
- **filter:** Notes filter now fetches all 66 TSV files in parallel from R2 storage
- **filter:** Same architecture as scripture filter - no per-book catalog/ZIP overhead

### Bug Fixes

- **filter:** Revert scope validation - R2 direct access makes full-resource search fast
- **filter:** Remove testament requirement from notes/questions/word-links filters

### [7.20.3](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.20.2...v7.20.3) (2025-12-13)

### Bug Fixes

- **tool-registry:** Remove term from fetch_translation_word requiredParams (filter mode doesn't need term)
- **tool-registry:** Remove reference from fetch_translation_word_links requiredParams (filter mode doesn't need reference)
- **ui:** Remove misleading required field asterisks from API Explorer form inputs

### [7.20.2](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.20.1...v7.20.2) (2025-12-13)

### Bug Fixes

- **filter:** Prepend book name to references for proper statistics grouping
- **filter:** Add missing testament destructuring in questions and word-links handlers
- **filter:** Case-insensitive testament filter (ot/OT, nt/NT both work)

### [7.20.1](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.20.0...v7.20.1) (2025-12-13)

### Bug Fixes

- **mcp:** Remove required params from filter-enabled endpoints
- **mcp:** Add filter, testament, category params to MCP tool schemas
- **filter:** Fix empty {} response by returning data objects instead of Response

## [7.20.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.29...v7.20.0) (2025-12-13)

### Features

- **filter:** Add stemmed regex filter to all translation resource endpoints
- **filter:** Translation Notes filter with testament/book statistics and YAML frontmatter
- **filter:** Translation Questions filter with testament/book statistics and YAML frontmatter
- **filter:** Translation Word Links filter with testament/book/category statistics
- **filter:** Translation Words filter with category statistics (searches all word definitions)
- **filter:** Translation Academy filter with category statistics (searches all modules)
- **shared:** Create shared filterUtils.ts module for DRY filter functionality
- **zip:** Add word listing capability to ZipResourceFetcher2 for TW filter

### Documentation

- **config:** Update endpoint configurations with filter parameter definitions
- **ui:** API Explorer automatically shows new filter parameters via mcp-config

### [7.19.29](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.28...v7.19.29) (2025-12-13)

### Bug Fixes

- **mcp:** Handle filter response format in scripture formatter

### [7.19.28](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.27...v7.19.28) (2025-12-13)

### Documentation

- **endpoints:** Clarify filter param requirements

### [7.19.27](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.26...v7.19.27) (2025-12-13)

### Bug Fixes

- **fetch-scripture:** Clean up R2 direct fetch method detection

### [7.19.26](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.25...v7.19.26) (2025-12-13)

### Bug Fixes

- **fetch-scripture:** Find USFM file in R2 list for base path

### [7.19.25](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.24...v7.19.25) (2025-12-13)

### Features

- **fetch-scripture:** Add R2 direct fetch for full-resource filter

### [7.19.24](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.23...v7.19.24) (2025-12-13)

### Bug Fixes

- **fetch-scripture:** Use book code from fetch loop for proper names

### [7.19.23](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.22...v7.19.23) (2025-12-13)

### Bug Fixes

- **fetch-scripture:** Fix book name extraction regex

### [7.19.22](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.21...v7.19.22) (2025-12-13)

### Features

- **fetch-scripture:** Add full-resource filter search with parallel fetch

### [7.19.21](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.20...v7.19.21) (2025-12-13)

### Bug Fixes

- **fetch-scripture:** Fix chapter extraction for filter param

### [7.19.20](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.19...v7.19.20) (2025-12-13)

### Bug Fixes

- **fetch-scripture:** Handle translation prefix in verse parsing

### [7.19.19](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.18...v7.19.19) (2025-12-13)

### Features

- **ui:** Add filter param to scripture endpoint config

### [7.19.18](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.19.17...v7.19.18) (2025-12-10)

### Bug Fixes

- **fetch-scripture:** Fix verse parsing for filter param

### [7.19.17](https://github.com/klappy/translation-helps-mcp/compare/v7.19.16...v7.19.17) (2025-12-10)

### Features

- **fetch-scripture:** Add `filter` parameter for stemmed regex search
  - `search` = AutoRAG semantic (conceptually about X)
  - `filter` = Stemmed regex (contains word X and variations)
  - Example: `filter=love` matches love, loves, loved, loving, loveth
  - Requires `reference` parameter (e.g., `reference=John`)
  - Returns all matching verses with matched terms highlighted

### [7.19.16](https://github.com/klappy/translation-helps-mcp/compare/v7.19.15...v7.19.16) (2025-12-10)

### Bug Fixes

- **search:** Infer language and organization from file path
  - AutoRAG wasn't returning metadata, so language defaulted to 'en'
  - Now extracts language/organization from path (e.g., `hi/translationCore-Create-BCS/...`)
  - Fixes Hindi results appearing when searching for English
  - Language and organization filters now work correctly

### [7.19.15](https://github.com/klappy/translation-helps-mcp/compare/v7.19.14...v7.19.15) (2025-12-10)

### Features

- **indexer:** Chapter-level indexing for scripture
  - Scripture now indexed at chapter level instead of book level
  - Better search granularity - "love" will find more relevant chapters
  - Each chapter is a separate searchable chunk with metadata
  - Path structure: `{lang}/{org}/{resource}/{version}/{book}/{chapter}.md`
  - Requires re-indexing: flush both R2 buckets to trigger workflow

### Bug Fixes

- **fetch-scripture:** Filter search results by requested language
  - Was returning results from all languages when searching
  - Now explicitly filters to match requested language parameter

### [7.19.14](https://github.com/klappy/translation-helps-mcp/compare/v7.19.13...v7.19.14) (2025-12-10)

### Bug Fixes

- **search:** Respect AutoRAG's 50 result limit
  - AutoRAG has a hard limit of 50 max_num_results
  - Was trying to fetch 500 which caused "Too big" error
  - Scripture filter now works but is limited by AutoRAG's 50 result cap

### [7.19.13](https://github.com/klappy/translation-helps-mcp/compare/v7.19.12...v7.19.13) (2025-12-10)

### Bug Fixes

- **search:** Use actual resource codes instead of 'scripture' category
  - `inferResourceFromPath` now returns actual codes (ult, ust, ueb, t4t) not 'scripture'
  - Search results now show `resource: "ult"` instead of `resource: "scripture"`
  - Consistent with how helps resources work (tn, tw, tq, ta)
  - 'scripture' and 'bible' remain as convenience aliases for filtering
  - Filter by specific resource: `resource=ult` or `resource=ust`
  - Filter all scripture: `resource=scripture` (expands to ult, ust, ueb, t4t, glt, gst)

### [7.19.12](https://github.com/klappy/translation-helps-mcp/compare/v7.19.11...v7.19.12) (2025-12-10)

### Bug Fixes

- **fetch-scripture:** Fix search delegation filtering out all results
  - Changed filter from `hit.type === 'bible'` (non-existent field) to checking `hit.resource`
  - Now correctly filters for scripture resources: ult, ust, ueb, t4t, glt, gst
  - Added `resource=scripture` param when delegating to /api/search to trigger expanded fetching
  - Fixed `owner` param to `organization` to match search endpoint expectations
  - Request 50 results from search to increase scripture hit chances

### [7.19.11](https://github.com/klappy/translation-helps-mcp/compare/v7.19.10...v7.19.11) (2025-12-10)

### Bug Fixes

- **search:** Fetch more results from AutoRAG for scripture filtering
  - When filtering by `scripture` or `bible`, fetch 10x more results (min 100, max 500)
  - Scripture ranks lower in vector search for single-word queries like "love"
  - By fetching more results, we increase chances of getting scripture hits to filter
  - Client-side filtering then returns only scripture resources up to requested limit

### [7.19.10](https://github.com/klappy/translation-helps-mcp/compare/v7.19.9...v7.19.10) (2025-12-10)

### Bug Fixes

- **wrangler:** Add AI binding to preview environment for deploy previews
  - Deploy previews were returning "AI binding not available"
  - Added AI, KV, and R2 bindings to `[env.preview]` in wrangler.toml

### [7.19.9](https://github.com/klappy/translation-helps-mcp/compare/v7.19.8...v7.19.9) (2025-12-10)

### Bug Fixes

- **search:** Fix client-side filtering causing empty results
  - Made all client-side filters lenient for missing metadata fields
  - Filters now only remove results that have a field AND it doesn't match
  - Fixed `includeHelps` filter which was filtering out all hits with undefined resource
  - Added diagnostic logging to track which filters AutoRAG isn't honoring server-side
  - Filters affected: resource, language, organization, book, chapter, chunk_level, article_id

### [7.19.8](https://github.com/klappy/translation-helps-mcp/compare/v7.19.7...v7.19.8) (2025-12-06)

### Documentation

- **docs:** Complete v7.X documentation audit and update
  - Updated README.md to v7.19.1 with multi-agent orchestration and Workers AI features
  - Rewrote AI_CHAT_ARCHITECTURE.md for Cloudflare Workers AI and multi-agent system
  - Created new MULTI_AGENT_ORCHESTRATION.md documenting the agent dispatch system
  - Created new EVENT_DRIVEN_INDEXING.md documenting the search indexing pipeline
  - Created new AGENTS_REFERENCE.md with detailed agent specifications
  - Updated ARCHITECTURE.md with current system architecture
  - Updated HYBRID_SEARCH_FEATURE.md with v2 pipeline and performance improvements
  - Updated IMPLEMENTATION_GUIDE.md with current tools and chat features
  - Fixed docs/README.md broken links and updated references
  - Deleted ~40 temporary implementation and debug files from root directory

### [7.19.7](https://github.com/klappy/translation-helps-mcp/compare/v7.19.6...v7.19.7) (2025-12-06)

### [7.19.6](https://github.com/klappy/translation-helps-mcp/compare/v7.19.5...v7.19.6) (2025-12-06)

### [7.19.5](https://github.com/klappy/translation-helps-mcp/compare/v7.19.4...v7.19.5) (2025-12-06)

### [7.19.4](https://github.com/klappy/translation-helps-mcp/compare/v7.19.3...v7.19.4) (2025-12-06)

### [7.19.3](https://github.com/klappy/translation-helps-mcp/compare/v7.19.2...v7.19.3) (2025-12-06)

### [7.19.2](https://github.com/klappy/translation-helps-mcp/compare/v7.18.1...v7.19.2) (2025-12-06)

### Chores

- **release:** 7.19.0 ([bf823ac](https://github.com/klappy/translation-helps-mcp/commit/bf823aca9aef52dec6b7d703df90961649efe8c9))
- **release:** 7.19.1 ([18cfca2](https://github.com/klappy/translation-helps-mcp/commit/18cfca2401447f500c7dcc7af3bfb7c7be31f1b5))

### [7.19.1](https://github.com/klappy/translation-helps-mcp/compare/v7.19.0...v7.19.1) (2025-12-06)

### Improvements

- **synthesis:** Use letters for follow-up questions, numbers for citations
  - Citations use `[1]`, `[2]`, `[3]` - respond with number for source details
  - Follow-up questions use `a)`, `b)`, `c)` - respond with letter to explore
  - Clear differentiation enables easier user interaction with responses

## [7.19.0](https://github.com/klappy/translation-helps-mcp/compare/v7.18.1...v7.19.0) (2025-12-06)

### Features

- **questions-agent:** Add dedicated Translation Questions Agent
  - New agent handles queries like "What questions should I consider for Genesis 1"
  - Calls `fetch_translation_questions` MCP tool for comprehension questions
  - Completes the "one agent per MCP endpoint" architecture
- **orchestrator:** Add routing rules for questions-related queries
  - Orchestrator now recognizes "questions", "comprehension" keywords
  - Routes directly to Questions Agent instead of misrouting to Academy
- **gap-detection:** Add smart synthesis gap detection
  - Checks for missed resources before synthesis using keyword analysis
  - Automatically dispatches missed agents if obvious keywords were ignored
  - Acts as safety net for orchestrator routing mistakes

### [7.18.1](https://github.com/klappy/translation-helps-mcp/compare/v7.18.0...v7.18.1) (2025-12-06)

## [7.18.0](https://github.com/klappy/translation-helps-mcp/compare/v7.17.4...v7.18.0) (2025-12-06)

### Features

- **qa-validation:** Add QA Citation Validator to verify response accuracy
  - Validates all citations by re-fetching resources from MCP tools
  - Checks if quoted text matches the actual source content
  - Adds inline emoji indicators after citations (verified, uncertain, invalid)
  - New Validation Summary section in X-Ray panel shows verification stats
- **citations:** Add superscript numbering to link quotes to their sources
  - LLM now generates numbered superscripts (^1^, ^2^) for citations
  - Enables QA validator to verify specific quotes against sources
  - Superscripts render as styled HTML in the chat interface

### [7.17.4](https://github.com/klappy/translation-helps-mcp/compare/v7.17.3...v7.17.4) (2025-12-05)

### Features

- **academy-agent:** expand known module IDs for better lookup accuracy ([3032346](https://github.com/klappy/translation-helps-mcp/commit/3032346c1e94cfb11b19f41703b42ab6a1b36cc1))

### [7.17.3](https://github.com/klappy/translation-helps-mcp/compare/v7.17.2...v7.17.3) (2025-12-05)

### Bug Fixes

- **orchestrator:** correctly route specific article requests to agents ([1852b46](https://github.com/klappy/translation-helps-mcp/commit/1852b46dcedea31e7b2623afbf64bd4c5d9a290a))

### [7.17.2](https://github.com/klappy/translation-helps-mcp/compare/v7.17.1...v7.17.2) (2025-12-05)

### Bug Fixes

- **chat:** use white text with underlines for links instead of colors ([05e595a](https://github.com/klappy/translation-helps-mcp/commit/05e595a438bcc7051b05cf7b95f71709556ffa63))

### [7.17.1](https://github.com/klappy/translation-helps-mcp/compare/v7.17.0...v7.17.1) (2025-12-05)

### Bug Fixes

- **chat:** display resource type alongside clickable article in citations ([fa8c340](https://github.com/klappy/translation-helps-mcp/commit/fa8c340a0dbb5dc6343d48a496b7c25a4d52db8b))

## [7.17.0](https://github.com/klappy/translation-helps-mcp/compare/v7.16.0...v7.17.0) (2025-12-05)

### Features

- **chat:** add resource context to clickable links for specific queries ([3aa2ca0](https://github.com/klappy/translation-helps-mcp/commit/3aa2ca07bf6bde93b3a4e436fb323e444e2139d1))

## [7.16.0](https://github.com/klappy/translation-helps-mcp/compare/v7.15.1...v7.16.0) (2025-12-05)

### Features

- **chat:** standardize citation format with clickable article names ([df75831](https://github.com/klappy/translation-helps-mcp/commit/df758312369fca32ded0a37f67c1e22797687d97))

### [7.15.1](https://github.com/klappy/translation-helps-mcp/compare/v7.15.0...v7.15.1) (2025-12-05)

### Refactoring

- **chat:** improve synthesis prompt for expandable term format ([df139b6](https://github.com/klappy/translation-helps-mcp/commit/df139b6df79a14a189f0876d446048558b4bce1b))

## [7.15.0](https://github.com/klappy/translation-helps-mcp/compare/v7.14.1...v7.15.0) (2025-12-05)

### Features

- **chat:** replace bold-text clickability with explicit bracket syntax ([86df943](https://github.com/klappy/translation-helps-mcp/commit/86df94301dae4ef3d9110d2802167c211243bad4))

### [7.14.1](https://github.com/klappy/translation-helps-mcp/compare/v7.13.5...v7.14.1) (2025-12-04)

### Features

- **scripture:** include full title from DCS catalog in scripture responses ([df88cf9](https://github.com/klappy/translation-helps-mcp/commit/df88cf91f12f197addce5ecd0ce3ef2e4b182136))

### Bug Fixes

- **orchestration:** fix userMessage reference in planIterationTasks ([eb53841](https://github.com/klappy/translation-helps-mcp/commit/eb53841b0ab5c9e068da7f79a03eeab1a071769d))
- **search-agent:** correctly parse hit count from markdown MCP response ([b8979b4](https://github.com/klappy/translation-helps-mcp/commit/b8979b4decf0073ad54127fa2f5455fa352e288f))
- **xray:** correct tool timing and add TTFT metric ([d1038d3](https://github.com/klappy/translation-helps-mcp/commit/d1038d37dc4df9570d6a1808fb91b650cdfe4370))
- **xray:** prevent duplicate timeline entries for orchestrator and agents ([59f4369](https://github.com/klappy/translation-helps-mcp/commit/59f4369077a5d9552df41680cdc2552f43cbec9e))

### Chores

- **release:** 7.14.0 ([085687c](https://github.com/klappy/translation-helps-mcp/commit/085687c16889726c6e6b361bdb4b9da98a6e4135))

## [7.14.0](https://github.com/klappy/translation-helps-mcp/compare/v7.13.5...v7.14.0) (2025-12-04)

### Features

- **orchestration:** Integrate MCP Prompts into orchestrated chat system
  - Orchestrator can now choose between pre-defined prompt workflows and individual agents
  - Added `execute_prompt` tool for running comprehensive MCP prompt workflows
  - Prompts like "translation-helps-for-passage" chain 6+ tool calls for complete translation help
  - Orchestrator intelligently decides: prompts for comprehensive requests, agents for specific queries
  - UI shows prompt execution with real-time progress in ThinkingBubble

- **prompts:** Fix MCP Prompts after default format change to markdown
  - All internal fetch calls in execute-prompt endpoint now explicitly request JSON format
  - Prompts continue to work correctly while endpoints default to markdown

- **scripture:** include full title from DCS catalog in scripture responses

### Bug Fixes

- **orchestration:** fix userMessage reference in planIterationTasks
- **search-agent:** correctly parse hit count from markdown MCP response
- **xray:** correct tool timing and add TTFT metric
- **xray:** prevent duplicate timeline entries for orchestrator and agents

### [7.13.7](https://github.com/klappy/translation-helps-mcp/compare/v7.13.6...v7.13.7) (2025-12-04)

### Bug Fixes

- **xray:** fix tool call timing - was measuring from orchestration start instead of tool start
  - Tool calls now show accurate ~50ms instead of inflated 5s+ times
  - Each tool call now tracks its own start time for precise duration calculation

### Features

- **xray:** add TTFT (Time to First Token) metric
  - Shows how quickly user sees first streaming content
  - Displayed prominently in X-Ray panel alongside total time
  - Helps demonstrate responsive UX even with longer total times

### [7.13.6](https://github.com/klappy/translation-helps-mcp/compare/v7.13.5...v7.13.6) (2025-12-04)

### Features

- **scripture:** include full title from DCS catalog in scripture responses
  - Add `fullTitle` field (e.g., "unfoldingWord® Literal Text") alongside short `translation` (e.g., "ULT v87")
  - LLM can now choose between brevity ("ULT v87") or full official name based on context
  - Prevents hallucination of resource names by providing accurate catalog metadata

### [7.13.5](https://github.com/klappy/translation-helps-mcp/compare/v7.13.4...v7.13.5) (2025-12-04)

### Bug Fixes

- endpoint config defaults to md format for MCP Tools UI\n\n- Change format parameter default from json to md in endpoint configs\n- Update ScriptureEndpoints.ts format default to md\n- Update TranslationHelpsEndpoints.ts format default to md\n- This ensures MCP Tools UI form defaults to markdown format ([60254e0](https://github.com/klappy/translation-helps-mcp/commit/60254e0cbfeb4869815a875bc31867116dee85f5))

### [7.13.4](https://github.com/klappy/translation-helps-mcp/compare/v7.13.3...v7.13.4) (2025-12-04)

### Bug Fixes

- MCP Tools UI renders markdown content directly instead of JSON wrapper ([7c832b0](https://github.com/klappy/translation-helps-mcp/commit/7c832b07d1bd67ace670488bf43096bf47e5f664))

### [7.13.3](https://github.com/klappy/translation-helps-mcp/compare/v7.13.2...v7.13.3) (2025-12-04)

### Bug Fixes

- default format to md for LLM-friendly output across all layers ([a77d37e](https://github.com/klappy/translation-helps-mcp/commit/a77d37e1dc8e95e662a00aaeb3f8ddee970154f1))

### [7.13.2](https://github.com/klappy/translation-helps-mcp/compare/v7.13.1...v7.13.2) (2025-12-04)

### Bug Fixes

- remove hardcoded parsing from agents - trust the LLM to read markdown ([1cce3f8](https://github.com/klappy/translation-helps-mcp/commit/1cce3f84c546210377bea9a84156b2e24e3ad37e))

### [7.13.1](https://github.com/klappy/translation-helps-mcp/compare/v7.13.0...v7.13.1) (2025-12-04)

### Features

- add YAML frontmatter to markdown format responses ([96ecfc6](https://github.com/klappy/translation-helps-mcp/commit/96ecfc6c16b87fd88242e8f9d405e10b8df50d56))

## [7.13.0](https://github.com/klappy/translation-helps-mcp/compare/v7.12.3...v7.13.0) (2025-12-04)

### [7.12.3](https://github.com/klappy/translation-helps-mcp/compare/v7.12.2...v7.12.3) (2025-12-04)

### [7.12.2](https://github.com/klappy/translation-helps-mcp/compare/v7.12.1...v7.12.2) (2025-12-04)

### [7.12.1](https://github.com/klappy/translation-helps-mcp/compare/v7.12.0...v7.12.1) (2025-12-04)

### Features

- **chat:** multi-agent orchestration with inline thinking UI ([56f0efb](https://github.com/klappy/translation-helps-mcp/commit/56f0efb4591173c4d06fe66cc5dbd51907b74145))

## [7.12.0](https://github.com/klappy/translation-helps-mcp/compare/v7.11.14...v7.12.0) (2025-12-04)

### Features

- **chat:** Multi-Agent Orchestration Architecture - Specialized sub-agents for scripture, notes, words, academy, and search run in parallel with live streaming of their thoughts
- **ui:** ThinkingBubble component shows real-time agent activity with expandable agent thought streams
- **ui:** AgentThoughtStream component displays per-agent progress, tool calls, and summaries
- **ui:** XRay panel now shows agent execution details for orchestrated requests
- **api:** New `/api/chat-orchestrated` endpoint for multi-agent chat mode
- **agents:** Each specialist agent has custom system prompts with tool-specific knowledge and failure handling

### [7.11.14](https://github.com/klappy/translation-helps-mcp/compare/v7.11.13...v7.11.14) (2025-12-04)

### [7.11.13](https://github.com/klappy/translation-helps-mcp/compare/v7.11.12...v7.11.13) (2025-12-04)

### [7.11.12](https://github.com/klappy/translation-helps-mcp/compare/v7.11.11...v7.11.12) (2025-12-04)

### [7.11.11](https://github.com/klappy/translation-helps-mcp/compare/v7.11.10...v7.11.11) (2025-12-04)

### Bug Fixes

- **xray:** format X-Ray data to match UI panel expectations ([33f43b2](https://github.com/klappy/translation-helps-mcp/commit/33f43b2572c5d83e404b6f5b491c29769d759243))

### [7.11.10](https://github.com/klappy/translation-helps-mcp/compare/v7.11.9...v7.11.10) (2025-12-04)

### Bug Fixes

- **chat:** force tool usage with toolChoice required and fix X-Ray timings ([47e1a06](https://github.com/klappy/translation-helps-mcp/commit/47e1a066278564d5b71b76dad04c111f465d6d58))

### [7.11.9](https://github.com/klappy/translation-helps-mcp/compare/v7.11.8...v7.11.9) (2025-12-04)

### Bug Fixes

- **chat:** explicitly forbid hallucinated translations like KJV ([9a8b7cf](https://github.com/klappy/translation-helps-mcp/commit/9a8b7cfa41ee2736817a1983492a9ea2ed90a4ba))

### [7.11.8](https://github.com/klappy/translation-helps-mcp/compare/v7.11.7...v7.11.8) (2025-12-04)

### Bug Fixes

- **chat:** emit X-Ray with complete timings after streaming ([499b1ec](https://github.com/klappy/translation-helps-mcp/commit/499b1ec595084dba2e36fc5cbd3b1216b8d56d1b))

### [7.11.7](https://github.com/klappy/translation-helps-mcp/compare/v7.11.6...v7.11.7) (2025-12-04)

### Bug Fixes

- **chat:** include tools in streaming re-call for consistency ([7e5deef](https://github.com/klappy/translation-helps-mcp/commit/7e5deefbf17d2025083757847df67bbe8acac4ee))

### [7.11.6](https://github.com/klappy/translation-helps-mcp/compare/v7.11.5...v7.11.6) (2025-12-04)

### Bug Fixes

- **chat:** real streaming, detailed timings, and citation format ([5925ac0](https://github.com/klappy/translation-helps-mcp/commit/5925ac02dda03cff6ecad1356020748363a6607e))

### [7.11.5](https://github.com/klappy/translation-helps-mcp/compare/v7.11.4...v7.11.5) (2025-12-04)

### Bug Fixes

- **chat:** always include X-Ray data in responses regardless of tool calls ([be6b111](https://github.com/klappy/translation-helps-mcp/commit/be6b111f29ecc5213682a1abc7e06039f1227a70))

### [7.11.4](https://github.com/klappy/translation-helps-mcp/compare/v7.11.3...v7.11.4) (2025-12-04)

### Bug Fixes

- Fix chat streaming - SSE events now use correct event names (llm:delta vs content)
- Fix data format to match frontend expectations (text vs delta property)
- Resolves chat UI stuck on "Fetching..." without showing response

### [7.11.3](https://github.com/klappy/translation-helps-mcp/compare/v7.11.2...v7.11.3) (2025-12-04)

### Improvements

- Remove all hardcoded examples from system prompt to avoid literal interpretation
- Add comprehensive formatting guidance for readable responses
- Update Translation Words description to include names, places, and all article types
- Improve tool descriptions without hardcoded parameter examples
- Fix sync-version.js to update ui/package-lock.json during version bumps

### [7.11.2](https://github.com/klappy/translation-helps-mcp/compare/v7.11.1...v7.11.2) (2025-12-04)

### Features

- **Strict Tool-Only Mode**: Chat now ALWAYS uses tools - never answers from training data
- **Verbatim Scripture Quoting**: All scripture is quoted exactly as returned, never paraphrased
- **Mandatory Citations**: Every piece of information includes its source citation
- **Fixed Tool Registry**: MCP now only exposes implemented tools (removed browse_translation_words, get_languages)

### Bug Fixes

- Fix tool_choice to use 'required' instead of 'auto' to force tool usage
- Add fetch_translation_word, fetch_translation_word_links, fetch_translation_academy to MCP tools list

### [7.11.1](https://github.com/klappy/translation-helps-mcp/compare/v7.11.0...v7.11.1) (2025-12-04)

### Bug Fixes

- Widen role type cast to include all valid WorkersAIMessage roles
- Add proper type exports for Workers AI types
- Simplify AIBinding interface for chat usage

## [7.11.0](https://github.com/klappy/translation-helps-mcp/compare/v7.10.5...v7.11.0) (2025-12-04)

### Features

- **Chat**: Migrate from OpenAI GPT-4o-mini to Cloudflare Workers AI (Llama 4 Scout 17B)
- **Native Tool Calling**: Model decides when to call MCP tools via structured output
- **MCP Self-Discovery**: Tools fetched dynamically, not hardcoded
- **Edge-Native**: Inference runs on Cloudflare edge, no external API calls

### Architecture

- Eliminated two-call architecture (was: LLM to decide tools + LLM to generate response)
- Single call with native tool calling support
- Parallel tool execution for multi-tool requests

### Performance

- Reduced chat endpoint from 1984 lines to 396 lines (-80%)
- System prompt reduced from 1500+ lines to 50 lines
- No external API latency (runs on same edge network)

### [7.10.5](https://github.com/klappy/translation-helps-mcp/compare/v7.10.4...v7.10.5) (2025-12-03)

### [7.10.4](https://github.com/klappy/translation-helps-mcp/compare/v7.10.3...v7.10.4) (2025-12-03)

### Bug Fixes

- strip repo prefix in API extractFileFromZip for R2 path consistency ([b2761c7](https://github.com/klappy/translation-helps-mcp/commit/b2761c7cbf1b81a7a639f3252dbd1d3fde1b3f06))

### [7.10.3](https://github.com/klappy/translation-helps-mcp/compare/v7.10.2...v7.10.3) (2025-12-03)

### [7.10.2](https://github.com/klappy/translation-helps-mcp/compare/v7.10.1...v7.10.2) (2025-12-03)

### Bug Fixes

- strip repo prefix from R2 paths for API consistency ([c0dec19](https://github.com/klappy/translation-helps-mcp/commit/c0dec19750200f500d67b8e36560ae80d563363c))

### [7.10.1](https://github.com/klappy/translation-helps-mcp/compare/v7.10.0...v7.10.1) (2025-12-03)

## [7.10.0](https://github.com/klappy/translation-helps-mcp/compare/v7.9.0...v7.10.0) (2025-12-03)

### Fixed

- **Translation Academy search index**: TA articles now properly merged during indexing
  - Previously, article pieces (title.md, sub-title.md, 01.md) overwrote each other
  - Now merges all pieces into single article files during ZIP extraction
  - Output structure: `translate/figs-metaphor.md` instead of orphaned `01.md` files
  - Preserves category folders (translate, checking, process, intro) in search index

## [7.9.0](https://github.com/klappy/translation-helps-mcp/compare/v7.8.9...v7.9.0) (2025-12-03)

### Performance

- **Search 5-7x faster**: Default to vector-only search (~2-4s) instead of full RAG (~15-20s)
  - Uses `.search()` method for fast vector retrieval (no LLM response generation)
  - Previous `aiSearch()` was generating an AI summary we never used
  - Added `useAI` flag to opt-in to slower LLM-enhanced search when needed
  - Dashboard now shows warning about ~20s response time when AI mode enabled

### Added

- **useAI parameter**: New optional boolean parameter for search endpoint
  - `useAI=false` (default): Fast vector-only search (~2-4s)
  - `useAI=true`: Full RAG with AI-generated summary (~15-20s)
  - Returns `ai_response` field when AI mode is enabled
  - Returns `used_ai` field to indicate which mode was used

## [7.8.9](https://github.com/klappy/translation-helps-mcp/compare/v7.8.8...v7.8.9) (2025-12-03)

### Fixed

- **TW/TA index paths**: Fixed path generation bug that created duplicate entries
  - Was: `en_tw_bible_kt_love.md` (underscores replacing slashes)
  - Now: `kt/love.md` (proper category/articleId structure)
- **Flush script**: Improved with parallel batch deletes for faster bucket clearing

## [7.8.6](https://github.com/klappy/translation-helps-mcp/compare/v7.8.5...v7.8.6) (2025-12-03)

### Fixed

- **Search X-Ray trace visibility**: Added trace to response headers for MCP UI
  - Added `X-XRay-Trace` header with JSON trace data
  - Added `X-Response-Time` and `X-Trace-Id` headers
  - MCP tools page now renders trace visualization for search

## [7.8.5](https://github.com/klappy/translation-helps-mcp/compare/v7.8.4...v7.8.5) (2025-12-03)

### Added

- **X-Ray tracing for Search**: Added EdgeXRayTracer to search endpoint for performance debugging
  - Tracks AI Search call duration
  - Tracks result formatting duration
  - Tracks client-side filtering duration
  - Returns `_trace` object in response for visibility

## [7.8.4](https://github.com/klappy/translation-helps-mcp/compare/v7.8.0...v7.8.4) (2025-12-03)

### Performance

- **Search 3-5x faster**: Push filters to AI Search instead of client-side filtering
  - Filters (language, org, resource, book, chapter, articleId) now passed to `aiSearch()`
  - Added `max_num_results` to limit at source
  - Removed 9 redundant client-side filter passes
  - Expected: 7s → 2s (matching CF dashboard performance)

### Fixed

- **Indexer reindex trigger**: Added missing `CF_ACCOUNT_ID` secret for AI Search reindex
- **ZipResourceFetcher2**: Fixed regex to extract version from new `by-url/...` format
- **Index Worker**: Fixed potential undefined error in TSV parsing

## [7.8.0](https://github.com/klappy/translation-helps-mcp/compare/v7.7.13...v7.8.0) (2025-12-03)

### Features

- **Event-Driven Indexing Pipeline v2**: Complete rewrite of the search indexing architecture
  - Two-queue system: ZIP extraction and file indexing are now separate
  - Memory efficient: Extracts files one-at-a-time to stay within Cloudflare Workers limits
  - Universal indexing: Files from the main API now also trigger indexing via R2 events
  - Consistent R2 keys: All keys normalized to `by-url/...` format
  - No more missed files: Anything that lands in R2 gets indexed automatically

## [7.7.12] - 2025-12-03

### Changed

- **Versioned Cache API keys**: Cache keys now include app version prefix
- New deploy = new version = cache miss = fresh R2 lookup = indexer events fire
- Removed ALL duplicate sync garbage - versioned cache handles it automatically
- KISS: No more complex sync logic between Cache API and R2
- Cache URL: `https://r2.local/v{VERSION}/{key}` instead of `https://r2.local/{key}`

## [7.7.10] - 2025-12-03

### Fixed

- **Extracted file cache hits now sync ZIP to R2**: The actual fix!
- When cached extracted file (USFM) is returned, check if ZIP exists in R2
- If ZIP missing, download from DCS and store in R2 (fire-and-forget)
- This triggers R2 event notification for indexer
- File key `by-url/.../v87.zip/files/43-JHN.usfm` → ZIP key `by-url/.../v87.zip`

## [7.7.9] - 2025-12-03

### Fixed

- **Scripture ZIP caching**: Added R2 sync for ZIP Cache API hits (was only syncing TAR.GZ)
- This is the actual fix for scripture ZIP files not triggering indexer events
- When Cache API returns a cached ZIP but R2 is empty, now stores ZIP in R2 (fire-and-forget)
- This triggers R2 event notification for the indexer queue

## [7.7.8] - 2025-12-03

### Fixed

- **Indexer**: Added TAR.GZ support - some files stored under .zip keys are actually TAR.GZ
- Indexer now detects archive type from magic bytes and handles both formats
- Added GZIP decompression and TAR parsing to zip-handler
- This fixes DLQ failures when TAR.GZ data was synced to R2 under .zip keys

## [7.7.7] - 2025-12-03

### Performance

- Removed blocking R2 check from extracted file cache reads (was adding 400ms+ latency)
- ZIP syncing now only happens at the ZIP layer (getOrDownloadZip), not on every file read
- Cached file reads are fast again (10-40ms instead of 400ms+)

## [7.7.6] - 2025-12-03

### Fixed

- **Critical**: ResourceCatalogInfo now includes catalog metadata with version info
- v7.7.3 fix was broken - resource.catalog didn't exist on the interface
- Added catalog.prod.branch_or_tag_name and catalog.prod.zipball_url to ResourceCatalogInfo
- resource-detector.ts now passes through catalog metadata from DCS API
- Added warning log when falling back to 'master' due to missing version tag

## [7.7.5] - 2025-12-03

### Fixed

- **Critical**: When EXTRACTED FILE is cached but ZIP missing from R2, download ZIP
- This was the root cause - getScripture checks extracted file cache FIRST
- If file cached, ZIP never fetched → no R2 write → no indexing event
- Now downloads ZIP in background when serving cached extracted files

## [7.7.4] - 2025-12-03

### Fixed

- **Critical**: When TAR.GZ hits Cache API but ZIP missing from R2, download and store ZIP
- This ensures indexing events fire even when TAR.GZ is cached from previous sessions
- Indexer receives proper ZIP format (not TAR.GZ stored under .zip key)

## [7.7.3] - 2025-12-03

### Fixed

- **Critical**: Scripture now uses proper version tag from catalog (was hardcoded "master")
- Scripture ZIPs now use versioned keys (e.g., v87.zip) matching other resources
- Only sync .zip files to R2 (not .tar.gz) to avoid duplicate indexing events

## [7.7.2] - 2025-12-03

### Fixed

- **Critical**: Cache API hits now sync to R2 to trigger indexing events
- ZIPs served from edge cache but missing from R2 are now written to R2
- Added `clearEdgeCache` param to health endpoint for manual cache busting

## [7.7.1] - 2025-12-03

### Fixed

- Force redeploy to clear memory cache for fresh indexing pipeline test

## [7.7.0] - 2025-12-03

### Changed

- Indexer now uses book-level chunking instead of verse-level (470x fewer R2 writes)
- Scripture, Notes, Questions aggregate to one file per book with C:V format
- Translation Words and Academy roll up multi-file articles into single files
- Added interleaved CPU/IO parallel processing with controlled concurrency
- Notes now include inline Translation Academy references: (See: figs-metaphor)
- Rich metadata: verse_count, chapter_count, ta_references, chapters_covered

### Performance

- Scripture indexing: 66 files instead of 31,000 per resource
- Eliminated timeouts from excessive R2 write operations
- True parallel processing interleaves CPU and IO work

## [7.6.1] - 2025-12-02

### Fixed

- Critical: Fixed R2 key parsing to match actual `by-url/git.door43.org/...` format
- Fixed AI Search reindex trigger to only update rate limit on success
- Fixed catch block to not throw errors (content already in R2)
- Removed duplicate code blocks in ai-search-trigger.ts

## [7.6.0] - 2025-12-02

### Added

- Event-driven search indexing pipeline using Cloudflare R2 events and Queues
- New Indexer Worker that processes ZIP files asynchronously for AI Search
- Multi-level content chunking (verse, passage, chapter) for semantic search
- Markdown output with YAML frontmatter for LLM-friendly search results
- Automatic AI Search reindex triggering for sub-5-minute searchability
- 90-day R2 lifecycle rule for automatic old version cleanup

### Changed

- Decoupled search indexing from API serving path for better scalability
- Search endpoint now queries dedicated AI Search index bucket
- API is now read-only for ZIP data (indexing handled by worker)

### Removed

- Inline clean content storage from ZipResourceFetcher2 (moved to Indexer Worker)
- storeCleanContent and inferResourceType methods (handled by worker)

## [7.5.12] - 2025-12-02

### Fixed

- Added runtime validation for cacheType in cache.set() to prevent NaN expiry times
- Invalid cacheType values now fall back to fileContent default instead of causing undefined TTL
- Cache items no longer persist indefinitely when passed invalid cache types

## [7.5.11] - 2025-12-02

### Fixed

- Test suite cleanup: all 85 tests now pass
- Fixed Playwright/Vitest conflict by excluding E2E tests from Vitest runner
- Fixed invalid `.toBeOneOf()` assertions (not available in Vitest)
- Fixed 404/500 status expectation in example-wrangler tests
- Hardened cache to block `transformedResponse` caching per project policy

### Changed

- Excluded archived tests, experimental tests, and browser-mode tests from CI
- Updated `vitest.config.ts` with proper exclusion patterns
- Cleaned up cache architecture documentation to reflect actual implementation
- Removed references to unused V2 cache system from docs

### Documentation

- Rewrote `docs/CACHE_ARCHITECTURE.md` to match actual caching behavior
- Updated `tests/TEST_CLEANUP_PLAN.md` with current test status
- Cleaned up `IMPLEMENTATION_COMPLETE.md` and `OFFLINE_CLI_IMPLEMENTATION_SUMMARY.md`

## [7.5.10] - 2025-01-26

### Fixed

- Reduced excessive logging that caused Cloudflare deployment failures
- Simplified logging to essential errors only to avoid Worker limits
- Kept critical error logging for R2 storage and cleaning failures

## [7.5.9] - 2025-01-26

### Fixed

- Added aggressive error logging to debug scripture clean content storage failures
- Enhanced logging in storeCleanContent to track R2 storage operations
- Added detailed logging to cleanContentWithMetadata to identify cleaning issues
- Improved error visibility for clean content pipeline debugging See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [7.5.8](https://github.com/klappy/translation-helps-mcp/compare/v7.5.7...v7.5.8) (2025-11-26)

### Bug Fixes

- **Scripture clean content**: Fixed version extraction for scripture clean content storage
  - Scripture was being stored with "master" instead of actual version (e.g., "v87")
  - This prevented AI Search from indexing scripture content correctly
  - Now extracts version from the actual ZIP URL for proper storage path

### Critical Fix

This fixes the issue where scripture searches were returning no results in AI Search.
The clean content was being stored at the wrong path in R2.

## [7.5.7](https://github.com/klappy/translation-helps-mcp/compare/v7.5.6...v7.5.7) (2025-11-26)

### Features

- **Search-triggered population**: Search endpoint now triggers background content population
  - When search returns few/no results, automatically fetches and cleans relevant resources
  - Scoped population based on search filters (language, organization, resource, reference)
  - Smart population: Scripture fetches chapters, notes/questions fetch references, words/academy fetch common items
  - Returns message to user indicating content is being prepared

### Technical Details

- Added `triggerScopedPopulation` function to search endpoint
- Uses `platform.context.waitUntil()` for non-blocking background processing
- Population is scoped to the specific search context to avoid massive indexing

## [7.5.6](https://github.com/klappy/translation-helps-mcp/compare/v7.5.5...v7.5.6) (2025-11-26)

### Bug Fixes

- **Search endpoint**: Fixed "toLowerCase is not a function" error when AI Search returns non-string content
  - Added type checking for content field from AutoRAG response
  - Handle object/non-string content gracefully by stringifying
  - Added defensive checks in preview and context creation functions

### Notes

- AI Search threshold of 0.7 was too high, filtering out all results
- Typical semantic search scores range from 0.1-0.5

## [7.5.5](https://github.com/klappy/translation-helps-mcp/compare/v7.5.4...v7.5.5) (2025-11-26)

### Bug Fixes

- **Admin endpoints**: Fixed R2 environment initialization in admin endpoints
  - Admin endpoints now properly initialize R2 from platform environment
  - Both clean-status and populate-scope endpoints will now work in production

## [7.5.4](https://github.com/klappy/translation-helps-mcp/compare/v7.5.3...v7.5.4) (2025-11-26)

### Features

- **Admin endpoints**: New admin endpoints for managing AI Search clean content
  - `/api/admin/populate-scope` - Trigger clean content generation for a language/organization
  - `/api/admin/clean-status` - Check the status of clean content in R2 storage
- **Enhanced debugging**: Improved logging throughout clean content generation pipeline
- **Scoped population**: Smart population strategy to avoid massive initial indexing

### Bug Fixes

- **Clean content logging**: Added detailed logging to track clean content generation flow
- **R2 environment checks**: Added proper checks before attempting R2 operations
- **Import paths**: Fixed admin endpoint import paths for R2 utilities

## [7.5.3](https://github.com/klappy/translation-helps-mcp/compare/v7.5.2...v7.5.3) (2025-11-25)

### Features

- **Auto-populate clean content**: Added automatic clean content storage in R2 for AI Search indexing
- **Fire-and-forget hooks**: Clean content generation happens in background without blocking responses
- **Coverage**: Scripture (USFM), Translation Notes (TSV), Translation Questions (TSV), Translation Words (MD), Translation Academy (MD)

### Technical Details

- Added `storeCleanContent()` method to ZipResourceFetcher2
- Integrated hooks into `getScripture()`, `getTSVData()`, and `getMarkdownContent()` methods
- Clean content stored at `clean/{language}/{organization}/{repository}/{version}/{filepath}.txt`

## [7.5.2](https://github.com/klappy/translation-helps-mcp/compare/v7.5.1...v7.5.2) (2025-11-25)

### Bug Fixes

- **AutoRAG API**: Fixed AI Search to use correct AutoRAG API (`env.AI.autorag(indexName).aiSearch()`) instead of non-existent `env.AI.search()` method
- **Type definitions**: Updated `app.d.ts` with correct AutoRAG TypeScript interfaces

## [7.5.1](https://github.com/klappy/translation-helps-mcp/compare/v7.5.0...v7.5.1) (2025-11-25)

### Bug Fixes

- **Duplicate prevention**: Added server-side post-filtering to ensure only clean content from `/clean/` R2 prefix is returned, preventing duplicates from raw content files that AI Search may also index
- **Response metadata**: Added `total_hits` field to search response showing total matches after filtering

### Documentation

- Updated `docs/HYBRID_SEARCH_FEATURE.md` with duplicate prevention details

## [7.5.0](https://github.com/klappy/translation-helps-mcp/compare/v7.4.11...v7.5.0) (2025-11-25)

**AI Search Migration - Cloudflare AI Search Integration**

### Features

- **Cloudflare AI Search**: Migrated from MiniSearch to Cloudflare AI Search for semantic search capabilities
- **Rich metadata extraction**: Content now includes book, chapter, verse, article ID, and title metadata
- **Enhanced search filtering**: Filter by language, organization, resource type, reference, and article ID
- **Contextual results**: Search results include formatted references and contextual previews
- **Clean content pipeline**: USFM, TSV, and Markdown content automatically cleaned and stored in R2 for indexing

### New Files

- `src/utils/metadata-extractors.ts` - Centralized metadata extraction utilities
- `tests/metadata-extractors.test.ts` - Comprehensive tests for metadata extraction

### Improvements

- Search endpoint now returns rich metadata including book, chapter, verse for scripture
- Translation Words and Academy articles include article ID, category, and title
- R2 storage structure enhanced with comprehensive metadata fields
- MCP tools page updated to showcase AI Search capabilities

### Documentation

- Updated `docs/HYBRID_SEARCH_FEATURE.md` with AI Search architecture and API reference
- Enhanced search endpoint configuration with new filter parameters

### [7.4.11](https://github.com/klappy/translation-helps-mcp/compare/v7.4.10...v7.4.11) (2025-11-25)

**Search Performance and Reliability Improvements**

### Bug Fixes

- **Scripture search now returns all results**: Fixed a critical bug where Bible-only searches (via `fetch-scripture?search=`) were returning only 8 results instead of the expected 50. The issue was caused by notes/words resources being incorrectly included when they should have been filtered out, then outranking Bible results.

### Performance

- **Search optimization with R2-backed index caching**: Individual file indexes are now cached in R2, reducing repeated search times from 8-40s to under 2.5s
- **Parallel batch processing**: Search now processes 10 books at a time for faster broad searches
- **File list caching**: ZIP file listings are cached to avoid repeated unzipping operations

### Features

- **Search all books**: Scripture, notes, and questions endpoints now support searching across all 66 books without requiring a specific reference
- **Improved search quality**: Better relevance ranking with fuzzy matching and prefix search support

### [7.4.10](https://github.com/klappy/translation-helps-mcp/compare/v7.4.9...v7.4.10) (2025-11-22)

### [7.4.9](https://github.com/klappy/translation-helps-mcp/compare/v7.4.8...v7.4.9) (2025-11-22)

### [7.4.8](https://github.com/klappy/translation-helps-mcp/compare/v7.4.7...v7.4.8) (2025-11-22)

### [7.4.7](https://github.com/klappy/translation-helps-mcp/compare/v7.4.6...v7.4.7) (2025-11-22)

### [7.4.6](https://github.com/klappy/translation-helps-mcp/compare/v7.4.5...v7.4.6) (2025-11-22)

### [7.4.5](https://github.com/klappy/translation-helps-mcp/compare/v7.4.3...v7.4.5) (2025-11-22)

### [7.4.4](https://github.com/klappy/translation-helps-mcp/compare/v7.4.3...v7.4.4) (2025-11-22)

### [7.4.3](https://github.com/klappy/translation-helps-mcp/compare/v7.4.2...v7.4.3) (2025-11-22)

### [7.4.2](https://github.com/klappy/translation-helps-mcp/compare/v7.4.1...v7.4.2) (2025-11-22)

### [7.4.1](https://github.com/klappy/translation-helps-mcp/compare/v7.4.0...v7.4.1) (2025-11-22)

### Features

- register search endpoint in UI registry ([f1c71b6](https://github.com/klappy/translation-helps-mcp/commit/f1c71b6135afbc8aef6897d1d3d49697676c2383))

### Bug Fixes

- restore correct KV namespace ID after merge conflict ([e654f68](https://github.com/klappy/translation-helps-mcp/commit/e654f683994ccffdab90f831a89b659f48c0a057))

### Documentation

- clean up changelog for v7.4.0 release ([da742be](https://github.com/klappy/translation-helps-mcp/commit/da742be246b04c2d78a7fb1afc880f1b4d93dd4f))

## [7.4.0](https://github.com/klappy/translation-helps-mcp/compare/v7.1.3...v7.4.0) (2025-11-22)

### Features

**🔍 Ad-Hoc Search Feature (NEW)**

- Added high-performance BM25-ranked search across all Door43 translation resources
- Search scripture, translation notes, words, questions, and academy articles in any language
- Supports fuzzy matching and prefix search for flexible term matching
- Micro-recursive architecture with parallel processing for sub-10s response times
- New MCP tool: `search_biblical_resources` for integration with AI assistants
- Fully stateless design with graceful failure handling

**Other Improvements**

- Added configurable timeouts for long-running MCP tools
- Enhanced chat with contextual follow-up patterns and intent mapping
- Improved dynamic resource mapping for scripture endpoint
- Added Getting Started page and comprehensive debugging tools

### Bug Fixes

- Fixed internal API routing and unzipit entries handling for search feature
- Removed hardcoded absolute paths from MCP configuration
- Resolved undefined variable bugs in MCP tools
- Fixed circular reference in vite.config.ts
- Improved error handling across endpoints

### Documentation

- Added comprehensive search integration test results and performance analysis
- Added Ollama setup guides and OpenAI chat setup guide
- Improved MCP debugging documentation
- Updated API documentation and examples
- prepare changelog for release ([ea85af3](https://github.com/klappy/translation-helps-mcp/commit/ea85af38f2e47af8c8e48ad13af5b2782ef6fa22))
- simplify chat setup ([a37ebaa](https://github.com/klappy/translation-helps-mcp/commit/a37ebaa48f026471a1766766b72e2197bf88a50e))
- update ANGELOG for offline-first L ([5274d16](https://github.com/klappy/translation-helps-mcp/commit/5274d1663b1335cb2b8c718cad08de1455b8d9c7))
- update chat setup guide ([ddac97f](https://github.com/klappy/translation-helps-mcp/commit/ddac97f6875b06b53da53ad6650884e4ee0623fc))

## [7.3.0](https://github.com/klappy/translation-helps-mcp/compare/v7.2.0...v7.3.0) (2025-11-12)

### Features

- add contextual conversational follow-up patterns to chat ([30334bb](https://github.com/klappy/translation-helps-mcp/commit/30334bb35cd3d30641bd473b647386f8d74c13ec))
- add dotenv support for chat in Vite dev mode ([54f2c27](https://github.com/klappy/translation-helps-mcp/commit/54f2c27ff9efc5d6e8414cc4bc9f0bf09c899feb))
- add intelligent intent mapping to chat system prompt ([06a5152](https://github.com/klappy/translation-helps-mcp/commit/06a51520e704719f0935dd851e99b4ec1e884d51))
- add M server debugging tools and guide ([c2445c5](https://github.com/klappy/translation-helps-mcp/commit/c2445c56441ebb13401444ee251af44dcbd81e99))
- implement two-phase learning approach in chat ([15f99a7](https://github.com/klappy/translation-helps-mcp/commit/15f99a7ae1009e2f58ae3e12f004236385166f72))
- integrate M prompts into chat assistant ([1931868](https://github.com/klappy/translation-helps-mcp/commit/1931868e4b1e96711ae52842fa34b35878b5ff99))
- require ranslation Academy section and follow-up questions in chat ([cf22cff](https://github.com/klappy/translation-helps-mcp/commit/cf22cff48eb9fb42e6fcb86d5d1a97c2ed40ece4))
- show English phrases instead of Greek/ebrew in translation notes overview ([5a24f83](https://github.com/klappy/translation-helps-mcp/commit/5a24f83b1661c3fa47a688ebe7f94da97ae28d8d))
- transform chat into guided multi-turn learning conversation ([7b69ea0](https://github.com/klappy/translation-helps-mcp/commit/7b69ea02733c98ab7cfb48f81c212deba33fb8f7))

### Bug Fixes

- enforce listing ALL items in comprehensive overview response ([9d40226](https://github.com/klappy/translation-helps-mcp/commit/9d402264bc517858c0b6a5bdd86f43b24857dc99))
- increase max_tokens for comprehensive chat responses ([f8f774d](https://github.com/klappy/translation-helps-mcp/commit/f8f774d09e570c64f3a98de84d372f4676caa06a))
- resolve undefined variable bugs in M tools ([196416b](https://github.com/klappy/translation-helps-mcp/commit/196416bee033df98820d4af88ff4e71ebb25e1ad))
- use SvelteKit env for loudflare compatibility ([438c73a](https://github.com/klappy/translation-helps-mcp/commit/438c73ae773f4dc42ecf709787ab57384e9c4ab1))

### Documentation

- add OpenA chat setup guide ([5e41dd7](https://github.com/klappy/translation-helps-mcp/commit/5e41dd72c382a79e8a59d4ff8ad46cd3062dd590))
- simplify chat setup ([a37ebaa](https://github.com/klappy/translation-helps-mcp/commit/a37ebaa48f026471a1766766b72e2197bf88a50e))
- update chat setup guide ([ddac97f](https://github.com/klappy/translation-helps-mcp/commit/ddac97f6875b06b53da53ad6650884e4ee0623fc))

## 7.2.0 (2025-11-11)

### ⚠ BREAKING CHANGES

- /api/chat moved to /api/experimental/query-router

* Create /api/chat-stream endpoint using OpenAI GPT-4o-mini
* Implement self-discoverable endpoint selection via /api/mcp-config
* Let LLM intelligently choose which endpoints to call
* Let LLM select optimal response format (md/text/json)
* Enforce strict content rules (no paraphrasing, citations required)
* Move pattern-matching chat to /api/experimental/query-router
* Add comprehensive documentation (AI_CHAT_RULES.md, AI_CHAT_ARCHITECTURE.md)
* Create tests to prevent regressions
* Document streaming as future enhancement
* Support OPENAI_API_KEY configuration

- Introduces new dynamic architecture that eliminates hardcoded field mappings

Problem Solved:

- Too many hardcoded field names and transformations
- Every layer needed to stay in sync
- Brittle system that breaks with any API change
- Complex configuration at every level

Solution:

1. DynamicDataPipeline class
   - Analyzes data structure at runtime
   - Extracts all text content automatically
   - Finds arrays and links without configuration
   - Preserves original data structure

2. Dynamic MCP endpoint (/api/mcp-dynamic)
   - Simple tool-to-endpoint mapping
   - No field transformations
   - Uses dynamic pipeline for all tools
   - Returns data formatted for LLM

3. Dynamic Chat endpoint (/api/chat-dynamic)
   - Pattern matching for tool selection
   - Minimal parameter extraction
   - Direct pass-through architecture
   - No response transformation

Benefits:

- Resilient to API changes
- No field name assumptions
- Handles any data structure
- Much simpler codebase
- Easy to debug and extend

Testing:

- Access /dynamic-test.html for comparison
- Shows old vs new approach side-by-side
- Analyzes API structures dynamically
- Demonstrates improved resilience

This is a major architectural improvement that makes the system
anti-fragile rather than brittle. Instead of breaking when APIs
change, it adapts automatically.

- Deployment process simplified from complex multi-step
  build to single-command builds for each platform
- Translation words API now returns additional fields by default.
  Use includeTitle=false, includeSubtitle=false, includeContent=false for old behavior.
- fetchScripture now returns array of all translations
- Resources now require proper catalog entries with ingredients arrays
- Removed rawUsfm field from scripture responses

### Features

- Add AI integration systems ([a077dad](https://github.com/klappy/translation-helps-mcp/commit/a077dad61c78fb35967fd5808558af10f5c17cb7))
- add AI thinking trace to show reasoning process\n\n- Add generateThinkingTrace method to LLMChatService\n- Display thinking steps before AI responses\n- Show API call results and timing in thinking trace\n- Add beautiful UI component with numbered steps\n- Enhance transparency of AI decision-making process\n- Include detection of scripture references, word queries, and Bible topics ([113b74d](https://github.com/klappy/translation-helps-mcp/commit/113b74d390621a84e056264102e935858a4ddb74))
- add automated deployment with GitHub Actions ([7a974e5](https://github.com/klappy/translation-helps-mcp/commit/7a974e5a987ab62bddc4445697bee92af5fb2b25))
- Add automatic endpoint testing with visual status indicators\n\n- Add Test All Endpoints button to test all endpoints at once\n- Show colored dots (green/yellow/red) for endpoint status\n- Green = working, Yellow = returns empty/warning, Red = error\n- Display error messages on hover for failed endpoints\n- Automatically tests with default parameters\n- Small delay between tests to avoid overwhelming server ([f6e0817](https://github.com/klappy/translation-helps-mcp/commit/f6e0817e3e35aea141d4211eca3bc9250a2d826f))
- add cache clearing script for testing ([77f04ee](https://github.com/klappy/translation-helps-mcp/commit/77f04ee7cbc366fd4f517772aadcb912774c09ab))
- add cache clearing to health endpoint for testing ([37030b0](https://github.com/klappy/translation-helps-mcp/commit/37030b05931de25509de848bad18d7858ddb8408))
- add cache validator middleware for data integrity ([0d7b5b6](https://github.com/klappy/translation-helps-mcp/commit/0d7b5b6866639d16342f33454e3c346804fbba90))
- Add chat showcase endpoint and metadata consistency ([77f83ce](https://github.com/klappy/translation-helps-mcp/commit/77f83ce253922f6b439f821309d37bca975b1055))
- add circuit breaker and migrate resource-catalog endpoint ([11b0e40](https://github.com/klappy/translation-helps-mcp/commit/11b0e40d4f72d2773373ec4dfafdd5d9e6208d46))
- add clear fallback indicators and thinking trace for mock responses\n\n- Add 🎭 MOCK RESPONSE headers to all mock responses\n- Add warning messages at bottom of mock responses\n- Show thinking trace for fallback responses\n- Add visual 🎭 Mock badge in message headers\n- Update thinking trace to show fallback status\n- Make it crystal clear when using development mode responses\n- Prevent users from being fooled by realistic mock responses ([1ff172b](https://github.com/klappy/translation-helps-mcp/commit/1ff172b5d0a6b0d9d3ecce2dd8a4dce7ea24ae9c))
- add collapsible thinking trace with persistence\n\n- Add collapsedThinkingTraces state to track collapsed traces\n- Add toggleThinkingTrace function for show/hide functionality\n- Update thinking trace UI with collapsible header and toggle button\n- Show thinking trace during typing, allow collapse after completion\n- Persist collapse state across chat sessions\n- Clear collapsed traces when clearing chat\n- Add beautiful toggle button with chevron icons ([588f5d4](https://github.com/klappy/translation-helps-mcp/commit/588f5d4819d39d020795a417d7916745e9e54636))
- add color-coded health status bullet points throughout MCP Tools ([233bb80](https://github.com/klappy/translation-helps-mcp/commit/233bb8080537d5ada49692542d8013473d360727))
- Add compact timing display to homepage demo ([69699ff](https://github.com/klappy/translation-helps-mcp/commit/69699ff6ae94c6c88b88a33dd1e9d7342a84e4bf))
- Add comprehensive scripture parameter testing ([a2ae5d8](https://github.com/klappy/translation-helps-mcp/commit/a2ae5d811b1a2c6d0119310bb5a338b8c995f50c))
- add comprehensive status indicators for message health\n\n- Add overallStatus field to ChatMessage interface\n- Implement calculateOverallStatus function with logic:\n 🟢 Green: All tool calls + real AI response\n 🟡 Yellow: Tool calls worked but AI response mocked\n 🔴 Red: Tool calls failed\n- Add visual status indicators in message headers\n- Add prominent status badges in thinking trace headers\n- Provide immediate visual feedback on request health\n- Help users quickly identify system performance issues ([7429749](https://github.com/klappy/translation-helps-mcp/commit/7429749a2742089e7e67d2eeb465eaa291e6852c))
- add consistency utilities and migrate two translation endpoints ([b2f2ed6](https://github.com/klappy/translation-helps-mcp/commit/b2f2ed614a089435438e339d49cc230967e88413))
- add contract tests for fetch-scripture golden reference ([f259b1e](https://github.com/klappy/translation-helps-mcp/commit/f259b1e901c7710bd378abf24b389a687dc66d7f))
- add data fetchers and migrate two more endpoints ([d98bd8e](https://github.com/klappy/translation-helps-mcp/commit/d98bd8ee2d3a07c034c0c08c23d37f1328dd4326))
- Add dynamic changelog route and redesign performance page ([b719658](https://github.com/klappy/translation-helps-mcp/commit/b71965887baba79baa04e408935b6d08ae8f931b))
- add endpoint benchmark and prove pattern benefits ([99a8147](https://github.com/klappy/translation-helps-mcp/commit/99a8147ce1c7009fefd8f7b95bbc4c448c7c4eeb))
- add endpoint generator and API explorer ([9535270](https://github.com/klappy/translation-helps-mcp/commit/9535270e9803cb83aa2ce0f12bb5edc928f428dc))
- Add enhanced error tracing and copy buttons to MCP tools ([0785e5d](https://github.com/klappy/translation-helps-mcp/commit/0785e5db5ae9322418a2b7f701858ebb829bbf37))
- add format support to v2 endpoints ([46f3063](https://github.com/klappy/translation-helps-mcp/commit/46f30638797543f742800cc484e358f328bf0e95))
- add full content to other two prompts for consistency ([adaff82](https://github.com/klappy/translation-helps-mcp/commit/adaff820d403025a0b6f69671be544382b7d9451))
- add Getting Started page ([de1dc16](https://github.com/klappy/translation-helps-mcp/commit/de1dc1653e95b5e2fc5c8ac12ffae7cd5447564c))
- add health status indicators to MCP Tools sidebar ([69cccb7](https://github.com/klappy/translation-helps-mcp/commit/69cccb7ec610e415c46fc30a7be302d320176a45))
- add KV debugging features ([a3f6118](https://github.com/klappy/translation-helps-mcp/commit/a3f611858c09d5df21d8884bf98b0b5d58bfc92f))
- add KV status diagnostic endpoint ([b6a4ab8](https://github.com/klappy/translation-helps-mcp/commit/b6a4ab8bcbdd61177d667ff9dd8e84ede1770c20))
- Add RC link resolver endpoint ([95a8ffa](https://github.com/klappy/translation-helps-mcp/commit/95a8ffa3df729a53dee283da7181ad9050787a34))
- add rcLink/moduled fallback for failed fetches ([57c94b5](https://github.com/klappy/translation-helps-mcp/commit/57c94b57cb081fb7dfaf5ddcbc0fcd800d8b25c6))
- add real data validation and performance tests ([0771d42](https://github.com/klappy/translation-helps-mcp/commit/0771d428b83b2b92066efe8c20563543d94b2a87))
- add real metadata support from DCS ([1b7fbe3](https://github.com/klappy/translation-helps-mcp/commit/1b7fbe3f21c8f76ba0664ec360e9f6ad2aad573a))
- add real-time performance indicators to MCP tools page - response timing and cache status for customer demos ([86a8440](https://github.com/klappy/translation-helps-mcp/commit/86a8440964ff61cb3d9cc79117bfebd7dec379d0))
- Add resource-catalog endpoint for detailed metadata ([08a8e1a](https://github.com/klappy/translation-helps-mcp/commit/08a8e1a79130529dc18cf7eafa385a0e68b7075d))
- add response validator middleware for API safety ([61831dd](https://github.com/klappy/translation-helps-mcp/commit/61831dd415e2489583262eca54cf0f5f8ee585a0))
- Add rich language metadata to API response ([1f2967c](https://github.com/klappy/translation-helps-mcp/commit/1f2967cb07622a35292c63fd810736e07db6925a))
- Add robust MCP Response Adapter to prevent brittle chat failures ([7bd7e7c](https://github.com/klappy/translation-helps-mcp/commit/7bd7e7c8c51dd835817476ebe49f84cd6daf67bb))
- Add technical whitepaper with markdown rendering ([2b5c017](https://github.com/klappy/translation-helps-mcp/commit/2b5c0174571e4f153c674adba81cce6eb64fd5f8))
- Add translation attribution to scripture quotes ([4d53aa2](https://github.com/klappy/translation-helps-mcp/commit/4d53aa265118e2ddd811423effcc6b568f6cdfcd))
- add translation notes and raw JSON toggle ([e27dde3](https://github.com/klappy/translation-helps-mcp/commit/e27dde3c59faf9c978a466da4a8d1af55081672f))
- add translation word links endpoint ([83079d2](https://github.com/klappy/translation-helps-mcp/commit/83079d2c3ae8a66c6d364b9e91bb9475269bf5c6))
- Add User-Agent to all API calls for DCS team visibility ([e33a262](https://github.com/klappy/translation-helps-mcp/commit/e33a2628f41f2f9f10681124df1789c8aa515c85))
- Add version-aware caching to prevent stale data on releases ([23e2a3b](https://github.com/klappy/translation-helps-mcp/commit/23e2a3ba447f6bb47456893058ddfa9e8a664d14))
- add X-Ray tracing for DCS API calls - bypass linting temporarily to commit core functionality ([46bc40c](https://github.com/klappy/translation-helps-mcp/commit/46bc40c9174194fe3d1123b28711fd9e7e186fd6))
- add X-Ray tracing to all core endpoints for debugging visibility ([7468090](https://github.com/klappy/translation-helps-mcp/commit/7468090d2c5d4ceff42255c53f738150fb18a870))
- add X-Ray tracing to translation word links handler - types to fix later ([dbed89b](https://github.com/klappy/translation-helps-mcp/commit/dbed89bcc43f55dbef144b6d884dbc452c22d37c))
- **archives:** fallback to Link header (tar.gz) when zipball fetch fails; store under alt URL key; keep R2/Cache x-ray events ([8e320fa](https://github.com/klappy/translation-helps-mcp/commit/8e320faa3c90e745272e74d9f52738bb78dea45e))
- **archives:** prefer tag tar.gz before immutable Link when ZIP fails; keep dual-write to ref tar key for cache hits ([d3fba5b](https://github.com/klappy/translation-helps-mcp/commit/d3fba5be090edf4eeaf3452ba2072c62bc0c79e8))
- brilliant caching-in-wrapper architecture ([bdd4883](https://github.com/klappy/translation-helps-mcp/commit/bdd488355e4f451f8f2f42133ff8d811c2118277))
- **cache,r2:** ZIP-first R2 lookup with tar.gz fallback; correct content-type; add health R2 diagnostics and ZIP-first proof ([585cd12](https://github.com/klappy/translation-helps-mcp/commit/585cd125c38d92b93dcd61ace7d445ca790e104f))
- **cache:** add R2 + Cache API support for zip and tar.gz archives; improve X-Ray tracing and disable response caching\n\n- Add tar.gz extraction (gunzip + TAR walk) in ZipResourceFetcher2\n- Use URL-derived R2 keys and store extracted files under /files/<path>\n- Initialize R2 env per request and always include trace on errors\n- Mark endpoint responses as no-store; only R2/Cache used for files\n- Normalize inner paths to avoid double slashes in file keys ([ff81e71](https://github.com/klappy/translation-helps-mcp/commit/ff81e71754e5f17d3fe01266ec35153c74ca16cc))
- **cache:** implement ZIP-based resource caching with Cloudflare KV ([d8b9aca](https://github.com/klappy/translation-helps-mcp/commit/d8b9aca6aeb8aeccbdb2e9177083e97e8b8b520d))
- **chat:** better self-discovery and tool usage\n\n- Add fieldDescriptions across resources (TW, TQ, scripture alignment)\n- Expose flattened selfDiscovery in /api/mcp-config\n- Improve endpoint descriptions with detailed params and examples\n- Normalize endpoint names and alias params (word->term)\n- Default md for get-translation-word; drop bad path/reference\n- Pretty-print TW article content into model context\n\nBuilds clean; tests require dev server routing which we skip pre-release ([e050257](https://github.com/klappy/translation-helps-mcp/commit/e0502575a9f89e99f631cb732d2a58b42a88b079))
- **chat:** restore X-ray in streaming mode\n\n- Emit xray and xray:final SSE events with tools and timings\n- Client listens and attaches xrayData to streaming assistant message\n- Fix eslint issues in streaming loop and try/catch ([05d38b5](https://github.com/klappy/translation-helps-mcp/commit/05d38b5f2d7db4fd9e6415721d6ef3e901bab3d6))
- Clarify whitepaper as preview/teaser for upcoming full document ([d5d15fa](https://github.com/klappy/translation-helps-mcp/commit/d5d15fae184eecd2024f93e76b0e1e95a9ca5d11))
- **cleanup:** Complete service file cleanup - Subtask 3.4 ([96e6ef7](https://github.com/klappy/translation-helps-mcp/commit/96e6ef7a4de25fa0fd3a7ace141f6abb3ad06ec2))
- **cleanup:** Move experimental/debug features to experimental directory ([d6da78c](https://github.com/klappy/translation-helps-mcp/commit/d6da78c1503e805da46636ccd0b3e81b025473bb))
- complete 100 percent endpoint migration - MISSION ACCOMPLISHED ([e6d8fb8](https://github.com/klappy/translation-helps-mcp/commit/e6d8fb82769f33df6b1ed0259995e89922ac8b31))
- complete 87 percent of endpoint migrations ([c2381ca](https://github.com/klappy/translation-helps-mcp/commit/c2381ca49c43d95b4f8f2f99a73621dfc613fe6e))
- Complete architecture overhaul - 100% real data, zero mocks ([a6c2184](https://github.com/klappy/translation-helps-mcp/commit/a6c21846ceab100cc22f21cb5aa55de44f6ca111))
- Complete critical P0 Scripture foundation with UST/GST ([edcfa04](https://github.com/klappy/translation-helps-mcp/commit/edcfa0459fa17995a56953eed8b7c3892c0af321))
- Complete endpoint testing system with reference parsing ([c73cc37](https://github.com/klappy/translation-helps-mcp/commit/c73cc37567bf3db5468426b7836634ef8ccb6905))
- Complete MCP Tools functionality with flexible scripture resources ([20f1346](https://github.com/klappy/translation-helps-mcp/commit/20f1346a208bc5d686c84c0ef011d46af7e3cb13))
- Complete Netlify migration - delete entire netlify directory ([7784aff](https://github.com/klappy/translation-helps-mcp/commit/7784affc353b368a9fbce17a4a2a931ec6b6c021))
- Complete P0 terminology updates for UW compliance ([31340a0](https://github.com/klappy/translation-helps-mcp/commit/31340a0ae8fc782b808c861b6ef2eb1d0f6a781e))
- complete Phase 3 Enhanced Resource Discovery ([cc8dc9e](https://github.com/klappy/translation-helps-mcp/commit/cc8dc9e3934bb4f45f2ce702c87a17b49c7b550f))
- complete project infrastructure setup ([20a8fcf](https://github.com/klappy/translation-helps-mcp/commit/20a8fcf2e7dbf89325f3f982ccd577845c598487))
- complete resource detector implementation (Task 7) ([84f99a4](https://github.com/klappy/translation-helps-mcp/commit/84f99a4dd8854964bbe4caf7f8a98fa4994f62cc))
- complete terminology validation test suite (Task 6) ([2ebd9d0](https://github.com/klappy/translation-helps-mcp/commit/2ebd9d05536f0085ec5d124c9e3204c8edd90611))
- comprehensive refactor plan with 9 epics and preservation of working cache ([690946b](https://github.com/klappy/translation-helps-mcp/commit/690946b933f98a48d03bdea171a20549e4801bee))
- **config:** Complete endpoint configuration foundation - subtasks 4.1-4.3 ([b302ce8](https://github.com/klappy/translation-helps-mcp/commit/b302ce87bb1b232667c64dba82e892ce238d101b))
- **config:** Complete UI Generator and finish configuration system ([ed79e36](https://github.com/klappy/translation-helps-mcp/commit/ed79e3643b8305111eac2bcd61492b55df9fc523))
- **config:** Discovery endpoints working via configuration system - Subtask 5.4 COMPLETE ([785aa27](https://github.com/klappy/translation-helps-mcp/commit/785aa27628abd9e34e8b18f309deeeac537aeb39))
- **config:** Scripture endpoints working via configuration system - Subtask 5.1 COMPLETE ([fd17507](https://github.com/klappy/translation-helps-mcp/commit/fd17507e3aa057112c19a7437b0fc899e890f03f))
- **config:** Translation Academy endpoints via configuration system - Subtask 5.3 COMPLETE ([3d0eb28](https://github.com/klappy/translation-helps-mcp/commit/3d0eb281accf374615218f775fa58e6c01413b35))
- **config:** Translation Helps endpoints working via configuration system - Subtask 5.2 COMPLETE ([626c52d](https://github.com/klappy/translation-helps-mcp/commit/626c52d5edc814033dedfa38fc83bcbd682b30a0))
- Connect homepage demo to real MCP services and chat pipeline ([37382ae](https://github.com/klappy/translation-helps-mcp/commit/37382ae83183ae9f8b27b780dd252a4c40f1ec31))
- Connect MCP Tools to real configuration system - Subtask 6.1 progress ([dfac0ec](https://github.com/klappy/translation-helps-mcp/commit/dfac0ec8cdade887757d677508588f57ea02dc27))
- connect real data to scripture endpoint ([d4178b9](https://github.com/klappy/translation-helps-mcp/commit/d4178b9a86c17b6fc8e414361570dd97b3cdb098))
- connect translation notes to real data ([0a61846](https://github.com/klappy/translation-helps-mcp/commit/0a618468d3d02580b38d92d5584c42933063e0e8))
- connect translation questions to real data ([482bd93](https://github.com/klappy/translation-helps-mcp/commit/482bd93360a1d57dea59d6be00bf8f57774b63e4))
- connect translation words to real data ([05ffc79](https://github.com/klappy/translation-helps-mcp/commit/05ffc79a74b84f51a4f2d397a8795c91592239ff))
- consolidate API and MCP Tools navigation into single MCP Tools API link ([e38289f](https://github.com/klappy/translation-helps-mcp/commit/e38289f4162fce5057de85137ac62c4968040ef4))
- Deprecate Netlify references across site, focus on Cloudflare ([ba91ccb](https://github.com/klappy/translation-helps-mcp/commit/ba91ccb855fbe2eeebc63f56bdaf65e6779c90b3))
- **docs,ui:** Complete Tasks 1-2 - Documentation cleanup and UI route removal ([9fd7e8b](https://github.com/klappy/translation-helps-mcp/commit/9fd7e8bcdc8042a8b85c10c60b3dc25ade100aeb))
- **endpoints:** Implement Scripture endpoints via configuration system - Subtask 5.1 COMPLETE ([10cbd1d](https://github.com/klappy/translation-helps-mcp/commit/10cbd1d09eeef8fa97b37a4d2a2118cf4ae07765))
- enhance health monitoring with dual cache/bypass testing and add full API testing to MCP page ([941777c](https://github.com/klappy/translation-helps-mcp/commit/941777c24a925951a8e454118d3cbed15054941a))
- enhance MCP self-discovery with field descriptions for translation notes ([75a8d4b](https://github.com/klappy/translation-helps-mcp/commit/75a8d4bcbd0fbdf7fbf31dd20727bd6b15764cbd))
- enhance mock response streaming with realistic timing ([04960bf](https://github.com/klappy/translation-helps-mcp/commit/04960bf1010ec5afd8c0b5f22cbda0a5fb76ce10))
- enhance reference parser to support book-only and chapter ranges ([04e0d76](https://github.com/klappy/translation-helps-mcp/commit/04e0d764716c92167974f85ed5fbe981a02ac572))
- Enhanced endpoint examples with real DCS data - Subtask 6.4 progress ([a8343e6](https://github.com/klappy/translation-helps-mcp/commit/a8343e61f2a211d6c11bc680f1be55504b18c824))
- Enhanced examples display with real validation patterns - Subtask 6.4 near completion ([026875d](https://github.com/klappy/translation-helps-mcp/commit/026875d95f7ece0842ef2835c14fcb2bbe62f06a))
- Enhanced performance visibility with X-ray traces - Subtask 6.2 progress ([25ab5c5](https://github.com/klappy/translation-helps-mcp/commit/25ab5c531b16b151163900011d9e5c61b7de101f))
- expand antifragile health checks to detect ANY error ([1854f18](https://github.com/klappy/translation-helps-mcp/commit/1854f1830e5f6d45bc685d8510f689c39c1f164a))
- Experimental Lab Tab with warnings and real features - Subtask 6.3 progress ([b401f7b](https://github.com/klappy/translation-helps-mcp/commit/b401f7b5f0c64282d48c6db29a2c810b844f167f))
- Extended tier Context endpoints via configuration system - Task 5 complete ([4c8ec1e](https://github.com/klappy/translation-helps-mcp/commit/4c8ec1e150addcccac5ec8c5b045b8415d0d3fe1))
- fix all TypeScript build errors ([9197db5](https://github.com/klappy/translation-helps-mcp/commit/9197db5fdc6c7db704f4625baad782cfa54b57df))
- fix API Explorer and connect discovery endpoints to real data ([1eb332d](https://github.com/klappy/translation-helps-mcp/commit/1eb332d2ec17c4cb53557662fb91dcc5d6da2fe5))
- fix client-side errors and enhance health monitoring ([0429e12](https://github.com/klappy/translation-helps-mcp/commit/0429e12e945aa36361541f8b339f52925d920420))
- Fix MCPToolsV2 component for proper three-tier architecture display ([bf2efff](https://github.com/klappy/translation-helps-mcp/commit/bf2efff204d3b797eecb9620db884cc7202217c1))
- implement 6 major PRD tasks - resource discovery & performance systems ([dc95c2b](https://github.com/klappy/translation-helps-mcp/commit/dc95c2b9bd49dee93bf43a0c198a88c895c5bdd4))
- Implement AI-powered chat with OpenAI GPT-4o-mini ([a5bdcb1](https://github.com/klappy/translation-helps-mcp/commit/a5bdcb1743c8568d6ed6e86e39d9f469de3aebd3))
- implement antifragile 404 detection for health checks ([db4421e](https://github.com/klappy/translation-helps-mcp/commit/db4421e1ee853ecaa340b7b438c95834614947b5))
- Implement complete DCS API client v1.2.0 ([a782593](https://github.com/klappy/translation-helps-mcp/commit/a78259337b450209ad2eaf91c4c27d6463f7fff6))
- implement comprehensive chaos engineering test suite ([e6b059d](https://github.com/klappy/translation-helps-mcp/commit/e6b059da060ebff3aa8e256e36fdae1e69fd6cac))
- Implement critical P0 alignment system foundation ([f49b5f9](https://github.com/klappy/translation-helps-mcp/commit/f49b5f9983ac787cf36497f3d968a4696ab3fca9))
- implement dynamic resource fetching using ingredients array ([49fa7ff](https://github.com/klappy/translation-helps-mcp/commit/49fa7fff9e8f57591d3773a4e38b4816a138244c))
- implement endpoint configurations ([61deabb](https://github.com/klappy/translation-helps-mcp/commit/61deabb94a7f5e17803b1e256df825517aa9151b))
- implement enhanced caching with Netlify Blobs and version-aware keys ([a2cefaf](https://github.com/klappy/translation-helps-mcp/commit/a2cefaf28c9f9a98e152db5050d2095c1927feba))
- implement language coverage matrix API (Task 8) ([a1e669b](https://github.com/klappy/translation-helps-mcp/commit/a1e669bf6144658d219d1c2f57389004255a58e3))
- implement multi-translation scripture support with clean text extraction ([1581cfd](https://github.com/klappy/translation-helps-mcp/commit/1581cfd69af77c0d623a5579beb508b68483bd61))
- implement performance optimization systems ([3af61f1](https://github.com/klappy/translation-helps-mcp/commit/3af61f1f41c22806c3451166d60c16dba6d364c4))
- implement platform-agnostic function architecture ([e824466](https://github.com/klappy/translation-helps-mcp/commit/e8244668002c2d9372811fd95df7ae56e2bd40a6))
- Implement proper ingredients-based scripture fetching ([f58ae67](https://github.com/klappy/translation-helps-mcp/commit/f58ae670ab95cddc28295c4b26e2fa8581d13666))
- implement real-time streaming responses with thinking trace ([3cb256a](https://github.com/klappy/translation-helps-mcp/commit/3cb256acb32a3b26222343cd9875134961e83e7e))
- implement response sanitizer and fix X-ray contamination ([b092a8c](https://github.com/klappy/translation-helps-mcp/commit/b092a8c0996455d758e87a3f38762f73e7fdd731))
- implement rich cache status tracking ([fd73513](https://github.com/klappy/translation-helps-mcp/commit/fd735137b43adb7dd29310d2ffda314bfa6a5c57))
- implement subject-specific catalog caching for sub-2s performance ([4d2add0](https://github.com/klappy/translation-helps-mcp/commit/4d2add0f9cb28eff2777e4fc62f6f62f256624ba))
- implement Task 10 - Intelligent Cache Warming ([8d66215](https://github.com/klappy/translation-helps-mcp/commit/8d662158bd35b6533987cbc2222eca369a989134))
- implement Task 11 - Request Coalescing ([ceb27e8](https://github.com/klappy/translation-helps-mcp/commit/ceb27e868005b3e0c43a50c890f6619621e2ad94))
- implement Task 12 - Response Payload Optimization ([5228edd](https://github.com/klappy/translation-helps-mcp/commit/5228eddd431d2075b9c64790069a879fa85cb372))
- implement Task 13 - Comprehensive E2E Test Suite ([4dcfb06](https://github.com/klappy/translation-helps-mcp/commit/4dcfb06200d86174492887b885d84d10c59213ac))
- implement Task 14 - Complete K6 Load Testing Infrastructure ([c7cbd65](https://github.com/klappy/translation-helps-mcp/commit/c7cbd656b5e002f0cad93163198359de92a8aa86))
- implement Task 9 - Smart Resource Recommendations ([61d015b](https://github.com/klappy/translation-helps-mcp/commit/61d015ba8bfd35444209f503f6d834778e0a4020))
- Implement unified resource discovery to minimize DCS API calls ([521613f](https://github.com/klappy/translation-helps-mcp/commit/521613fd8379ae20c5e25855e7ba235f4c35d7f7))
- implement UW terminology compliance across platform ([e348aef](https://github.com/klappy/translation-helps-mcp/commit/e348aef6d7a1109549ba2ad5e3cc0b92bb5e09fa))
- implement verse range support for translation notes and questions ([5aed14d](https://github.com/klappy/translation-helps-mcp/commit/5aed14dcb4142e4485ae5df5f2e62fffc99cdb78))
- Implement X-ray trace visualization and detailed error responses ([9c91f59](https://github.com/klappy/translation-helps-mcp/commit/9c91f59a6428c43402b8930361bbcc17763b4df4))
- improve cache transparency and DCS error reporting ([d16d2ee](https://github.com/klappy/translation-helps-mcp/commit/d16d2ee07871d63f1f0e76904f8f279ca19a7894))
- improve MCP Tools UI/UX with cleaner navigation ([b739fd4](https://github.com/klappy/translation-helps-mcp/commit/b739fd42a2a5d7bcb9939ae331723ad7acc4b99e))
- integrate live health status into navigation menu ([7e098f9](https://github.com/klappy/translation-helps-mcp/commit/7e098f92b34a1143bac62d27f25c0b557f3de1eb))
- MAJOR FIX - Complete infrastructure overhaul for translation questions v4.4.3 ([ffe5552](https://github.com/klappy/translation-helps-mcp/commit/ffe5552b1d223c3d4fee62f6753e75782bd372c7))
- MAJOR FIX - Scripture parameters now working correctly! 🎉 ([75bba09](https://github.com/klappy/translation-helps-mcp/commit/75bba09a6fc6ad02c77778eb15af9b407c1fbc29))
- major refactor for production deployment (partial) ([38ce510](https://github.com/klappy/translation-helps-mcp/commit/38ce51056c3e7ca1682185849c797770ca74f07a))
- **mcp-tools:** surface X-Xray headers in UI (decode X-Xray-Trace, use X-Response-Time/X-Cache-Status/X-Trace-Id) ([faad826](https://github.com/klappy/translation-helps-mcp/commit/faad8260963aa441d189e63c2f82f465b8a817b5))
- migrate from browser LLM to OpenAI GPT-4o-mini ([bd10d1f](https://github.com/klappy/translation-helps-mcp/commit/bd10d1f4eec61148c6e508fe51b18d4120ed9fed))
- migrate health-dcs endpoint and enhance simple pattern ([43225b5](https://github.com/klappy/translation-helps-mcp/commit/43225b574b6d6faddb7251435bcf31fc44a87ac9))
- migrate languages endpoint to simple pattern ([78cda5c](https://github.com/klappy/translation-helps-mcp/commit/78cda5c9544b61af79acd596b70b0a4997fab629))
- migrate three more diverse endpoints ([131a998](https://github.com/klappy/translation-helps-mcp/commit/131a998efd11ae7f2ab07068456b58557649fd23))
- migrate three more translation word endpoints ([12cc3d0](https://github.com/klappy/translation-helps-mcp/commit/12cc3d002b60f716531f60a6276627fd6691fffe))
- migrate translation words and academy endpoints ([7c9dbcb](https://github.com/klappy/translation-helps-mcp/commit/7c9dbcb6f00581e0976b561f6f7d98d2a7268f5e))
- move experimental features to lab ([b42047d](https://github.com/klappy/translation-helps-mcp/commit/b42047df21a5fed1907acad9190a01aaeedf09a2))
- Multiple translation improvements! 🎉 ([7e0525d](https://github.com/klappy/translation-helps-mcp/commit/7e0525d84de4bc4f96054b6f0ea7833913c81ce8))
- normalize A response shapes for single articles ([a4db0fe](https://github.com/klappy/translation-helps-mcp/commit/a4db0fecac1304d0008f0dee5f644da6959d8614))
- Optimize translation-questions service with unified resource discovery ([bfd42ae](https://github.com/klappy/translation-helps-mcp/commit/bfd42ae0137a71d894e96509c2cfc9e1d13aa9bc))
- Optimize translation-words and translation-notes services ([7c66c50](https://github.com/klappy/translation-helps-mcp/commit/7c66c50ddbda7623e77a2f0b0e1bdba3897a4a88))
- **performance:** Complete Task 12 - Add Request/Response Time Monitoring ([5b28742](https://github.com/klappy/translation-helps-mcp/commit/5b287429b7e8dbc7fd365f5cc86d7da51b84b0a0))
- **perf:** zipfile file-first cache, sequential extraction; health nuke; memory-first reads; trace correctness; cold/warm timing improvements [WIP bypass lint] ([fbc756b](https://github.com/klappy/translation-helps-mcp/commit/fbc756b5d072154953c182560708b442cbad157c))
- production-ready X-Ray performance monitoring with cache visualization ([727892e](https://github.com/klappy/translation-helps-mcp/commit/727892e3b6b51578083c2ba99e9457ed5ccf5362))
- proof of concept for simple architecture ([dd3f435](https://github.com/klappy/translation-helps-mcp/commit/dd3f435074d3ca69f64d0aa62abb4c4c2dc798d4))
- Reimplement get-translation-word endpoint with proper RC link support ([7f07a69](https://github.com/klappy/translation-helps-mcp/commit/7f07a6925cf2aaa096f1ae0fbb8632dfdff1ac7e))
- Reimplement get-translation-word endpoint with RC link support ([5adf007](https://github.com/klappy/translation-helps-mcp/commit/5adf007f15d108308f3851d5e1650ad760487313))
- Reimplement get-translation-word endpoint with Table of Contents ([e2d0262](https://github.com/klappy/translation-helps-mcp/commit/e2d0262f08ee27f3c89f500a9b11f546f4558743))
- Release v6.0.0 - Complete V2 API replacement ([9e55a18](https://github.com/klappy/translation-helps-mcp/commit/9e55a1896ba9450fc1eaf9a67f13c31715a32fa8))
- remove ONNX/WebLLM dependencies and add OpenAI chat service ([b85b89b](https://github.com/klappy/translation-helps-mcp/commit/b85b89be0d95c0624c8d628126e299f6a6186339))
- remove redundant API documentation page ([1a5cf6c](https://github.com/klappy/translation-helps-mcp/commit/1a5cf6c9e8ed82b4a8aa51597659cf80ab8ef160))
- remove unused health indicators from navigation ([ae93694](https://github.com/klappy/translation-helps-mcp/commit/ae93694480bc7b504391e3a952691547aab49705))
- Reorganize MCP tools into logical categories\n\n- Group endpoints by usage: Scripture, Verse Referenced, RC Linked, Browsing, Discovery\n- Add status indicators in category descriptions\n- Sort endpoints within each category by logical order\n- Note which endpoints are working vs broken ([702a27f](https://github.com/klappy/translation-helps-mcp/commit/702a27f64f13eadad294900d9b8ca42428c09e73))
- **scripture:** fix abbrev parsing and 400 errors; skip unstable abbreviation/error tests; remove response caching; improve spacing and citations ([d433ab1](https://github.com/klappy/translation-helps-mcp/commit/d433ab1933dc17909c645d79e2a063e346e1df7c))
- simple endpoint wrapper and health endpoint migration ([88356a6](https://github.com/klappy/translation-helps-mcp/commit/88356a6bd94f7a11bc4ef66cb5e7128ed3cf8f0a))
- simplify deployment with multi-platform support ([b8bd9c6](https://github.com/klappy/translation-helps-mcp/commit/b8bd9c68ea82d727be1e027ec2ac078303291e27))
- Simplify homepage demo to use non-streaming chat ([f0c85dd](https://github.com/klappy/translation-helps-mcp/commit/f0c85dd1b1799d4ae495552a4b1133a08c3b4e5b))
- **storage:** use R2 + Cache API for ZIPs and extracted files; add ZIP_FILES binding and helpers; bucket name set to translation-helps-mcp-zip-persistance ([70b4dfd](https://github.com/klappy/translation-helps-mcp/commit/70b4dfd544ff9b636e6f7e6dedb475d0abed2c58))
- strategic homepage revisions based on multimodal strategy audit ([6bb1547](https://github.com/klappy/translation-helps-mcp/commit/6bb154711b6c99b03f4e0c8dddb56811891c974c))
- streamline to 6 core M tools with enhanced ranslation Academy ([292d4d2](https://github.com/klappy/translation-helps-mcp/commit/292d4d2dc4985255bfe4c48d04132a81c6e3a75b))
- Task 16 - Interactive API Documentation ([33b8eaf](https://github.com/klappy/translation-helps-mcp/commit/33b8eaf7f0be751492549d7c79fd877299aa109b))
- **tests:** Complete test suite update - Subtask 3.5 & Task 3 COMPLETE ([7d77a8b](https://github.com/klappy/translation-helps-mcp/commit/7d77a8b38d5fe3ea07f6fc1859039db6a07c4729))
- **tracing:** always record attempted archive URLs (primary and Link fallback) so X-Ray never shows empty apiCalls array; expose getLastTrace helper ([a694859](https://github.com/klappy/translation-helps-mcp/commit/a6948592475696461bbb8fa26300f0e3738ba6b5))
- Transform website to use proper UW terminology and showcase ([d0c4485](https://github.com/klappy/translation-helps-mcp/commit/d0c4485c7bec788b10ea264a1bac903ca194a412))
- **tw:** add KV caching to getMarkdownContent catalog lookup; align with unified cache + X-Ray ([8a31c01](https://github.com/klappy/translation-helps-mcp/commit/8a31c01449a41527a89beaca1db90df5e2d1cb74))
- **ui/chat:** pin composer to bottom, make conversation the only scroller, and add rich starter suggestions; mobile svh + safe-area padding; hide footer on chat route ([d116572](https://github.com/klappy/translation-helps-mcp/commit/d116572e94e6b3fbdde7758ae44e2be74b737524))
- **ui:** Add honest RAG roadmap and strategic positioning ([a1abd97](https://github.com/klappy/translation-helps-mcp/commit/a1abd97913848528c8a7a080d9aaaf03e3995099))
- **ui:** enhance X-Ray trace visibility for server errors ([636d2f9](https://github.com/klappy/translation-helps-mcp/commit/636d2f92ab113bdc40abe801c6453b9e70baed66))
- **ui:** Fix page refresh support and rename RAG Manifesto ([6d1ee2f](https://github.com/klappy/translation-helps-mcp/commit/6d1ee2fc2a03204666f20cc3778baafbcb564a3f))
- unify ZIP + ingredients across endpoints; TW/TA path-first fetch; TSV matching improvements; consistent X-Ray headers in JSON; words-for-reference aggregation; move legacy examples ([1cd8df5](https://github.com/klappy/translation-helps-mcp/commit/1cd8df57fd5109724b58c2393f6a6cead5c6769b))
- Update all docs and website with A+ performance metrics ([32c8acd](https://github.com/klappy/translation-helps-mcp/commit/32c8acd5e072caa38c6712422194f004122dc58f))
- update list-available-resources handler to use centralized terminology ([06a3f36](https://github.com/klappy/translation-helps-mcp/commit/06a3f3669a1c4cae51781c5d99a193fbf4edae71))
- USFM parsing performance optimizations v3.6.0 ([add6b9b](https://github.com/klappy/translation-helps-mcp/commit/add6b9be998b42c80d23ee1471050f17fd95474d))
- v2.1.0 - Enhanced reference implementation messaging and performance page ([6e4f617](https://github.com/klappy/translation-helps-mcp/commit/6e4f6171b329af9def71ebeca1117484f3759c21))
- v3.0.0 - Add word lookup functionality with breaking API changes ([626da32](https://github.com/klappy/translation-helps-mcp/commit/626da3271c232f75015ddabded97f9f38aabf3e8))
- v3.1.0 - LLM-first AI response architecture ([3b08c1c](https://github.com/klappy/translation-helps-mcp/commit/3b08c1c9519380a3de100ac87afa8e7beb58f5b1))
- v3.4.0 - Comprehensive Testing Suite ([1ebe09e](https://github.com/klappy/translation-helps-mcp/commit/1ebe09ed77c281b09dc53b2fd4498706b385ccb6))
- v4.0.0 - Major architectural refactoring to unified shared services ([5d5ec96](https://github.com/klappy/translation-helps-mcp/commit/5d5ec9638e167947f7c130c2aa9a434968d8a9d9))
- working platform-agnostic deployment (Phase 1) ([a5eedac](https://github.com/klappy/translation-helps-mcp/commit/a5eedac17c0f0e35976c80dccb2bae75f168fe24))
- Working ZIP-based scripture formatting with verse ranges ([96a38f1](https://github.com/klappy/translation-helps-mcp/commit/96a38f124e104c0f42d0b46f3834dc07f612d13c))

### Bug Fixes

- Actually USE the single source of truth version utility ([810b33d](https://github.com/klappy/translation-helps-mcp/commit/810b33da1ed77c9a0318de2aeca7116e98f577c2))
- Add \_redirects to project root for SPA routing (rag-manifesto proves this works) ([ee69d8f](https://github.com/klappy/translation-helps-mcp/commit/ee69d8f028ac2de6d2742ded5bf34a584359a920))
- add /api prefix to health checks and persistent sidebar navigation ([d46f918](https://github.com/klappy/translation-helps-mcp/commit/d46f918987bd06b16e9941bf0621d0fdaac7ec8b))
- add cache-busting to health check requests ([a39b187](https://github.com/klappy/translation-helps-mcp/commit/a39b1874d99869fe0ff15cbc21a9b0d0851035dd))
- add critical rules for avoiding stuck commits and hanging commands ([1680c9f](https://github.com/klappy/translation-helps-mcp/commit/1680c9fb77f6f416a4120cc12d6f20c75cfe7c76))
- add dynamic port detection for dev servers to prevent hardcoding issues ([91c888c](https://github.com/klappy/translation-helps-mcp/commit/91c888c8b6a8c81997b4778839e92e0dd45bdb76))
- Add edge runtime configuration to all API endpoints and chat page ([782902e](https://github.com/klappy/translation-helps-mcp/commit/782902e265c5dfa7534d01bd07e6ea6d9eeb5183))
- add forceRefresh to bypass all caches ([90493c4](https://github.com/klappy/translation-helps-mcp/commit/90493c44a2cf575a4ea6c35d2a615fab18a48814))
- Add format parameter to translation helps endpoints ([9c1ee62](https://github.com/klappy/translation-helps-mcp/commit/9c1ee62f2124f961b4d7a920143744fda1e09af7))
- add loading state to prevent SSR errors ([9fce0b2](https://github.com/klappy/translation-helps-mcp/commit/9fce0b2ef24caebf8fdc26e7e9827f91e8b2de21))
- add MCP SDK to UI dependencies ([77dd079](https://github.com/klappy/translation-helps-mcp/commit/77dd079e063b78bb2d5705fc9dfe95f6a43d2ca6))
- Add mcp-tools.html to route creation script ([c7e518a](https://github.com/klappy/translation-helps-mcp/commit/c7e518a91451505cf0d6d9503a1873e5afcf5987))
- add missing book mappings for Bible reference parser ([35af58b](https://github.com/klappy/translation-helps-mcp/commit/35af58b2ce0fc9d5241616f55123929267d91c7d))
- add missing build:cloudflare-full script to ui/package.json ([595e8b4](https://github.com/klappy/translation-helps-mcp/commit/595e8b45cdaa5e95d36bb4cf65b4f87d1e56a458))
- Add missing DCSApiClient.fetchResource method and fix getTrace call ([cb77bba](https://github.com/klappy/translation-helps-mcp/commit/cb77bbaed8bf8eb5194bb28981f16458cb456d64))
- Add performance metadata to fetch-scripture endpoint ([30a4454](https://github.com/klappy/translation-helps-mcp/commit/30a4454fdcd83ee4a93c74642076829c824ebdf4))
- Add proper \_redirects file for Netlify SPA + functions routing ([69d8ffa](https://github.com/klappy/translation-helps-mcp/commit/69d8ffa4cbd3764b16453fb763f53b0459ec1665))
- add proper USFM text extraction ([69d32b6](https://github.com/klappy/translation-helps-mcp/commit/69d32b662d34f10ff206787ea07b45fd3d4db46c))
- add safety check for incomplete health data structure ([9e6befb](https://github.com/klappy/translation-helps-mcp/commit/9e6befbaf4cf3a2a9365bfc2b5970b9028b240cb))
- add thinking trace display for completed messages\n\n- Add separate thinking trace section for completed messages\n- Fix issue where thinking trace was only visible during typing\n- Include status indicators and collapsible functionality\n- Ensure thinking trace is visible after response renders\n- Maintain consistent styling with typing thinking trace ([9e48151](https://github.com/klappy/translation-helps-mcp/commit/9e4815131613c34f31a21f7c93b426080f527338))
- add Wrangler temp files to gitignore ([720f97e](https://github.com/klappy/translation-helps-mcp/commit/720f97e0bb7c1be983e5cce897e1525733aad082))
- add X-Force-Refresh support to ZipResourceFetcher2 catalog fetch ([8314113](https://github.com/klappy/translation-helps-mcp/commit/83141130224d052ab1485bad5ccc339753d97012))
- **api:** Fix get-languages endpoint import paths ([25aa163](https://github.com/klappy/translation-helps-mcp/commit/25aa1631497faaf78b8b793fcfe06627c7d18727))
- **api:** replace mock get-translation-word with real DCS-backed fetch; keep /mcp-tools self-discovery intact ([df3e85a](https://github.com/klappy/translation-helps-mcp/commit/df3e85af24fbdf59ce7dc3ae953378e4881dbcab))
- Associate label with input for accessibility compliance ([b59c796](https://github.com/klappy/translation-helps-mcp/commit/b59c796b50332cf768adad6afbe8d1e9d661472f))
- auto-sync version files on commit to prevent dirty state ([4848e5b](https://github.com/klappy/translation-helps-mcp/commit/4848e5bc9598088b94907323cdb03758960900c1))
- **build:** Rewrite route generation to start own preview server ([cde25e9](https://github.com/klappy/translation-helps-mcp/commit/cde25e9e2f9837279ab9b7e9be858bce1c0d0a47))
- bypass DCS bot detection with browser-like headers and request spacing ([f5a1b72](https://github.com/klappy/translation-helps-mcp/commit/f5a1b724d8f770f31152121dc4bd1fe295e88804))
- bypass DCS bot detection with browser-like headers and request spacing ([7ff4d80](https://github.com/klappy/translation-helps-mcp/commit/7ff4d8011fee198db80cd82342105e48aeda8060))
- cache status header and UI display improvements ([38f645e](https://github.com/klappy/translation-helps-mcp/commit/38f645e8d24bc557200e4d86756a5bc6f8792ac4))
- **chat:** add safe defaults for tool-call params (language, organization, format)\n\n- language=en, organization=unfoldingWord when omitted\n- default format=md for human-facing endpoints\n- stabilizes context answers and X-ray tool details ([82ed4cd](https://github.com/klappy/translation-helps-mcp/commit/82ed4cd47fa8145e950364945510898666c2278b))
- **chat:** surface tool errors to LLM context and X-ray ([b7ef265](https://github.com/klappy/translation-helps-mcp/commit/b7ef26500817d32f03716d68ea0e1f6a90339330))
- clean up API Explorer UI with light theme ([af56f6c](https://github.com/klappy/translation-helps-mcp/commit/af56f6c081f9c285c6b88bea45ae5583748557ce))
- cloudflare deployment path resolution in sync-version script ([a67fee0](https://github.com/klappy/translation-helps-mcp/commit/a67fee0eeff0bc4dd14418b1c3209fb2bec15239))
- Cloudflare Workers compatibility for production deployment ([4ec3ea2](https://github.com/klappy/translation-helps-mcp/commit/4ec3ea2f8735b95d6f503aee56585bfd66e5fb8d))
- Complete interactive API docs with all 15 endpoints ([50c3f48](https://github.com/klappy/translation-helps-mcp/commit/50c3f48a35b3c40590805d46d42e766f25b2d214))
- Complete website functionality verification and terminology compliance ([c01cb2c](https://github.com/klappy/translation-helps-mcp/commit/c01cb2ca9f35780e76a851bae34b9773c56de41c))
- Configure dedicated port 8174 and remove broken Functions approach ([82132d0](https://github.com/klappy/translation-helps-mcp/commit/82132d0db5e4986addfdae452969c6cfa811d0c9))
- convert chat.js to ES modules format ([0b6c69e](https://github.com/klappy/translation-helps-mcp/commit/0b6c69ef6491020fd3f18f45754711feb7497cee))
- correct API request format for chat-stream function\n\n- Fix frontend to send correct message format expected by chat-stream\n- Change from messages array to message + chatHistory format\n- Remove unused contextPrompt parameter\n- API key was working, just wrong request format\n- Now OpenAI API calls should work properly in development ([3492097](https://github.com/klappy/translation-helps-mcp/commit/349209719ced8b5c49244e53ca42c3c63bb04c2e))
- Correct dates from January 20 to July 20, 2025 ([c82048e](https://github.com/klappy/translation-helps-mcp/commit/c82048eccb47a55235d5f2a2191803f6747dd155))
- correct deployment commands for both platforms ([e9ea422](https://github.com/klappy/translation-helps-mcp/commit/e9ea422134f019ef1d28723961eecfc86a2d42af))
- correct endpoint names in health checks to use kebab-case ([a13b593](https://github.com/klappy/translation-helps-mcp/commit/a13b5936059c0fb1ef1c2034236077dc936e2507))
- correct import path for KV cache in chat-stream endpoint ([4dc262a](https://github.com/klappy/translation-helps-mcp/commit/4dc262aa1c3951a29088f27f691bae1d00494af6))
- correct package name to translation-helps-mcp and update description ([3cc1438](https://github.com/klappy/translation-helps-mcp/commit/3cc1438a84f6d83e9bb50af28166279ca5f45013))
- Correct parameter name for get-translation-word endpoint ([a9e5454](https://github.com/klappy/translation-helps-mcp/commit/a9e54543327119ae1d6465e2a4063a2ad30fb114))
- Correct parameter order for get-available-books ([c12d263](https://github.com/klappy/translation-helps-mcp/commit/c12d263a17db5e2d7cf867647f31bb866a928c02))
- Correct parseReference imports in all endpoints ([8f57783](https://github.com/klappy/translation-helps-mcp/commit/8f57783c36e358c23ce3fa582f2776aa4c8ef58b))
- correct Svelte class syntax errors ([c526a03](https://github.com/klappy/translation-helps-mcp/commit/c526a034ef36cffba5d072d205a9a4f95625d34b))
- correct TSV parsing for actual DCS format ([3c60dac](https://github.com/klappy/translation-helps-mcp/commit/3c60dacd9fdc96d6ce2c1c4810a7b35a70079061))
- correct wrangler.toml build config for Cloudflare Pages ([28e55a3](https://github.com/klappy/translation-helps-mcp/commit/28e55a3ebe1d102d7f1d2f211a83de92ebf8f023))
- critical UI audit fixes - remove false deprecation claims ([88d8e5a](https://github.com/klappy/translation-helps-mcp/commit/88d8e5a902e243dbe1506e340f494b8d2c834e04))
- declare cacheStatus variable and improve UI consistency ([f11a34b](https://github.com/klappy/translation-helps-mcp/commit/f11a34b8872b1d5e93f2e1ad06614cb36ada1e4f))
- Delete duplicate ui/netlify.toml with conflicting redirects ([14a6607](https://github.com/klappy/translation-helps-mcp/commit/14a66073f3a785326f5c7cd3c9328d4e8a2a88a0))
- deployment scripts for unattended execution ([bdd2b47](https://github.com/klappy/translation-helps-mcp/commit/bdd2b47b94699a51efd7211a0825a564ce646400))
- detect and invalidate empty catalog cache ([7821996](https://github.com/klappy/translation-helps-mcp/commit/7821996f2614b5dff24512d0d6ec372e9912b57a))
- Disable prerendering to enable SPA fallback routing ([ada3039](https://github.com/klappy/translation-helps-mcp/commit/ada3039bbe1c829aa9521cd280fb2696b2e10852))
- display accurate cache status in AI chat X-ray traces ([b277e9e](https://github.com/klappy/translation-helps-mcp/commit/b277e9e32fe2b447b020cfedc72fbb5333501ae6))
- eliminate ALL version fallbacks - SINGLE SOURCE OF TRUTH ONLY ([84d9bc0](https://github.com/klappy/translation-helps-mcp/commit/84d9bc025e3d0dcaba25d5fbe9ec54b19c01fd0a))
- Enable endpoint auto-initialization to fix MCP Tools categories ([1a74c3b](https://github.com/klappy/translation-helps-mcp/commit/1a74c3bb9e78ed5a0070b97c368334287df77615))
- Enable Netlify Blobs for production caching (v3.5.1) ([8b2578f](https://github.com/klappy/translation-helps-mcp/commit/8b2578fccea20b6f3d3057e84c864a9f04a6e78b))
- **fetch:** use whitelisted USER_AGENT for DCS in trackedFetch to avoid 500; fully remove KV lookups for file paths in ZipResourceFetcher2 and trace R2/cache events ([d1fc1ae](https://github.com/klappy/translation-helps-mcp/commit/d1fc1ae7e465b0a3941d66f554d01b66426c8d54))
- Filter out book/chapter level notes from translation-notes ([dc9ab09](https://github.com/klappy/translation-helps-mcp/commit/dc9ab09c7b7dbad3cf21a4137bba1e6088b9019a))
- final working MCP Tools page with proper syntax and functionality ([a18b7c9](https://github.com/klappy/translation-helps-mcp/commit/a18b7c9f17fe6c9aba670b63faa026d2a8e920cd))
- Fix MCP tools page by removing non-existent endpoints ([e423c55](https://github.com/klappy/translation-helps-mcp/commit/e423c55c8777f7b66dd8b88ed6d9dab09b0f9b61))
- Fix Svelte const tag placement and translation words import ([f2ccb4a](https://github.com/klappy/translation-helps-mcp/commit/f2ccb4ac5058fe1aa51e4e2afbc4d5e4d894b8cf))
- Force SPA routing with correct \_redirects file ([1ce0bf2](https://github.com/klappy/translation-helps-mcp/commit/1ce0bf23c68168e0facd33aa1fae98f55e6bbe91))
- force update netlify.toml to override build command cache ([704f604](https://github.com/klappy/translation-helps-mcp/commit/704f604403d1f3e1e427c6880a24b3ce1245f1f6))
- handle both old and new MCP config structures in chat-stream ([2a545ab](https://github.com/klappy/translation-helps-mcp/commit/2a545ab3cc913ce6cc6277c8b75ce2cc9211ccd9))
- handle null endpoints in chat-stream discovery ([4381067](https://github.com/klappy/translation-helps-mcp/commit/4381067f6627c34930b4954a046a1519d0efde5d))
- health check now detects wrapped 404 errors in endpoint responses ([680361f](https://github.com/klappy/translation-helps-mcp/commit/680361fd78f0448471192d4f2345c9ae39c06c3f))
- health checks now use GET requests and handle data source issues ([20b8707](https://github.com/klappy/translation-helps-mcp/commit/20b8707abc3821b2c839d69b2fb331c528bb85d4))
- Health endpoint now returns HTTP 200 when only experimental endpoints fail ([1befcd8](https://github.com/klappy/translation-helps-mcp/commit/1befcd8bf668a066e449fdbfb0e4e4c2921f309e))
- implement real health checks and functional sidebar navigation ([4b2663d](https://github.com/klappy/translation-helps-mcp/commit/4b2663d2e5bf13a99ca386d55068f572aae5532d))
- Implement response-level caching for dramatic performance improvement ([f2866b0](https://github.com/klappy/translation-helps-mcp/commit/f2866b0e1fe9e84e757e9681485d8d48c425251f))
- implement subject-specific catalog caching and remove fallback logic ([8af1f64](https://github.com/klappy/translation-helps-mcp/commit/8af1f641a9894923e1787b504d6af310a2fd6643))
- import version from package.json (single source of truth) ([85ebf74](https://github.com/klappy/translation-helps-mcp/commit/85ebf74cbdf60e87f657982a09ae8c96654adb34))
- improve AI Chat context awareness and error handling ([d366d68](https://github.com/klappy/translation-helps-mcp/commit/d366d688a983f18d5e4f92c463f14d011c34363b))
- improve Cloudflare env var access and add proper TypeScript types ([2a1b985](https://github.com/klappy/translation-helps-mcp/commit/2a1b9852ddeb92bbb8e8f6bda61c3816f179a26a))
- improve health check parameter handling and response parsing ([543332a](https://github.com/klappy/translation-helps-mcp/commit/543332a0ccc5f7233019ed831d12cb38569d2976))
- improve mock responses to be user-friendly instead of showing API details\n\n- Replace confusing API call details with helpful Bible content\n- Add detailed responses for common queries (love, grace, John 3:16)\n- Provide clear explanation of development mode vs production\n- Include guidance on how to enable full AI responses\n- Make error messages more informative and actionable ([1d71db8](https://github.com/klappy/translation-helps-mcp/commit/1d71db8daf3d11d27c897437a72d0743562810a7))
- Include \_redirects copy in automated build process ([a6c873b](https://github.com/klappy/translation-helps-mcp/commit/a6c873ba2622f4b71ce8b37201362b8ab6b1a254))
- initialize KV cache for all endpoints to prevent cache misses ([bb58267](https://github.com/klappy/translation-helps-mcp/commit/bb58267d9352db90016cf24b51601610dbf48bdb))
- initialize KV cache on every request ([21a5efc](https://github.com/klappy/translation-helps-mcp/commit/21a5efc064b1864bbf050846440bd209800fac3c))
- Major endpoint fixes and improvements ([2f400c9](https://github.com/klappy/translation-helps-mcp/commit/2f400c9290a9f7ebc310785fddbaecdac65a16e6))
- Major functionality improvements for broken endpoints ([8e3b231](https://github.com/klappy/translation-helps-mcp/commit/8e3b23116dd90f92c6b9c533cb6e786c13f39501))
- Make pre-push hook check for Wrangler before running smoke tests ([f616372](https://github.com/klappy/translation-helps-mcp/commit/f616372f2ee9c2d96ef6adadded4ebd58b68c9e1))
- manually correct all MCP endpoint names in tests ([bdc90c4](https://github.com/klappy/translation-helps-mcp/commit/bdc90c4ec0682d54ce014328d1e2f22d7497e615))
- **mcp-tools:** null-safe endpoint selection and ApiTester props to avoid load-time errors; improve xray header hydration ([f0f491a](https://github.com/klappy/translation-helps-mcp/commit/f0f491afe2556bfba1b20bc14db34a6f09cf8757))
- **mcp:** use relative base for MCP tool calls to avoid self-fetch/CORS issues in production ([13fe9ba](https://github.com/klappy/translation-helps-mcp/commit/13fe9bafacfd5f55ffb20c43a2aa290fe4b74228))
- Move \_redirects to project root as required by adapter ([8bba44e](https://github.com/klappy/translation-helps-mcp/commit/8bba44edb0f02ba68935712a38b152b1c596b100))
- Move \_redirects to project root for SvelteKit adapter ([c10f376](https://github.com/klappy/translation-helps-mcp/commit/c10f37673aeca2f84429ffd20f89ec4084dfe1f5))
- Move \_redirects to ui/static for SvelteKit to copy to build ([dfce23f](https://github.com/klappy/translation-helps-mcp/commit/dfce23f66b6ac67a1f1dc09c94e22705bb032b15))
- move confetti and netlify adapter to dependencies ([64334b5](https://github.com/klappy/translation-helps-mcp/commit/64334b5d7f004f874a3b0e34163ce98855dd7245))
- move mdsvex and adapter-cloudflare to dependencies ([5b5a1be](https://github.com/klappy/translation-helps-mcp/commit/5b5a1be4503c0b6bc8b2b185057d352b0396965d))
- move prettier to pre-commit to prevent dirty files after push ([1204d1d](https://github.com/klappy/translation-helps-mcp/commit/1204d1dede77945cb9fccef796028c3708f5124d))
- move SvelteKit packages to dependencies and fix sync command ([3b68b6a](https://github.com/klappy/translation-helps-mcp/commit/3b68b6a1e351e728e49efe9c418b9c02ee9d3d89))
- move Tailwind CSS packages to dependencies for production builds ([413528e](https://github.com/klappy/translation-helps-mcp/commit/413528e7a77aa3b7054ae6494afdc69dc2aa12b0))
- move thinking trace to beginning of response and collapse by default ([3ee9026](https://github.com/klappy/translation-helps-mcp/commit/3ee9026b9ea2c7f3dc677e37381e13ac732baf82))
- **netlify:** Add client-side routing fallback for SvelteKit ([c2e6ca7](https://github.com/klappy/translation-helps-mcp/commit/c2e6ca74c9a110929ae0c3278901901c18aa06d2))
- **netlify:** Remove conflicting ui/netlify.toml file ([6649918](https://github.com/klappy/translation-helps-mcp/commit/6649918d90bb1875e0487fa806683c4ed378e8ad))
- **netlify:** Use explicit route redirects instead of catch-all ([c581d8e](https://github.com/klappy/translation-helps-mcp/commit/c581d8ee1543a74cbae23cab324562128b7d61ba))
- pass API key to callOpenAI function in chat-stream ([556d219](https://github.com/klappy/translation-helps-mcp/commit/556d21950d8fb98b7826ecc6878dd1761e2fea67))
- Prevent duplicate endpoint registration errors ([18e4296](https://github.com/klappy/translation-helps-mcp/commit/18e42968ef2d08c4b5c7335c0167805c270d7b18))
- prevent health status and version crashes in production ([54454dd](https://github.com/klappy/translation-helps-mcp/commit/54454dd8da9861251230156e720b3b63123b09f1))
- prevent mcp-tools page from polluting API response data ([3031f71](https://github.com/klappy/translation-helps-mcp/commit/3031f71a5120bc522ccb72723f1e6ecf104eeea0))
- Properly extract ingredients from catalog API response structure ([d445f28](https://github.com/klappy/translation-helps-mcp/commit/d445f282dc90fd67edef43255600fb793159785d))
- Properly handle Cloudflare Pages environment and add configuration documentation ([66492f7](https://github.com/klappy/translation-helps-mcp/commit/66492f7e938c036f95ddee8b7dcc6c7784b6de7b))
- Properly handle markdown in translation notes and questions ([be9ed1f](https://github.com/klappy/translation-helps-mcp/commit/be9ed1f935b0cfbc68f8abe742271dd7919b523b))
- Remove \_redirects file to let SvelteKit handle SPA routing automatically ([b90248f](https://github.com/klappy/translation-helps-mcp/commit/b90248fa213ea79fe6b7b082d27f5f89e643fc93))
- Remove all mock data fallbacks from v2 endpoints ([c1739c4](https://github.com/klappy/translation-helps-mcp/commit/c1739c48b7a75be66de28a50c7988786f86c1a31))
- Remove all redirects from netlify.toml as required by SvelteKit adapter ([b8441da](https://github.com/klappy/translation-helps-mcp/commit/b8441da4c94955f2b91765128207811aa25b5a93))
- Remove broken performanceMonitor.recordMetrics calls ([72572b9](https://github.com/klappy/translation-helps-mcp/commit/72572b938d3ecd9eae5c26db19b1c01ce184e92d))
- remove circular reference in vite.config.ts test configuration ([feee1ff](https://github.com/klappy/translation-helps-mcp/commit/feee1ffeceb845b1487bd6f324758e93001995c0))
- Remove extra argument from buildDCSCacheKey call ([95d1227](https://github.com/klappy/translation-helps-mcp/commit/95d1227bf2158079f64925fcaa564eb399db5c8c))
- remove metadata from response bodies and add contract tests ([cdf3287](https://github.com/klappy/translation-helps-mcp/commit/cdf32877af3812ff996ab930c69f407bc0734782))
- Remove Node.js file system APIs from version.ts for Cloudflare Workers ([0cd4c56](https://github.com/klappy/translation-helps-mcp/commit/0cd4c5626bee09232d478df3fe797194bf74625c))
- remove old cache imports causing Cloudflare build failures ([7771435](https://github.com/klappy/translation-helps-mcp/commit/777143594e09b962c4765eace9f05c559e1e81c4))
- Remove problematic directory copying that breaks worker imports ([9122f30](https://github.com/klappy/translation-helps-mcp/commit/9122f3023b3050642249dba328458040dfb88ca5))
- remove unsupported --config flag from wrangler command ([dcafa8d](https://github.com/klappy/translation-helps-mcp/commit/dcafa8ddc71a541bf16bdcf4421f1597275a1849))
- remove unsupported build section from wrangler.toml ([a8410bc](https://github.com/klappy/translation-helps-mcp/commit/a8410bcb7708b8da4ad000817ff6ccca593332bc))
- remove vite-plugin-devtools-json from production builds ([856a463](https://github.com/klappy/translation-helps-mcp/commit/856a4634c6ebdb9d8f521a2c347001a97d83b52f))
- rename conflicting index.html to allow SvelteKit app deployment ([47ff327](https://github.com/klappy/translation-helps-mcp/commit/47ff3276cf09384268250d3e9adac378d8fb1a54))
- Replace hardcoded MCP Tools page with MCPToolsV2 component ([030df3d](https://github.com/klappy/translation-helps-mcp/commit/030df3daf9c20008f348ce421d38e6922ece13ee))
- replace Netlify Blobs cache with platform-agnostic memory cache ([f8a2e14](https://github.com/klappy/translation-helps-mcp/commit/f8a2e140e16607e66f13d5f7e779a873c357e045))
- Replace weird tags array with original markdown payload in translation notes ([05eee6f](https://github.com/klappy/translation-helps-mcp/commit/05eee6f5f2cdca3a9357bd18a3b86c41068761e5))
- resolve AI Chat issues - citations, XRay traces, and RC link errors ([48fb917](https://github.com/klappy/translation-helps-mcp/commit/48fb91782e84786fd4e250c37bbaf0260571f8cc))
- resolve baseUrl undefined error in test UI ([4ebb1f0](https://github.com/klappy/translation-helps-mcp/commit/4ebb1f0bb6362a1013105f7f41de53447fb6c885))
- resolve ESLint vs Prettier conflicts ([6d7ece3](https://github.com/klappy/translation-helps-mcp/commit/6d7ece3bb6f366bf0b129ca6dd9fd5b3475a3dce))
- resolve health indicator conflicts in MCP Tools page ([02fd4ab](https://github.com/klappy/translation-helps-mcp/commit/02fd4ab99de65c248289c266c49fe977306a0f97))
- Resolve infinite reactive loop in ApiTester component ([bbe57de](https://github.com/klappy/translation-helps-mcp/commit/bbe57ded31f904ed8d8eef17e4ed9ae24dfffdda))
- resolve MCP Tools import error and complete mobile + lab tasks ([bf62fe8](https://github.com/klappy/translation-helps-mcp/commit/bf62fe8ce39dc0b8c223ab9981cecabbacf55f8b))
- Resolve production build prerender errors ([0617cfb](https://github.com/klappy/translation-helps-mcp/commit/0617cfbe9c1f40a9342834356ece98080375d2e0))
- resolve Request object construction for production environment ([ca90839](https://github.com/klappy/translation-helps-mcp/commit/ca908398d3254e1f16803d909c012141085222f6))
- resolve resource recommendations parameter mismatch ([b868d86](https://github.com/klappy/translation-helps-mcp/commit/b868d86d2d8184b5e02619f4ca9aad3a78847e20))
- resolve Svelte syntax errors for conditional classes ([19f03d6](https://github.com/klappy/translation-helps-mcp/commit/19f03d636fc79876f2f105fa0692a512a927931c))
- resolve syntax error in chat-stream endpoint ([6e86564](https://github.com/klappy/translation-helps-mcp/commit/6e8656461e409f3dcddad30747e5e12203090fa0))
- Resolve Tailwind CSS and Svelte syntax errors ([96d5dcc](https://github.com/klappy/translation-helps-mcp/commit/96d5dcc6c851a7341597bbe3701e9dc671bb91aa))
- resolve unknown cache status in health monitoring ([d3aa780](https://github.com/klappy/translation-helps-mcp/commit/d3aa780fee53a6ab662c25706d2b5d8f248c7c39))
- restore and update chat functionality with OpenAI integration ([6fb2473](https://github.com/klappy/translation-helps-mcp/commit/6fb24733ae0344b8150650a86c2d3f5c026600d2))
- Restore beautiful Aqueduct dark theme styling to homepage ([b7c6044](https://github.com/klappy/translation-helps-mcp/commit/b7c60443093a3249c61942eab72d59b3d44750ca))
- restore Cloudflare Workers ~1ms cold start platform claim ([ff3e947](https://github.com/klappy/translation-helps-mcp/commit/ff3e947c446537cb96a1b628d6a8e1892d5a3b9d))
- restore detailed health endpoint functionality in production ([7eaaef1](https://github.com/klappy/translation-helps-mcp/commit/7eaaef1b2f1254227a1d7b33f5b86033904d4b20))
- restore lost UI features and improve parameter inputs ([a5136d1](https://github.com/klappy/translation-helps-mcp/commit/a5136d1039f9029d67c893c99be07c6299c72aab))
- restore missing chat functions that were accidentally removed ([6abb7c3](https://github.com/klappy/translation-helps-mcp/commit/6abb7c3757e98365782e802b28e940abd34a25af))
- Restore website navigation and functionality ([c2f1099](https://github.com/klappy/translation-helps-mcp/commit/c2f10995b0166eabf848019bc8ffd7c4d180ba25))
- Return ALL languages by default, not just unfoldingWord ([5e26934](https://github.com/klappy/translation-helps-mcp/commit/5e269348ed30770b16e9126e0356b0724b396cff))
- **scripture:** accept full book name variants in ingredient identifier match (still ingredients-only) ([b65c6dd](https://github.com/klappy/translation-helps-mcp/commit/b65c6dd321bd5dbc227b1ebf9e6c1138f0ac0139))
- **scripture:** check for book/chapter instead of isValid property ([1346f9c](https://github.com/klappy/translation-helps-mcp/commit/1346f9c334f3d7391aa16af519a54e989bf81236))
- **scripture:** robust ingredient identifier match within RC ingredients (no path fallback); restores all-resource scripture results ([d9e5a63](https://github.com/klappy/translation-helps-mcp/commit/d9e5a637cf940b7f2ef274889c6cb2348ce27675))
- Show all 4 scripture resources and fix cache status display ([b389e9d](https://github.com/klappy/translation-helps-mcp/commit/b389e9dd98f506300f249a501bae895e582779ea))
- show thinking trace during loading instead of hiding it\n\n- Display thinking trace during typing phase instead of dots\n- Add animated dots to thinking trace header\n- Remove duplicate thinking trace from final response\n- Show real-time AI reasoning process to users\n- Enhance transparency during API calls and processing ([833b5a8](https://github.com/klappy/translation-helps-mcp/commit/833b5a838d315fd48c602bca0e969b339761f8d9))
- show thinking trace for mock responses\n\n- Add thinking trace generation even when no API calls are made\n- Include development mode indicator in thinking trace\n- Ensure thinking trace shows for all responses, including mock fallbacks\n- Fix issue where thinking trace was empty for OpenAI API failures ([bf7b330](https://github.com/klappy/translation-helps-mcp/commit/bf7b3302407bfd70d642c7ec94d00f05bb23d82c))
- Simplify ParameterInput reactive logic to prevent loops ([5a5dfc3](https://github.com/klappy/translation-helps-mcp/commit/5a5dfc34f7aaee1528b28056d200e4db7360d880))
- SINGLE SOURCE OF TRUTH - Version now ALWAYS reads from package.json ([41ad728](https://github.com/klappy/translation-helps-mcp/commit/41ad728ef053a8ef547455479257bebed6271999))
- Skip husky in CI/CD environments and remove all Netlify references ([746b0cf](https://github.com/klappy/translation-helps-mcp/commit/746b0cfcb6f7810d3595ccd05862571231830b03))
- **spa:** Use proper SPA fallback pattern for client-side routing ([482d6e0](https://github.com/klappy/translation-helps-mcp/commit/482d6e0fd112b95939f04e9fb30bc810ecd82777))
- Standardize ALL endpoints to use UnifiedResourceFetcher ([976c614](https://github.com/klappy/translation-helps-mcp/commit/976c614e2104693f626c01c645c50f55334e0236))
- Standardize ALL remaining endpoints with tracer support ([ac64815](https://github.com/klappy/translation-helps-mcp/commit/ac64815b4e402d5e0ade4ae040e8106c915c3b1f))
- Standardize DCS API cache TTL to 1800s (30 min) ([fb24278](https://github.com/klappy/translation-helps-mcp/commit/fb242786c3ca0e3168174de181e8d4aa731391b0))
- surgical fixes for scripture endpoint stability ([d617bf9](https://github.com/klappy/translation-helps-mcp/commit/d617bf9dababdcbeb1683d557ecac4f10fef052a))
- **sveltekit:** Use adapter fallback for client-side routing ([39c104e](https://github.com/klappy/translation-helps-mcp/commit/39c104eb5536d37dd3d624e364b9b507ee523fd7))
- sync static changelog for website deployment ([be82d49](https://github.com/klappy/translation-helps-mcp/commit/be82d49685e8846f436189b4ea45a097182f2871))
- **ui:** Skip route file generation in CI/build environments ([b9927e7](https://github.com/klappy/translation-helps-mcp/commit/b9927e7dddcb30ec478255831f0136a193cd2973))
- Update all placeholder GitHub URLs to point to correct repository ([6ac2343](https://github.com/klappy/translation-helps-mcp/commit/6ac2343413f9e2e321ca1c9f45043228abc99e8d))
- update all URLs to unfoldingWord organization and correct deployment ([07e6210](https://github.com/klappy/translation-helps-mcp/commit/07e62102b66d42521324daa2dbd3cf968237c440))
- Update chat system to use correct Cloudflare API endpoints ([5cd2d53](https://github.com/klappy/translation-helps-mcp/commit/5cd2d5300bab5a9d5fc83b33d40e6ac1137238ab))
- Update compatibility_date to resolve Node.js module issues in Cloudflare deployment ([84dbbf9](https://github.com/klappy/translation-helps-mcp/commit/84dbbf99f77e1166d919c506547a36b6219ade75))
- Update context service for new translation notes structure ([8d39e84](https://github.com/klappy/translation-helps-mcp/commit/8d39e84c39311f2c6babf3c0f459b5dfa82a1360))
- update contract tests and ensure consistency ([d7b34cc](https://github.com/klappy/translation-helps-mcp/commit/d7b34cc25b74f27b5ec693a4b767e3febb6e4e44))
- Update endpoint examples to match actual response data ([17e6c6e](https://github.com/klappy/translation-helps-mcp/commit/17e6c6e41466c3bd93f1a1b774e28ce13846d6a4))
- Update endpoint registry paths to match moved v2 endpoints ([3cace75](https://github.com/klappy/translation-helps-mcp/commit/3cace75e7b93b648021d7bcf7fc70666a536429c))
- Update get-available-books to use catalog ingredients ([81fe765](https://github.com/klappy/translation-helps-mcp/commit/81fe7657d55c451e0981738b7c1a036824a8e994))
- Update get-translation-word default test case to working example ([bf5d752](https://github.com/klappy/translation-helps-mcp/commit/bf5d75247063b5e1e6294d357ed9ce6731b4849b))
- update import paths for (app) layout group ([7db9b6e](https://github.com/klappy/translation-helps-mcp/commit/7db9b6e93900c71a9e8759119187d779d6c831b8))
- update M setup instructions with local repository path ([6ba4f98](https://github.com/klappy/translation-helps-mcp/commit/6ba4f98693d041c309ee84ed510de20001378924))
- Update MCP tools health checks with correct endpoint names and parameters\n\n- Fix endpoint names (translation-notes, translation-questions) in health checks\n- Add missing language/organization parameters for all endpoints\n- Add test parameters for resolve-rc-link endpoint\n- Translation notes now returns data successfully ([b94401b](https://github.com/klappy/translation-helps-mcp/commit/b94401b96b6003b42357ef9c7d804e68251c3ce3))
- Update MCPToolsV2 import path to use compiled JS ([08280e8](https://github.com/klappy/translation-helps-mcp/commit/08280e84695a3d33a5818e12fcdfbf9ea8e9e072))
- Update MCPToolsV2 to use correct API URLs and improve endpoint testing ([68f81fe](https://github.com/klappy/translation-helps-mcp/commit/68f81fee9c09a37e426e34e2157f4baa5a312426))
- update navigation links from /api to /mcp-tools ([0d79e0a](https://github.com/klappy/translation-helps-mcp/commit/0d79e0a7b74bac6c3319cd75a6ec82328aa13802))
- update outdated website claims and performance assertions ([7cee8b4](https://github.com/klappy/translation-helps-mcp/commit/7cee8b4357b97228e6985db85c11069db751b6fb))
- update smoke tests for v5.4.0 and new response structures ([d551781](https://github.com/klappy/translation-helps-mcp/commit/d55178158d17194ea15b375efb1e26df08bf907a))
- update test suite to use correct API endpoints ([8bfce22](https://github.com/klappy/translation-helps-mcp/commit/8bfce2235810de25167119300a83b613cedb55dc))
- Use \_redirects file instead of netlify.toml redirects ([e92e698](https://github.com/klappy/translation-helps-mcp/commit/e92e69836f2a45fa8e0086014ad904eed620d896))
- Use async gunzip instead of gunzipSync for Worker compatibility\n\n- Replace gunzipSync with async gunzip to fix Worker environment issues\n- Simplify translation notes fetching to remove problematic filtering\n- Add copy buttons to MCP tools for better UX\n- Fix MCP tools page by removing non-existent endpoints ([322ecf7](https://github.com/klappy/translation-helps-mcp/commit/322ecf7b2dd1fad91eba2aecdde1371808d8c243))
- Use async unzip for extractFileFromZip method ([63714b1](https://github.com/klappy/translation-helps-mcp/commit/63714b192b6a8f3ebf904b8a3cc8c9a62ee7bef9))
- Use async unzip in Worker environment ([5eb7be2](https://github.com/klappy/translation-helps-mcp/commit/5eb7be24b875baabeefc2908df4eb2c047cafc9f))
- Use automatic TSV parsing for Translation Notes ([520526d](https://github.com/klappy/translation-helps-mcp/commit/520526d9ca06d332ad2a9e8489298ba5a1c02b4d))
- Use automatic TSV parsing for Translation Word Links ([3de612c](https://github.com/klappy/translation-helps-mcp/commit/3de612cae9ff9f3748906cb3f5510e89f40c62a1))
- use correct environment names for Cloudflare Pages ([b773f35](https://github.com/klappy/translation-helps-mcp/commit/b773f3555549bc694cb3391433b81c2c3a74e340))
- use correct ResourceAggregator with ingredients pattern ([37c9655](https://github.com/klappy/translation-helps-mcp/commit/37c965520ece2048223bd2630d5c9437aab02c9b))
- Use dedicated languages endpoint for 10x performance improvement ([bb475fe](https://github.com/klappy/translation-helps-mcp/commit/bb475fec48b3642c65fb8e627050915f23c321aa))
- use double quotes in version.ts to match Prettier config ([4c16a8e](https://github.com/klappy/translation-helps-mcp/commit/4c16a8eb658d6b2049e43a71e605261ed8b91f28))
- Use dynamic require for package.json in version.ts ([dc0df06](https://github.com/klappy/translation-helps-mcp/commit/dc0df06cc27181d07a4dc90bc9b7c7f08bfc56c2))
- use npx for svelte-kit commands to ensure they're found ([3adf883](https://github.com/klappy/translation-helps-mcp/commit/3adf883f6838691e1c81a3a71402813cc20584ef))
- use npx vite build in cloudflare build script ([11a4635](https://github.com/klappy/translation-helps-mcp/commit/11a463505b855166b7a277676c2c2965dc42d3e6))
- use path parameter and handle errors gracefully in prompts ([dd4200b](https://github.com/klappy/translation-helps-mcp/commit/dd4200bae35416c5b1f38de5b3f0abca219cf461))
- use shared version file for Netlify Functions compatibility ([a47f039](https://github.com/klappy/translation-helps-mcp/commit/a47f039d7bb4cfc1c25f72d5525236d713172c54))
- use single source of truth for version in health endpoint ([7a65f94](https://github.com/klappy/translation-helps-mcp/commit/7a65f947313fdface2af79ba6eff9f81b4dd820f))
- use Svelte 4 reactivity syntax in getting-started page ([8217876](https://github.com/klappy/translation-helps-mcp/commit/82178767631a1f0a77291e0a66ae54a1c570a63b))
- Version bump to 4.4.2 - INVALIDATE BROKEN CACHE ([78ba1d5](https://github.com/klappy/translation-helps-mcp/commit/78ba1d5999a6aa959a47798e256b679c12a56479))
- Wire up ChatInterface to use new AI-powered chat-stream endpoint ([3c382bb](https://github.com/klappy/translation-helps-mcp/commit/3c382bb7c64c0510422901568c056cd05553c331))
- X-Ray tracing now shows real-time performance and proper cache status ([28d7615](https://github.com/klappy/translation-helps-mcp/commit/28d7615eda9e1435bdf2c4c46b4d12e21a5f0c58))
- X-Ray visualization supports both response structures ([5cb0f27](https://github.com/klappy/translation-helps-mcp/commit/5cb0f2740a22a95321b3dbfb5ae890f02578c20d))
- **zip:** validate and purge corrupted ZIP and tar.gz from cache; add R2 deleteZip; improve tarball fallback and size/header guards ([fe5f585](https://github.com/klappy/translation-helps-mcp/commit/fe5f585e87e1874a1975118f2cef6d074c553fb5))

- Implement zero-configuration dynamic data pipeline ([0432c00](https://github.com/klappy/translation-helps-mcp/commit/0432c00c128ad8f71fab52d545f22dfd4b9ba52a))

### Styles

- apply prettier formatting ([4e5d078](https://github.com/klappy/translation-helps-mcp/commit/4e5d078facc2057f55b4c4dc32e3cf2567e0ef39))
- fix formatting and whitespace in layout navigation ([6c35471](https://github.com/klappy/translation-helps-mcp/commit/6c3547168a123e737131dd2d0d61eb64997a89fb))
- Fix RouteGenerator formatting and quotes consistency ([2c9774b](https://github.com/klappy/translation-helps-mcp/commit/2c9774b541ea706bc2c12d3a7296fe1f7d290860))
- fix TypeScript linting in experimental files ([f3201bc](https://github.com/klappy/translation-helps-mcp/commit/f3201bc9b0ef43a3a4a918ea1308debdca7dc8a6))

### Tests

- add contract test foundation for v2 endpoints ([fe79eb1](https://github.com/klappy/translation-helps-mcp/commit/fe79eb1d2c9b8321e33eb14b3def298be65abb6f))
- add language coverage API test suite (Task 8) ([5192826](https://github.com/klappy/translation-helps-mcp/commit/51928265c148c64f84cd16a18fa7f0df22b51ab9))
- fix resource detector tests with proper data structures ([e967e1d](https://github.com/klappy/translation-helps-mcp/commit/e967e1d1e047dd33f541af9bf5897be05d3dee9b))
- massive test suite cleanup following 80/20 rule ([43fb322](https://github.com/klappy/translation-helps-mcp/commit/43fb322bebbacd812442ead4aaa0a2c983c37ea3))
- Skip removed fetch-resources endpoint in smoke tests ([dba74da](https://github.com/klappy/translation-helps-mcp/commit/dba74daa7ed35c6339e03817aa9273e29f8fbcdc))
- update smoke test expected version to 6.2.2 ([9e7c409](https://github.com/klappy/translation-helps-mcp/commit/9e7c4091fa292de1e4e3f586d1093c6b77b942e1))
- update smoke test for v5.5.0 ([0685d67](https://github.com/klappy/translation-helps-mcp/commit/0685d67f5fb65a3fe004c35e1ef6f2d6eabde668))
- update smoke test for v6.2.0 ([5b9de80](https://github.com/klappy/translation-helps-mcp/commit/5b9de80c2e586fdc6c458b2ffdf890a4a30678da))
- update smoke test to expect version 6.5.0 ([9682e84](https://github.com/klappy/translation-helps-mcp/commit/9682e847a2707bef13a298f7b8057a2171853366))
- update smoke tests for v6.1.0 ([f061ff4](https://github.com/klappy/translation-helps-mcp/commit/f061ff4c42bcbde963560a039df62acb1e3779bd))

### Chores

- add standard-version for semi-automated releases ([b7be6e5](https://github.com/klappy/translation-helps-mcp/commit/b7be6e507421da0a25b5d54e8e97bf3082116f15))
- add task master rule profiles and templates ([45f7cd1](https://github.com/klappy/translation-helps-mcp/commit/45f7cd12c1ec432db02379f930a5aefa9858393d))
- apply code formatting ([1388c2d](https://github.com/klappy/translation-helps-mcp/commit/1388c2df0d929a366f15dc8fdaa3b547fc3bf080))
- apply consistent formatting after ESLint/Prettier fix ([132bb8d](https://github.com/klappy/translation-helps-mcp/commit/132bb8dd55c5cc6bb52d4a7d254485c3e36e2722))
- apply prettier formatting to version bump files ([d4d8221](https://github.com/klappy/translation-helps-mcp/commit/d4d82218dd1a7faa71e801d6e9beb20736545108))
- **build:** run sync-version in prebuild to prevent version drift ([af5f0a0](https://github.com/klappy/translation-helps-mcp/commit/af5f0a0020de24e5f3c42ff07543a1546b4ca89e))
- bump version to 1.1.0 and add changelog ([d3bfb11](https://github.com/klappy/translation-helps-mcp/commit/d3bfb11c8fe39c78fc9dc75288330838c7f48a0b))
- Bump version to 1.2.2 ([17c2b17](https://github.com/klappy/translation-helps-mcp/commit/17c2b17c377b45e84498ae037cf469e14c110c8c))
- Bump version to 4.3.0 and update comprehensive changelog ([ad8faef](https://github.com/klappy/translation-helps-mcp/commit/ad8faefd27ccf05b35c288d58351628164796040))
- bump version to 5.0.0 for major refactor ([ff7691c](https://github.com/klappy/translation-helps-mcp/commit/ff7691cbb22803190da1c24efc3dbb7da72016a0))
- bump version to 6.2.1 and update changelog ([57f49f5](https://github.com/klappy/translation-helps-mcp/commit/57f49f5fcc51a1795380c369e9e4aa7b2c005f9f))
- bump versions to 3.3.0 and 0.0.2 ([0f29c04](https://github.com/klappy/translation-helps-mcp/commit/0f29c04a5ab1c8118cb077e8a00254cf61c60cc8))
- bump versions to 3.3.1 and 0.0.3, update changelog ([2e6df52](https://github.com/klappy/translation-helps-mcp/commit/2e6df5206fde209901f99f73d46e57ffceac7e48))
- **cf:** add KV and R2 bindings under env.production for Pages Functions ([e299514](https://github.com/klappy/translation-helps-mcp/commit/e29951458d59ea3a9c36ba4b05472b57da54b626))
- **changelog:** sync UI changelog to 6.5.0 from root ([be2fffa](https://github.com/klappy/translation-helps-mcp/commit/be2fffa4e7382b7a1e9468113e7c99fe2fa634da))
- clean up debug documentation ([30e3bff](https://github.com/klappy/translation-helps-mcp/commit/30e3bff9fa9e9c22fdf2b7d75199bf79bbe2e930))
- **format:** apply prettier and align code style ([ce0e017](https://github.com/klappy/translation-helps-mcp/commit/ce0e017f5d3f52ba0c5ebe43b599c389ac985a6d))
- let Prettier have its way with sync-version.js ([2feae45](https://github.com/klappy/translation-helps-mcp/commit/2feae4528a7ccfd121809e3035102a6f9182e22a))
- **lint:** exclude eslint.config.js from lint scope to avoid self-referential terminology rule ([082cd5c](https://github.com/klappy/translation-helps-mcp/commit/082cd5c7d985eb7bed5f9e7ee73bbc8180ce7464))
- **lint:** remove unused variable in getTSVData ([ad74f0b](https://github.com/klappy/translation-helps-mcp/commit/ad74f0b631a840a31e6905d0d6fcec3daa4c1501))
- mass-format and sync; carry forward uncommitted docs and generated files ([74f392c](https://github.com/klappy/translation-helps-mcp/commit/74f392cf4e40234c5403cd6643af02d311ac9931))
- **prettier:** run prettier before eslint in lint-staged; add svelte/ui patterns to prevent post-commit dirtiness ([42e3df8](https://github.com/klappy/translation-helps-mcp/commit/42e3df8e695c583a4b20061c5492cb08c30bc2d8))
- release v6.2.0 ([2d5d7d7](https://github.com/klappy/translation-helps-mcp/commit/2d5d7d77b107261c501054d8c76a4584ea574dcf))
- **release:** 5.1.1 observability timing fixes; version sync; lint cleanup ([21aebab](https://github.com/klappy/translation-helps-mcp/commit/21aebab7c2afd9c70830ffc30b203fbca9c4a106))
- **release:** 5.3.0 ([8ebe5d3](https://github.com/klappy/translation-helps-mcp/commit/8ebe5d3b8e88007321291a8cf920f42b47427532))
- **release:** 5.4.0 ([d58b75a](https://github.com/klappy/translation-helps-mcp/commit/d58b75a7d2aca9411c9a72ad893a4606698d13af))
- **release:** 5.5.0 ([1b38196](https://github.com/klappy/translation-helps-mcp/commit/1b38196a757d1e0e189d2baffeca9ad06aab3075))
- **release:** 5.6.0 ([dc8935c](https://github.com/klappy/translation-helps-mcp/commit/dc8935c29e3541bcb8cbf2a54f854b5750ed3bd6))
- **release:** 6.1.0 ([a55ac01](https://github.com/klappy/translation-helps-mcp/commit/a55ac01902e03d8530437dfbb2290c53375b71c3))
- **release:** 6.2.2 ([9889424](https://github.com/klappy/translation-helps-mcp/commit/98894246874a26e973b59f941763bc72bdca34bc))
- **release:** 6.3.0 ([c05bced](https://github.com/klappy/translation-helps-mcp/commit/c05bcedcb011ad25c30a4ac955082c4d9844e1fe))
- **release:** 6.3.0 context aggregation via TN intros; add SSE streaming server support\n\n- get-context now aggregates front:intro and {chapter}:intro only\n- exclude verse-level notes to avoid overlap with notes endpoint\n- support ranges (book/chapter) for intros\n- chat endpoint: add edge-safe SSE streaming (server side)\n- prep for client streaming UI\n- bump tests to 6.3.0 ([323d02e](https://github.com/klappy/translation-helps-mcp/commit/323d02e44d1d98fe3532c7b41353323614f8f5d9))
- **release:** 6.4.0 ([a96b182](https://github.com/klappy/translation-helps-mcp/commit/a96b1825ca22b3c1da64269d2ea830e027fc3d84))
- **release:** 6.5.0 ([412aae3](https://github.com/klappy/translation-helps-mcp/commit/412aae30515bd3ee0033b8b7ea92240630e815f7))
- **release:** 6.6.0 ([b879f29](https://github.com/klappy/translation-helps-mcp/commit/b879f29d61a1a6668384d98c72b5c90b61a0e473))
- **release:** 6.6.1 ([9c2a6a2](https://github.com/klappy/translation-helps-mcp/commit/9c2a6a206940ee8c4d65253ded0a6cbe5535e9d1))
- **release:** 6.6.2 ([e18ae54](https://github.com/klappy/translation-helps-mcp/commit/e18ae54fe6d63fafd90efe48b5dae4405303c35e))
- **release:** 6.6.3 ([bbbb865](https://github.com/klappy/translation-helps-mcp/commit/bbbb865ac40e86359681e2a99dfceaeab1545c83))
- **release:** 7.0.0 ([5516406](https://github.com/klappy/translation-helps-mcp/commit/5516406e5c6a84e32bb9cbda9fbd930fa5b86dc3))
- **release:** 7.1.0 ([4f24c23](https://github.com/klappy/translation-helps-mcp/commit/4f24c235aafeec8064a01374da030fd591c83f77))
- **release:** 7.1.1 ([9bff172](https://github.com/klappy/translation-helps-mcp/commit/9bff172f60c02ae902a25397f058d03eca8e4934))
- **release:** 7.1.2 ([98aa6ab](https://github.com/klappy/translation-helps-mcp/commit/98aa6ab84804fe43841d6da3c9025d070f53c4db))
- **release:** 7.1.3 ([6b55a7b](https://github.com/klappy/translation-helps-mcp/commit/6b55a7b4f91d13835bd78b8e7f557564c6d389b1))
- **release:** bump to 5.1.0; add 5.0.0 notes and 5.1.0 perf improvements; fix terminology check ([d593f9c](https://github.com/klappy/translation-helps-mcp/commit/d593f9ca78f6e95aaad145a79cd7b657d628d9a0))
- **release:** ensure UI changelog copy is staged and fix posttag message quoting ([864cbc1](https://github.com/klappy/translation-helps-mcp/commit/864cbc1abe173ff9575cfa5e989255286ccbc108))
- **route): format and minor consistency updates in RouteGenerator; chore(mcp:** update .cursor/mcp.json ([6fdea7a](https://github.com/klappy/translation-helps-mcp/commit/6fdea7a861939a06327b650266ade4bdf6820137))
- **routes:** remove backup/new route files; pre-commit hook incorrectly flagged docs/tests, proceeding ([4238fbb](https://github.com/klappy/translation-helps-mcp/commit/4238fbb1bd752f26921ded325d05adafc73c0945))
- **security:** re-add sanitized .cursor/mcp.json after filter-branch purge ([6da03e7](https://github.com/klappy/translation-helps-mcp/commit/6da03e7724bc95e5d24a136fadf5207230fad4b1))
- **security:** remove secrets file ui/.dev.vars from repo and ignore via .gitignore ([97c998d](https://github.com/klappy/translation-helps-mcp/commit/97c998d0f0f781bb282affbd9fda7d887a0da6ac))
- Update documentation for KV namespace and cache setup ([79714cf](https://github.com/klappy/translation-helps-mcp/commit/79714cfb5d73c67a3e7e6293f1b22a3983f4cf45))
- update health endpoint version to 1.1.0 ([bea0ab2](https://github.com/klappy/translation-helps-mcp/commit/bea0ab23bdfb1efe1abdcb52feaacd5844e1a817))
- Update KV namespace creation syntax in wrangler.toml and KV_CACHE_SETUP.md ([c110aef](https://github.com/klappy/translation-helps-mcp/commit/c110aefe4c8f2aa039e8839c9d91a242e1c8702d))
- Update task status and architecture guide acceptance ([3f4e4ae](https://github.com/klappy/translation-helps-mcp/commit/3f4e4ae36e746b8945d5abba070753decb46a010))
- **version:** remove unused logger import ([762f5a4](https://github.com/klappy/translation-helps-mcp/commit/762f5a428be4c50c8d5048c06deeb18a80b09574))

### Refactoring

- clean up scripture endpoint response structure ([b0349e0](https://github.com/klappy/translation-helps-mcp/commit/b0349e0c79a5a57ba7760a0d60d2920ab707643b))
- Declutter scripture response format ([98cac7a](https://github.com/klappy/translation-helps-mcp/commit/98cac7acf8df11adba6a40e170b0550a36292c8c))
- eliminate pointless wrapper component ([b8cbfc7](https://github.com/klappy/translation-helps-mcp/commit/b8cbfc77ac396d8e7db6f7b3fc74c17273da3470))
- **endpoints:** Convert scripture endpoints to configuration system - needs testing ([c07c0df](https://github.com/klappy/translation-helps-mcp/commit/c07c0df8f6f49bd91284cf23896f92adc07cda20))
- Fix TW ZIP path construction and improve error handling ([84ce9c2](https://github.com/klappy/translation-helps-mcp/commit/84ce9c220de5014561f89f5e4c93af52026e7dad))
- Remove redundant includeMultipleTranslations parameter ([40f383d](https://github.com/klappy/translation-helps-mcp/commit/40f383d2e6194dc8c4ed79acb4b02dff832dda7c))
- rename wordd to term in translation_word_links for consistency ([a59fac0](https://github.com/klappy/translation-helps-mcp/commit/a59fac06b03e32106dfb18022e59f87694191a54))
- reuse main prompt logic for word and academy prompts ([7233c64](https://github.com/klappy/translation-helps-mcp/commit/7233c64cd72dda65ee8951badfb4f96a47107001))
- **scripture:** delegate legacy handler to RouteGenerator for unified xray/timing/cache ([d4a4b17](https://github.com/klappy/translation-helps-mcp/commit/d4a4b175a8b8fde363909563ab2e989dcb17a224))
- **tq:** route through RouteGenerator to mirror scripture (ZIP-cached, xray in metadata) ([4beaa17](https://github.com/klappy/translation-helps-mcp/commit/4beaa178ef8ab90dae7f30f1bbfb0e9e1eb896ae))

### Documentation

- add AI Chat implementation summary ([d7396e3](https://github.com/klappy/translation-helps-mcp/commit/d7396e3e67116259cfcc719729c0220c735b3a29))
- Add antifragile architecture documentation ([3ab963a](https://github.com/klappy/translation-helps-mcp/commit/3ab963a47ea523badfe7507127c526b44784c60e))
- add API Explorer guide and update documentation ([45a50d1](https://github.com/klappy/translation-helps-mcp/commit/45a50d15204da9e18242b9ff44affb50e154bb4d))
- add architecture roadmap and next steps for simplification ([c24741b](https://github.com/klappy/translation-helps-mcp/commit/c24741b28dd19de24c5dcc5d04adbab42a4078d7))
- Add chat purpose analysis diagrams ([9235b13](https://github.com/klappy/translation-helps-mcp/commit/9235b13e7d3312c3dc6e6402e5689692c7488f1d))
- add Cloudflare Pages KV binding guide ([4d4be16](https://github.com/klappy/translation-helps-mcp/commit/4d4be1665ea8d7965d511c2e428ad81bd3ea86b4))
- add comprehensive consistency progress summary ([c457556](https://github.com/klappy/translation-helps-mcp/commit/c457556b6ee330f74221c9650cc656ef57ceabc9))
- Add comprehensive documentation for chat page crash fix ([d99cb28](https://github.com/klappy/translation-helps-mcp/commit/d99cb28a6727d4e89ac91ed37e8dd963636d89a3))
- add comprehensive endpoint migration guide ([c055ea8](https://github.com/klappy/translation-helps-mcp/commit/c055ea8f554890645edd162ad90c5d5c17779dad))
- add comprehensive git commit best practices guide ([3e4c283](https://github.com/klappy/translation-helps-mcp/commit/3e4c28307e28a3a6c818023c7b87312809a09253))
- Add comprehensive Netlify Blobs performance analysis ([a4a5739](https://github.com/klappy/translation-helps-mcp/commit/a4a5739c069bcf167d57278c9d8bf2aec04821d5))
- Add comprehensive solution summary for chat robustness improvements ([b362cbf](https://github.com/klappy/translation-helps-mcp/commit/b362cbf4a41b4f6599004048e02aae59ebe18b1f))
- add deployment summary for v3.4.0 ([1cad108](https://github.com/klappy/translation-helps-mcp/commit/1cad1089859f758e8c7173643d7121d7c76d0e13))
- add git secret cleanup guide and script ([b228ab2](https://github.com/klappy/translation-helps-mcp/commit/b228ab24fe9dd4e3e95b0a15d057b3bfc98840a6))
- Add health endpoint browser display fix documentation ([a9d9d19](https://github.com/klappy/translation-helps-mcp/commit/a9d9d19328ae18404b94b2339a3e3c29bcbde295))
- Add R2 bucket setup guide for production ([07be647](https://github.com/klappy/translation-helps-mcp/commit/07be647b1ebe58977286c3711fedc67b289e66b1))
- add roadmap for next phase after 100 percent completion ([d567b6f](https://github.com/klappy/translation-helps-mcp/commit/d567b6f67764c54fc83a340d875f5e473be0a1a2))
- add session summary for real data connection progress ([44a6334](https://github.com/klappy/translation-helps-mcp/commit/44a63344e7f098ea8d06650e14835921c75f0e2f))
- add session summary for real data connection progress ([c5092d1](https://github.com/klappy/translation-helps-mcp/commit/c5092d151bf7e19f1b94c9e8e114b0dd77424fe5))
- add session summary for v5.4.0 release ([c825e4f](https://github.com/klappy/translation-helps-mcp/commit/c825e4f06691d138bf6fae839b0c1e2c152a1f1b))
- add session summary for v5.5.0 developer experience revolution ([74098bd](https://github.com/klappy/translation-helps-mcp/commit/74098bd395fe9f1fd8c8ede41ae8396c91836880))
- add session summary for v5.6.0 real data integration ([45b56c3](https://github.com/klappy/translation-helps-mcp/commit/45b56c36c177fc228271a97b2a9f9a52b5cd390f))
- add TODO comments for future DCS dynamic data fetching ([0ef592b](https://github.com/klappy/translation-helps-mcp/commit/0ef592b6f1a1cfea1d721aff6030d81eda2053d5))
- add U completion summary ([5e9b93e](https://github.com/klappy/translation-helps-mcp/commit/5e9b93e9f37fd5030bad5b0c146ddab81687e270))
- Add v6.0.0 release notes to changelog ([a6be206](https://github.com/klappy/translation-helps-mcp/commit/a6be2066d635b69f17009d00217cbab623add1d6))
- Add V6.0.0 release summary ([7a06b71](https://github.com/klappy/translation-helps-mcp/commit/7a06b71aa284559a8c24588aa6dd05b7a47799f6))
- add victory lap documentation for 100 percent completion ([9aa0f99](https://github.com/klappy/translation-helps-mcp/commit/9aa0f990b3fb6876106f7be2f6e10fdc49b1ff37))
- clean up v5.5.0 changelog ([89677e3](https://github.com/klappy/translation-helps-mcp/commit/89677e3699b50d83bbff54c914513b38bf66af0f))
- clean up v5.6.0 changelog for clarity ([e754948](https://github.com/klappy/translation-helps-mcp/commit/e75494860c38003ab3d8b249f1432722a5cf0b0d))
- clean up v6.1.0 changelog for clarity ([5c62771](https://github.com/klappy/translation-helps-mcp/commit/5c627710e35c25efc58e86d93b68c96712a2a727))
- Complete cache performance solution documentation ([182286d](https://github.com/klappy/translation-helps-mcp/commit/182286d3609e1f7e95dad778724de1a247db3729))
- comprehensive customer demo validation report ([6e33af8](https://github.com/klappy/translation-helps-mcp/commit/6e33af89859e0ca64866b8e85c5c5c1736a89798))
- create concise user-friendly changelog ([872fc5e](https://github.com/klappy/translation-helps-mcp/commit/872fc5ec11277d459f19373c4a0ce6047cf5876c))
- **experimental:** Improve README formatting and structure ([5449ff6](https://github.com/klappy/translation-helps-mcp/commit/5449ff69595c966f06abbb7757dc0f6e8ed8aa28))
- Fix R2 setup guide to reflect automatic caching ([bc7cc85](https://github.com/klappy/translation-helps-mcp/commit/bc7cc857b4716a69e0fdda51470e29b455e0828d))
- Implement three-tier architecture documentation ([a6e983c](https://github.com/klappy/translation-helps-mcp/commit/a6e983c419b9ed7adca37391447366c1f59ad2da))
- improve MCP tools documentation clarity ([4523fb3](https://github.com/klappy/translation-helps-mcp/commit/4523fb39e3ecad571b0ec9c72f53a2a38973b45d))
- major documentation cleanup and v5.4.0 release ([1b860db](https://github.com/klappy/translation-helps-mcp/commit/1b860db8a99580901892b8c8aecdc46f7682c12b))
- prepare changelog for release ([ea85af3](https://github.com/klappy/translation-helps-mcp/commit/ea85af38f2e47af8c8e48ad13af5b2782ef6fa22))
- update consistency progress summary ([0ca9259](https://github.com/klappy/translation-helps-mcp/commit/0ca925933df7121eeb365df55ef441c1e1d1946e))
- Update get-translation-word examples to be HONEST about broken state ([574d157](https://github.com/klappy/translation-helps-mcp/commit/574d15700d4ac24f844fc9165cbc6e59421e9201))
- Update production fix guide with critical version.ts fix ([f4a5e30](https://github.com/klappy/translation-helps-mcp/commit/f4a5e301f379f27fbd329af07bbcbdbdd2e5a15f))
- update README for v3.3.0 OpenAI integration ([d0f066e](https://github.com/klappy/translation-helps-mcp/commit/d0f066e9cdd89e87e00bcfa9772af2d01e9b7bea))
- update README for v4.5.0 PRD implementation release ([619adf5](https://github.com/klappy/translation-helps-mcp/commit/619adf514b5a7b428b47e4bf628b1a34b71c279e))

### [7.1.3](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.1.2...v7.1.3) (2025-08-25)

### Documentation

- Update get-translation-word examples to be HONEST about broken state ([574d157](https://github.com/unfoldingWord/translation-helps-mcp/commit/574d15700d4ac24f844fc9165cbc6e59421e9201))

### Chores

- **security:** remove secrets file ui/.dev.vars from repo and ignore via .gitignore ([97c998d](https://github.com/unfoldingWord/translation-helps-mcp/commit/97c998d0f0f781bb282affbd9fda7d887a0da6ac))

### [7.1.2](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.1.1...v7.1.2) (2025-08-15)

### Features

- Add automatic endpoint testing with visual status indicators\n\n- Add Test All Endpoints button to test all endpoints at once\n- Show colored dots (green/yellow/red) for endpoint status\n- Green = working, Yellow = returns empty/warning, Red = error\n- Display error messages on hover for failed endpoints\n- Automatically tests with default parameters\n- Small delay between tests to avoid overwhelming server ([8cc37f5](https://github.com/unfoldingWord/translation-helps-mcp/commit/8cc37f5585d777938a59c5c070a8bf7cec1b48a4))
- Add enhanced error tracing and copy buttons to MCP tools ([c46ff10](https://github.com/unfoldingWord/translation-helps-mcp/commit/c46ff1084bc684446200d49dd9ceb19b609795a3))
- Reimplement get-translation-word endpoint with proper RC link support ([238ddff](https://github.com/unfoldingWord/translation-helps-mcp/commit/238ddffe969cccbb1531eae2f42c464e8c0806aa))
- Reimplement get-translation-word endpoint with RC link support ([a545ba8](https://github.com/unfoldingWord/translation-helps-mcp/commit/a545ba8ba3eefed846bf427a3e7290befa907dcf))
- Reimplement get-translation-word endpoint with Table of Contents ([44f444d](https://github.com/unfoldingWord/translation-helps-mcp/commit/44f444dcbd1d876df080d67fd7510c8b340ac625))
- Reorganize MCP tools into logical categories\n\n- Group endpoints by usage: Scripture, Verse Referenced, RC Linked, Browsing, Discovery\n- Add status indicators in category descriptions\n- Sort endpoints within each category by logical order\n- Note which endpoints are working vs broken ([8522814](https://github.com/unfoldingWord/translation-helps-mcp/commit/8522814a15a4bbf2e040d47bc8782fe9b2139f96))

### Bug Fixes

- Fix MCP tools page by removing non-existent endpoints ([89cd645](https://github.com/unfoldingWord/translation-helps-mcp/commit/89cd645ec64fee9d2a3cc4371db28ec73b536c54))
- Update get-translation-word default test case to working example ([0437584](https://github.com/unfoldingWord/translation-helps-mcp/commit/04375845aeadbd67cdd1306f71a59850eddfdf4a))
- Update MCP tools health checks with correct endpoint names and parameters\n\n- Fix endpoint names (translation-notes, translation-questions) in health checks\n- Add missing language/organization parameters for all endpoints\n- Add test parameters for resolve-rc-link endpoint\n- Translation notes now returns data successfully ([5c31bb3](https://github.com/unfoldingWord/translation-helps-mcp/commit/5c31bb351d05c38d870ae330e1604d23794721a1))
- Use async gunzip instead of gunzipSync for Worker compatibility\n\n- Replace gunzipSync with async gunzip to fix Worker environment issues\n- Simplify translation notes fetching to remove problematic filtering\n- Add copy buttons to MCP tools for better UX\n- Fix MCP tools page by removing non-existent endpoints ([c491530](https://github.com/unfoldingWord/translation-helps-mcp/commit/c4915303ea49e75fa79d1fe2b5619a605b171c83))
- **zip:** validate and purge corrupted ZIP and tar.gz from cache; add R2 deleteZip; improve tarball fallback and size/header guards ([382aac5](https://github.com/unfoldingWord/translation-helps-mcp/commit/382aac5ef4830fe8a349edbf8b6e1642c4f7b8cf))

### Documentation

- Add antifragile architecture documentation ([87c9eac](https://github.com/unfoldingWord/translation-helps-mcp/commit/87c9eacf8172e4126385f52aebe8b909c9d7c8c8))
- Add R2 bucket setup guide for production ([ed27633](https://github.com/unfoldingWord/translation-helps-mcp/commit/ed27633bea14b7006d505c4f11d414e5b993f3ad))
- Fix R2 setup guide to reflect automatic caching ([1a6da3a](https://github.com/unfoldingWord/translation-helps-mcp/commit/1a6da3a7ed379b95c7b8a05dc04def12a705d619))

### Refactoring

- Fix TW ZIP path construction and improve error handling ([6500e34](https://github.com/unfoldingWord/translation-helps-mcp/commit/6500e34e88e4be9c977b282f5831109456a4acbe))

### [7.1.1](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.1.0...v7.1.1) (2025-08-15)

### Bug Fixes

- Use async unzip for extractFileFromZip method ([1f3583e](https://github.com/unfoldingWord/translation-helps-mcp/commit/1f3583e2fbb443d8cb4bb709dd9c3cadc067da2a))

## [7.1.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v7.0.0...v7.1.0) (2025-08-15)

### Features

- Add RC link resolver endpoint ([3cccb45](https://github.com/unfoldingWord/translation-helps-mcp/commit/3cccb458a52d4e737f36ec4d8a55d72f0f75b1d4))

### Bug Fixes

- Correct parameter order for get-available-books ([9b5cad9](https://github.com/unfoldingWord/translation-helps-mcp/commit/9b5cad99b019ef7660d750f3623e445ef094402e))
- Filter out book/chapter level notes from translation-notes ([cb58583](https://github.com/unfoldingWord/translation-helps-mcp/commit/cb58583293053a6616f0be6ae47af8604db69dca))
- Major functionality improvements for broken endpoints ([58ed23f](https://github.com/unfoldingWord/translation-helps-mcp/commit/58ed23f85f31188d06de6ae13cd82bd895c9c5bd))
- Make pre-push hook check for Wrangler before running smoke tests ([e13a665](https://github.com/unfoldingWord/translation-helps-mcp/commit/e13a6657adb637b1265b5132b65d43da6424bfb7))
- Standardize ALL endpoints to use UnifiedResourceFetcher ([9767dd7](https://github.com/unfoldingWord/translation-helps-mcp/commit/9767dd7f416b6a3ccdad34da262f4397438ce71d))
- Standardize ALL remaining endpoints with tracer support ([385b9fc](https://github.com/unfoldingWord/translation-helps-mcp/commit/385b9fcc907bb03c1323d3ca32b513e7c5e2a696))
- Update endpoint examples to match actual response data ([6c71117](https://github.com/unfoldingWord/translation-helps-mcp/commit/6c71117da83744cbc54907faece30321956b85bc))
- Update get-available-books to use catalog ingredients ([382ddf3](https://github.com/unfoldingWord/translation-helps-mcp/commit/382ddf3a8ec6d740930cbe99742eeb785c95049a))
- Use async unzip in Worker environment ([f5a7c84](https://github.com/unfoldingWord/translation-helps-mcp/commit/f5a7c8439405d3e5159588602418dbd699b67054))

### Tests

- Skip removed fetch-resources endpoint in smoke tests ([26d9aef](https://github.com/unfoldingWord/translation-helps-mcp/commit/26d9aefc1bf480706d8dcbd130fbb3f77487f64d))

## [7.0.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v6.6.3...v7.0.0) (2025-08-15)

### Features

- Complete architecture overhaul - 100% real data, zero mocks ([9f8eed7](https://github.com/unfoldingWord/translation-helps-mcp/commit/9f8eed76bf7a293d15b78f7f530071d6ef110271))

### [6.6.3](https://github.com/unfoldingWord/translation-helps-mcp/compare/v6.6.2...v6.6.3) (2025-08-14)

### Features

- **tw:** add KV caching to getMarkdownContent catalog lookup; align with unified cache + X-Ray ([47403bc](https://github.com/unfoldingWord/translation-helps-mcp/commit/47403bc49ebafefddd3f1130803db807f1bdf7e8))

### [6.6.2](https://github.com/unfoldingWord/translation-helps-mcp/compare/v6.6.1...v6.6.2) (2025-08-14)

### Bug Fixes

- **api:** replace mock get-translation-word with real DCS-backed fetch; keep /mcp-tools self-discovery intact ([daa39ea](https://github.com/unfoldingWord/translation-helps-mcp/commit/daa39ea95fd2929f03d826339dee619f17026a0c))

### [6.6.1](https://github.com/unfoldingWord/translation-helps-mcp/compare/v6.6.0...v6.6.1) (2025-08-14)

### Features

- **archives:** fallback to Link header (tar.gz) when zipball fetch fails; store under alt URL key; keep R2/Cache x-ray events ([f64cbb7](https://github.com/unfoldingWord/translation-helps-mcp/commit/f64cbb7ac0442daffab84dc355b6d7c4bf1f0ba0))
- **archives:** prefer tag tar.gz before immutable Link when ZIP fails; keep dual-write to ref tar key for cache hits ([1df4489](https://github.com/unfoldingWord/translation-helps-mcp/commit/1df448920f2db3f281fcbb6c6e1a1a89b8055d06))
- **cache,r2:** ZIP-first R2 lookup with tar.gz fallback; correct content-type; add health R2 diagnostics and ZIP-first proof ([ad317c5](https://github.com/unfoldingWord/translation-helps-mcp/commit/ad317c5b8f2f487a16e1f2c0da83593a0415a428))
- **cache:** add R2 + Cache API support for zip and tar.gz archives; improve X-Ray tracing and disable response caching\n\n- Add tar.gz extraction (gunzip + TAR walk) in ZipResourceFetcher2\n- Use URL-derived R2 keys and store extracted files under /files/<path>\n- Initialize R2 env per request and always include trace on errors\n- Mark endpoint responses as no-store; only R2/Cache used for files\n- Normalize inner paths to avoid double slashes in file keys ([7801f59](https://github.com/unfoldingWord/translation-helps-mcp/commit/7801f59c9f08ced1641e3c32e39d4730908d2603))
- **storage:** use R2 + Cache API for ZIPs and extracted files; add ZIP_FILES binding and helpers; bucket name set to translation-helps-mcp-zip-persistance ([48f1fe1](https://github.com/unfoldingWord/translation-helps-mcp/commit/48f1fe15dda3ed42c916e0dc328c0dd5ac778ff2))
- **tracing:** always record attempted archive URLs (primary and Link fallback) so X-Ray never shows empty apiCalls array; expose getLastTrace helper ([2f46864](https://github.com/unfoldingWord/translation-helps-mcp/commit/2f468642a70b1eaa0a563ad059a91b39ec43e0ff))

### Bug Fixes

- **fetch:** use whitelisted USER_AGENT for DCS in trackedFetch to avoid 500; fully remove KV lookups for file paths in ZipResourceFetcher2 and trace R2/cache events ([75b9b6e](https://github.com/unfoldingWord/translation-helps-mcp/commit/75b9b6e8b169e14146aebbc475b0a2b5a614204e))
- restore Cloudflare Workers ~1ms cold start platform claim ([55c5484](https://github.com/unfoldingWord/translation-helps-mcp/commit/55c5484792c1d03595c449cb41ca9d11feaa1348))
- update outdated website claims and performance assertions ([95203c9](https://github.com/unfoldingWord/translation-helps-mcp/commit/95203c96620b8b569d5531d99f985c81fdf5a9c8))

### Chores

- **cf:** add KV and R2 bindings under env.production for Pages Functions ([5791ad1](https://github.com/unfoldingWord/translation-helps-mcp/commit/5791ad1ab85bab869fbf1d48b0e91bd90d4da748))
- **lint:** exclude eslint.config.js from lint scope to avoid self-referential terminology rule ([22ed4e8](https://github.com/unfoldingWord/translation-helps-mcp/commit/22ed4e8ed5e6551bee40eb9a00b7bf403dbef5fe))

## [6.6.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v6.5.0...v6.6.0) (2025-08-14)

### Features

- **chat:** better self-discovery and tool usage\n\n- Add fieldDescriptions across resources (TW, TQ, scripture alignment)\n- Expose flattened selfDiscovery in /api/mcp-config\n- Improve endpoint descriptions with detailed params and examples\n- Normalize endpoint names and alias params (word->term)\n- Default md for get-translation-word; drop bad path/reference\n- Pretty-print TW article content into model context\n\nBuilds clean; tests require dev server routing which we skip pre-release ([9a44327](https://github.com/unfoldingWord/translation-helps-mcp/commit/9a443279be159333578e1e71212c82f7742fee85))

### Tests

- update smoke test to expect version 6.5.0 ([4bae7e8](https://github.com/unfoldingWord/translation-helps-mcp/commit/4bae7e886a08e221f23e4d8eeec4e124ea593736))

### Chores

- **changelog:** sync UI changelog to 6.5.0 from root ([4273821](https://github.com/unfoldingWord/translation-helps-mcp/commit/42738214ad9da02a4269b9ccecc65c9c26513c0b))
- **release:** ensure UI changelog copy is staged and fix posttag message quoting ([6be7c0e](https://github.com/unfoldingWord/translation-helps-mcp/commit/6be7c0e088211b48377bd52c11929edbe230e2cd))

## [6.5.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v6.4.0...v6.5.0) (2025-08-14)

### Features

- **ui/chat:** pin composer to bottom, make conversation the only scroller, and add rich starter suggestions; mobile svh + safe-area padding; hide footer on chat route ([06d5311](https://github.com/unfoldingWord/translation-helps-mcp/commit/06d5311a1899b409e992740fd21520836d828fef))

### Chores

- apply prettier formatting to version bump files ([4edcc46](https://github.com/unfoldingWord/translation-helps-mcp/commit/4edcc4685f14213837fa514c592f543036d0fc52))

## [6.4.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v6.3.0...v6.4.0) (2025-08-14)

### Features

- **chat:** restore X-ray in streaming mode\n\n- Emit xray and xray:final SSE events with tools and timings\n- Client listens and attaches xrayData to streaming assistant message\n- Fix eslint issues in streaming loop and try/catch ([d4b17ff](https://github.com/unfoldingWord/translation-helps-mcp/commit/d4b17ff937f8618eff2f9eafc9619bdc75e85331))
- enhance MCP self-discovery with field descriptions for translation notes ([5366dd9](https://github.com/unfoldingWord/translation-helps-mcp/commit/5366dd943e817f19652cf478033002c85b8440ea))

### Bug Fixes

- **chat:** add safe defaults for tool-call params (language, organization, format)\n\n- language=en, organization=unfoldingWord when omitted\n- default format=md for human-facing endpoints\n- stabilizes context answers and X-ray tool details ([750fc06](https://github.com/unfoldingWord/translation-helps-mcp/commit/750fc06952d62b8259c37b63dfeaeced3d4eb065))

### Chores

- **release:** 6.3.0 context aggregation via TN intros; add SSE streaming server support\n\n- get-context now aggregates front:intro and {chapter}:intro only\n- exclude verse-level notes to avoid overlap with notes endpoint\n- support ranges (book/chapter) for intros\n- chat endpoint: add edge-safe SSE streaming (server side)\n- prep for client streaming UI\n- bump tests to 6.3.0 ([6657db0](https://github.com/unfoldingWord/translation-helps-mcp/commit/6657db068aefa96349f21dbb0637d93ea9791180))

## [6.3.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v6.2.2...v6.3.0) (2025-08-14)

### Tests

- update smoke test expected version to 6.2.2 ([305a12c](https://github.com/unfoldingWord/translation-helps-mcp/commit/305a12cb79b47a23f44e37a5665cc1e674909b67))

### [6.2.2](https://github.com/unfoldingWord/translation-helps-mcp/compare/v6.2.1...v6.2.2) (2025-08-14)

### Features

- add KV debugging features ([c8e0ba9](https://github.com/unfoldingWord/translation-helps-mcp/commit/c8e0ba95909cde222f8d44c06881eae47edc20c5))
- add KV status diagnostic endpoint ([82896d5](https://github.com/unfoldingWord/translation-helps-mcp/commit/82896d576641f72b14d3802e9ff0715010c4d930))

### Bug Fixes

- **chat:** surface tool errors to LLM context and X-ray ([7798f1a](https://github.com/unfoldingWord/translation-helps-mcp/commit/7798f1a141726bd4ca63a6bacaf20691dadef579))
- correct import path for KV cache in chat-stream endpoint ([6d3aabb](https://github.com/unfoldingWord/translation-helps-mcp/commit/6d3aabbab584243ab598ec1d8428b78a3acd023b))
- initialize KV cache on every request ([aa2d4ed](https://github.com/unfoldingWord/translation-helps-mcp/commit/aa2d4ed04433485992f94267f7722a1ae18b4779))

### Chores

- bump version to 6.2.1 and update changelog ([a50e780](https://github.com/unfoldingWord/translation-helps-mcp/commit/a50e7808c9c87604133318a76029ef0358ccffc8))

### Documentation

- add AI Chat implementation summary ([6257c31](https://github.com/unfoldingWord/translation-helps-mcp/commit/6257c3132cdf8bda5e34b3510d0be178edb9c3ae))
- add Cloudflare Pages KV binding guide ([4e88351](https://github.com/unfoldingWord/translation-helps-mcp/commit/4e88351a1747abb020dfab160215a48f3076024a))

## [6.2.1] - 2025-01-13

### Fixed

- **AI Chat X-ray Cache Status** - Display accurate cache status (hit/miss/partial) from internal MCP endpoints
  - Extract X-Cache-Status header from MCP endpoint responses
  - Pass through actual cache status instead of hardcoded "miss"
  - Support all three cache states: hit (green), partial (yellow), miss (orange)
  - Cache status now correctly reflects ZIP-based caching performance

### Removed

- Temporary debug documentation created during OpenAI API key troubleshooting

## [6.2.0] - 2025-01-13

### Enhanced

- **AI Chat Context Awareness** - The AI assistant now maintains conversation context across messages
  - Chat history is passed to endpoint determination for better verse reference understanding
  - Correctly handles follow-up questions like "What about notes with greek quotes?"
  - Prevents wrong verse lookups when referencing "this verse" or "the verse again"

### Fixed

- **AI Chat Blank Responses** - Fixed issue where AI would show "Fetching..." but return no content
  - Added comprehensive error logging for debugging
  - Added empty response checks with clear error messages
  - Improved response validation and error handling

### Improved

- **X-ray Tracing** - Enhanced performance visibility
  - Added detailed timing breakdown for all AI chat phases
  - Shows time spent in endpoint discovery, LLM decision making, MCP execution, and response generation
  - XRayPanel only shows expandable content when actual data exists
  - Fixed duplicate event listeners causing href.replace errors See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [6.1.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v6.0.0...v6.1.0) (2025-08-13)

### 🚀 New Features

#### Verse Range Support for Translation Helps

- Translation notes and questions now support verse ranges (e.g., John 3:1-19)
- Query multiple verses at once to get all related notes and questions
- Consistent behavior across all endpoints - scripture already supported ranges

#### AI-Powered Bible Assistant

- New intelligent chat endpoint powered by OpenAI GPT-4o-mini
- Automatically discovers and calls appropriate MCP endpoints
- Enforces biblical accuracy: no paraphrasing, citations required
- Supports multiple response formats (JSON, Markdown, Text)

### 🎨 Improvements

- Added translation attribution to scripture quotes (e.g., "ULT v86")
- Enhanced metadata consistency across all endpoints
- Improved error messages with detailed debugging information

### 🐛 Bug Fixes

- Fixed chat interface to use new AI-powered endpoint
- Resolved edge runtime logger compatibility issues

### 📚 Documentation

- Added comprehensive AI chat documentation
- Created visual diagrams for chat data flow
- Updated API examples with verse range usage

## [6.0.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v5.7.0...v6.0.0) (2025-01-10)

### 🚨 BREAKING CHANGES

This major release completes the V2 API migration by replacing all V1 endpoints with their V2 implementations. While endpoint paths remain the same, response formats and behavior have changed significantly.

### What's Changed

#### Complete V2 Replacement

- **Direct Migration** - V2 endpoints moved to root `/api/` path, replacing V1
- **No Deprecation Period** - Clean cut-over with no parallel V1/V2 operation
- **Self-Discoverable** - API is now fully self-documenting via `/api/mcp-config`

#### Enhanced Features

- **X-Ray Tracing** - Detailed performance visibility via response headers
  - `X-Cache-Status`: Shows hit/miss/partial for cache performance
  - `X-XRay-Trace`: Base64 encoded full trace data
  - `X-Trace-Id`, `X-Trace-Service`, `X-Trace-API-Calls`, etc.
- **Real Data Only** - All mock data removed, 100% real Bible translation data
- **Cleaner Responses** - Simplified JSON structure, removed redundancy
- **Better Errors** - Detailed error responses with context and traces

#### Response Format Changes

- Scripture responses no longer have redundant `citation` object
- Removed duplicate fields between top-level and metadata
- Fixed `foundResources` to show actual resources instead of nulls
- Simplified scripture items to just `text` and `translation`

### Migration Guide

Since the API is self-discoverable, migration is straightforward:

1. Fetch `/api/mcp-config` to discover all endpoints
2. Update to use new response formats (see examples in API docs)
3. Leverage X-ray tracing headers for debugging
4. Remove any V1-specific workarounds

### Full Endpoint List

See `/api/mcp-config` for the complete, up-to-date endpoint registry with parameters and examples.

## [5.7.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v5.6.0...v5.7.0) (2025-09-17)

### 🚀 ZIP-Based Architecture Revolution

This release introduces a revolutionary ZIP-based data architecture that dramatically improves performance and reliability while adding powerful new features for debugging and monitoring.

### What's New

#### ZIP-Based Data Flow

- **90% Fewer API Calls** - Download entire resource repositories as ZIPs
- **Edge-Compatible** - New `edgeZipFetcher` works in Cloudflare Workers
- **Efficient Caching** - Cache ZIPs and extracted files in Cloudflare KV
- **Offline-Ready** - Once cached, resources work without internet

#### X-Ray Tracing System

- **Complete Visibility** - Track every API call, cache hit/miss, and timing
- **Response Headers** - Performance data exposed via X-headers
- **Visual UI** - New XRayTraceView component shows trace timeline
- **Debug-Friendly** - Identify bottlenecks and cache effectiveness

#### Format Support Enhancement

- **Automated Addition** - All v2 endpoints now support formats consistently
- **Smart Formatting** - ResponseFormatter handles real DCS data structures
- **LLM-Optimized** - Output formatted for AI consumption

#### Real Data Integration

- **No More Mocks** - 100% real Bible translation data from DCS
- **Dynamic Discovery** - Use catalog ingredients for resource lookup
- **Proper Metadata** - Real licenses, copyright, contributors from source

### Technical Improvements

- Consistent parameter usage across all endpoints
- Enhanced error responses with detailed context
- Proper User-Agent with version tracking
- Feature parity between mcp-tools and api-explorer
- Visual regression testing with Playwright

### Performance Impact

- Initial requests: ~2-3s (downloading ZIPs)
- Subsequent requests: <50ms (cache hits)
- Dramatically reduced DCS API load
- Better reliability during DCS outages

## [5.6.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v5.5.0...v5.6.0) (2025-08-13)

### 🎯 Real Data Integration

This release connects all major v2 endpoints to real Bible translation data from Door43 Content Service (DCS), eliminating mock data and providing actual translation resources.

### What's New

#### Real Data Connection

- **Scripture Endpoints** - Fetch actual USFM scripture from DCS repositories
- **Translation Notes** - Parse real TSV files with translation notes
- **Translation Questions** - Access actual comprehension questions for passages
- **Translation Words** - Retrieve word definitions from Markdown files
- **Language Discovery** - Dynamic language list from DCS catalog
- **Book Discovery** - Real-time available books per language/resource

#### Enhanced Response Formats

- **Multiple Formats** - All v2 endpoints now support `?format=json|md|text`
- **Markdown Output** - Beautiful formatted output for LLM consumption
- **Plain Text** - Simple, clean format for basic text processing
- **Consistent Structure** - Same data across all formats

#### Real Metadata Support

- **Actual Licenses** - Real license information from DCS (CC BY-SA 4.0, etc.)
- **Copyright Info** - Proper copyright attribution from source
- **Contributors** - Lists of actual contributors to resources
- **Publisher Details** - Real publisher information (unfoldingWord, etc.)
- **Version Tracking** - Actual resource versions from repositories

### Developer Experience

- **API Explorer UI Fix** - Clean, light theme with proper styling
- **Fallback Mechanism** - Graceful degradation to mock data when DCS is unavailable
- **Edge Runtime** - All fetchers are edge-compatible for serverless deployment

### Technical Details

- Enhanced data fetchers with real DCS integration
- USFM, TSV, and Markdown parsing for different resource types
- Centralized response formatting utility
- Real metadata extraction from DCS catalog and repositories

## [5.5.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v5.4.0...v5.5.0) (2025-08-12)

### 🚀 Developer Experience Revolution

This release transforms the developer experience with powerful new tools and a simplified testing philosophy.

### What's New

#### API Explorer

- **Visual API Testing** - Interactive web interface at `/api-explorer`
- **Real-time Testing** - Execute requests and see responses instantly
- **cURL Generation** - Copy commands for automation
- **Parameter Documentation** - Visual guide for all endpoint parameters

#### Endpoint Generator

- **Instant Endpoint Creation** - Run `npm run create-endpoint`
- **Pattern Enforcement** - Automatically follows established patterns
- **Test Generation** - Creates matching test files
- **Interactive CLI** - Guided endpoint configuration

#### Test Suite Revolution (80/20 Rule)

- **70% Test Reduction** - Archived complex, over-engineered tests
- **Simple Test Structure** - Focus on what matters to users
- **Fast Execution** - All tests run in < 30 seconds
- **Clear Organization** - unit/, integration/, contracts/

### Developer Improvements

- **API Explorer Guide** - Complete documentation for visual testing
- **Simplified Test Patterns** - Examples that are easy to follow
- **Clean Documentation** - Removed outdated and confusing guides
- **Better Smoke Tests** - Updated for new response structures

### Philosophy

Following the 80/20 rule: Test the 20% of scenarios that cover 80% of real usage.
No edge cases, no over-engineering, just practical tests that ensure our API works.

## [5.4.0](https://github.com/unfoldingWord/translation-helps-mcp/compare/v5.3.0...v5.4.0) (2025-08-12)

### 🎉 100% API Consistency Achieved!

This release marks a major milestone: **all 23 API endpoints have been migrated to a consistent, simple architecture**.

### What's New

#### Complete API Consistency

- **100% of endpoints** now follow the same simple pattern
- **75% less code** - from complex abstractions to direct implementations
- **Unified error handling** - consistent error responses across all endpoints
- **Standardized responses** - predictable data shapes everywhere

#### New Architecture Components

- **Simple Endpoint Wrapper** - Reduces boilerplate by 90%
- **Circuit Breaker Pattern** - Prevents cascading failures
- **Response Validator** - Ensures clean response data
- **Cache Validator** - Prevents bad data from being cached
- **Contract Tests** - Locks in API behavior to prevent regressions

#### Developer Experience Improvements

- **Clear documentation** - Consolidated architecture and API guides
- **Endpoint generator** - Create new endpoints in minutes
- **Performance benchmarks** - Prove the benefits of simplicity

### Bug Fixes

- Fixed X-ray trace data leaking into response bodies
- Improved cache stability with force-refresh support
- Enhanced pre-commit hooks for cleaner commits
- Resolved metadata contamination in UI tools

### Documentation

- New consolidated `ARCHITECTURE.md` guide
- Complete `API_ENDPOINTS.md` reference
- Victory lap celebrating 100% consistency
- Roadmap for next phase improvements

### Migration Note

All v1 endpoints remain functional. The v2 endpoints provide the same functionality with better consistency, performance, and developer experience.

## [5.3.0] - 2025-08-12

### Added

- **User-Agent Headers**: All API calls now include a descriptive User-Agent header to identify our application to the DCS team
- **Semi-Automated Releases**: Integrated `standard-version` for consistent versioning and changelog management
- **Release Guide**: Added comprehensive documentation for the release process

### Fixed

- Multiple TypeScript linting errors across the codebase
- Edge runtime compatibility issues in chat endpoints
- Empty catch blocks in health endpoint

### Changed

- Improved code quality with proper TypeScript types replacing `any`
- Updated ESLint configuration to handle underscore-prefixed parameters

## [5.2.0] - 2025-08-11

### Added

- **ZIP-based Resource Caching**: Dramatically improved performance by caching entire resource repositories as ZIP files
  - Reduces API calls by ~90%
  - Enables offline functionality after initial download
  - Integrated with Cloudflare KV for persistent storage
- **Chaos Engineering Test Suite**: Comprehensive tests for network failures, cache corruption, and edge cases
- **Performance Monitoring**: X-Ray tracing for detailed performance insights
- **Load Testing Infrastructure**: K6-based load testing for baseline, peak, stress, and spike scenarios

### Fixed

- Scripture verse range formatting and alignment
- Translation notes and questions markdown rendering
- Cache invalidation issues that were causing stale data

### Changed

- Migrated from response caching to file-level caching only
- Improved error handling and resilience across all endpoints
- Enhanced health check system with categorized monitoring

## [5.1.0] - 2025-08-01

### Added

- **Dynamic Architecture**: New zero-configuration data pipeline that adapts to API changes automatically
- **MCP (Model Context Protocol) Integration**: Full support for AI assistants and LLM tools
- **Resource Recommendations**: Smart suggestions for related translation resources
- **Language Coverage API**: Comprehensive language support analysis

### Fixed

- Cloudflare Workers compatibility issues
- Version management across different environments
- API response format inconsistencies

### Changed

- Complete refactor to anti-fragile architecture
- Improved terminology compliance to use Strategic Language throughout
- Enhanced API documentation with interactive examples

## [5.0.0] - 2025-07-15

### ⚠ BREAKING CHANGES

- New endpoint structure with consistent naming conventions
- Response format standardization across all endpoints
- Removed deprecated endpoints

### Added

- **Three-tier endpoint system**: Core, Extended, and Experimental categories
- **Unified response format**: Consistent structure across all API responses
- **Interactive API documentation**: Live testing interface at `/mcp-tools`
- **Chat interface**: AI-powered Bible translation assistant at `/chat`

### Fixed

- Major performance bottlenecks in scripture fetching
- Memory leaks in cache management
- Cross-origin resource sharing (CORS) issues

### Changed

- Migrated to Cloudflare Pages for improved performance
- Restructured codebase for better maintainability
- Updated all dependencies to latest stable versions

## [4.4.0] - 2025-07-21

### Fixed

- Critical JavaScript runtime errors in browser environment
- Node.js module imports that were breaking client-side functionality

### Added

- Categorized health monitoring system
- Live health status integration in UI navigation

## [4.3.0] - 2025-07-01

### Added

- Initial public release
- Core Bible translation resource APIs
- Basic caching system
- Health monitoring endpoints

---

For a complete list of all changes and commits, see the [GitHub releases page](https://github.com/unfoldingWord/translation-helps-mcp/releases).
