# Agents Reference

This document provides a detailed reference for each specialist agent in the Translation Helps MCP multi-agent system.

**Last Updated:** December 2025  
**Version:** 7.19.29

## Overview

The system includes 6 specialist agents and a QA validator, each focused on a single type of translation resource:

| Agent           | MCP Tool                      | Purpose                             |
| --------------- | ----------------------------- | ----------------------------------- |
| Scripture Agent | `fetch_scripture`             | Bible text in various translations  |
| Notes Agent     | `fetch_translation_notes`     | Verse-by-verse translation guidance |
| Words Agent     | `fetch_translation_word`      | Biblical term definitions           |
| Academy Agent   | `fetch_translation_academy`   | Translation concept articles        |
| Questions Agent | `fetch_translation_questions` | Comprehension questions             |
| Search Agent    | `search_biblical_resources`   | Semantic search across all          |
| QA Validator    | Multiple                      | Citation verification               |

---

## Scripture Agent

### Purpose

Fetches Bible text in various translations including ULT (literal) and UST (simplified).

### File Location

`ui/src/lib/ai/agents/scripture-agent.ts`

### MCP Tool

`fetch_scripture`

### Parameters

| Parameter             | Required | Default | Description                         |
| --------------------- | -------- | ------- | ----------------------------------- |
| `reference`           | Yes      | -       | Bible reference (e.g., "John 3:16") |
| `format`              | Yes      | -       | Always use "md" for markdown        |
| `resource`            | No       | "all"   | "ult", "ust", or "all"              |
| `includeVerseNumbers` | No       | true    | Include verse numbers               |
| `language`            | No       | "en"    | Language code                       |

### Capabilities

- **ULT**: Unfoldingword Literal Text - word-for-word translation
- **UST**: Unfoldingword Simplified Text - meaning-based translation
- Verse ranges and full chapters
- Multiple languages

### Example Task

"Fetch John 3:16 in ULT and UST"

### Example Tool Call

```json
{
  "reference": "John 3:16",
  "format": "md",
  "resource": "all"
}
```

### Common Failures

