/**
 * Experimental Endpoint Configurations
 *
 * ⚠️ WARNING: These endpoints are experimental and may change or be removed
 * without notice. Do not use in production!
 */

import type { EndpointConfig } from "../EndpointConfig";

/**
 * AI Content Summarizer endpoint
 */
export const AISummarizerEndpoint: EndpointConfig = {
  name: "ai-summarize-content",
  path: "/api/ai-summarize",
  category: "experimental",
  description: "🧪 EXPERIMENTAL: AI-powered content summarization (currently mock data)",
  params: {
    reference: {
      type: "string",
      required: true,
      description: "Bible reference to summarize",
    },
    contentType: {
      type: "string",
      required: true,
      description: "Type of content to summarize",
      validation: {
        enum: ["notes", "words", "questions", "all"],
      },
    },
    maxLength: {
      type: "number",
      required: false,
      default: 500,
      description: "Maximum summary length in characters",
    },
  },
  dataSource: {
    type: "computed",
  },
  responseShape: {
    type: "context",
    fields: {
      summary: {
        type: "string",
        description: "AI-generated summary",
      },
      reference: {
        type: "string",
        description: "Reference being summarized",
      },
      sources: {
        type: "array",
        description: "Sources used for summary",
      },
      confidence: {
        type: "number",
        description: "AI confidence score (0-1)",
      },
    },
  },
  examples: [
    {
      params: { reference: "John 3:16", contentType: "all" },
      response: {
        summary: "This verse emphasizes God's love for humanity...",
        reference: "John 3:16",
        sources: ["tn", "tw"],
        confidence: 0.95,
      },
    },
  ],
  performance: {
    expectedMs: 2000,
    cacheStrategy: "minimal",
  },
};

/**
 * AI Quality Checker endpoint
 */
export const AIQualityCheckerEndpoint: EndpointConfig = {
  name: "ai-quality-check",
  path: "/api/ai-quality-check",
  category: "experimental",
  description: "🧪 EXPERIMENTAL: AI-powered translation quality assessment (currently mock data)",
  params: {
    sourceText: {
      type: "string",
      required: true,
      description: "Original source text",
    },
    translatedText: {
      type: "string",
      required: true,
      description: "Translated text to check",
    },
    checkType: {
      type: "string",
      required: false,
      default: "comprehensive",
      description: "Type of quality check",
      validation: {
        enum: ["accuracy", "fluency", "terminology", "comprehensive"],
      },
    },
  },
  dataSource: {
    type: "computed",
  },
  responseShape: {
    type: "context",
    fields: {
      score: {
        type: "number",
        description: "Overall quality score (0-100)",
      },
      issues: {
        type: "array",
        description: "Identified quality issues",
      },
      suggestions: {
        type: "array",
        description: "Improvement suggestions",
      },
      checkType: {
        type: "string",
        description: "Type of check performed",
      },
    },
  },
  examples: [
    {
      params: {
        sourceText: "For God so loved the world",
        translatedText: "Porque Dios amó tanto al mundo",
        checkType: "comprehensive",
      },
      response: {
        score: 92,
        issues: [],
        suggestions: ["Consider alternate phrasing for emphasis"],
        checkType: "comprehensive",
      },
    },
  ],
  performance: {
    expectedMs: 3000,
    cacheStrategy: "minimal",
  },
};

/**
 * Smart Resource Recommendations endpoint
 */
export const SmartRecommendationsEndpoint: EndpointConfig = {
  name: "smart-recommendations",
  path: "/api/smart-recommendations",
  category: "experimental",
  description: "🧪 EXPERIMENTAL: Context-aware resource recommendations",
  params: {
    reference: {
      type: "string",
      required: true,
      description: "Bible reference",
    },
    userRole: {
      type: "string",
      required: true,
      description: "User role",
      validation: {
        enum: ["translator", "checker", "consultant", "facilitator"],
      },
    },
    currentTask: {
      type: "string",
      required: false,
      description: "Current translation task",
    },
    difficulty: {
      type: "string",
      required: false,
      default: "auto",
      description: "Passage difficulty",
      validation: {
        enum: ["easy", "moderate", "difficult", "auto"],
      },
    },
  },
  dataSource: {
    type: "computed",
  },
  responseShape: {
    type: "discovery",
    fields: {
      recommendations: {
        type: "array",
        description: "Recommended resources with priority and reasoning",
      },
      analysisMetadata: {
        type: "object",
        description: "Details about the analysis performed",
      },
      confidence: {
        type: "number",
        description: "Recommendation confidence (0-1)",
      },
    },
  },
  examples: [
    {
      params: {
        reference: "Romans 9",
        userRole: "translator",
      },
      response: {
        recommendations: [
          {
            resource: "tn",
            priority: "high",
            reason: "Complex theological concepts require translation notes",
          },
        ],
        analysisMetadata: {
          complexity: "high",
          themes: ["election", "sovereignty"],
        },
        confidence: 0.88,
      },
    },
  ],
  performance: {
    expectedMs: 1500,
    cacheStrategy: "moderate",
  },
};

/**
 * Advanced Cache Analytics endpoint
 */
export const CacheAnalyticsEndpoint: EndpointConfig = {
  name: "cache-analytics",
  path: "/api/cache-analytics",
  category: "experimental",
  description: "🧪 EXPERIMENTAL: Advanced cache performance analytics",
  params: {
    timeRange: {
      type: "string",
      required: false,
      default: "1h",
      description: "Time range for analytics",
      validation: {
        enum: ["5m", "1h", "24h", "7d", "30d"],
      },
    },
    endpoint: {
      type: "string",
      required: false,
      description: "Filter by specific endpoint",
    },
  },
  dataSource: {
    type: "computed",
  },
  responseShape: {
    type: "discovery",
    fields: {
      hitRate: {
        type: "number",
        description: "Cache hit rate percentage",
      },
      avgResponseTime: {
        type: "object",
        description: "Average response times for hit/miss",
      },
      hotKeys: {
        type: "array",
        description: "Most frequently accessed cache keys",
      },
      recommendations: {
        type: "array",
        description: "Cache optimization recommendations",
      },
    },
  },
  examples: [
    {
      params: { timeRange: "1h" },
      response: {
        hitRate: 85.3,
        avgResponseTime: {
          hit: 45,
          miss: 320,
        },
        hotKeys: ["scripture:john-3-16:en", "tn:romans-1:en"],
        recommendations: ["Increase TTL for scripture endpoints"],
      },
    },
  ],
  performance: {
    expectedMs: 500,
    cacheStrategy: "aggressive",
  },
};

/**
 * All experimental endpoints
 */
export const ExperimentalEndpoints = [
  AISummarizerEndpoint,
  AIQualityCheckerEndpoint,
  SmartRecommendationsEndpoint,
  CacheAnalyticsEndpoint,
];
