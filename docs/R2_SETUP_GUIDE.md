# R2 Bucket Setup Guide

## Problem

Production returns 404 errors for translation resources (notes, words, academy) even though the code is deployed correctly. This happens because the R2 bucket is empty.

## Solution

The R2 bucket needs to be populated with ZIP files from Door43 Content Service (DCS).

### Manual Setup (Current Method)

Since there's no automated seeding script yet, you'll need to:

1. **Access Cloudflare Dashboard**
   - Go to R2 > translation-helps-mcp-zip-persistence
   - This bucket stores all the ZIP files for resources

2. **Required ZIP Files**
   - Translation Notes: `en_tn.zip` from https://git.door43.org/unfoldingWord/en_tn
   - Translation Words: `en_tw.zip` from https://git.door43.org/unfoldingWord/en_tw
   - Translation Academy: `en_ta.zip` from https://git.door43.org/unfoldingWord/en_ta
   - Translation Questions: `en_tq.zip` from https://git.door43.org/unfoldingWord/en_tq
   - Scripture (ULT): `en_ult.zip` from https://git.door43.org/unfoldingWord/en_ult
   - Scripture (UST): `en_ust.zip` from https://git.door43.org/unfoldingWord/en_ust

3. **Download and Upload**
   - Download each ZIP from the releases page
   - Upload to R2 bucket with the correct naming convention:
     - Pattern: `{language}_{resource}.zip`
     - Example: `en_tn.zip`, `en_tw.zip`, etc.

### Automated Solution (TODO)

We need to create a script that:

1. Fetches ZIP URLs from DCS API
2. Downloads the ZIPs
3. Uploads them to R2 using Wrangler CLI
4. Could be run during deployment or as a scheduled job

### Verification

After uploading, test the endpoints:

```bash
# Should return actual data, not 404
curl https://translation-helps-mcp.pages.dev/api/translation-notes?reference=John%203:16
```

## Why This Happens

- Dev environment might have cached data or different ZIP access
- Production R2 bucket starts empty after creation
- No automatic seeding process exists yet

## Temporary Workaround

Until R2 is populated, the app will:

- Scripture endpoints might work (if using direct API calls)
- Translation helps will return 404 errors
- Health check shows R2 as "available" but resources won't load
