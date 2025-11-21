# Offline-First Architecture

This document describes the offline-first architecture of the Translation Helps MCP system.

## Vision

**Enable Bible translation work anywhere, even without internet access.**

This includes:

- Remote missionary fields
- Areas with unreliable connectivity
- Air-gapped secure environments
- Low-bandwidth scenarios
- Cost-sensitive deployments (avoiding API fees)

## Architecture Principles

### 1. Offline-First

The system is designed to work offline **by default**, with online connectivity as an enhancement:

- ✅ **Core functionality works offline**
- ✅ **Local AI (Ollama) requires no internet**
- ✅ **Resources cached locally**
- ✅ **Peer-to-peer resource sharing**
- ⚡ **Online mode enables**: updates, syncing, cloud AI

### 2. Progressive Enhancement

Features degrade gracefully:

```
Full Online → Partial Online → Fully Offline
    ↓              ↓                ↓
All features   Cached only    Local cache only
Cloud AI       Local AI       Local AI
Auto-sync      Manual sync    No sync
```

### 3. Zero-Trust Network

The system **never assumes** network availability:

- Always check `isOnline()` before network requests
- Immediate fallback to local cache
- User-friendly offline error messages
- Background sync when connection returns

## Components

### Network Detection

**File**: `src/utils/network-detector.ts`

- Checks Door43 availability
- Caches status for 30 seconds
- Provides status change callbacks
- Used by all network-dependent components

```typescript
const online = await networkDetector.isOnline();
if (!online) {
  // Use local cache only
}
```

### Pluggable Cache System

**Files**: `src/functions/caches/*.ts`

Three-tier cache with configurable providers:

1. **Memory** (always available)
2. **File System** (Node.js, offline-capable)
3. **Cloudflare KV** (Workers, online-only)

See [CACHE_ARCHITECTURE.md](CACHE_ARCHITECTURE.md) for details.

### Resource Sync Service

**File**: `src/services/ResourceSync.ts`

Downloads complete resource repositories:

- **Source**: Door43 Content Service
- **Format**: ZIP files
- **Storage**: `~/.translation-helps-mcp/cache/resources/`
- **Languages**: On-demand download
- **Updates**: Check for newer versions

```bash
# Download all English resources
th-cli sync en

# Check download status
th-cli sync status
```

### Resource Transfer Service

**File**: `src/services/ResourceTransfer.ts`

Import/Export for offline sharing:

- **Export**: Create share packages with manifests
- **Import**: Validate and install resources
- **Formats**: ZIP with checksums
- **Bulk**: Multiple languages/resources
- **Split**: Large files into chunks

```bash
# Export resources
th-cli export en --output ~/usb-drive/

# Import resources
th-cli import ~/usb-drive/share-package-en-*.zip
```

## Data Flow

### Online Mode

```mermaid
User Request
    ↓
Memory Cache → (miss)
    ↓
FS/KV Cache → (miss)
    ↓
Door43 API → (fetch)
    ↓
Store in all caches
    ↓
Return to user
```

### Offline Mode

```mermaid
User Request
    ↓
Memory Cache → (miss)
    ↓
FS Cache → (hit)
    ↓
Warm Memory Cache
    ↓
Return to user
```

### First-Time Offline Setup

```mermaid
Online Computer
    ↓
Download resources (th-cli sync en)
    ↓
Export to USB (th-cli export en --output /usb/)
    ↓
Transfer to offline computer
    ↓
Import on offline computer (th-cli import /usb/*.zip)
    ↓
Use offline with local Ollama AI
```

## Resource Sharing

### Share Package Format

```
share-package-en-2024-01-15.zip
├── manifest.json         # Metadata and checksums
├── en_ult.zip           # Unlocked Literal Text
├── en_ust.zip           # Unlocked Simplified Text
├── en_tn.zip            # Translation Notes
├── en_tq.zip            # Translation Questions
├── en_tw.zip            # Translation Words
├── en_twl.zip           # Translation Word Links
└── en_ta.zip            # Translation Academy
```

### Manifest Structure

```json
{
  "version": "1.0",
  "createdAt": "2024-01-15T10:30:00Z",
  "language": "en",
  "resources": [
    {
      "type": "ult",
      "filename": "en_ult.zip",
      "size": 5242880,
      "checksum": "sha256:abc123..."
    }
  ],
  "creator": "Organization Name",
  "description": "English translation helps"
}
```

### Integrity Verification

- **SHA-256 checksums** for each resource
- **Validation** before import
- **Corruption detection** during extraction
- **Automatic retry** for failed imports

## Offline Scenarios