- **404 Not Found**: Book name misspelled or translation unavailable
- **Empty response**: Reference out of range (e.g., "Jude 2" doesn't exist)

---

## Notes Agent

### Purpose

Fetches verse-by-verse translation guidance from Translation Notes.

### File Location

`ui/src/lib/ai/agents/notes-agent.ts`

### MCP Tool

`fetch_translation_notes`

### Parameters

| Parameter        | Required | Default | Description                           |
| ---------------- | -------- | ------- | ------------------------------------- |
| `reference`      | Yes      | -       | Bible reference                       |
| `format`         | Yes      | -       | Always use "md"                       |
| `language`       | No       | "en"    | Language code                         |
| `includeIntro`   | No       | true    | Include book/chapter introductions    |
| `includeContext` | No       | true    | Include notes from surrounding verses |

### Capabilities

- Verse-level translation notes
- Quote and explanation pairs
- Book and chapter introductions
- Context from surrounding verses

### Note Types

- **Figures of Speech**: Metaphors, idioms, rhetorical questions
- **Cultural Context**: Historical background, customs
- **Grammar**: Verb tenses, pronouns, sentence structure
- **Theology**: Key doctrinal concepts

### Example Task

"Get translation notes for Romans 8:1-4"

### Example Tool Call

```json
{
  "reference": "Romans 8:1-4",
  "format": "md",
  "language": "en",
  "includeIntro": true
}
```

---

## Words Agent

### Purpose

Fetches definitions for biblical terms, names, and places from Translation Words.

### File Location

`ui/src/lib/ai/agents/words-agent.ts`

### MCP Tool

`fetch_translation_word`

### Parameters

| Parameter   | Required  | Description                                     |
| ----------- | --------- | ----------------------------------------------- |
| `term`      | Preferred | English term to look up (e.g., "love")          |
| `format`    | Yes       | Always use "md"                                 |
| `path`      | Optional  | Exact file path (e.g., "bible/kt/grace.md")     |
| `rcLink`    | Optional  | RC link (e.g., "rc://\*/tw/dict/bible/kt/love") |
| `reference` | Optional  | Get words linked to a verse                     |

### Categories

- **kt (Key Terms)**: Theological concepts - grace, faith, salvation, covenant
- **names**: People and places - Abraham, Jerusalem, Moses, Israel
- **other**: Common terms - bread, water, house

### Language Limitation

Translation Words uses **English terms only**. Greek/Hebrew terms must be translated:

| Original | Search For             |
| -------- | ---------------------- |
| agape    | love                   |
| hesed    | covenant, faithfulness |
| logos    | word                   |
| pneuma   | spirit                 |
| sarx     | flesh                  |
| kardia   | heart                  |

### Example Task

"Get the definition for 'covenant'"

### Example Tool Call

```json
{
  "term": "covenant",
  "format": "md"
}
```

---

## Academy Agent

### Purpose

Fetches training articles about translation concepts and techniques from Translation Academy.

### File Location

`ui/src/lib/ai/agents/academy-agent.ts`

### MCP Tool

`fetch_translation_academy`

### Parameters

| Parameter  | Required | Default | Description       |
| ---------- | -------- | ------- | ----------------- |
| `moduleId` | Yes      | -       | Academy module ID |
| `format`   | Yes      | -       | Always use "md"   |
| `language` | No       | "en"    | Language code     |

### Known Module IDs

**Figures of Speech (figs-):**

- `figs-metaphor` - Metaphors, comparisons
- `figs-simile` - Similes, "like" or "as" comparisons
- `figs-idiom` - Idioms, expressions
- `figs-rquestion` - Rhetorical questions
- `figs-personification` - Personification
- `figs-parallelism` - Parallelism
- `figs-metonymy` - Metonymy
- `figs-explicit` - Making implicit explicit
- `figs-ellipsis` - Ellipsis, omitted words
- `figs-hyperbole` - Hyperbole, exaggeration
- `figs-irony` - Irony, sarcasm
- `figs-litotes` - Litotes, understatement
- `figs-euphemism` - Euphemism
- `figs-merism` - Merism
- `figs-doublet` - Doublets, paired words
- `figs-activepassive` - Active/passive voice
- `figs-abstractnouns` - Abstract nouns
- `figs-possession` - Possession relationships

**Writing Styles (writing-):**

- `writing-poetry` - Poetry
- `writing-proverbs` - Proverbs
- `writing-apocalypticwriting` - Apocalyptic

**Grammar (grammar-):**

- `grammar-connect-logic-result` - Result clauses
- `grammar-connect-logic-goal` - Purpose clauses
- `grammar-connect-condition-fact` - Conditional: fact
- `grammar-connect-condition-hypothetical` - Conditional: hypothetical
- `grammar-connect-time-simultaneous` - Simultaneous time
- `grammar-connect-time-sequential` - Sequential time

**Guidelines:**

- `guidelines-sonofgodprinciples` - Son of God translation
- `guidelines-authoritative` - Authoritative sources

### Example Task

"Fetch the article on figs-metaphor"

### Example Tool Call

```json
{
  "moduleId": "figs-metaphor",
  "format": "md"
}
```

---

## Questions Agent

### Purpose

Fetches comprehension questions that help verify understanding of passages.

### File Location

`ui/src/lib/ai/agents/questions-agent.ts`

### MCP Tool

`fetch_translation_questions`

### Parameters

| Parameter   | Required | Default | Description     |
| ----------- | -------- | ------- | --------------- |
| `reference` | Yes      | -       | Bible reference |
| `format`    | Yes      | -       | Always use "md" |
| `language`  | No       | "en"    | Language code   |

### Capabilities

- Verse-level comprehension questions
- Answer guidance
- Full chapter coverage

### Use Cases

- Verify understanding before translating
- Prepare teaching or study materials
- Check comprehension of complex passages

### Example Task

"Get comprehension questions for Genesis 1"

### Example Tool Call

```json
{
  "reference": "Genesis 1",
  "format": "md",
  "language": "en"
}
```

---

## Search Agent

### Purpose

Performs semantic search across all translation resources for exploratory queries.

### File Location

`ui/src/lib/ai/agents/search-agent.ts`

### MCP Tool

`search_biblical_resources`

### Parameters

| Parameter      | Required | Default | Description                   |
| -------------- | -------- | ------- | ----------------------------- |
| `query`        | Yes      | -       | Natural language search query |
| `format`       | Yes      | -       | Always use "md"               |
| `reference`    | No       | -       | Filter to specific passage    |
| `language`     | No       | "en"    | Language code                 |
| `limit`        | No       | 50      | Maximum results               |
| `includeHelps` | No       | true    | Include notes/words/academy   |

### When to Use

- Exploratory questions: "What does the Bible say about..."
- Finding related content: "passages about forgiveness"
- Unknown location: "where is X mentioned"
- Broad topics: "faith in Hebrews"

### Search Tips

- Use specific keywords: "eternal life" better than "living forever"
- Combine with reference for focused results
- Use biblical terminology for better matches
- Higher relevance scores indicate better matches

### Result Types

- Scripture matches (Bible text)
- Translation Notes (verse explanations)
- Translation Words articles (term definitions)
- Translation Academy modules (translation concepts)

### Example Task

"Search for 'eternal life' in all resources"

### Example Tool Call

```json
{
  "query": "eternal life",
  "format": "md"
}
```

---

## QA Validator

### Purpose

Verifies citations in synthesized responses by re-fetching source content.

### File Location

`ui/src/lib/ai/agents/qa-validator.ts`

### How It Works

1. Collects citations from agent responses
2. Re-fetches each resource to verify content exists
3. Annotates citations with verification status
4. Reports validation summary

### Verification Status

| Status    | Emoji | Meaning                   |
| --------- | ----- | ------------------------- |
| Verified  | ✅    | Source confirmed to exist |
| Uncertain | ⏳    | Could not fully verify    |
| Invalid   | ❌    | Source not found          |

### Resource Type Mappings

| Citation Type         | MCP Tool                      |
| --------------------- | ----------------------------- |
| Scripture, ULT, UST   | `fetch_scripture`             |
| Translation Words     | `fetch_translation_word`      |
| Translation Academy   | `fetch_translation_academy`   |
| Translation Notes     | `fetch_translation_notes`     |
| Translation Questions | `fetch_translation_questions` |

### Example Validation Output

```markdown
**Citations:**
[1] [[John 3:16|ULT]] ✅
[2] [[love|Translation Words]] ✅
[3] [[figs-metaphor|Translation Academy]] ⏳

**Validation Summary:**

- 2 verified
- 1 uncertain
- 0 invalid
```

---

## Common Patterns

### All Agents Must

1. Always include `format: "md"` for markdown output
2. Include `language: "en"` when applicable
3. Handle tool call failures gracefully
4. Return structured citations for synthesis

### Citation Format

All agents extract citations in this format:

```typescript
interface Citation {
  source: string; // Resource type
  reference?: string; // Bible ref or article name
  content: string; // Preview of content
}
```

### Error Handling

When tools fail, agents:

1. Log error with context
2. Return empty findings with error message
3. Set `success: false` in response
4. Allow synthesis to proceed with available data

## Related Documentation

- [Multi-Agent Orchestration](./MULTI_AGENT_ORCHESTRATION.md) - System overview
- [AI Chat Architecture](./AI_CHAT_ARCHITECTURE.md) - Architecture details
- [API Endpoints](./API_ENDPOINTS.md) - Underlying API reference
