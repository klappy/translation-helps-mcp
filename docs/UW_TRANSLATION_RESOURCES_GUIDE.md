# unfoldingWord Translation Resources: Developer Guide

This document provides comprehensive technical documentation for developers building scripture translation, review, and quality assurance tools that work with unfoldingWord's Bible translation resources. These resources form an interconnected ecosystem designed to support accurate, clear, and natural Bible translation worldwide.

## Table of Contents

1. [Overview](#overview)
2. [Resource Ecosystem Concepts](#resource-ecosystem-concepts)
3. [Resource Relationships and Workflow](#resource-relationships-and-workflow)
4. [Getting Started with Integration](#getting-started-with-integration)
5. [Technical Specifications](#technical-specifications)
6. [Resource Container Architecture](#resource-container-architecture)
7. [Resource Linking System](#resource-linking-system)
8. [Integration Patterns and APIs](#integration-patterns-and-apis)
9. [Implementation Guidelines](#implementation-guidelines)
10. [Advanced Topics and Extensibility](#advanced-topics-and-extensibility)
11. [Further Reading and Resources](#further-reading-and-resources)

## Overview

### Mission and Philosophy

unfoldingWord translation resources are developed under Creative Commons Attribution-ShareAlike 4.0 licenses to provide the global church with high-quality, interconnected Bible translation tools. The ecosystem serves **Mother Tongue Translators (MTTs)** who use **Strategic Languages** as their bridge to translate Scripture into their **heart languages**.

### Key Definitions

**Strategic Languages**: Strategic languages (such as English, Spanish, French, Portuguese, Hindi) that serve as intermediary bridges between the original biblical languages (Hebrew, Greek, Aramaic) and target heart languages. Strategic Languages are major languages that Mother Tongue Translators can understand and use as a foundation for translating Scripture into their native languages.

**Mother Tongue Translators (MTTs)**: Translators who are native speakers of the target language and are working to translate Scripture into their own heart language - the language they know best and speak most naturally.

**Heart Languages**: The native languages that Mother Tongue Translators speak most naturally and are translating Scripture into. These are the target languages for the final Bible translations that will serve local communities.

### Translation Challenges: A Real-World Scenario

To understand why the unfoldingWord resource ecosystem exists, consider this common translation scenario:

**The Challenge**: A team of Mother Tongue Translators in a remote region is working to translate the book of Romans into their heart language. They're using a popular commercial Bible translation in Spanish (their Strategic Language) as their primary source, along with basic study helps.

**Problem 1 - Hidden Cultural Adaptations**: In Romans 1:1, their Spanish Bible translates Paul's description of himself as "siervo" (servant), which feels natural and appropriate in Spanish. However, they don't realize that the original Greek word "δοῦλος" (doulos) actually means "slave" - a much stronger concept that implies complete ownership and submission. The Spanish translation adapted this for cultural comfort, but in the translators' culture, the concept of slavery might actually communicate Paul's intended meaning more accurately than the softened "servant." Without access to the original language, they miss this opportunity for a more precise translation.

**Problem 2 - Metaphor Translation Barriers**: When they reach Romans 3:25, they encounter the phrase "propitiation through his blood." This theological metaphor combines ancient Jewish sacrificial concepts with legal terminology that has no direct equivalent in their culture. They spend days trying to understand what "propitiation" means and how blood relates to forgiveness in their worldview. Without cultural and linguistic guidance, they struggle to find meaningful expressions in their language.

**Problem 3 - Consultant Dependency**: As these difficult passages accumulate, the translation team must wait weeks or months or years for a visiting consultant to help them understand the meaning and suggest translation approaches. This creates frustrating delays and leaves team members feeling uncertain about their translation decisions. The consultant, while helpful, may not fully understand their cultural context and might suggest solutions that don't work naturally in their language.

**Problem 4 - Inconsistent Terminology**: The team encounters the word "covenant" throughout Romans but translates it differently each time because they don't have a systematic understanding of how this theological concept appears across the entire Bible. Without comprehensive terminology guidance, their translation lacks the conceptual consistency that helps readers understand biblical themes.

**How the unfoldingWord Ecosystem Helps**: These resources work together to address each of these common challenges:

- **Literal Text (ULT/GLT)** provides a form-centric rendering that preserves the structure and wording of the original text, showing exactly what the Greek says about Paul being a "slave" rather than a softened "servant"
- **Simplified Text (UST/GST)** demonstrates how to express complex concepts such as "propitiation" in clear, natural language that can guide culturally appropriate translation approaches
- **Translation Notes** provide specific guidance for passages such as Romans 3:25, explaining the cultural and theological background needed for accurate translation
- **Translation Words** articles give comprehensive definitions of key terms like "covenant" and "propitiation," showing how they're used consistently throughout Scripture
- **Translation Academy** articles teach general principles for translating metaphors, cultural concepts, and theological terminology
- **Translation Questions** help the team verify that their translation effectively communicates the intended meaning to their community

Instead of waiting for consultant visits, the translation team has immediate access to expert guidance precisely targeted to the original language words they're translating. Importantly, they don't need to learn Greek or Hebrew themselves - the combination of Literal Text (showing original structure), Simplified Text (demonstrating clear meaning), and Translation Notes (explaining context) gives them access to original language insights through their Strategic Language. They can make informed decisions about how closely to follow their Strategic Language source versus returning to the original meaning, and they can translate complex concepts with confidence using proven methodologies.

This scenario illustrates why disconnected resources create translation bottlenecks, while an integrated ecosystem enables Mother Tongue Translators to work efficiently and accurately with expert-level understanding of the original text, all accessible through their Strategic Language.

### Resource Ecosystem Architecture

The translation resource ecosystem consists of three foundational layers:

1. **Source Texts**: Original language texts (Hebrew, Greek, Aramaic) with modern Strategic Language translations
2. **Alignment Layer**: Precise word-level connections between original and Strategic Languages
3. **Support Resources**: Contextual guidance, definitions, methodology, and quality assurance tools

### Key Design Principles

- **Interconnectedness**: All resources link together through standardized reference systems
- **Precision**: Word-level alignment enables exact targeting of translation guidance
- **Extensibility**: Resource Container specification allows new resource creation
- **Multilingual**: Strategic Language organizations can create parallel resource sets
- **Open Access**: Creative Commons licensing ensures global accessibility

## Resource Ecosystem Concepts

This section provides developers with a comprehensive understanding of what the various resource contains, why translation teams need them, and how they work together. Understanding these concepts is essential before diving into technical implementation details.

### Foundation Resources

These resources provide the structural framework for all translation work:

#### **Versification**

**What it contains**: The canonical chapter and verse structure for all 66 books of the Protestant Bible canon.

**Purpose**: Establishes a consistent reference system that all other resources use to coordinate with each other. When you look at Genesis 1:1, every resource knows exactly which verse you're referencing.

**Why translators need it**: Enables precise navigation and ensures that notes, word definitions, and questions all align to the correct Scripture passages.

#### **Original Language Texts**

**What they contain**:

- **Hebrew Bible (UHB)**: The complete Old Testament in Hebrew and Aramaic
- **Greek New Testament (UGNT)**: The complete New Testament in Koine Greek

**Purpose**: Provide the authoritative source texts that all translations should ultimately derive from.

**Why translators need them**: These are the "measuring stick" against which all translations are evaluated for accuracy and faithfulness.

### Strategic Language Translation Texts

These are complete Bible translations in Strategic Languages (such as English, Spanish, French) that serve as bridges for mother tongue translators:

#### **Literal Text (ULT/GLT)**

**What it contains**: A complete Bible translation that follows a form-centric approach, preserving the structures of the original Hebrew and Greek texts while remaining understandable in the Strategic Language.

**Purpose**: Shows translators exactly what the original text says by retaining, as much as possible, original-language word order, grammatical forms, idioms, and figures of speech.

**Why translators need it**: Provides access to the structural patterns and specific forms used in the original languages, helping translators understand how the biblical authors expressed their thoughts and enabling them to make informed decisions about how to render these forms in their target languages.

#### **Simplified Text (UST/GST)**

**What it contains**: A complete Bible translation that follows a meaning-based approach, prioritizing clear, natural communication of biblical concepts using plain language and general expressions.

**Purpose**: Demonstrates how to express the meaning of the original text in natural, understandable language that communicates effectively to modern readers.

**Why translators need it**: Provides a model for meaning-based translation, showing how to communicate biblical concepts clearly and naturally while maintaining the essential meaning of the original text.

#### **Word Alignment Data**

**What it contains**: Precise connections showing exactly which words in the Strategic Language translate which words in Hebrew/Aramaic/Greek.

**Purpose**: Creates a bridge between the original languages and Strategic Language translations at the individual word level.

**Why translators need it**: Enables translation tools to show exactly which Hebrew or Greek word a translator is working on, and to highlight relevant notes and definitions for that specific word.

### Supporting Resources

These supporting resources provide contextual guidance, definitions, methodology, and quality assurance tools that work together with the core translation texts. These resources follow standardized formats and linking mechanisms to enable precise integration with translation applications.

#### **Translation Notes (tN)**

**What they contain**: Verse-by-verse explanations for difficult, ambiguous, or culturally complex passages throughout the Bible that require special attention for accurate translation.

**Purpose**: Provide specific guidance for translating challenging passages, including alternative translation options, cultural background, theological clarifications, and explanations of figures of speech or grammatical constructions.

**Why translators need them**: Many passages in Scripture require specialized knowledge about language, culture, or context to translate accurately. These notes provide that expertise in a practical format that can be adapted for different Strategic Languages.

**Example**: For a metaphor such as "God is my rock," a note would explain that this refers to God as a source of protection and stability, not a literal stone.

#### **Translation Words (tW)**

**What they contain**: Comprehensive definitions and explanations of key biblical, theological, and cultural terms that appear throughout Scripture, focusing on how these words are used in the Bible rather than providing modern dictionary definitions.

**Purpose**: Ensure translators understand important biblical concepts consistently across the entire Bible, providing biblical context for terms that may not be used in everyday life or may have different meanings in modern usage.

**Why translators need them**: Many biblical terms such as "covenant," "righteousness," or "Sabbath" carry specific biblical meanings that differ from modern usage and must be translated consistently throughout Scripture to preserve the integrity of biblical concepts.

**Example**: The entry for "covenant" explains the biblical concept of formal agreements between God and people, with examples from throughout Scripture.

#### Content Categories

- **Key Terms (`/bible/kt/`)**: Central theological concepts (God, salvation, covenant, righteousness)
- **Names (`/bible/names/`)**: People, places, and proper nouns (Abraham, Jerusalem, Pharaoh)
- **Other Terms (`/bible/other/`)**: Cultural, historical, and general concepts (Sabbath, temple, sacrifice)

#### **Translation Words Links (tWL)**

**unfoldingWord® Translation Words Links** - Precise mapping connecting specific original language word occurrences to Translation Words definitions. **tWL serves as the essential bridge between specific verses and Translation Words articles**, enabling translators to discover exactly which theological terms in any given verse need explanation.

#### Technical Specifications

- **Format**: TSV files, one per book
- **Naming**: `twl_[BOOK].tsv` (e.g., `twl_GEN.tsv`)
- **Repository**: [unfoldingWord Translation Words Links](https://git.door43.org/unfoldingWord/en_twl)
- **License**: Creative Commons Attribution-ShareAlike 4.0

#### TSV Column Structure

| Reference | ID   | Tags | OrigWords | Occurrence | TWLink                       |
| --------- | ---- | ---- | --------- | ---------- | ---------------------------- |
| 1:3       | xyz9 | kt   | אֱלֹהִים  | 1          | rc://en/tw/dict/bible/kt/god |

**Column Definitions**:

- **Reference**: Chapter:verse where term occurs
- **ID**: Four-character unique identifier
- **Tags**: Term category (kt, names, other)
- **OrigWords**: Original language word(s)
- **Occurrence**: Which occurrence of the original word
- **TWLink**: Link to Translation Words article

### 8. Translation Questions (TQ)

**unfoldingWord® Translation Questions** - Comprehensive questions enabling translators to verify their translation communicates intended meaning clearly.

#### Technical Specifications

- **Format**: TSV files, one per book
- **Discovery**: Dynamic via catalog API + ingredients pattern (no hardcoded file names)
- **Repository**: [unfoldingWord Translation Questions](https://git.door43.org/unfoldingword/en_tq)
- **License**: Creative Commons Attribution-ShareAlike 4.0

> **Note**: As of v4.4.3, the Translation Helps MCP uses the catalog API and resource ingredients to dynamically discover translation question files, eliminating the need for hardcoded file naming conventions like `tq_[BOOK].tsv`. This makes the system more resilient to upstream resource organization changes.

#### TSV Column Structure

| Reference | ID   | Tags | Quote | Occurrence | Question                     | Response                     |
| --------- | ---- | ---- | ----- | ---------- | ---------------------------- | ---------------------------- |
| 1:3       | swi9 |      |       |            | What does Paul call himself? | Paul calls himself a servant |

The quote and occurrence columns are not used in translation questions.

#### Purpose and Usage

- **Translation Verification**: Confirm translated meaning matches original intent
- **Comprehension Testing**: Verify target language speakers understand translation
- **Quality Assurance**: Systematic checking of translation accuracy
- **Training Tool**: Help translators understand key concepts

### 9. Translation Academy (TA)

**unfoldingWord® Translation Academy** - Comprehensive training materials providing theoretical foundation and practical guidance for Bible translation.

#### Technical Specifications

- **Format**: Markdown articles in hierarchical structure
- **Organization**: `/translate/`, `/checking/`, `/process/` categories
- **Repository**: [unfoldingWord Translation Academy](https://git.door43.org/unfoldingWord/en_ta)
- **License**: Creative Commons Attribution-ShareAlike 4.0

#### Content Categories

- **Translation Principles**: Fundamental translation theory concepts
- **Translation Methods**: Specific techniques for different text types
- **Cultural Issues**: Cross-cultural communication guidance
- **Quality Assurance**: Standards and checking processes

#### Article Structure

```markdown
# Translate Unknowns

## Description

This page answers the question: How do I translate words that I don't understand?

## Translation Principles

When translators encounter unknown words...

## Examples

Here are examples of how to handle unknown words...

## Translation Strategies

If the word is not known, here are strategies...
```

## Resource Container Architecture

### Technical Foundation

All unfoldingWord resources follow the [Resource Container (RC) specification](https://resource-container.readthedocs.io/en/latest/), providing standardized structure, metadata, and linking mechanisms.

### RC Directory Structure

```
en_resource_name/
├── .apps/                      # Application metadata
├── LICENSE.md                  # License information
├── manifest.yaml              # RC manifest file
├── media.yaml                 # Media definitions (optional)
└── content/                   # Project content directory
    ├── config.yaml            # Project configuration
    ├── 01-GEN.usfm           # Genesis content
    └── 40-MAT.usfm           # Matthew content
```

### RC Container Types

#### 1. Bundle (`bundle`)

Flat directory structure for USFM collections:

```
en_ult/
├── manifest.yaml
├── 01-GEN.usfm               # Direct file access
└── 40-MAT.usfm
```

#### 2. Help (`help`)

Supplemental content like Translation Notes (flat structure):

```
en_tn/
├── manifest.yaml
├── tn_GEN.tsv
├── tn_EXO.tsv
├── tn_MAT.tsv
└── tn_REV.tsv
```

#### 3. Dictionary (`dict`)

Term definitions like Translation Words:

```
en_tw/
├── manifest.yaml
└── content/
    ├── aaron.md
    ├── god.md
    └── moses.md
```

#### 4. Manual (`man`)

Instructional content like Translation Academy:

```
en_ta/
├── manifest.yaml
└── content/
    ├── translate-unknowns/
    │   └── 01.md
    └── checking-level-one/
        └── 01.md
```

#### 5. Book (`book`)

Chapter/chunk structured content:

```
en_obs/
├── manifest.yaml
└── content/
    ├── 01/                   # Chapter directories
    │   ├── 01.md            # Chunk files
    │   └── 02.md
    └── 02/
        └── 01.md
```

### Manifest File Structure

Every RC includes a `manifest.yaml` following [Dublin Core standards](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/):

```yaml
dublin_core:
  conformsto: "rc0.2"
  contributor: []
  creator: "unfoldingWord"
  description: "Literal translation for Bible translators"
  format: "text/usfm"
  identifier: "ult"
  issued: "2024-01-01"
  language:
    identifier: "en"
    title: "English"
    direction: "ltr"
  modified: "2024-01-01T12:00:00-00:00"
  publisher: "unfoldingWord"
  relation:
    - "en/tn"
    - "en/tw"
    - "hbo/uhb"
    - "el-x-koine/ugnt"
  rights: "CC BY-SA 4.0"
  source:
    - identifier: "uhb"
      language: "hbo"
      version: "2.1.30"
  subject: "Bible"
  title: "unfoldingWord Literal Text"
  type: "bundle"
  version: "85"

checking:
  checking_entity: ["unfoldingWord"]
  checking_level: "3"

projects:
  - categories: ["bible-ot"]
    identifier: "gen"
    path: "./01-GEN.usfm"
    sort: 1
    title: "Genesis"
    versification: "kjv"
```

## Resource Linking System

### RC Link Structure

The [RC Linking specification](https://resource-container.readthedocs.io/en/latest/) defines standardized URIs for cross-resource navigation:

```
rc://language/resource/type/project/chapter/chunk
```

### Link Examples by Resource Type

```
# Translation texts
rc://en/ult/book/gen/01/02        # ULT/GLT Genesis 1:2
rc://en/ust/book/mat/05/01        # UST/GST Matthew 5:1

# Translation Notes
rc://en/tn/help/gen/01/02         # Translation Note for Genesis 1:2

# Translation Words
rc://en/tw/dict/bible/kt/god      # Translation Words entry for "god"

# Translation Academy
rc://en/ta/man/translate/translate-unknowns    # TA module
```

### Wildcard Support

```
rc://en/ult/book/*                # Any book in English ULT/GLT
rc://*/ult/book/gen               # Genesis in ULT/GLT in any language (Default)
rc://en/*/book/gen/01/01          # Genesis 1:1 in any English translation
```

Language wildcards in RC links are commonly used for language codes (e.g. `rc://*/ult/book/gen`) because they allow applications to dynamically resolve the appropriate language based on user preferences and settings. Rather than hardcoding specific language codes, using wildcards enables the same RC link structure to work across multiple languages. The application's language selection feature determines which language resources to load when resolving these wildcarded links. This pattern promotes resource reusability and simplifies multilingual support.

### Link Resolution Process

1. **Locate Resource Container**: Find RC directory matching language/resource
2. **Navigate to Project**: Use manifest to locate project content
3. **Resolve Chapter/Chunk**: Navigate to specific content location

### Practical Usage Examples

#### Translation Notes TSV

```tsv
Reference ID SupportReference Quote Note
1:1 tn001 rc://en/ta/man/translate/translate-names Παῦλος Paul is the name of a man
1:1 tn002 rc://en/tw/dict/bible/other/servant δοῦλος Paul calls himself a servant
```

#### Cross-References to other resources (commonly translationAcademy and translationWords articles)

```markdown
For more information, see [Translate Names](rc://en/ta/man/translate/translate-names).
```

## Integration Patterns and APIs

This section covers practical API usage, authentication methods, and multi-platform integration strategies that developers need for robust resource access and application deployment across different hosting environments.

### Hosting Infrastructure: Git-Based Platforms

While the primary hosting is **Door43 Content Service (DCS)**, applications should support multiple hosting platforms:

#### Primary Platform: Door43 Content Service

- **Platform**: `https://git.door43.org/`
- **Technology**: Gitea-based Git platform with Door43 extensions
- **API Access**: REST API for programmatic access
- **Version Control**: Full Git history and branching
- **Catalog API**: Extended endpoints for resource discovery and organization

#### Alternative Hosting Considerations

IT is expected that applications would be designed to work with other git-based hosting platforms that host resource containers:

- **Door43 Clones**: Mirror instances of the main DCS platform
- **Other Gitea Instances**: Self-hosted Gitea platforms with unfoldingWord resources

In an online environment, Door43 clones are the easiest to support since they would include the custom API endpoints that Door43 uses to manage resources in the Door43 Catalog. With Gitea instances as the second best option. Since DCS itself is a Gitea instance, they share most of the same API endpoints.

Other git-based hosting platforms that would be more challenging to support:

- **Local Repositories**: Offline or network-isolated environments
- **Generic Git Platforms**: GitHub, GitLab, or other Git-based hosting
- **Custom Servers**: Organization-specific hosting solutions

### API Documentation and Access

#### Door43 API Overview

Door43 extends the standard Gitea API with specialized endpoints for Bible translation resources. The API provides both standard Git repository access and enhanced catalog functionality for resource discovery.

**API Documentation**:

- **Swagger UI**: [https://git.door43.org/api/swagger](https://git.door43.org/api/swagger)
- **OpenAPI Specification**: [https://git.door43.org/swagger.v1.json](https://git.door43.org/swagger.v1.json)
- **Base URL**: `https://git.door43.org/api/v1`
- **Platform Information**: [Door43 About Page](https://git.door43.org/about)

#### Standard Gitea API Endpoints

```javascript
// Repository access
GET / api / v1 / repos / { owner } / { repo }; // Repository metadata
GET / api / v1 / repos / { owner } / { repo } / contents / { path }; // File contents
GET / api / v1 / repos / { owner } / { repo } / releases; // Release information
GET / api / v1 / repos / { owner } / { repo } / tags; // Version tags

// Organization and user endpoints
GET / api / v1 / orgs / { org } / repos; // Organization repositories
GET / api / v1 / users / { username } / repos; // User repositories
```

#### Door43 Catalog API Extensions

The Catalog API provides enhanced resource discovery and organization capabilities, by default the catalog is filtered to only show resources that are in the production stage.

```javascript
// Catalog endpoints for resource discovery
GET /api/v1/catalog/list                            // List all catalog entries
GET /api/v1/catalog/search                          // Search catalog entries
GET /api/v1/catalog/latest                          // Latest released resources

// Resource organization by metadata
GET /api/v1/catalog/list?subject=Bible              // Filter by subject
GET /api/v1/catalog/list?resource=ult               // Filter by resource type
GET /api/v1/catalog/list?lang=en                    // Filter by language
GET /api/v1/catalog/list?stage=prod                 // Filter by release stage
```

#### Catalog Entry Structure

Catalog entries provide rich metadata for resource discovery:

```typescript
interface CatalogEntry {
  id: string; // Unique identifier
  url: string; // Repository URL
  name: string; // Resource name
  owner: string; // Owner/organization
  full_name: string; // Full repository name
  title: string; // Human-readable title
  description: string; // Resource description
  language: {
    identifier: string; // Language code (e.g., "en")
    title: string; // Language name (e.g., "English")
    direction: string; // Text direction ("ltr" or "rtl")
  };
  subject: string; // Content subject (e.g., "Bible")
  resource: {
    identifier: string; // Resource type (e.g., "ult", "tn")
    title: string; // Resource title
  };
  format: string; // Content format (e.g., "text/usfm")
  stage: string; // Release stage ("prod", "preprod", "draft")
  checking_level: string; // Quality level ("1", "2", "3")
  version: string; // Version number
  released: string; // Release date (ISO 8601)
  zipball_url: string; // Download URL for ZIP archive
  tarball_url: string; // Download URL for TAR archive
  metadata_url: string; // Direct manifest.yaml URL
  metadata_json_url: string; // JSON-formatted metadata URL
}
```

#### TypeScript Interface Generation

The OpenAPI specification can be used to generate TypeScript interfaces:

```bash
# Install OpenAPI TypeScript generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript interfaces
openapi-generator-cli generate \
  -i https://git.door43.org/swagger.v1.json \
  -g typescript-fetch \
  -o ./src/api/door43
```

#### Common Integration Patterns

**1. Resource Discovery Process**:
Applications should query the catalog API to find available resources by language and type:

- Filter catalog entries by language (`lang=en`) and resource type (`resource=ult`)
- Include stage filter (`stage=prod`) to get production-ready resources only
- Sort results by release date to identify the most recent version
- Handle cases where no resources are found for a given language/type combination

**2. Resource Download Process**:
Applications can obtain resource content through multiple methods:

- **ZIP Download**: Use the `zipball_url` from catalog entries for complete resource packages
- **Direct File Access**: Access individual files through repository API endpoints
- **Manifest Access**: Retrieve metadata through `metadata_json_url` for resource information
- **Incremental Loading**: Download only needed books or sections rather than entire resources

**3. Multi-Language Resource Discovery**:
To find available languages for a specific resource type:

- Query catalog without language filter to get all available implementations
- Extract unique language identifiers from the results
- Group resources by language to understand completeness
- Identify which languages have full resource ecosystems

**4. Strategic Language Ecosystem Assessment**:
To identify complete Strategic Language implementations:

- Define core resource requirements (`ult`, `ust`, `tn`, `tw`, `twl`, `ta`)
- Query catalog for all production resources across languages
- Group catalog entries by language identifier
- Filter languages that have all required resource types available
- Prioritize languages with recent updates and high checking levels

#### Authentication and Rate Limiting Considerations

**Authentication Requirements:**

- Most public resources are accessible without authentication
- Private repositories or enhanced API features may require API tokens
- Authentication should use standard `Authorization: token <TOKEN>` headers
- Content-Type should be set to `application/json` for API requests

**Rate Limiting Management:**

- APIs typically include rate limit information in response headers
- Check `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers when available
- Implement backoff strategies when approaching rate limits
- Consider caching responses to minimize API calls
- For high-volume applications, consider local resource mirrors

### Repository Organization

```
https://git.door43.org/unfoldingWord/en_ult     # ULT/GLT
https://git.door43.org/unfoldingWord/en_ust     # UST/GST
https://git.door43.org/unfoldingWord/en_tn      # Translation Notes
https://git.door43.org/unfoldingWord/en_tw      # Translation Words
https://git.door43.org/unfoldingWord/en_twl     # Translation Words Links
https://git.door43.org/unfoldingWord/en_ta      # Translation Academy
```

### Multilingual Strategic Language Ecosystem

#### Strategic Language Strategy

unfoldingWord created English resources for Mother Tongue Translators, serving as the reference implementation. Multiple organizations contribute resources for different Strategic Languages:

**Organization Types**:

- **Language-Specific Organizations**: Like `es-419_gl` (Latin American Spanish Strategic Language resources)
- **Multi-Language Organizations**: Like `unfoldingWord` (hosting resources for multiple languages)
- **Mixed Organizations**: Some organizations host both Strategic Language and other language resources

#### Repository Naming Patterns

**Standard Format**: `{language-code}_{resource-identifier}`

**Examples**:

- `en_ult` - English Literal Translation
- `es-419_tn` - Latin American Spanish Translation Notes
- `fr_tw` - French Translation Words
- `hi_glt` - Hindi Gateway Literal Translation

#### Resource Subject Identification

Resource content types are definitively identified by the `subject` field in each repository's manifest file, not just the repository name. The Door43 Catalog API uses these subjects as searchable parameters. The ecosystem is extensible, allowing new subjects to be created as translation needs evolve.

**Complete List of Current Resource Subjects**:

- Aligned Bible
- Aramaic Grammar
- Bible
- Greek Grammar
- Greek Lexicon
- Greek New Testament
- Hebrew Grammar
- Hebrew Old Testament
- Hebrew-Aramaic Lexicon
- OBS Study Notes
- OBS Study Questions
- OBS Translation Notes
- OBS Translation Questions
- Open Bible Stories
- Study Notes
- Study Questions
- Training Library
- Translation Academy
- Translation Notes
- Translation Questions
- Translation Words
- TSV Study Notes
- TSV Study Questions
- TSV Translation Notes
- TSV Translation Questions
- TSV Translation Words Links
- TSV OBS Study Notes
- TSV OBS Study Questions
- TSV OBS Translation Notes
- TSV OBS Translation Questions
- TSV OBS Translation Words Links

**Resource Identifier Extensibility**:

The resource identifiers used in repository names (the part after the underscore) are also extensible. These identifiers serve dual purposes:

- **Repository Naming**: Form part of the repository name pattern `{language}_{identifier}`
- **Resource Relations**: Used in manifest `relation` fields to establish connections between resources

**Example Resource Relations in Manifest**:

```yaml
relation:
  - en/tn # English Translation Notes
  - en/tw # English Translation Words
  - hbo/uhb # Hebrew Bible
  - el-x-koine/ugnt # Greek New Testament
```

Organizations can create new resource identifiers and subjects as needed for specialized resources, following the established patterns while extending the ecosystem capabilities.

The English implementation serves as the model that other Strategic Language organizations follow, maintaining the same structural patterns and resource types while adapting content for their specific linguistic and cultural contexts. For detailed guidance on Strategic Language translation and adaptation processes, see the [Strategic Language Manual](https://gl-manual.readthedocs.io/en/latest/gl_translation.html).

#### Consistent Linking Strategy

All Strategic Language organizations maintain the same internal linking patterns:

```yaml
# Spanish GLT manifest
relation:
  - es-419/tw # Spanish Translation Words
  - es-419/tn # Spanish Translation Notes
  - hbo/uhb?v=2.1.30 # Same Hebrew Bible reference
  - el-x-koine/ugnt?v=0.34 # Same Greek New Testament reference
```

### Quality Assurance Integration

#### Alignment-Based Validation

- **Coverage**: Every original word has Strategic Language alignment
- **Accuracy**: Aligned words appropriately represent original meaning
- **Consistency**: Same original words consistently aligned across contexts

#### Cross-Resource Coherence

- **Note Accuracy**: Translation Notes reference actually aligned words
- **Link Validity**: TWL points to words present in alignments
- **Methodology**: Alignment decisions follow Translation Academy principles

## Advanced Topics and Extensibility

This section covers advanced integration topics including creating custom resources, extending the ecosystem, and implementing specialized features for power users and organizations with unique requirements.

### Creating New Resources

The unfoldingWord ecosystem is designed for extensibility. Strategic Language organizations can create additional resources following RC specifications, including new resource types with custom subjects and identifiers.

#### Required Components

1. **RC Directory Structure**: Follow standard layout with manifest
2. **Manifest Compliance**: Use Dublin Core metadata standards
3. **Linking Compatibility**: Support RC link resolution
4. **Format Standards**: Use established file formats (USFM, TSV, Markdown)
5. **Subject Definition**: Choose appropriate subject for resource type (existing or new)
6. **Identifier Selection**: Select unique resource identifier for repository naming and relations

#### Example: New Commentary Resource

**Directory Structure**:

```
en_biblical-commentary/
├── .apps/
├── LICENSE.md
├── manifest.yaml
├── bc_GEN.tsv
├── bc_EXO.tsv
└── bc_MAT.tsv
```

**Manifest**:

```yaml
dublin_core:
  conformsto: "rc0.2"
  creator: "Strategic Language Organization"
  description: "Biblical commentary for translation teams"
  format: "text/tab-separated-values"
  identifier: "biblical-commentary"
  language:
    identifier: "en"
    title: "English"
  relation:
    - "en/ult"
    - "en/ust"
  title: "Biblical Commentary"
  type: "help"
  version: "1"

projects:
  - identifier: "gen"
    path: "./bc_GEN.tsv"
    title: "Genesis"
```

**TSV Content**:

| Reference | ID    | Tags     | Quote       | Occurrence | Note                                       |
| --------- | ----- | -------- | ----------- | ---------- | ------------------------------------------ |
| 1:1       | bc001 | creation | בְּרֵאשִׁית | 1          | The Hebrew word for "beginning" implies... |
| 1:2       | bc002 | spirit   | רוּחַ       | 1          | The Spirit of God hovering suggests...     |

### Integration Requirements

#### For Translation Tools

1. **Resource Discovery**: Scan for RC manifest files
2. **Type Recognition**: Handle all RC container types
3. **Format Processing**: Parse USFM, TSV, and Markdown content
4. **Link Resolution**: Support RC link navigation

#### For Resource Creators

1. **Reference Format**: Use standard chapter:verse format
2. **Quote Matching**: Include exact original language text for alignment
3. **Occurrence Tracking**: Number multiple instances correctly
4. **Cross-References**: Use RC link format for references

## Implementation Guidelines

### Resource Loading Strategy

#### Configurable Resource Sources

Applications should support configurable resource sources rather than hardcoding specific URLs:

**Configuration Requirements:**

- **Base URL**: Configurable base URL for resource hosting platform (default: Door43)
- **Organization**: Configurable organization/user for resource repositories (default: unfoldingWord)
- **API Endpoint**: Configurable API path for programmatic access (default: /api/v1)
- **Authentication**: Optional authentication tokens for private or enhanced access
- **API Preference**: Configurable preference for using catalog API vs. direct repository access

**Resource Loading Strategy:**

1. **Primary Method**: Attempt catalog API access when available for enhanced discovery
2. **Fallback Method**: Use standard Git platform API for direct repository access
3. **Final Fallback**: Direct Git protocol access for maximum compatibility
4. **Error Handling**: Graceful degradation between access methods with appropriate logging

**Access Method Selection:**

- Catalog API provides enhanced metadata and filtering capabilities
- Standard Git APIs offer broad platform compatibility
- Direct Git access ensures availability even when web APIs are unavailable
- Local caching reduces repeated network requests

#### Platform Detection and Adaptation

**Platform Adaptation Strategy:**

- Detect platform type from base URL patterns (Door43, GitHub, GitLab, generic Git)
- Adapt API calls and authentication methods based on detected platform
- Use platform-specific optimizations when available
- Maintain compatibility across different hosting platforms

#### Dependency Resolution Strategy

**Automated Resource Loading Using Manifest Relations**

Applications can leverage the `relation` field in Resource Container manifests to automatically discover and load related resources, creating a comprehensive resource environment with minimal configuration.

**Manifest-Driven Dependency Chain Example**:

Starting with `en_glt` (English Literal Translation):

```yaml
# en_glt/manifest.yaml
relation:
  - en/tn # Translation Notes
  - en/twl # Translation Words Links
  - en/tq # Translation Questions
  - hbo/uhb # Hebrew Bible (source)
```

Loading `en_tn` reveals additional dependencies:

```yaml
# en_tn/manifest.yaml
relation:
  - en/glt # Back reference to ULT/GLT
  - en/gst # Back reference to UST/GST
  - en/ta # Translation Academy methodology
```

Loading `en_twl` shows further connections:

```yaml
# en_tw/manifest.yaml
relation:
  - en/tw # Translation Words
  - en/glt # Literal translation reference
  - en/gst # Simplified translation reference
```

**Selective Dependency Loading Algorithm**:

Applications may only require specific resource types rather than complete dependency chains. The loading strategy should support selective resource filtering based on application requirements.

**Filtered Loading Process**:

```
1. Load initial resource (e.g., en_glt)
2. Parse manifest relations array
3. Apply resource type filters based on application needs
4. For each filtered relation identifier:
   a. Convert to repository URL/path
   b. Check if already loaded (deduplication)
   c. If not loaded, add to loading queue
   d. Load resource and parse its manifest
   e. Apply filters to its relations before adding to queue
5. Continue until all required dependencies resolved
6. Build dependency graph for proper initialization order
```

**Application-Specific Resource Filtering Examples**:

**Translation Review App** (only needs GLT, TN, TA):

- Load en_glt as primary resource
- Filter relations to include only Translation Notes and Translation Academy subjects
- Skip Translation Words Links, Translation Questions, and other resource subjects
- Maintain focused resource set for specific workflow

**Terminology Study App** (only needs TW, TWL, GLT):

- Load en_tw as primary resource
- Filter relations to include only Translation Words Links and source text subjects
- Skip Translation Notes and methodology resource subjects
- Focus on word-level analysis workflow

**Community Checking App** (only needs GLT, GST, TQ):

- Load translation texts for comparison
- Include only Translation Questions subject for verification workflow
- Skip detailed notes and terminology resource subjects
- Streamline interface for community validators

**Deduplication Strategy**:

**Resource Tracking Requirements**:

- Maintain a registry of already loaded resources using resource identifiers
- Track loading state for each resource (not_loaded, loading, loaded) to prevent race conditions
- Use resource identifiers from manifest relations as unique keys for deduplication
- Implement efficient lookup mechanisms for checking resource loading status

**Loading Queue Management**:

- Maintain a queue of resources discovered through manifest relations but not yet loaded
- Process the queue systematically, checking each resource against the loaded registry
- Add newly discovered relations to the queue during processing
- Continue processing until all discovered dependencies are resolved

**Cache Integration**:

- Check local cache before initiating network requests for resources
- Return cached resources immediately when available and current
- Update cache with newly loaded resources for future deduplication
- Implement cache invalidation strategies for resource updates

**RC Link Integration with Relations**:

Combine manifest relations with RC link resolution for comprehensive resource loading:

**Cross-Reference Resolution Pattern**:

```
User clicks RC link: rc://en/ta/man/translate/figs-metaphor

1. Parse RC link components
2. Check if en/ta already loaded via relations
3. If not loaded, trigger dependency loading for en/ta
4. Load en/ta and its dependencies via manifest relations
5. Navigate to specific article within loaded resource
6. Update dependency graph with newly discovered relations
```

**Practical Implementation Considerations**:

**Circular Dependency Handling**:

- ULT/GLT references TN, TN references ULT/GLT
- Track loading state (not_loaded, loading, loaded) to prevent cycles
- Use dependency graph to detect and handle circular references

**Version Compatibility**:

- Relations may specify version constraints (`en/tn?v=85`)
- Validate version compatibility across dependency chain
- Handle version conflicts with user notification or fallback strategies

**Resource Filtering Strategies**:

**Subject-Based Filtering**:

- Use resource manifest `subject` field to identify resource types
- Create inclusion/exclusion lists based on application requirements
- Filter by subject categories (e.g., only "Translation Notes" and "Translation Academy")
- Allow users to configure resource type preferences

**Identifier-Based Filtering**:

- Filter relations by resource identifier patterns (tn, tw, ta, tq, etc.)
- Support wildcard patterns for flexible filtering (e.g., "t\*" for translation helps)
- Enable application-specific resource selection profiles
- Maintain filtering rules across application sessions

**Dependency Scope Control**:

- **Minimal Scope**: Load only explicitly required resources
- **Extended Scope**: Include first-level dependencies only
- **Full Scope**: Load complete dependency chains (traditional approach)
- **Custom Scope**: User-defined resource type combinations

**Performance Optimization**:

- Load filtered relations in parallel when possible
- Prioritize critical path resources (alignment data before notes)
- Implement lazy loading for large dependency trees
- Cache dependency graphs to avoid repeated resolution
- Skip unnecessary network requests through effective filtering

**Organization-Aware Loading**:

```yaml
# Handle cross-organization dependencies
relation:
  - unfoldingWord/en/tn # Explicit organization reference
  - es-419_gl/es-419/glt # Different organization
  - en/tw # Same organization (implicit)
```

## Conclusion

The unfoldingWord translation resource ecosystem provides a comprehensive, interconnected foundation for building sophisticated Bible translation tools. By following the Resource Container specification and implementing proper linking mechanisms, developers can create applications that leverage the full power of this integrated resource system.

### Key Success Factors

1. **Understand the Ecosystem**: Grasp how resources interconnect and depend on each other
2. **Follow Standards**: Implement RC specifications and linking protocols correctly
3. **Leverage Alignment**: Use word-level alignment for precise resource targeting
4. **Plan for Extensibility**: Design systems that can accommodate new resources
5. **Optimize Performance**: Implement efficient loading and caching strategies

### Benefits for Translation Teams

- **Precision**: Word-level alignment enables exact targeting of translation guidance
- **Comprehensiveness**: Complete ecosystem covers all aspects of translation work
- **Quality Assurance**: Multiple validation layers ensure translation accuracy
- **Efficiency**: Interconnected resources reduce lookup time and improve workflow
- **Extensibility**: Framework supports creation of specialized resources

### Benefits for Developers

- **Standards-Based**: RC specification provides clear implementation guidelines
- **Well-Documented**: Complete technical specifications with conceptual guidance
- **Proven Architecture**: Battle-tested by multiple translation organizations
- **Open Source**: Creative Commons licensing enables broad adoption
- **Community Support**: Active developer community and ongoing maintenance

This documentation provides the foundation for building translation tools that serve the global church's mission of making Scripture accessible in every language. The unfoldingWord ecosystem represents years of collaborative development by translation experts, linguists, and software developers working together to create the most comprehensive Bible translation resource system available today.

## Further Reading and Resources

### Technical Specifications and Standards

- **[USFM 3.1 Specification](https://docs.usfm.bible/usfm/3.1/index.html)** - Complete technical specification for Unified Standard Format Markers used in scripture texts
- **[Resource Container Specification](https://resource-container.readthedocs.io/en/latest/)** - Official documentation for the Resource Container standard including structure, manifest format, and linking mechanisms
- **[Dublin Core Metadata Terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)** - Metadata standards used in Resource Container manifests

### Translation Methodology and Workflow

- **[Strategic Language Manual](https://gl-manual.readthedocs.io/en/latest/gl_translation.html)** - Comprehensive guide for translating and adapting unfoldingWord resources into Strategic Languages
- **[unfoldingWord Translator Resources](https://unfoldingword.org/for-translators/)** - Complete collection of tools, training materials, and resources for Bible translation teams

### Platform and API Documentation

- **[Door43 Content Service](https://git.door43.org/about)** - Information about the primary hosting platform for unfoldingWord resources
- **[Door43 API Documentation](https://git.door43.org/api/swagger)** - Interactive API documentation and testing interface for programmatic access to resources
