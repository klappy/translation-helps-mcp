/**
 * Scripture Endpoint Configurations
 *
 * Defines all scripture-related endpoints with USFM to text transformation,
 * proper parameter handling, and real data examples.
 */

import type { EndpointConfig } from "../EndpointConfig.js";
import { SCRIPTURE_SHAPE } from "../ResponseShapes.js";

/**
 * Generic Scripture Endpoint Configuration
 * Base configuration for all scripture endpoints
 */
const SCRIPTURE_BASE_CONFIG: Partial<EndpointConfig> = {
  category: "core",
  responseShape: SCRIPTURE_SHAPE,
  params: {
    reference: {
      type: "string",
      required: true,
      description: 'Scripture reference (e.g., "John 3:16", "Genesis 1:1-5", "Psalm 23", "John 3-4", "Matthew")',
      example: "John 3:16",
      pattern: "^[1-3]?\\s?[A-Za-z]+.*$",
      min: 3,
      max: 50,
    },
    language: {
      type: "string",
      required: true,
      description: "Language code for the scripture text",
      example: "en",
      options: ["en", "es", "fr", "sw", "hi", "ar", "zh", "pt"],
    },
    organization: {
      type: "string",
      required: true,
      description: "Organization providing the scripture text",
      example: "unfoldingWord",
      options: ["unfoldingWord", "Door43-Catalog"],
    },
    resource: {
      type: "string",
      required: false,
      default: "all",
      description:
        "Scripture resource type(s) - single resource (ult, ust, t4t, ueb), comma-separated (ult,ust), or 'all' for all available",
      example: "all",
      options: ["ult", "ust", "t4t", "ueb", "all", "ult,ust", "t4t,ueb"],
    },
    format: {
      type: "string",
      required: false,
      default: "text",
      description: "Output format - 'json' for structured data, 'text' for plain text with citation, 'md' for markdown, 'usfm' for USFM formatted",
      example: "text",
      options: ["json", "text", "md", "markdown", "usfm"],
    },
    includeAlignment: {
      type: "boolean",
      required: false,
      default: false,
      description: "Include word alignment data (only available with USFM format)",
      example: false,
    },
  },
  dataSource: {
    type: "dcs-api",
    dcsEndpoint:
      "/api/v1/repos/{organization}/{language}_{resource}/contents/{book}/{chapter}.usfm",
    transformation: "usfm-to-text",
    cacheTtl: 7200, // 2 hours
  },
  enabled: true,
  tags: ["scripture", "bible", "core", "text"],
};

/**
 * Reference to scripture parameters for reuse
 */
const SCRIPTURE_PARAMS = SCRIPTURE_BASE_CONFIG.params!;

/**
 * Fetch Scripture - Generic scripture endpoint
 */
export const FETCH_SCRIPTURE_CONFIG: EndpointConfig = {
  name: "fetch-scripture",
  path: "/fetch-scripture",
  title: "Fetch Scripture",
  description: "Retrieve scripture text from multiple translations in any supported language",
  category: "core",
  responseShape: SCRIPTURE_SHAPE,
  params: SCRIPTURE_PARAMS,
  dataSource: {
    type: "computed",
    cacheTtl: 3600,
  },
  enabled: true,
  tags: ["scripture", "bible", "text", "core"],
  examples: [
    {
      name: "John 3:16 (Most famous verse)",
      description: "Fetch the most well-known Bible verse in English",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["God so loved the world", "eternal life"],
        minLength: 50,
      },
    },
    {
      name: "Genesis 1:1 (Creation beginning)",
      description: "Fetch the very first verse of the Bible",
      params: {
        reference: "Genesis 1:1",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["In the beginning", "God created", "heavens and the earth"],
        minLength: 40,
      },
    },
    {
      name: "Psalm 23:1-4 (Multi-verse passage)",
      description: "Fetch multiple verses from the famous Shepherd Psalm",
      params: {
        reference: "Psalm 23:1-4",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["The Lord is my shepherd", "valley of death"],
        minLength: 200,
      },
    },
    {
      name: "Romans 8:28 (Spanish translation)",
      description: "Fetch scripture in Spanish to demonstrate multi-language support",
      params: {
        reference: "Romans 8:28",
        language: "es",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["Dios"],
        minLength: 30,
      },
    },
  ],
} as EndpointConfig;

