/**
 * Experimental Endpoint Configurations
 *
 * ⚠️ WARNING: These are placeholder configurations for future features
 * They are not implemented yet but showcase what's coming!
 */

import type { EndpointConfig } from "../EndpointConfig";

/**
 * Placeholder experimental endpoints
 * These are displayed in the UI but not actually functional yet
 */
export const ExperimentalEndpoints: EndpointConfig[] = [
  {
    name: "ai-translation-assistant",
    title: "🤖 AI Translation Assistant",
    path: "/api/ai-translation-assistant",
    category: "experimental",
    enabled: false,
    description:
      "Coming Soon: Real-time AI-powered translation suggestions based on context and best practices",
    params: {},
    dataSource: { type: "computed" },
    responseShape: {
      dataType: "object",
      structure: {
        required: ["placeholder"],
        optional: [],
      },
      performance: {
        maxResponseTime: 1000,
        cacheable: false,
      },
    },
    performance: {
      expectedMs: 1000,
      cacheStrategy: "minimal",
    },
  },
  {
    name: "parallel-passage-finder",
    title: "🔍 Parallel Passage Finder",
    path: "/api/parallel-passages",
    category: "experimental",
    enabled: false,
    description:
      "Coming Soon: Discover parallel passages and cross-references across the entire Bible",
    params: {},
    dataSource: { type: "computed" },
    responseShape: {
      dataType: "object",
      structure: {
        required: ["placeholder"],
        optional: [],
      },
      performance: {
        maxResponseTime: 1000,
        cacheable: true,
      },
    },
    performance: {
      expectedMs: 1500,
      cacheStrategy: "standard",
    },
  },
  {
    name: "translation-memory",
    title: "💾 Translation Memory Engine",
    path: "/api/translation-memory",
    category: "experimental",
    enabled: false,
    description:
      "Coming Soon: Leverage past translations to ensure consistency across your project",
    params: {},
    dataSource: { type: "computed" },
    responseShape: {
      dataType: "object",
      structure: {
        required: ["placeholder"],
        optional: [],
      },
      performance: {
        maxResponseTime: 500,
        cacheable: true,
      },
    },
    performance: {
      expectedMs: 500,
      cacheStrategy: "aggressive",
    },
  },
  {
    name: "cultural-context-analyzer",
    title: "🌍 Cultural Context Analyzer",
    path: "/api/cultural-context",
    category: "experimental",
    enabled: false,
    description: "Coming Soon: Understand cultural nuances and idioms for better contextualization",
    params: {},
    dataSource: { type: "computed" },
    responseShape: {
      dataType: "object",
      structure: {
        required: ["placeholder"],
        optional: [],
      },
      performance: {
        maxResponseTime: 2000,
        cacheable: true,
      },
    },
    performance: {
      expectedMs: 2000,
      cacheStrategy: "standard",
    },
  },
  {
    name: "hebrew-greek-interlinear",
    title: "📜 Hebrew/Greek Interlinear",
    path: "/api/interlinear",
    category: "experimental",
    enabled: false,
    description: "Coming Soon: Word-by-word alignment with original Hebrew and Greek texts",
    params: {},
    dataSource: { type: "computed" },
    responseShape: {
      dataType: "object",
      structure: {
        required: ["placeholder"],
        optional: [],
      },
      performance: {
        maxResponseTime: 1500,
        cacheable: true,
      },
    },
    performance: {
      expectedMs: 1500,
      cacheStrategy: "aggressive",
    },
  },
  {
    name: "audio-scripture-sync",
    title: "🎧 Audio Scripture Sync",
    path: "/api/audio-sync",
    category: "experimental",
    enabled: false,
    description:
      "Coming Soon: Synchronized audio narration with text highlighting for oral learners",
    params: {},
    dataSource: { type: "computed" },
    responseShape: {
      dataType: "object",
      structure: {
        required: ["placeholder"],
        optional: [],
      },
      performance: {
        maxResponseTime: 3000,
        cacheable: true,
      },
    },
    performance: {
      expectedMs: 3000,
      cacheStrategy: "standard",
    },
  },
  {
    name: "fetch-ult-scripture",
    title: "Fetch ULT Scripture",
    path: "/fetch-ult-scripture",
    category: "experimental",
    enabled: false,
    description:
      "⚠️ EXPERIMENTAL: Fetch ULT/GLT scripture with alignment data (not fully implemented)",
    params: {},
    dataSource: { type: "computed" },
    responseShape: {
      dataType: "object",
      structure: {
        required: ["placeholder"],
        optional: [],
      },
      performance: {
        maxResponseTime: 1000,
        cacheable: true,
      },
    },
    performance: {
      expectedMs: 1000,
      cacheStrategy: "standard",
    },
  },
  {
    name: "fetch-ust-scripture",
    title: "Fetch UST Scripture",
    path: "/fetch-ust-scripture",
    category: "experimental",
    enabled: false,
    description:
      "⚠️ EXPERIMENTAL: Fetch UST/GST scripture with clarity metrics (not fully implemented)",
    params: {},
    dataSource: { type: "computed" },
    responseShape: {
      dataType: "object",
      structure: {
        required: ["placeholder"],
        optional: [],
      },
      performance: {
        maxResponseTime: 1000,
        cacheable: true,
      },
    },
    performance: {
      expectedMs: 1000,
      cacheStrategy: "standard",
    },
  },
];
