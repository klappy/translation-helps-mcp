# Platform-Agnostic Function Architecture

This project uses a **shared business logic** approach that allows the same core functions to run on both **Netlify** and **Cloudflare** platforms without code duplication.

## 🏗️ Architecture Overview

```
translation-helps-mcp/
├── src/functions/                    # 🎯 Platform-agnostic business logic
│   ├── platform-adapter.ts          # Platform abstraction layer
│   ├── handlers/                     # Core function handlers
│   │   ├── get-languages.ts
│   │   ├── fetch-scripture.ts
│   │   └── ... (all function logic)
│   ├── *.ts                         # Shared services (copied from _shared)
│   └── utils.ts
├── netlify/functions/                # 🟦 Netlify-specific wrappers
│   ├── get-languages.ts            # Thin wrapper using createNetlifyHandler()
│   ├── fetch-scripture.ts          # Auto-generated
│   └── ... (all Netlify functions)
└── ui/src/routes/api/               # 🟨 SvelteKit API routes
    ├── get-languages/+server.ts    # Thin wrapper using createSvelteKitHandler()
    ├── fetch-scripture/+server.ts  # Auto-generated
    └── ... (all SvelteKit routes)
```

## 🎯 Key Benefits

1. **✅ No Code Duplication**: Business logic written once, used everywhere
2. **✅ Platform Flexibility**: Deploy to Netlify, Cloudflare, or both
3. **✅ Consistent APIs**: Same endpoints work on both platforms
4. **✅ Easy Testing**: Test business logic independent of platform
5. **✅ Auto-Generation**: Platform wrappers generated automatically

## 🚀 How It Works

### 1. Platform-Agnostic Handler

```typescript
// src/functions/handlers/get-languages.ts
export const getLanguagesHandler: PlatformHandler = async (request) => {
  // All business logic here - no platform-specific code!
  const result = await getLanguages(request.queryStringParameters);
  return { statusCode: 200, body: JSON.stringify(result) };
};
```

### 2. Platform Adapters

```typescript
// Netlify wrapper (auto-generated)
import { createNetlifyHandler } from "../../src/functions/platform-adapter";
import { getLanguagesHandler } from "../../src/functions/handlers/get-languages";
export const handler = createNetlifyHandler(getLanguagesHandler);

// SvelteKit wrapper (auto-generated)
import { createSvelteKitHandler } from "../../../src/functions/platform-adapter";
import { getLanguagesHandler } from "../../../src/functions/handlers/get-languages";
export const GET = createSvelteKitHandler(getLanguagesHandler);
```

## 🛠️ Commands

### Generate Platform Wrappers

```bash
npm run generate:functions
```

Auto-generates both Netlify functions and SvelteKit API routes from shared handlers.

### Build for Netlify

```bash
npm run build:netlify
```

Uses existing Netlify functions (already generated).

### Build for Cloudflare

```bash
npm run build:cloudflare-full
```

1. Generates fresh SvelteKit API routes
2. Builds SvelteKit app with Cloudflare adapter
3. Deploys with built-in SvelteKit API routes

## 🎯 Deployment Scenarios

### Scenario A: Netlify Only

- Uses `netlify/functions/` (Netlify Functions)
- Traditional serverless functions approach

### Scenario B: Cloudflare Only

- Uses `ui/src/routes/api/` (SvelteKit API routes)
- Everything bundled in the SvelteKit app

### Scenario C: Multi-Platform

- Same codebase deploys to both platforms
- Identical API behavior on both platforms
- Choose platform based on performance/cost needs

## 🔧 Adding New Functions

1. **Create shared handler**: `src/functions/handlers/my-new-function.ts`
2. **Add to generator**: Update `scripts/generate-platform-functions.js`
3. **Generate wrappers**: Run `npm run generate:functions`
4. **Deploy**: Both platforms now have the new function!

## 📦 Dependencies

The platform adapter handles all the differences:

- **Request parsing**: Query params, headers, body
- **Response formatting**: Status codes, headers, CORS
- **Error handling**: Consistent error responses
- **Platform quirks**: Netlify events vs. SvelteKit requests

This architecture gives you **maximum flexibility** with **minimum maintenance**! 🎉
