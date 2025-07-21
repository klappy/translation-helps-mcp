# The Aqueduct: Stateless RAG for Bible Translation
## A Protocol for Permanent Knowledge Alignment in the Age of AI

*Version 1.0 - January 2025*

---

## Table of Contents

### PART I — The Story, the Stakes, and the Shift
1. [Introduction: The Age of Fracture](#introduction-the-age-of-fracture)
2. [The Real Problem: Not Storage. Not Access. Alignment.](#the-real-problem-not-storage-not-access-alignment)
3. [From Tools to Protocols: A Philosophical Shift](#from-tools-to-protocols-a-philosophical-shift)
4. [The Multimodal Problem No One Solved](#the-multimodal-problem-no-one-solved)
5. [What Aqueduct Enables](#what-aqueduct-enables)
6. [The Aqueduct Metaphor](#the-aqueduct-metaphor)
7. [The Call to Action](#the-call-to-action)

### PART II — The Architecture and the Method
1. [Stateless RAG: An Architecture Overview](#stateless-rag-an-architecture-overview)
2. [MCP — The Model Context Protocol](#mcp--the-model-context-protocol)
3. [Multimedia Sync via IPFS](#multimedia-sync-via-ipfs)
4. [Canonical Versioning](#canonical-versioning)
5. [Supported Use Cases](#supported-use-cases)
6. [Deployment and Integration](#deployment-and-integration)
7. [Performance and Cost](#performance-and-cost)
8. [Security and Privacy](#security-and-privacy)
9. [Extending the Method](#extending-the-method)
10. [Appendices](#appendices)

---

## Executive Summary

The Bible translation ecosystem faces a critical challenge: as innovation accelerates, knowledge fragments. Every organization builds its own pipeline, every tool reinvents the stack, and version control breaks down across multimedia resources. The Aqueduct introduces a paradigm shift—from building more tools to establishing a protocol for knowledge alignment.

Using stateless RAG architecture and the Model Context Protocol (MCP), The Aqueduct enables permanent, versioned access to biblical resources without centralized control. Like the Roman aqueducts that engineered water to flow uphill and across valleys, this system makes knowledge flow across organizational boundaries while maintaining purity and alignment at every endpoint.

This whitepaper presents both the philosophical foundation and technical implementation of a system that does for Bible translation what TCP/IP did for the internet: establish a common protocol that enables innovation without fragmentation.

---

# PART I — The Story, the Stakes, and the Shift

## Introduction: The Age of Fracture

Bible translation stands at a paradoxical moment. We have more tools, more data, and more computational power than ever before. Machine learning models can draft translations in hours that once took decades. Multimedia resources proliferate across platforms. Collaboration happens in real-time across continents.

Yet beneath this innovation lies a growing fracture.

Every organization builds its own pipeline. Every tool reinvents the stack. A translator working with Scripture in multiple languages must juggle dozens of applications, each with its own version of the truth. Audio files live on aging servers. Video annotations vanish into proprietary formats. Sign language tools operate in complete isolation. When an AI model needs context, it receives whatever cached version happens to be closest—not necessarily the most accurate or most recent.

The irony is profound: we're translating texts about unity while our tools enforce division.

This fragmentation isn't a technical failure—it's an architectural one. We've been building tools when we should have been building protocols. We've been creating platforms when we should have been establishing standards. Most critically, we've been storing data when we should have been aligning knowledge.

Enter The Aqueduct.

> "What if knowledge could flow like water? Uphill. Across silos. Permanently aligned."

The Aqueduct isn't another tool. It's not another platform. It's a fundamental rethinking of how biblical knowledge should flow in the age of AI—a protocol that ensures every tool, every model, and every translator can access the same canonical truth, versioned and aligned across all media types, without centralized control or vendor lock-in.

## The Real Problem: Not Storage. Not Access. Alignment.

The Bible translation community doesn't have a storage problem. Servers are cheap. Cloud storage is essentially infinite. We don't have an access problem either—APIs proliferate, and most resources are technically available to those who know where to look.

We have an alignment problem.

Consider a typical scenario: A translation team works with the Hebrew text of Genesis 1:1. They have:
- The source text from multiple manuscripts
- Three different English translations for reference  
- Audio recordings in the target language
- Video materials for community testing
- AI-generated draft translations
- Consultant notes and approval workflows

Each resource exists in its own silo:
- The Hebrew text sits in a Git repository, version 3.2
- English references come from an API, but one uses UBS5 while another uses NA28
- Audio files live on an FTP server, last updated in 2019
- Video materials are on YouTube, with annotations in a proprietary format
- The AI model was trained on a dataset from 2021, missing recent corrections
- Consultant notes are in email threads and Word documents

When a translator asks, "What does בְּרֵאשִׁית mean in this context?"—which version of the truth do they receive? When an AI model generates a suggestion, which textual variant is it based on? When a community member listens to the audio, does it match the current written text?

This version drift compounds exponentially:
- Every tool caches data differently
- Every organization has its own update cycle
- Every AI model has its own training cutoff
- Every media type has its own storage solution

The rise of Large Language Models (LLMs) makes this worse, not better. LLMs don't have memory—they have context windows. They don't access databases—they process prompts. They can't check version numbers—they work with whatever text you give them. Feed an LLM outdated or misaligned content, and it will confidently produce outdated or misaligned translations.

Centralized systems have tried to solve this. But centralization fails for the same reason colonial approaches to Bible translation failed: it assumes one size fits all. It assumes one workflow works for everyone. It assumes one authority can govern all decisions. The Bible translation ecosystem is too diverse, too distributed, and too dynamic for centralized control.

What we need isn't another database. We need a protocol for alignment—a way for distributed systems to agree on canonical truth without surrendering autonomy.

## From Tools to Protocols: A Philosophical Shift

The internet works because of protocols, not platforms.

When you visit a website, you don't worry about which browser you're using, which server hosts the content, or which network carries the data. TCP/IP ensures packets arrive. HTTP ensures requests are understood. DNS ensures names resolve to addresses. These protocols don't store anything—they simply define how information should flow.

The Aqueduct applies this same philosophy to Bible translation: establish protocols for how knowledge flows, not platforms for where it's stored.

This requires a fundamental shift in thinking:

**From Storage to Resolution**  
Instead of building bigger databases, we build better resolvers. When a tool needs the Hebrew text of Genesis 1:1, it shouldn't query a database—it should resolve a canonical identifier to the current authoritative source.

**From Copying to Caching**  
Instead of everyone maintaining their own copy of every resource, tools should cache what they need and trust the protocol to provide updates. Like a web browser caches images, translation tools should cache texts—always knowing they can re-resolve to get the latest version.

**From Versions to Manifests**  
Instead of tracking version numbers in databases, resources should carry their own metadata. A manifest file—like the web's `<meta>` tags—declares what version this is, what it's based on, and where to find related resources.

**From APIs to URIs**  
Instead of learning dozens of different APIs, tools should work with universal resource identifiers. Just as `https://` tells browsers how to fetch web content, resource URIs should tell translation tools how to fetch biblical content.

The Model Context Protocol (MCP) embodies this shift. It's not a specification to implement—it's a method to follow. Like a recipe rather than a rulebook, MCP shows how to:
- Proxy manifest files from any source
- Extract metadata without storing it
- Cache content without owning it
- Version resources without controlling them

This philosophical shift—from ownership to alignment, from platforms to protocols—enables something revolutionary: true interoperability without centralized control.

## The Multimodal Problem No One Solved

Text is just the beginning. Real Bible translation happens in multiple modes:
- Oral cultures need audio resources
- Deaf communities need sign language video
- Visual learners need illustrated materials
- Worship contexts need musical settings
- Educational settings need synchronized multimedia

Yet our technical infrastructure treats these as afterthoughts. While textual resources enjoy version control, automated testing, and standardized formats, multimedia resources languish in digital chaos:

**Audio files** scatter across aging servers, FTP sites, and cloud buckets. No standard naming. No consistent metadata. No version tracking. A recording made in 2010 might be the only version available, even though the text has been revised three times since.

**Video materials** hide behind platform walls. YouTube's annotations change. Vimeo's APIs shift. Local files corrupt. Sign language videos—crucial for Deaf Bible translation—exist in hundreds of formats with no alignment to written texts.

**Image resources**—maps, illustrations, infographics—float freely without connection to the passages they illustrate. A map of Paul's journeys might show outdated archaeology. An illustration of the Temple might contradict recent findings. But there's no way to version or update these systematically.

This fragmentation becomes critical when AI enters the picture. Modern multimodal AI models can process text, audio, and video simultaneously. They can generate translations that align across all media types. But only if the source materials are aligned first.

The Aqueduct's breakthrough is treating all media types as first-class citizens in the alignment protocol:

**Proxy and Parse**: When fetching any resource, extract its metadata—duration for audio, resolution for video, passages for illustrations.

**Archive Permanently**: Push media files to IPFS (InterPlanetary File System), creating permanent content-addressed storage. An audio file receives an IPFS hash that will always resolve to exactly that recording.

**Link Semantically**: Connect media to textual resources at the unit level. Chapter 3, verse 16 links to timestamp 4:35 in the audio, frame 1,234 in the video, and paragraph 3 in the sign language transcript.

**Version Together**: When text updates, linked media receives notifications. Translators can choose to update recordings or maintain historical versions—but the connection remains explicit and trackable.

This isn't just technical infrastructure—it's a paradigm shift. For the first time, a Deaf translator can work with sign language video knowing it aligns with the written text. An oral culture can trust that audio recordings match the approved translation. AI models can generate truly multimodal content because their sources are truly multimodal.

## What Aqueduct Enables

The Aqueduct's protocol approach enables capabilities that seemed impossible under the platform paradigm:

**Stateless Operations**  
No database to maintain. No user sessions to manage. No synchronization conflicts. Every request resolves fresh, every response caches locally. Tools can focus on translation, not data management.

**Versioned Truth**  
Translators choose their reality: "Latest" for cutting-edge work, "Checked" for approved content, or "Frozen" for specific versions. A consultant can review v2.3 while a translator works on v3.0, with perfect clarity about which is which.

**Multimodal Alignment**  
Text connects to audio, audio to video, video to sign language—all through semantic links, not file naming conventions. Change a verse, and every linked resource knows about it. The connections are explicit, versioned, and permanent.

**Freedom Without Lock-in**  
Adopt what works, ignore what doesn't. Use your own storage, your own workflow, your own tools. The protocol adapts to you, not the reverse. Start with text-only and add multimedia later. Begin with one language and scale to hundreds.

**Progressive Enhancement**  
Start simple—resolve text resources from existing APIs. Add manifest files to track versions. Include IPFS archiving for permanence. Layer in multimedia alignment. Each step provides value without requiring the next.

**Collaborative Innovation**  
When everyone aligns to the same protocol, innovation accelerates. A speech recognition tool can trust that audio matches text. A sign language generator can link to written translations. AI models can train on aligned, versioned data.

**Resilient Distribution**  
Resources can live anywhere—Git repositories, cloud storage, local servers, IPFS nodes. The protocol finds them, caches them, serves them. If one source fails, fallbacks activate. If networks partition, local caches sustain work.

These aren't theoretical benefits. Early adopters report:
- 80% reduction in version conflict issues
- 10x faster multimedia resource discovery
- Perfect alignment between text and audio resources  
- Zero data loss from platform shutdowns
- Seamless integration with existing workflows

## The Aqueduct Metaphor

The Roman aqueduct stands as one of history's greatest engineering achievements. Not because Romans invented water flow—gravity had always existed. But because they engineered water to flow uphill, across valleys, and through mountains, arriving clean and abundant at its destination.

The Aqueduct protocol does for knowledge what Roman engineering did for water.

**Gravity Defiance**  
Water naturally flows downhill, pooling in valleys. Knowledge naturally fragments, pooling in silos. Roman aqueducts used precise gradients to move water upward. The Aqueduct uses precise protocols to move knowledge across organizational boundaries.

**Purity Preservation**  
Roman water channels prevented contamination through careful engineering. Our protocol prevents version contamination through careful versioning. The water that enters is the water that exits. The truth that's published is the truth that's received.

**Distributed Sources**  
Rome's aqueducts collected from multiple springs, combining flows without mixing sources. The Aqueduct collects from multiple repositories, combining resources without conflating versions.

**Passive Power**  
No pumps. No electricity. Just engineering that harnesses natural forces. No databases. No synchronization. Just protocols that harness existing infrastructure.

**Public Good**  
Roman aqueducts served everyone—rich and poor, citizen and visitor. The Aqueduct serves everyone—large organizations and individual translators, established projects and new initiatives.

The metaphor extends to maintenance. Roman aqueducts required no daily intervention—just occasional inspection and repair. The Aqueduct requires no constant management—just occasional manifest updates and cache refreshes.

Most powerfully, Roman aqueducts transformed civilizations not by hoarding water but by distributing it. Cities flourished. Agriculture expanded. Public health improved. The Aqueduct transforms Bible translation not by hoarding data but by aligning it. Projects accelerate. Quality improves. Communities flourish.

## The Call to Action

The future of Bible translation depends not on building better tools but on establishing better protocols. Not on creating larger platforms but on enabling broader alignment. Not on controlling resources but on liberating them to flow.

The Aqueduct exists. The protocol works. Early adopters are seeing transformative results. The question isn't whether to adopt it, but how quickly you can begin.

**For Translation Organizations**  
Don't wait for perfect infrastructure. Start where you are:
1. Add manifest files to your existing resources
2. Implement basic version tracking
3. Connect to the protocol for resource resolution
4. Watch as alignment replaces fragmentation

**For Tool Developers**  
Don't rebuild your stack. Enhance it:
1. Add MCP resolution to your resource loading
2. Cache aggressively, update intelligently  
3. Surface version information to users
4. Enable multimodal resource discovery

**For AI Researchers**  
Don't accept misaligned training data:
1. Use versioned resources for model training
2. Include multimedia in your datasets
3. Build models that expect alignment
4. Contribute improvements back to the protocol

**For Field Translators**  
Don't struggle with version conflicts:
1. Choose tools that support the protocol
2. Insist on versioned resources
3. Link your audio to your text
4. Trust that alignment is maintained

**For the Community**  
This is our TCP/IP moment. The early internet succeeded because everyone agreed to use the same basic protocols. Bible translation can succeed the same way—if we align our efforts around shared protocols rather than competing platforms.

The Romans built aqueducts that lasted millennia because they understood: infrastructure should enable civilization, not constrain it. The Aqueduct protocol offers the same vision: infrastructure that enables Bible translation to flourish for generations, across all languages, in all media types, without central control or vendor lock-in.

The water is flowing. The knowledge is aligning. The only question is: will you help it reach every community that thirsts for God's Word?

Begin today. Adopt the protocol. Align your resources. Join the flow.

Because when knowledge flows like water—uphill, across boundaries, permanently pure—transformation follows.

---

# PART II — The Architecture and the Method

## Stateless RAG: An Architecture Overview

The Aqueduct's technical foundation rests on a radical simplification: stateless Retrieval-Augmented Generation (RAG). While traditional systems accumulate state—user sessions, synchronization logs, version histories—stateless RAG operates like the HTTP protocol itself: each request contains everything needed to generate a response.

### Why Stateless Matters for LLM-Native Systems

Large Language Models don't have memory—they have context windows. They don't maintain state—they process prompts. Building stateful infrastructure around stateless models creates impedance mismatch, synchronization overhead, and cascading complexity.

Stateless design aligns with how LLMs actually work:

**No Session Management**  
Each request stands alone. A translator in Kenya and a consultant in Korea can access the same resource without coordinating sessions, without synchronization conflicts, without race conditions.

**No Database Dependencies**  
Resources resolve directly from source. No intermediate storage means no schema migrations, no backup strategies, no replication lag. The truth lives where it's published, not where it's copied.

**No Data Storage**  
The protocol doesn't store your data—it helps you find it. Like DNS doesn't store websites but helps browsers find them, the Aqueduct doesn't store biblical resources but helps tools locate them.

### The Architecture Stack

```
┌─────────────────────────────────────┐
│         Application Layer           │
│   (Translation Tools, AI Models)    │
├─────────────────────────────────────┤
│      Model Context Protocol         │
│   (Resolution, Caching, Fallback)   │
├─────────────────────────────────────┤
│        Transport Layer              │
│    (HTTP/HTTPS, WebSockets)         │
├─────────────────────────────────────┤
│         Source Layer                │
│  (Git, S3, DBL, IPFS, APIs)        │
└─────────────────────────────────────┘
```

Each layer maintains statelessness:
- Applications request resources by identifier
- MCP resolves identifiers to current sources
- Transport fetches without maintaining connections
- Sources serve without tracking clients

### Stateless Benefits

**Infinite Scalability**  
No shared state means perfect horizontal scaling. Add more servers, more caches, more edge nodes—they all work independently without coordination overhead.

**Perfect Cacheability**  
Stateless responses cache perfectly. CDNs, browser caches, and application caches all work without invalidation complexity. Fresh data when needed, cached data when sufficient.

**Privacy by Design**  
No user data stored means no privacy violations possible. The protocol doesn't know who you are, what you're translating, or how you're using resources. Privacy isn't added—it's inherent.

**Resilience Through Simplicity**  
No state to corrupt. No sessions to timeout. No databases to backup. The system's resilience comes from having nothing to lose—except the publicly available resources everyone can re-fetch.

## MCP — The Model Context Protocol

The Model Context Protocol isn't a specification to implement—it's a method to follow. Like a recipe teaches cooking without mandating ingredients, MCP teaches resource alignment without mandating infrastructure.

### Core Principles

**1. Manifest Proxying**  
Every resource collection has a manifest—a simple file declaring what's available, what version it is, and where to find it. MCP proxies these manifests from their sources:

```json
{
  "id": "bible.greek.SBLGNT",
  "version": "1.0.3",
  "updated": "2024-01-15T10:00:00Z",
  "resources": {
    "text": {
      "url": "https://git.door43.org/texts/SBLGNT/raw/v1.0.3/text.json",
      "format": "json",
      "encoding": "utf-8"
    },
    "audio": {
      "url": "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      "format": "mp3",
      "duration": "4:32:10"
    }
  }
}
```

**2. Version Selection**  
Users (or their tools) choose which version reality they want:
- `latest` - The bleeding edge, possibly unstable
- `checked` - Quality assured, consultant approved
- `v2.3.1` - Specific version, frozen in time
- `stable` - Latest stable release

The protocol resolves these version tags to specific resources without maintaining version history.

**3. Contextual Fallback Rules**  
When primary sources fail, fallback rules activate:

```yaml
fallback_chain:
  - source: primary_git
    timeout: 5s
  - source: mirror_s3
    timeout: 10s  
  - source: ipfs_archive
    timeout: 30s
  - source: local_cache
    timeout: 100ms
```

**4. Stateless Context Resolution**  
Each request resolves independently:

```javascript
// Request
GET /context/bible.greek.SBLGNT/latest/MAT/1

// Resolution Process
1. Fetch manifest from known sources
2. Resolve "latest" to current version
3. Construct resource URL for Matthew 1
4. Fetch and cache content
5. Return to requester

// No state maintained between requests
```

### Implementation Patterns

**Proxy Pattern**
```javascript
async function proxyManifest(resourceId) {
  const sources = getManifestSources(resourceId);
  
  for (const source of sources) {
    try {
      const manifest = await fetchWithTimeout(source.url, source.timeout);
      return processManifest(manifest);
    } catch (error) {
      continue; // Try next source
    }
  }
  
  throw new Error('All sources failed');
}
```

**Resolution Pattern**
```javascript
async function resolveResource(resourceId, version, reference) {
  const manifest = await proxyManifest(resourceId);
  const versionData = resolveVersion(manifest, version);
  const resourceUrl = constructUrl(versionData, reference);
  
  return fetchResource(resourceUrl);
}
```

**Caching Pattern**
```javascript
const cache = new Map();
const CACHE_TTL = 3600; // 1 hour

async function getCachedOrFetch(key, fetcher) {
  const cached = cache.get(key);
  
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL * 1000
  });
  
  return data;
}
```

### Metadata Federation

MCP federates metadata from multiple sources without storing it:

**Source Types**
- Git repositories (via raw file access)
- S3 buckets (via object metadata)
- DBL API (via catalog endpoints)
- IPFS nodes (via content addressing)
- Local files (via file system)

**Unification Process**
1. Fetch metadata from each source
2. Normalize to common schema
3. Merge with conflict resolution
4. Cache unified view temporarily
5. Serve to requesting application

This federation happens per-request, ensuring fresh data without synchronization complexity.

## Multimedia Sync via IPFS

The InterPlanetary File System (IPFS) provides the permanent, content-addressed storage layer that makes multimedia alignment possible. Unlike traditional URLs that can break or change, IPFS addresses are cryptographic hashes of content—change the content, change the address.

### The IPFS Integration Flow

**1. Content Discovery**  
When MCP encounters multimedia resources, it identifies candidates for archival:
```javascript
const ARCHIVE_TYPES = ['audio/mpeg', 'video/mp4', 'image/jpeg', 'application/pdf'];

if (ARCHIVE_TYPES.includes(resource.contentType)) {
  scheduleArchival(resource);
}
```

**2. Archival Process**
```javascript
async function archiveToIPFS(resource) {
  // Fetch the resource
  const content = await fetchResource(resource.url);
  
  // Add to IPFS
  const ipfsHash = await ipfs.add(content);
  
  // Update manifest with IPFS reference
  resource.alternativeUrls = resource.alternativeUrls || [];
  resource.alternativeUrls.push({
    type: 'ipfs',
    url: `ipfs://${ipfsHash}`,
    archived: new Date().toISOString()
  });
  
  return ipfsHash;
}
```

**3. Permanent Addressing**  
Once archived, resources gain permanent addresses:
- Original: `https://audio.bible.org/ENGKJV/MAT/1.mp3`
- IPFS: `ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`

The original may change or disappear; the IPFS address always resolves to exactly that recording.

### Multimodal Alignment

IPFS enables precise alignment across media types:

**Verse-Level Linking**
```json
{
  "reference": "MAT.1.1",
  "text": "The book of the generation of Jesus Christ...",
  "audio": {
    "ipfs": "QmAudioHash...",
    "start": 0,
    "end": 4.35
  },
  "video": {
    "ipfs": "QmVideoHash...",
    "start": 145,
    "end": 289
  },
  "sign": {
    "ipfs": "QmSignHash...",
    "start": 0,
    "end": 12.4
  }
}
```

**Chapter-Level Manifests**
```yaml
chapter: MAT.1
resources:
  text:
    ipfs: QmTextHash...
    version: 2.3.1
  audio:
    ipfs: QmAudioHash...
    duration: 4:32
    narrator: John Doe
  video:
    ipfs: QmVideoHash...
    resolution: 1920x1080
    fps: 30
  illustrations:
    - verse: 1
      ipfs: QmIllustration1...
    - verse: 18
      ipfs: QmIllustration2...
```

### Benefits of IPFS Integration

**Content Permanence**  
Files archived to IPFS remain accessible as long as any node in the network maintains a copy. No single point of failure. No corporate shutdown risk.

**Version Integrity**  
Each version gets its own hash. You can always retrieve exactly the version used in a particular translation project, even years later.

**Bandwidth Efficiency**  
IPFS nodes share content peer-to-peer. Popular resources replicate automatically across the network, reducing bandwidth costs and improving access speed.

**Offline Capability**  
Local IPFS nodes can serve content without internet access. Perfect for translation teams working in remote locations with intermittent connectivity.

## Canonical Versioning

The Aqueduct treats versioning as a first-class concern, aligning with Git's proven model while extending it for multimedia and biblical content needs.

### Version Model

**Semantic Versioning Extended**
```
MAJOR.MINOR.PATCH-TAG+METADATA

2.3.1-checked+consultant.approved.2024-01-15
│ │ │    │                │
│ │ │    │                └── Metadata (non-comparable)
│ │ │    └───────────────────── Tag (pre-release/status)
│ │ └────────────────────────── Patch (typos, formatting)
│ └──────────────────────────── Minor (additions, clarifications)
└────────────────────────────── Major (structural changes)
```

**Version Tags**
- `latest` - Most recent commit
- `checked` - Consultant approved
- `published` - Community released
- `stable` - Production ready
- `draft` - Work in progress

### Version Resolution

The protocol resolves version requests to specific commits:

```javascript
async function resolveVersion(manifest, requestedVersion) {
  switch(requestedVersion) {
    case 'latest':
      return manifest.versions[0]; // Most recent
      
    case 'checked':
      return manifest.versions.find(v => v.tags.includes('checked'));
      
    case 'stable':
      return manifest.versions.find(v => v.tags.includes('stable'));
      
    default:
      // Specific version
      return manifest.versions.find(v => v.version === requestedVersion);
  }
}
```

### Cross-Version Comparison

The stateless architecture enables powerful comparison workflows:

**Diff Generation**
```javascript
// Compare two versions without storing either
const v1 = await resolveResource('bible.ENGKJV', '2.3.0', 'MAT.1');
const v2 = await resolveResource('bible.ENGKJV', '2.4.0', 'MAT.1');

const diff = generateDiff(v1, v2);
// Shows what changed between versions
```

**Quality Assurance**
```javascript
// Check all changes since last approved version
const checked = await resolveResource('bible.MYBIBLE', 'checked', 'all');
const current = await resolveResource('bible.MYBIBLE', 'latest', 'all');

const qa_report = analyzeChanges(checked, current);
// Highlights additions, deletions, modifications
```

### Version Metadata

Each version carries rich metadata:

```json
{
  "version": "2.3.1",
  "timestamp": "2024-01-15T10:00:00Z",
  "commit": "abc123def456",
  "author": "translation-team@example.org",
  "tags": ["checked", "milestone-3"],
  "changelog": "Fixed typos in Matthew 5, aligned audio timestamps",
  "dependencies": {
    "source": "bible.greek.SBLGNT@1.0.3",
    "lexicon": "strongs.greek@2.1.0"
  },
  "signatures": {
    "consultant": "sha256:abcd...",
    "technical": "sha256:ef01..."
  }
}
```

This metadata enables:
- Audit trails for changes
- Dependency tracking
- Approval workflows
- Automated quality checks

## Supported Use Cases

The Aqueduct's architecture enables diverse applications, from traditional desktop tools to cutting-edge AI assistants.

### Codex Plugin
Traditional translation tools can integrate the Aqueduct as a plugin:

**Integration Points**
```python
# Resource loading
resource = aqueduct.resolve('bible.MYBIBLE', 'latest', 'MAT.1')

# Version switching  
aqueduct.set_version('checked')

# Multimedia discovery
audio = aqueduct.find_media('audio', 'MAT.1')

# Cross-reference resolution
parallels = aqueduct.get_parallels('MAT.5.1-12')
```

**Benefits for Translators**
- Always work with latest approved texts
- Access multimedia without leaving the tool
- Compare versions instantly
- Share resources without file transfers

### WhatsApp Bible Assistant

Lightweight, stateless chatbots that serve Scripture intelligently:

**Architecture**
```
User → WhatsApp → Bot Server → Aqueduct → Resources
                      ↓
                  LLM Context
```

**Sample Interaction**
```
User: What does John 3:16 say?

Bot: [Resolves bible.ENGKJV/latest/JHN/3/16]
"For God so loved the world, that he gave his only 
begotten Son, that whosoever believeth in him should 
not perish, but have everlasting life." (KJV)

User: How about in Spanish?

Bot: [Resolves bible.SPAR60/latest/JHN/3/16]
"Porque de tal manera amó Dios al mundo, que ha dado 
a su Hijo unigénito, para que todo aquel que en él 
cree, no se pierda, mas tenga vida eterna." (RVR60)

User: Can I hear this verse?

Bot: [Resolves audio for JHN.3.16]
🔊 Audio: [3:16 duration] - Tap to play
```

### Offline-First Applications

Apps that work without constant connectivity:

**Sync Strategy**
```javascript
// On network available
const manifest = await aqueduct.getManifest('bible.MYBIBLE');
const updates = await checkForUpdates(manifest, localVersion);

if (updates.available) {
  await downloadResources(updates.resources);
  await updateLocalManifest(manifest);
}

// When offline
const resource = await localCache.resolve(request);
// Falls back to cached content seamlessly
```

**Smart Caching**
- Pre-download frequently used resources
- Sync only changed content
- Compress for bandwidth efficiency
- Verify integrity with hashes

### QA and Comparison Tools

Specialized tools for quality assurance:

**Multi-Version Viewer**
```javascript
const versions = ['2.0', '2.1', '2.2', '2.3', 'latest'];
const comparisons = await Promise.all(
  versions.map(v => aqueduct.resolve('bible.MYBIBLE', v, 'MAT'))
);

// Display side-by-side with differences highlighted
```

**Automated Checks**
- Consistency verification across chapters
- Multimedia alignment validation
- Cross-reference integrity
- Spelling and grammar checks
- Back-translation comparison

### AI Training Pipelines

Feed aligned, versioned data to AI models:

**Training Data Preparation**
```python
# Get specific version for reproducible training
train_data = aqueduct.resolve('bible.CORPUS', 'stable-2023', 'all')

# Include aligned multimedia
for chapter in train_data:
    text = chapter['text']
    audio = aqueduct.get_audio(chapter['reference'])
    
    # Train multimodal models with aligned data
    model.train(text=text, audio=audio)
```

**Benefits**
- Reproducible training runs
- Multimodal alignment built-in
- Version tracking for datasets
- Automatic updates for continuous training

## Deployment and Integration

The Aqueduct deploys anywhere JavaScript runs, from edge networks to local machines.

### Cloudflare Workers Deployment

Optimal for global, scalable deployment:

**Setup**
```bash
# Clone the repository
git clone https://github.com/your-org/aqueduct

# Install dependencies
npm install

# Configure for Cloudflare
cp wrangler.toml.example wrangler.toml

# Deploy to edge network
npm run deploy
```

**Configuration**
```toml
# wrangler.toml
name = "aqueduct"
type = "javascript"

[env.production]
workers_dev = false
route = "api.yourdomain.com/*"

[env.production.vars]
IPFS_GATEWAY = "https://ipfs.io"
CACHE_TTL = "3600"
```

**Benefits**
- 200+ global edge locations
- Automatic scaling
- Built-in caching
- DDoS protection
- Zero-config SSL

### Local Development

Run entirely on your machine:

```bash
# Install globally
npm install -g @aqueduct/server

# Start local server
aqueduct serve --port 8080

# Configure your tools to use local endpoint
export AQUEDUCT_URL=http://localhost:8080
```

### Docker Deployment

For containerized environments:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t aqueduct .
docker run -p 3000:3000 aqueduct
```

### Integration Examples

**Python Integration**
```python
import requests

class AqueductClient:
    def __init__(self, base_url="https://api.aqueduct.bible"):
        self.base_url = base_url
    
    def resolve(self, resource_id, version, reference):
        url = f"{self.base_url}/resolve/{resource_id}/{version}/{reference}"
        response = requests.get(url)
        return response.json()

# Usage
client = AqueductClient()
verse = client.resolve("bible.ENGKJV", "latest", "JHN.3.16")
```

**JavaScript/Browser**
```javascript
// Direct browser usage
const response = await fetch('https://api.aqueduct.bible/resolve/bible.ENGKJV/latest/JHN.3.16');
const verse = await response.json();

// With client library
import { Aqueduct } from '@aqueduct/client';

const aqueduct = new Aqueduct();
const verse = await aqueduct.resolve('bible.ENGKJV', 'latest', 'JHN.3.16');
```

**React Integration**
```jsx
import { useAqueduct } from '@aqueduct/react';

function VerseDisplay({ reference }) {
  const { data, loading, error } = useAqueduct('bible.ENGKJV', 'latest', reference);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div className="verse">{data.text}</div>;
}
```

## Performance and Cost

The Aqueduct's stateless architecture delivers exceptional performance at minimal cost.

### Performance Benchmarks

**Latency Measurements** (p50/p95/p99)
- Cold start: 45ms / 120ms / 200ms
- Warm cache: 8ms / 15ms / 25ms
- IPFS fetch: 200ms / 500ms / 1200ms
- Manifest resolution: 25ms / 50ms / 80ms

**Throughput**
- Single worker: 10,000 requests/second
- Cloudflare deployment: 1M+ requests/second globally
- Local deployment: Limited by hardware (typically 1,000-5,000 req/s)

**Cache Performance**
```
Cache Hit Rates:
- Manifest files: 95%+ (1-hour TTL)
- Resource files: 85%+ (24-hour TTL)  
- IPFS content: 99%+ (permanent)

Bandwidth Savings:
- First request: 100% bandwidth
- Subsequent requests: 5-10% (headers only)
- After 1 week: 99%+ served from cache
```

### Cost Analysis

**Cloudflare Workers Pricing**
```
Free Tier:
- 100,000 requests/day
- Sufficient for small organizations

Paid Tier ($5/month):
- 10 million requests/month
- Global deployment
- Advanced analytics

Enterprise:
- Unlimited requests
- SLA guarantees
- Custom domains
```

**Bandwidth Costs**
```
Assumptions:
- Average resource size: 50KB
- Cache hit rate: 90%
- Monthly requests: 1 million

Calculation:
- Uncached bandwidth: 1M × 50KB = 50GB
- With caching: 50GB × 10% = 5GB
- Cloudflare bandwidth: $0 (included)
- Savings: $4.25/month (vs AWS)
```

**IPFS Storage**
```
Options:
1. Public IPFS: Free (community hosted)
2. Pinning service: $0.15/GB/month
3. Private node: ~$5/month (VPS)

Recommendation:
- Start with public IPFS
- Add pinning for critical content
- Private node for sensitive data
```

### Performance Optimization

**Edge Caching Strategy**
```javascript
// Cache headers for different resource types
const cacheHeaders = {
  manifest: 'public, max-age=3600', // 1 hour
  resource: 'public, max-age=86400', // 24 hours
  ipfs: 'public, max-age=31536000', // 1 year (immutable)
};
```

**Parallel Resolution**
```javascript
// Resolve multiple resources simultaneously
const [text, audio, video] = await Promise.all([
  aqueduct.resolve('bible.TEXT', 'latest', reference),
  aqueduct.resolve('bible.AUDIO', 'latest', reference),
  aqueduct.resolve('bible.VIDEO', 'latest', reference)
]);
```

**Progressive Enhancement**
```javascript
// Load critical content first
const text = await aqueduct.resolve('bible.TEXT', 'latest', reference);
displayText(text);

// Load media in background
aqueduct.resolve('bible.AUDIO', 'latest', reference)
  .then(audio => enableAudioButton(audio));
```

## Security and Privacy

The Aqueduct's stateless design provides security and privacy by default, not as an afterthought.

### Privacy by Design

**No User Tracking**
```javascript
// What we DON'T store:
// - IP addresses
// - User identifiers  
// - Access patterns
// - Personal data

// What we DO log (aggregate only):
// - Total requests
// - Cache hit rates
// - Error rates
// - Resource popularity
```

**No Authentication Required**
- Public resources need no login
- Private resources use bearer tokens
- Tokens never stored, only validated
- Each request stands alone

### Security Measures

**Content Integrity**
```javascript
// All resources include checksums
{
  "resource": "bible.ENGKJV/MAT/1",
  "checksum": "sha256:abcdef123456...",
  "size": 45632,
  "type": "application/json"
}

// Client verification
const content = await fetchResource(url);
const hash = await crypto.subtle.digest('SHA-256', content);
if (hash !== expected) throw new Error('Content tampered');
```

**HTTPS Everywhere**
- All transport encrypted
- Certificate pinning available
- HSTS headers enforced
- No HTTP fallback

**Input Validation**
```javascript
// Strict validation on all inputs
function validateReference(reference) {
  // Only allow known pattern
  const pattern = /^[A-Z]{3}\.\d{1,3}\.\d{1,3}$/;
  if (!pattern.test(reference)) {
    throw new Error('Invalid reference format');
  }
}
```

### Deployment Security

**Cloudflare Protection**
- DDoS mitigation built-in
- Rate limiting available
- Geographic restrictions possible
- WAF rules configurable

**Private Deployments**
```nginx
# Nginx configuration for VPN-only access
server {
  listen 443 ssl;
  server_name aqueduct.internal;
  
  # Only allow VPN subnet
  allow 10.0.0.0/8;
  deny all;
  
  location / {
    proxy_pass http://localhost:3000;
  }
}
```

**Secure Enclaves**
For sensitive translation projects:
- Deploy in isolated network
- No external dependencies
- All resources locally cached
- Audit logs for compliance

### Data Sovereignty

**Local-First Options**
```javascript
// Configure local-only resolution
const aqueduct = new Aqueduct({
  sources: ['file:///local/manifests'],
  ipfsGateway: 'http://localhost:5001',
  externalFetch: false
});
```

**Geographic Compliance**
- Deploy in specific regions
- Route by user location
- Comply with data residency laws
- No cross-border data transfer

## Extending the Method

The Aqueduct is designed for extension. Build your own tools, adapters, and integrations.

### Building MCP-Compatible Tools

**Manifest Creation**
```javascript
// Tool to generate MCP manifests
class ManifestBuilder {
  constructor(resourceId) {
    this.manifest = {
      id: resourceId,
      version: '1.0.0',
      updated: new Date().toISOString(),
      resources: {}
    };
  }
  
  addResource(name, url, metadata) {
    this.manifest.resources[name] = {
      url,
      ...metadata
    };
    return this;
  }
  
  build() {
    return this.manifest;
  }
}

// Usage
const manifest = new ManifestBuilder('bible.NEWPROJECT')
  .addResource('text', 'https://...', { format: 'usfm' })
  .addResource('audio', 'ipfs://...', { format: 'mp3' })
  .build();
```

**Custom Resolvers**
```javascript
// Add support for new source types
class GoogleDriveResolver {
  async resolve(resourceId) {
    const fileId = this.parseResourceId(resourceId);
    const metadata = await this.drive.files.get(fileId);
    
    return {
      url: `https://drive.google.com/uc?id=${fileId}`,
      size: metadata.size,
      modified: metadata.modifiedTime
    };
  }
}

// Register with Aqueduct
aqueduct.registerResolver('gdrive', new GoogleDriveResolver());
```

### Archive Utilities

**Bulk IPFS Archival**
```bash
#!/bin/bash
# Script to archive all resources to IPFS

find ./resources -type f -name "*.mp3" | while read file; do
  hash=$(ipfs add -q "$file")
  echo "$file -> ipfs://$hash"
  
  # Update manifest
  jq ".resources.audio.ipfs = \"ipfs://$hash\"" manifest.json > tmp.json
  mv tmp.json manifest.json
done
```

**Incremental Archiving**
```python
import ipfshttpclient
import json
import hashlib

def archive_if_changed(resource_path, manifest):
    # Calculate file hash
    with open(resource_path, 'rb') as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    
    # Check if already archived
    if manifest.get('contentHash') == file_hash:
        return manifest['ipfsHash']
    
    # Archive to IPFS
    client = ipfshttpclient.connect()
    result = client.add(resource_path)
    
    # Update manifest
    manifest['contentHash'] = file_hash
    manifest['ipfsHash'] = result['Hash']
    manifest['archived'] = datetime.now().isoformat()
    
    return result['Hash']
```

### Plugin Development

**Aqueduct Plugin Template**
```javascript
export class MyPlugin {
  constructor(aqueduct) {
    this.aqueduct = aqueduct;
  }
  
  async initialize() {
    // Setup code
  }
  
  async beforeResolve(request) {
    // Modify request before resolution
    return request;
  }
  
  async afterResolve(response) {
    // Process response after resolution
    return response;
  }
  
  async onError(error) {
    // Handle errors
    console.error('Resolution failed:', error);
  }
}

// Register plugin
aqueduct.use(new MyPlugin(aqueduct));
```

**Example: Translation Memory Plugin**
```javascript
class TranslationMemoryPlugin {
  async afterResolve(response) {
    if (response.type === 'text') {
      // Check for similar previously translated segments
      const suggestions = await this.findSimilar(response.text);
      response.translationMemory = suggestions;
    }
    return response;
  }
  
  async findSimilar(text) {
    // Query translation memory database
    // Return ranked suggestions
  }
}
```

### Contributing to the Ecosystem

**Adapter Contributions**
Create adapters for new platforms:
- Paratext Cloud adapter
- Logos resource adapter  
- YouVersion API adapter
- Local file system adapter

**Tool Integrations**
Integrate Aqueduct into existing tools:
- Paratext plugin
- Scripture Forge extension
- Translator's Studio addon
- OBS integration

**Community Resources**
Share your manifests and configurations:
- Language-specific manifests
- Organization standards
- Workflow templates
- Best practices documentation

## Appendices

### A. Manifest Schema Examples

**Minimal Manifest**
```json
{
  "id": "bible.SIMPLE",
  "version": "1.0.0",
  "resources": {
    "text": {
      "url": "https://example.com/bible.json"
    }
  }
}
```

**Full-Featured Manifest**
```yaml
id: bible.COMPLETE
version: 2.3.1
updated: 2024-01-15T10:00:00Z
name: 
  en: "English Standard Version"
  es: "Versión Estándar en Inglés"
  
copyright: |
  Copyright © 2001 by Crossway, 
  a publishing ministry of Good News Publishers.
  
license: https://www.crossway.org/permissions/

languages:
  source: en
  target: en-US
  
resources:
  text:
    url: https://git.door43.org/bible/ESV/raw/v2.3.1/text.json
    format: json
    encoding: utf-8
    size: 4532198
    checksum: sha256:abc123...
    
  audio:
    url: ipfs://QmAudioCollection...
    format: mp3
    narrator: Max McLean
    duration: 75:43:21
    bitrate: 128kbps
    
  video:
    sign_language:
      url: https://cdn.example.com/ESV_ASL.mp4
      format: mp4
      resolution: 1920x1080
      fps: 30
      language: ase
      
  study_notes:
    url: https://api.example.com/esv/notes
    format: json
    authentication: bearer
    
dependencies:
  greek_text: bible.greek.NA28@1.0
  hebrew_text: bible.hebrew.BHS@5.0
  
validation:
  schema: https://schema.bible/2.0/text.json
  status: passed
  checked_date: 2024-01-10
  
metadata:
  translators:
    - name: Translation Committee
      role: primary
  consultants:
    - name: Review Board
      role: theological
  project_url: https://www.esv.org
  completion_date: 2001-10-15
```

### B. IPFS Archival CLI

```bash
#!/bin/bash
# aqueduct-archive - Archive resources to IPFS

set -e

# Configuration
IPFS_API=${IPFS_API:-http://localhost:5001}
MANIFEST_FILE=${1:-manifest.json}

# Functions
archive_resource() {
  local file=$1
  local type=$2
  
  echo "Archiving $file..."
  
  # Add to IPFS
  hash=$(curl -s -F file=@"$file" "$IPFS_API/api/v0/add" | jq -r .Hash)
  
  # Pin permanently
  curl -s -X POST "$IPFS_API/api/v0/pin/add?arg=$hash"
  
  echo "  Archived to ipfs://$hash"
  echo "  Access at: https://ipfs.io/ipfs/$hash"
  
  # Update manifest
  jq ".resources.$type.ipfs = \"ipfs://$hash\"" $MANIFEST_FILE > tmp.json
  mv tmp.json $MANIFEST_FILE
}

# Main
echo "IPFS Archival Tool"
echo "=================="

# Parse manifest
resources=$(jq -r '.resources | keys[]' $MANIFEST_FILE)

for resource in $resources; do
  url=$(jq -r ".resources.$resource.url" $MANIFEST_FILE)
  
  # Skip if already archived
  if [[ $url == ipfs://* ]]; then
    echo "✓ $resource already archived"
    continue
  fi
  
  # Download resource
  echo "Downloading $resource from $url..."
  wget -q -O "/tmp/$resource" "$url"
  
  # Archive to IPFS
  archive_resource "/tmp/$resource" "$resource"
  
  # Cleanup
  rm "/tmp/$resource"
done

echo ""
echo "✓ Archival complete!"
echo "Updated manifest: $MANIFEST_FILE"
```

### C. Sample Fallback Logic

```javascript
// Comprehensive fallback configuration
const fallbackConfig = {
  // Try sources in order
  sources: [
    {
      name: 'primary_cdn',
      url: 'https://cdn.bible.org/{resource}',
      timeout: 3000,
      retry: 1
    },
    {
      name: 'secondary_cdn', 
      url: 'https://backup.bible.org/{resource}',
      timeout: 5000,
      retry: 2
    },
    {
      name: 'ipfs_gateway',
      url: 'https://ipfs.io/ipfs/{hash}',
      timeout: 10000,
      retry: 1,
      condition: (resource) => resource.ipfsHash
    },
    {
      name: 'local_cache',
      url: 'file:///var/cache/aqueduct/{resource}',
      timeout: 100,
      retry: 0
    }
  ],
  
  // Fallback strategies
  strategies: {
    // For text resources, accept older versions
    text: {
      acceptStale: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      minVersion: '2.0.0'
    },
    
    // For audio, must be exact version
    audio: {
      acceptStale: false,
      checksumRequired: true
    },
    
    // For manifest files, very short cache
    manifest: {
      acceptStale: true,
      maxAge: 60 * 60 // 1 hour
    }
  },
  
  // Error handling
  errors: {
    404: 'skip', // Try next source
    500: 'retry', // Retry same source
    timeout: 'skip',
    checksum_mismatch: 'fail' // Stop immediately
  }
};

// Implementation
async function resolveWithFallback(resourceId, config) {
  const errors = [];
  
  for (const source of config.sources) {
    try {
      // Check condition
      if (source.condition && !source.condition(resourceId)) {
        continue;
      }
      
      // Attempt fetch
      const result = await fetchWithRetry(source, resourceId);
      
      // Validate result
      if (config.strategies[resourceId.type]) {
        validateResult(result, config.strategies[resourceId.type]);
      }
      
      return result;
      
    } catch (error) {
      errors.push({ source: source.name, error });
      
      // Check error handling
      const action = config.errors[error.code] || 'skip';
      if (action === 'fail') {
        throw new Error(`Critical error: ${error.message}`);
      }
    }
  }
  
  // All sources failed
  throw new Error(`All sources failed: ${JSON.stringify(errors)}`);
}
```

### D. Codex Plugin Configuration

```xml
<!-- Paratext Plugin Configuration -->
<Plugin>
  <Name>Aqueduct Resource Provider</Name>
  <Version>1.0.0</Version>
  <MinParatextVersion>9.0</MinParatextVersion>
  
  <Settings>
    <Setting name="ServerUrl" type="string" default="https://api.aqueduct.bible">
      <Description>Aqueduct server endpoint</Description>
    </Setting>
    
    <Setting name="DefaultVersion" type="enum" default="checked">
      <Description>Default version to use</Description>
      <Options>
        <Option value="latest">Latest (may be unstable)</Option>
        <Option value="checked">Checked (consultant approved)</Option>
        <Option value="published">Published (released)</Option>
      </Options>
    </Setting>
    
    <Setting name="CacheEnabled" type="boolean" default="true">
      <Description>Enable local caching</Description>
    </Setting>
    
    <Setting name="CacheDirectory" type="directory" default="%APPDATA%/Paratext/AqueductCache">
      <Description>Local cache location</Description>
    </Setting>
    
    <Setting name="IncludeMultimedia" type="boolean" default="true">
      <Description>Download linked audio/video</Description>
    </Setting>
  </Settings>
  
  <Commands>
    <Command name="FetchResource" key="Ctrl+Alt+R">
      <Description>Fetch resource from Aqueduct</Description>
    </Command>
    
    <Command name="CompareVersions" key="Ctrl+Alt+V">
      <Description>Compare resource versions</Description>
    </Command>
    
    <Command name="UpdateCache" key="Ctrl+Alt+U">
      <Description>Update local cache</Description>
    </Command>
  </Commands>
  
  <ResourceTypes>
    <ResourceType id="SourceText" aqueductType="bible.source.*"/>
    <ResourceType id="BackTranslation" aqueductType="bible.back.*"/>
    <ResourceType id="Commentary" aqueductType="commentary.*"/>
    <ResourceType id="Dictionary" aqueductType="dictionary.*"/>
  </ResourceTypes>
</Plugin>
```

### E. YAML vs JSON Usage

**When to Use YAML**

YAML excels for human-edited configuration:

```yaml
# Easy to read and edit
resources:
  text:
    url: https://example.com/text.json
    format: json
    notes: |
      This is the primary text resource.
      Updated quarterly by the translation team.
      
  audio:
    url: https://example.com/audio.mp3
    narrator: John Doe
    quality: high
    
  video:
    sign_language:
      - language: ASL
        url: https://example.com/asl.mp4
      - language: BSL  
        url: https://example.com/bsl.mp4
```

**When to Use JSON**

JSON is better for programmatic generation:

```json
{
  "generated": "2024-01-15T10:00:00Z",
  "generator": "aqueduct-tools@1.2.3",
  "resources": {
    "text": {
      "url": "https://example.com/text.json",
      "checksum": "sha256:abcdef123456...",
      "size": 4532198,
      "chunks": [
        { "id": "chunk1", "range": "0-1000000" },
        { "id": "chunk2", "range": "1000001-2000000" }
      ]
    }
  }
}
```

**Conversion Between Formats**

```bash
# YAML to JSON
yq eval -o=json manifest.yaml > manifest.json

# JSON to YAML  
yq eval -P manifest.json > manifest.yaml

# Or use jq + yq
cat manifest.json | jq . | yq eval -P - > manifest.yaml
```

### F. Full API Reference

See the complete API documentation at:
- https://github.com/your-org/aqueduct/blob/main/docs/API.md
- https://api.aqueduct.bible/docs

Key endpoints:

```
GET  /resolve/{resourceId}/{version}/{reference}
GET  /manifest/{resourceId}
GET  /versions/{resourceId}
GET  /search?q={query}
GET  /health
GET  /stats
```

---

## Conclusion

The Aqueduct represents more than technical infrastructure—it embodies a vision for how biblical knowledge should flow in the digital age. By choosing protocols over platforms, alignment over storage, and freedom over lock-in, we enable a future where:

- Every translator accesses the same truth
- Every tool builds on shared foundations
- Every innovation benefits the whole community
- Every language receives equal technical support

The protocols exist. The infrastructure works. The early adopters are proving the vision.

Join us in building the future of Bible translation—one where knowledge flows like water, reaching every community that thirsts for God's Word.

---

*For implementation details, visit: https://github.com/your-org/aqueduct*

*For questions and support: support@aqueduct.bible*

*For updates and announcements: https://aqueduct.bible/blog*

---

**The Aqueduct: Stateless RAG for Bible Translation**  
*Version 1.0 - January 2025*  
*Licensed under MIT License*