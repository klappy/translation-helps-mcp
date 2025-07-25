/**
 * Scripture Endpoint Configurations
 */

import { CommonParams, EndpointConfig } from "../EndpointConfig";
import { ResponseShapes } from "../ResponseShapes";

export const FetchScriptureEndpoint: EndpointConfig = {
  name: "fetch-scripture",
  path: "/fetch-scripture",
  category: "core",
  description: "Fetch scripture text in any supported version (ULT/UST)",

  params: {
    reference: CommonParams.reference,
    language: CommonParams.language,
    version: {
      name: "version",
      type: "string",
      required: false,
      default: "ult",
      description: "Scripture version (ult or ust)",
      examples: ["ult", "ust"],
      validation: {
        enum: ["ult", "ust"],
      },
    },
  },

  dataSource: {
    type: "dcs",
    transformation: "usfm-to-text",
    endpoint: "/api/v1/repos/{owner}/{repo}/contents/{path}",
  },

  responseShape: ResponseShapes.scripture,

  examples: [
    {
      params: { reference: "John 3:16", language: "en", version: "ult" },
      response: {
        text: "For God so loved the world, that he gave his only begotten Son, so that everyone who believes in him may not perish but may have eternal life.",
        reference: "John 3:16",
        version: "ult",
        language: "en",
      },
      description: "Single verse example",
    },
    {
      params: { reference: "Genesis 1:1-3", language: "en", version: "ust" },
      response: {
        text: 'In the beginning, God created the heavens and the earth. The earth was without form and empty. Darkness was upon the surface of the deep. The Spirit of God was moving above the surface of the waters. God said, "Let there be light," and there was light.',
        reference: "Genesis 1:1-3",
        version: "ust",
        language: "en",
      },
      description: "Verse range example",
    },
  ],

  performance: {
    targetMs: 300,
    cacheable: true,
    cacheKey: "{language}:{version}:{reference}",
  },

  mcp: {
    toolName: "fetchScripture",
    description:
      "Fetch scripture passages from the unfoldingWord Literal Text (ULT) or Simplified Text (UST)",
  },
};

export const FetchUltScriptureEndpoint: EndpointConfig = {
  name: "fetch-ult-scripture",
  path: "/fetch-ult-scripture",
  category: "core",
  description: "Fetch scripture from unfoldingWord Literal Text (ULT)",

  params: {
    reference: CommonParams.reference,
    language: CommonParams.language,
  },

  dataSource: {
    type: "dcs",
    transformation: "usfm-to-text",
    endpoint: "/api/v1/repos/{owner}/ult/contents/{path}",
  },

  responseShape: ResponseShapes.scripture,

  examples: [
    {
      params: { reference: "John 3:16", language: "en" },
      response: {
        text: "For God so loved the world, that he gave his only begotten Son, so that everyone who believes in him may not perish but may have eternal life.",
        reference: "John 3:16",
        version: "ult",
        language: "en",
      },
      description: "ULT specific endpoint",
    },
  ],

  performance: {
    targetMs: 300,
    cacheable: true,
    cacheKey: "{language}:ult:{reference}",
  },
};

export const FetchUstScriptureEndpoint: EndpointConfig = {
  name: "fetch-ust-scripture",
  path: "/fetch-ust-scripture",
  category: "core",
  description: "Fetch scripture from unfoldingWord Simplified Text (UST)",

  params: {
    reference: CommonParams.reference,
    language: CommonParams.language,
  },

  dataSource: {
    type: "dcs",
    transformation: "usfm-to-text",
    endpoint: "/api/v1/repos/{owner}/ust/contents/{path}",
  },

  responseShape: ResponseShapes.scripture,

  examples: [
    {
      params: { reference: "John 3:16", language: "en" },
      response: {
        text: "God loved the people in the world so much that he gave his only Son to them. The result is that everyone who believes in him will not die but will live forever.",
        reference: "John 3:16",
        version: "ust",
        language: "en",
      },
      description: "UST simplified text example",
    },
  ],

  performance: {
    targetMs: 300,
    cacheable: true,
    cacheKey: "{language}:ust:{reference}",
  },
};

/**
 * All scripture endpoints
 */
export const ScriptureEndpoints = [
  FetchScriptureEndpoint,
  FetchUltScriptureEndpoint,
  FetchUstScriptureEndpoint,
];