/**
 * Fetch ULT Scripture - MOVED TO EXPERIMENTAL
 */
const FETCH_ULT_SCRIPTURE_CONFIG: EndpointConfig = {
  ...SCRIPTURE_BASE_CONFIG,
  name: "fetch-ult-scripture",
  path: "/fetch-ult-scripture",
  title: "Fetch ULT Scripture",
  description: "Retrieve Unlocked Literal Text (ULT) scripture with word-for-word accuracy",

  dataSource: {
    ...SCRIPTURE_BASE_CONFIG.dataSource!,
    dcsEndpoint: "/api/v1/repos/{organization}/{language}_ult/contents/{book}/{chapter}.usfm",
  },

  examples: [
    {
      name: "ULT Literal Translation",
      description: "Get the most literal translation of John 3:16",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
        format: "text",
      },
      expectedContent: {
        contains: ["For God loved the world in this way", "gave", "only begotten Son"],
        minLength: 80,
        fields: {
          scripture: { translation: "ULT" },
        },
      },
    },
    {
      name: "ULT with USFM Markers",
      description: "Get ULT with original USFM formatting for detailed study",
      params: {
        reference: "Matthew 5:3-4",
        language: "en",
        organization: "unfoldingWord",
        format: "usfm",
        includeAlignment: true,
      },
      expectedContent: {
        contains: ["\\v 3", "Blessed", "poor in spirit", "\\v 4", "mourn"],
        fields: {
          scripture: { usfm: "string", alignment: "object" },
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * Fetch UST Scripture - Optimized for Unlocked Simplified Text
 */
const FETCH_UST_SCRIPTURE_CONFIG: EndpointConfig = {
  ...SCRIPTURE_BASE_CONFIG,
  name: "fetch-ust-scripture",
  path: "/fetch-ust-scripture",
  title: "Fetch UST Scripture",
  description:
    "Retrieve Unlocked Simplified Text (UST) scripture with clear, easy-to-understand language",

  dataSource: {
    ...SCRIPTURE_BASE_CONFIG.dataSource!,
    dcsEndpoint: "/api/v1/repos/{organization}/{language}_ust/contents/{book}/{chapter}.usfm",
  },

  examples: [
    {
      name: "UST Simple Language",
      description: "Get simplified, clear language version of John 3:16",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
        format: "text",
      },
      expectedContent: {
        contains: ["God loved the people", "gave his only Son", "live forever"],
        minLength: 60,
        fields: {
          scripture: { translation: "UST" },
        },
      },
    },
    {
      name: "UST Parable Explanation",
      description: "Get simplified explanation of complex parables",
      params: {
        reference: "Matthew 13:3-9",
        language: "en",
        organization: "unfoldingWord",
        format: "text",
      },
      expectedContent: {
        contains: ["farmer", "seeds", "good soil", "produced"],
        minLength: 300,
        fields: {
          scripture: { translation: "UST" },
        },
      },
    },
    {
      name: "UST Foreign Language",
      description: "Get simplified text in other languages",
      params: {
        reference: "Psalm 1:1",
        language: "es",
        organization: "unfoldingWord",
        format: "text",
      },
      expectedContent: {
        contains: ["feliz", "hombre", "no"],
        fields: {
          language: "es",
          scripture: { translation: "UST" },
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * All Scripture Endpoint Configurations
 */
export const SCRIPTURE_ENDPOINTS = [
  FETCH_SCRIPTURE_CONFIG,
  // ULT and UST endpoints moved to experimental
] as const;

export default SCRIPTURE_ENDPOINTS;
