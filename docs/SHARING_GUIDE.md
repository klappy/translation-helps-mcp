# Resource Sharing Guide

Complete guide to sharing translation resources offline via USB drives, Bluetooth, or any direct transfer method.

## Why Share Resources?

- 🌍 **Reach remote areas** without internet
- 💰 **Save bandwidth** in low-connectivity regions
- 🔒 **Maintain privacy** with air-gapped systems
- 👥 **Enable teams** to work offline together
- 📱 **Support mobile** translation work

## Quick Start

### Simplest Workflow

**Person A (has internet):**

```bash
th-cli export en --output ~/Desktop/share/
```

**Person B (no internet):**

```bash
th-cli import ~/Desktop/share/share-package-en-*.zip
th-cli
```

Done! Person B can now use all English translation helps offline.

## Detailed Workflows

### Scenario 1: USB Drive Sharing

**Perfect for: Field teams, remote workers, conferences**

**Sender (online computer):**

```bash
# 1. Sync latest resources
th-cli sync en

# 2. Export to USB drive
th-cli export en --output /media/usb-drive/

# 3. Safely eject USB drive
```

**Recipient (offline computer):**

```bash
# 1. Insert USB drive

# 2. Import resources
th-cli import /media/usb-drive/share-package-en-*.zip

# 3. Verify import
th-cli cache stats

# 4. Start using
th-cli
```

**Estimated Time:**

- Export: 30-60 seconds
- USB transfer: 1-2 minutes
- Import: 30-60 seconds
- Total: ~3-5 minutes for full English set

### Scenario 2: Bluetooth Transfer

**Perfect for: Mobile devices, quick shares, small datasets**

**Sender:**

```bash
# Create compressed bundle (smaller file)
th-cli export en --compress 9

# Share via Bluetooth/AirDrop
# File will be in: ~/.translation-helps-mcp/cache/exports/
```

**Recipient:**

```bash
# Import from Downloads
th-cli import ~/Downloads/share-package-en-*.zip
```

**File Sizes:**

- ULT only: ~50MB
- ULT + TN: ~150MB
- Full English: ~600MB (use `--compress 9` to reduce by ~20%)

### Scenario 3: CD/DVD Distribution

**Perfect for: Training events, bulk distribution, long-term storage**

```bash
# Split into CD-sized chunks (650MB)
th-cli export en --split 650MB --output ~/cd-burn/

# Creates multiple files:
# share-en.part1.zip (650MB)
# share-en.part2.zip (remaining)

# Burn to separate CDs

# Recipient combines and imports:
th-cli import ~/cd-contents/share-en.part*.zip
```

### Scenario 4: Multi-Language Bundle

**Perfect for: Organizations, training centers, multi-lingual teams**

```bash
# Create bundle with multiple languages
th-cli export --bundle en/ult,en/tn,en/tq,es/ult,es/tn,fr/ult,fr/tn

# This creates a custom package with only specified resources
# Reduces transfer size compared to full language exports
```

### Scenario 5: Minimal Translation Kit

**Perfect for: Basic translation work, limited storage, slow transfers**

```bash
# Export only essential resources
th-cli export --bundle en/ult,en/tn

# Results in ~150MB package instead of 600MB
# Sufficient for basic translation work
```

## Export Options

### Compression Levels

```bash
# Fast compression (default)
th-cli export en

# Maximum compression (smaller file, slower)
th-cli export en --compress 9

# No compression (fastest, larger file)
th-cli export en --compress 0
```

**Compression Comparison:**

- Level 0: 600MB, 5 seconds
- Level 6 (default): 480MB, 20 seconds
- Level 9: 450MB, 45 seconds

### Split Files

```bash
# Split into 100MB chunks
th-cli export en --split 100MB

# Split into CD-sized chunks
th-cli export en --split 650MB

# Split into DVD-sized chunks
th-cli export en --split 4GB
```

### Custom Output

```bash
# Specific directory
th-cli export en --output ~/Desktop/share/

# Network share
th-cli export en --output /mnt/network-share/

# Cloud sync folder
th-cli export en --output ~/Dropbox/translation-helps/
```

## Import Options

### Single File

```bash
th-cli import ~/Downloads/share-package-en-*.zip
```

### Multiple Files

```bash
# Import all ZIPs from a directory
th-cli import --dir ~/usb-drive/
```

### Verification

```bash
# Verify before importing
th-cli import verify ~/Downloads/share-package-en-*.zip

# Will check:
# - ZIP file integrity
# - Manifest checksums
# - Resource structure
```

## Best Practices

### For Senders

1. **Verify before exporting**

   ```bash
   th-cli cache stats
   ```

2. **Use compression for bandwidth-limited scenarios**

   ```bash
   th-cli export en --compress 9
   ```

3. **Include manifest metadata**
   - Always kept automatically
   - Recipients can verify integrity

4. **Test the package**
   - Import on a test system first
   - Verify all resources work

### For Recipients

1. **Verify after import**

   ```bash
   th-cli cache stats
   th-cli import verify file.zip
   ```

2. **Check available resources**

   ```bash
   th-cli cache stats
   ```

