# Cloudflare Services Used by Translation Helps MCP Project

**Last Updated:** November 4, 2025

---

## Current Status

✅ **All services operating within free tiers - $0/month**

---

## Services Used

### 1. Cloudflare Pages

**Why we use it:** Hosts our web application and serves the API endpoints globally at the edge.

📖 **Pricing:** [Cloudflare Pages Pricing](https://developers.cloudflare.com/pages/platform/pricing/)

---

### 2. Cloudflare Workers

**Why we use it:** Runs our serverless API functions that fetch and process Bible translation resources.

📖 **Pricing:** [Cloudflare Workers Pricing](https://workers.cloudflare.com/pricing)

---

### 3. Cloudflare Workers KV

**Why we use it:** Caches metadata like catalog information, organization data, and language listings to speed up responses.

📖 **Pricing:** [Cloudflare Workers KV Pricing](https://developers.cloudflare.com/kv/platform/pricing/)

---

### 4. Cloudflare R2 Storage

**Why we use it:** Stores ZIP archives of Bible translations and translation resources to avoid repeatedly downloading large files.

📖 **Pricing:** [Cloudflare R2 Storage Pricing](https://developers.cloudflare.com/r2/pricing/)

---

## Key Advantage

**Zero egress fees** - R2 doesn't charge for data transferred out, unlike AWS S3 which charges $90 per TB.
