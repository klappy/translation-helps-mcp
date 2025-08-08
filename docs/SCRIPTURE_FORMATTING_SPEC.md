# Scripture Formatting Specification

## Overview

This document specifies how scripture references should be formatted across different output formats (JSON, text, markdown) for various types of scripture requests.

## Supported Reference Types

1. **Single Verse**: `John 3:16`
2. **Verse Range (Continuous)**: `John 3:16-18`
3. **Discontinuous Verses**: `John 3:16,18,20` (planned)
4. **Full Chapter**: `John 3`
5. **Chapter Range**: `John 3-4` (planned)
6. **Multiple Discontinuous Chapters**: `John 3,5` (planned)
7. **Full Book**: `John` (planned)
8. **Cross-Chapter Range**: `John 3:16-4:3` (planned)

## Formatting Rules

### General Principles

1. **Verse Numbers**: Always display verse numbers when showing more than one verse
2. **Consistency**: Use the same formatting pattern across all multi-verse scenarios
3. **Clarity**: Make it obvious where verses start and end
4. **Citations**: Always include proper citations with reference, resource, organization, and version

### Markdown Format Rules

#### Single Verse

- No verse number prefix needed
- Text flows naturally
- Citation immediately follows text

```markdown
## UST

For God so loved the world...

> — John 3:16 UST (unfoldingWord v86)
```

#### Multiple Verses (Any Type)

- Every verse starts with its number
- Format: `{verse}. {text}`
- One blank line between verses for readability
- Citation shows the full range

```markdown
## UST

16. For God so loved the world...

17. For God did not send...

18. The one believing in him...
    > — John 3:16-18 UST (unfoldingWord v86)
```

#### Full Chapter

- Every verse numbered
- Format: `{verse}. {text}`
- Double line break between verses
- Citation shows chapter reference

```markdown
## UST

1. Now there was a man...

2. He visited Jesus at night...

3. Jesus replied to Nicodemus...
   > — John 3 UST (unfoldingWord v86)
```

#### Cross-Chapter References (Planned)

- Include chapter number in verse prefix
- Format: `{chapter}:{verse}. {text}`
- Clear chapter transitions

```markdown
## UST

3:16. For God so loved the world...

3:17. For God did not send...

4:1. When Jesus learned...

4:2. (Although Jesus himself...

4:3. He left Judea...

> — John 3:16-4:3 UST (unfoldingWord v86)
```

### Text Format Rules

Similar to markdown but without headers:

- Single verse: just text with inline citation
- Multiple verses: numbered with single line breaks
- Citation format: `-{reference} ({resource}, {organization} {version})`

### JSON Format Rules

Maintain current structure with:

- `resources` array containing all translations
- Each resource object has verse numbers embedded in text for multi-verse
- Metadata includes range information

## Implementation Status

✅ Implemented:

- Single verse
- Continuous verse ranges
- Full chapters

🔄 Planned:

- Discontinuous verses
- Chapter ranges
- Multiple discontinuous chapters
- Full books
- Cross-chapter ranges

## Technical Notes

- Verse extraction handled in `ZipResourceFetcher2.extractVerseFromUSFM()`
- Formatting applied in `RouteGenerator.formatMarkdownResponse()` and `formatTextResponse()`
- Reference parsing in `referenceParser.ts` needs updates for discontinuous references