### Scenario 1: Intermittent Connectivity

**User has occasional internet access**

- Sync resources when online
- Work offline when connection drops
- Auto-sync when connection returns
- Seamless transition between modes

### Scenario 2: Air-Gapped Environment

**No internet access ever**

1. Download resources on internet-connected computer
2. Export to USB drive
3. Transfer physically to air-gapped computer
4. Import and use completely offline

### Scenario 3: Limited Bandwidth

**Slow or expensive internet**

- Download once, use forever
- Export compressed packages
- Split large files for easier transfer
- Share resources peer-to-peer

### Scenario 4: Mobile/Field Work

**Remote areas with no connectivity**

- Pre-load resources before travel
- Work entirely offline
- Share resources with team via Bluetooth
- No cloud dependencies

## Storage Requirements

### Minimal Setup

```
Ollama (Mistral 7B):  4.1 GB
English ULT + TN:     150 MB
Total:                ~4.3 GB
```

### Full English Setup

```
Ollama (Mistral 7B):  4.1 GB
All English resources: 600 MB
Total:                ~4.7 GB
```

### Multi-Language Setup

```
Ollama (Mistral 7B):       4.1 GB
English resources:         600 MB
Spanish resources:         550 MB
French resources:          580 MB
Total:                     ~5.8 GB
```

## Security Considerations

### Offline Security Benefits

- **No data leakage**: Translation work stays local
- **No API keys** needed (with Ollama)
- **No cloud logs**: Complete privacy
- **Air-gap compatible**: Maximum security

### Share Package Security

- **Checksums**: Verify integrity
- **Validation**: Check structure before import
- **No executable code**: Only data files
- **Source verification**: Manifests track origin

## Performance

### Cache Hit Rates

| Scenario          | Memory | FS  | Network |
| ----------------- | ------ | --- | ------- |
| Online first-time | 0%     | 0%  | 100%    |
| Online subsequent | 85%    | 10% | 5%      |
| Offline           | 80%    | 20% | 0%      |

### Typical Latencies

- **Memory hit**: < 1ms
- **FS hit**: 1-10ms
- **Network fetch**: 100-500ms
- **Full offline**: 1-10ms average

## Future Enhancements

### Mobile Support

- **iOS/Android apps** using same architecture
- **IndexedDB** for browser caching
- **Background sync** when connected
- **Bluetooth sharing** built-in

### Enhanced Sync

- **Differential updates**: Only download changes
- **Resume failed downloads**: Don't restart from scratch
- **Bandwidth throttling**: Limit download speed
- **Scheduled sync**: Auto-update at specific times

### P2P Mesh

- **Direct device-to-device** transfer
- **Mesh networking** for teams
- **Automatic discovery** of nearby resources
- **Smart routing**: Find fastest source

## Migration Guide

### From Online-Only

1. Install Ollama and pull a model
2. Sync your primary language
3. Test offline mode
4. Update workflows to work offline-first

### From Existing Cache

The new system is backward compatible:

- Old cached data still works
- Automatically migrates on first use
- No manual intervention needed
- Existing functionality preserved

## Troubleshooting

### Cache Not Working

```bash
# Check cache stats
th-cli cache stats

# Verify providers
th-cli cache providers

# Test write
th-cli cache verify
```

### Sync Failures

```bash
# Check network
curl -I https://git.door43.org

# Check disk space
df -h ~/.translation-helps-mcp/

# Retry sync
th-cli sync en
```

### Import Failures

```bash
# Verify ZIP file
th-cli import verify file.zip

# Check free space
df -h

# Re-import
th-cli import file.zip
```

## Monitoring

### Cache Statistics

```bash
th-cli cache stats
```

Shows:

- Provider availability
- Item counts
- Size per provider
- Hit rates
- Disk usage

### Network Status

```bash
th-cli status
```

Shows:

- Online/offline status
- Active AI provider
- MCP connection
- Cache providers active

## Technical Details

### File System Paths

```
Windows: C:\Users\{user}\.translation-helps-mcp\cache\
Mac:     /Users/{user}/.translation-helps-mcp/cache/
Linux:   /home/{user}/.translation-helps-mcp/cache/
```

### Network Checks

- **Endpoint**: `https://git.door43.org`
- **Method**: HEAD request
- **Timeout**: 5 seconds
- **Cache**: 30 seconds
- **Retry**: Exponential backoff

### Graceful Degradation

1. Try fastest cache (Memory)
2. Try persistent cache (FS/KV)
3. Try network (Door43)
4. Return cached stale data if available
5. Return error only if nothing available

This ensures **maximum uptime** and **best user experience** regardless of network conditions.