3. **Test immediately**
   ```bash
   th-cli
   # Try querying a passage
   ```

## Transfer Methods Comparison

| Method        | Speed    | Range  | Setup          | Best For              |
| ------------- | -------- | ------ | -------------- | --------------------- |
| USB Drive     | Fast     | Manual | None           | Most scenarios        |
| Bluetooth     | Medium   | ~10m   | Pairing        | Quick mobile shares   |
| AirDrop       | Fast     | ~10m   | None (Mac/iOS) | Apple devices         |
| Network Share | Fast     | LAN    | Setup          | Office environments   |
| CD/DVD        | Slow     | Manual | Burner         | Long-term storage     |
| Cloud Sync    | Variable | Global | Account        | Hybrid online/offline |

## Troubleshooting

### Export Fails

**Symptoms**: Error during export

**Solutions**:

```bash
# Check disk space
df -h ~/.translation-helps-mcp/

# Check resource availability
th-cli cache stats

# Verify cache integrity
th-cli cache verify

# Re-sync if needed
th-cli sync en
```

### Import Fails

**Symptoms**: Error during import

**Solutions**:

```bash
# Verify ZIP file first
th-cli import verify file.zip

# Check disk space
df -h ~/.translation-helps-mcp/

# Try bulk import
th-cli import --dir /path/to/zips/

# Check file permissions
ls -la file.zip
```

### Checksum Mismatch

**Symptoms**: "Checksum verification failed"

**Cause**: File corrupted during transfer

**Solutions**:

1. Re-download/re-export the package
2. Use different transfer method
3. Split into smaller chunks
4. Verify file integrity on sender before transfer

### Missing Resources

**Symptoms**: "Resource not found" during import

**Cause**: Incomplete package or wrong resource type

**Solutions**:

```bash
# List what's in the package
unzip -l share-package-*.zip

# Check manifest
unzip -p share-package-*.zip manifest.json

# Re-export with correct resources
th-cli export en  # Full language
```

## Advanced Topics

### Custom Bundles

Create exactly what you need:

```bash
# Translation notes and words only
th-cli export --bundle en/tn,en/tw,en/twl

# Multiple languages, minimal set
th-cli export --bundle en/ult,en/tn,es/ult,es/tn

# Specific books (future feature)
# th-cli export --bundle en/ult --books "MAT,MRK,LUK,JHN"
```

### Bandwidth Optimization

```bash
# Maximum compression
th-cli export en --compress 9

# Plus splitting for slow connections
th-cli export en --compress 9 --split 10MB

# Transfer parts separately
# Each part is independent and can be sent via different methods
```

### Team Workflows

**Organizational Setup:**

1. **Central resource server**
   - Downloads all needed languages
   - Creates periodic exports
   - Maintains version control

2. **Distribution**
   - USB drives for field workers
   - Network shares for offices
   - Cloud sync for hybrid teams

3. **Updates**
   - Periodic re-exports with latest content
   - Delta updates (future feature)
   - Version tracking in manifests

## Storage Planning

### Per-Language Estimates

| Language   | Size  | Notes                   |
| ---------- | ----- | ----------------------- |
| English    | 600MB | Full set with all helps |
| Spanish    | 550MB | Full set                |
| French     | 580MB | Full set                |
| Portuguese | 520MB | Full set                |
| Russian    | 590MB | Full set                |

### Minimal Sets

| Resources     | Size  | Use Case                     |
| ------------- | ----- | ---------------------------- |
| ULT only      | 50MB  | Basic text only              |
| ULT + TN      | 150MB | Text + translation notes     |
| ULT + TN + TW | 200MB | Most common needs            |
| Full set      | 600MB | Complete translation toolkit |

### Planning Examples

**USB Drive (16GB):**

- Can hold: ~25 full languages
- Or: 100+ minimal sets
- Best for: Multi-language distribution

**DVD (4.7GB):**

- Can hold: ~7 full languages
- Or: 30+ minimal sets
- Best for: Training materials

**SD Card (32GB):**

- Can hold: ~50 full languages
- Or: 200+ minimal sets
- Best for: Mobile/tablet deployment

## FAQ

**Q: Can I use resources from multiple sources?**  
A: Yes! Import packages from different people. Resources are merged.

**Q: How do I update resources?**  
A: Import a newer package. It overwrites older versions.

**Q: Can I share just one resource type?**  
A: Yes! Use `th-cli export en tn` to export only translation notes.

**Q: What if import fails halfway?**  
A: Safe - imports are atomic per resource. Partial success is fine.

**Q: Can I verify without importing?**  
A: Yes! Use `th-cli import verify file.zip` to check integrity.

**Q: How do I know what I have cached?**  
A: Run `th-cli cache stats` to see all downloaded resources.

**Q: Can I delete specific languages?**  
A: Yes! Use `th-cli cache clear en` to remove English resources.

## Support

For issues or questions:

- Check the [CLI README](../clients/cli/README.md)
- Review [Offline Architecture](OFFLINE_ARCHITECTURE.md)
- File an issue on GitHub
