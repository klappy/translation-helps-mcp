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
      description:
        'Scripture reference (e.g., "John 3:16", "Genesis 1:1-5", "Psalm 23")',
      example: "John 3:16",
      pattern: "^[1-3]?\\s?[A-Za-z]+\\s+\\d+(?::\\d+(?:-\\d+)?)?$",
      min: 3,
      max: 50,
    },
    language: {
      type: "string",
      required: false,
      default: "en",
      description: "Language code for the scripture text",
      example: "en",
      options: ["en", "es", "fr", "sw", "hi", "ar", "zh", "pt"],
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
      description: "Organization providing the scripture text",
      example: "unfoldingWord",
      options: ["unfoldingWord", "Door43-Catalog"],
    },
    format: {
      type: "string",
      required: false,
      default: "text",
      description: "Output format for scripture text",
      example: "text",
      options: ["text", "usfm"],
    },
    includeAlignment: {
      type: "boolean",
      required: false,
      default: false,
      description:
        "Include word alignment data (only available with USFM format)",
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
 * Fetch Scripture - Generic scripture endpoint
 */
export const FETCH_SCRIPTURE_CONFIG: EndpointConfig = {
  ...SCRIPTURE_BASE_CONFIG,
  name: "fetch-scripture",
  path: "/fetch-scripture",
  title: "Fetch Scripture Text",
  description:
    "Retrieve scripture text for any reference with support for verses, ranges, and chapters",

  params: {
    ...SCRIPTURE_BASE_CONFIG.params!,
    resource: {
      type: "string",
      required: false,
      default: "ult",
      description: "Scripture resource type",
      example: "ult",
      options: ["ult", "ust", "ulb", "udb"],
    },
  },

  dataSource: {
    ...SCRIPTURE_BASE_CONFIG.dataSource!,
    dcsEndpoint:
      "/api/v1/repos/{organization}/{language}_{resource}/contents/{book}/{chapter}.usfm",
  },

  examples: [
    {
      name: "Single Verse",
      description: "Fetch a single verse from John 3:16",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
        resource: "ult",
        format: "text",
      },
      expectedContent: {
        contains: ["God so loved the world", "eternal life"],
        minLength: 50,
        fields: {
          scripture: { text: "string" },
          language: "en",
          organization: "unfoldingWord",
        },
      },
    },
    {
      name: "Verse Range",
      description: "Fetch multiple verses from Romans 8:28-30",
      params: {
        reference: "Romans 8:28-30",
        language: "en",
        organization: "unfoldingWord",
        resource: "ult",
        format: "text",
      },
      expectedContent: {
        contains: [
          "all things work together",
          "called according to",
          "predestined",
        ],
        minLength: 200,
        fields: {
          scripture: { text: "string" },
        },
      },
    },
    {
      name: "Entire Chapter",
      description: "Fetch the complete Psalm 23",
      params: {
        reference: "Psalm 23",
        language: "en",
        organization: "unfoldingWord",
        resource: "ult",
        format: "text",
      },
      expectedContent: {
        contains: [
          "The LORD is my shepherd",
          "valley of the shadow",
          "goodness and mercy",
        ],
        minLength: 400,
        fields: {
          scripture: { text: "string" },
        },
      },
    },
    {
      name: "With Alignment Data",
      description: "Fetch John 1:1 with word alignment in USFM format",
      params: {
        reference: "John 1:1",
        language: "en",
        organization: "unfoldingWord",
        resource: "ult",
        format: "usfm",
        includeAlignment: true,
      },
      expectedContent: {
        contains: ['\\w In|x-occurrence="1"', "beginning", "Word"],
        fields: {
          scripture: { usfm: "string", alignment: "object" },
        },
      },
    },
    {
      name: "Spanish Scripture",
      description: "Fetch Genesis 1:1 in Spanish",
      params: {
        reference: "Genesis 1:1",
        language: "es",
        organization: "unfoldingWord",
        resource: "ult",
        format: "text",
      },
      expectedContent: {
        contains: ["En el principio", "Dios", "creó"],
        fields: {
          language: "es",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * Fetch ULT Scripture - Optimized for Unlocked Literal Text
 */
export const FETCH_ULT_SCRIPTURE_CONFIG: EndpointConfig = {
  ...SCRIPTURE_BASE_CONFIG,
  name: "fetch-ult-scripture",
  path: "/fetch-ult-scripture",
  title: "Fetch ULT Scripture",
  description:
    "Retrieve Unlocked Literal Text (ULT) scripture with word-for-word accuracy",

  dataSource: {
    ...SCRIPTURE_BASE_CONFIG.dataSource!,
    dcsEndpoint:
      "/api/v1/repos/{organization}/{language}_ult/contents/{book}/{chapter}.usfm",
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
        contains: [
          "For God loved the world in this way",
          "gave",
          "only begotten Son",
        ],
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
export const FETCH_UST_SCRIPTURE_CONFIG: EndpointConfig = {
  ...SCRIPTURE_BASE_CONFIG,
  name: "fetch-ust-scripture",
  path: "/fetch-ust-scripture",
  title: "Fetch UST Scripture",
  description:
    "Retrieve Unlocked Simplified Text (UST) scripture with clear, easy-to-understand language",

  dataSource: {
    ...SCRIPTURE_BASE_CONFIG.dataSource!,
    dcsEndpoint:
      "/api/v1/repos/{organization}/{language}_ust/contents/{book}/{chapter}.usfm",
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
  FETCH_ULT_SCRIPTURE_CONFIG,
  FETCH_UST_SCRIPTURE_CONFIG,
] as const;

export default SCRIPTURE_ENDPOINTS;
