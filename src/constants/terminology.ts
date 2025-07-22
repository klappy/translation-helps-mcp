/**
 * unfoldingWord Translation Resources Terminology Constants
 *
 * This module provides the single source of truth for all UW-specific terminology
 * and resource type definitions used throughout the codebase.
 *
 * Based on: UW_TRANSLATION_RESOURCES_GUIDE.md
 * Last Updated: December 2024
 */

/**
 * Resource Types as defined by unfoldingWord
 * These represent the various translation resources available
 */
export enum ResourceType {
  // Scripture Texts
  ULT = "ult", // unfoldingWord Literal Text
  GLT = "glt", // Gateway Literal Text
  UST = "ust", // unfoldingWord Simplified Text
  GST = "gst", // Gateway Simplified Text

  // Translation Helps
  TN = "tn", // Translation Notes
  TW = "tw", // Translation Words
  TWL = "twl", // Translation Words Links
  TQ = "tq", // Translation Questions
  TA = "ta", // Translation Academy

  // Original Language Texts (future support)
  UHB = "uhb", // unfoldingWord Hebrew Bible
  UGNT = "ugnt", // unfoldingWord Greek New Testament
}

/**
 * Detailed descriptions for each resource type
 * Use these for API responses and user-facing content
 */
export const ResourceDescriptions = {
  [ResourceType.ULT]:
    "Form-centric translation preserving original language structure with word alignment",
  [ResourceType.GLT]: "Strategic Language Literal Text maintaining source language structure",
  [ResourceType.UST]: "Meaning-based translation in clear, natural language with word alignment",
  [ResourceType.GST]: "Strategic Language Simplified Text emphasizing natural expression",
  [ResourceType.TN]: "Verse-by-verse cultural and linguistic translation guidance",
  [ResourceType.TW]: "Comprehensive biblical term definitions with cross-references",
  [ResourceType.TWL]: "Word-level links connecting scripture to translation word definitions",
  [ResourceType.TQ]:
    "Community checking and comprehension validation questions for quality assurance",
  [ResourceType.TA]: "Translation methodology and best practices articles",
  [ResourceType.UHB]: "Original Hebrew Bible text with morphological analysis",
  [ResourceType.UGNT]: "Original Greek New Testament with grammatical details",
} as const;

/**
 * User and Language Types in the UW ecosystem
 */
export const UserTypes = {
  MTT: "Mother Tongue Translator",
  STRATEGIC_LANGUAGE: "Strategic Language",
  HEART_LANGUAGE: "Heart Language",
} as const;

/**
 * Language role descriptions for clarity
 */
export const LanguageRoles = {
  STRATEGIC:
    "Bridge languages (English, Spanish, etc.) used by Mother Tongue Translators to access translation resources",
  HEART: "Target languages being translated into by Mother Tongue Translators",
  ORIGINAL: "Biblical Hebrew and Greek source languages",
} as const;

/**
 * Organization naming patterns
 */
export const OrganizationPatterns = {
  UNFOLDINGWORD: "unfoldingWord",
  LANGUAGE_SPECIFIC: /^[a-z]{2,3}[-_](gl|sl)$/, // e.g., 'es-419_gl', 'fr_sl'
  DOOR43: "Door43-Catalog",
} as const;

/**
 * Resource Container (RC) related constants
 */
export const ResourceContainer = {
  MANIFEST_FILE: "manifest.yaml",
  RC_LINK_PATTERN: /^rc:\/\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/,
  RC_LINK_FORMAT: "rc://language/resource/type/project/chapter/chunk",
} as const;

/**
 * USFM and Alignment related constants
 */
export const AlignmentMarkers = {
  ZALN_START: "\\zaln-s",
  ZALN_END: "\\zaln-e\\*",
  WORD_START: "\\w ",
  WORD_END: "\\w*",
  ATTRIBUTES: {
    STRONG: "x-strong",
    LEMMA: "x-lemma",
    MORPH: "x-morph",
    OCCURRENCE: "x-occurrence",
    OCCURRENCES: "x-occurrences",
    CONTENT: "x-content",
  },
} as const;

/**
 * File format constants
 */
export const FileFormats = {
  USFM: "usfm",
  TSV: "tsv",
  MARKDOWN: "md",
  YAML: "yaml",
  JSON: "json",
} as const;

/**
 * API Response structures for consistent data formats
 */
export const ApiResponseFormats = {
  SCRIPTURE: {
    includeAlignment: true,
    includeVerseNumbers: true,
    format: "structured",
  },
  TRANSLATION_NOTES: {
    includeAcademyLinks: true,
    includeReferences: true,
  },
  TRANSLATION_WORDS: {
    includeReferences: false,
    includeRelated: true,
  },
} as const;

/**
 * Cache key patterns for consistent caching
 */
export const CacheKeyPatterns = {
  SCRIPTURE: (lang: string, resource: ResourceType, ref: string) =>
    `scripture:${lang}:${resource}:${ref}`,
  TRANSLATION_NOTES: (lang: string, ref: string) => `tn:${lang}:${ref}`,
  TRANSLATION_WORDS: (lang: string, word: string) => `tw:${lang}:${word}`,
  TRANSLATION_QUESTIONS: (lang: string, ref: string) => `tq:${lang}:${ref}`,
  WORD_LINKS: (lang: string, ref: string) => `twl:${lang}:${ref}`,
} as const;

/**
 * TypeScript types for better development experience
 */
export type ResourceTypeKey = keyof typeof ResourceType;
export type ResourceTypeValue = ResourceType[ResourceTypeKey];
export type UserTypeKey = keyof typeof UserTypes;
export type LanguageRoleKey = keyof typeof LanguageRoles;

/**
 * Helper functions for common operations
 */
export const TerminologyHelpers = {
  /**
   * Check if a resource type is a scripture text
   */
  isScriptureType: (type: ResourceType): boolean => {
    return [
      ResourceType.ULT,
      ResourceType.GLT,
      ResourceType.UST,
      ResourceType.GST,
      ResourceType.UHB,
      ResourceType.UGNT,
    ].includes(type);
  },

  /**
   * Check if a resource type is a translation help
   */
  isTranslationHelp: (type: ResourceType): boolean => {
    return [
      ResourceType.TN,
      ResourceType.TW,
      ResourceType.TWL,
      ResourceType.TQ,
      ResourceType.TA,
    ].includes(type);
  },

  /**
   * Get the literal vs simplified pair for a resource
   */
  getResourcePair: (type: ResourceType): ResourceType[] => {
    if (type === "ult") return ["ult", "ust"];
    if (type === "glt") return ["glt", "gst"];
    if (type === "ust") return ["ult", "ust"];
    if (type === "gst") return ["glt", "gst"];
    return [type];
  },

  /**
   * Validate Resource Container link format
   */
  isValidRCLink: (link: string): boolean => {
    return ResourceContainer.RC_LINK_PATTERN.test(link);
  },

  /**
   * Generate cache key for any resource type
   */
  generateCacheKey: (type: ResourceType, language: string, identifier: string): string => {
    return `${type}:${language}:${identifier}`;
  },
} as const;

/**
 * Deprecated terms that should trigger warnings/errors
 * Use these in ESLint rules and validation
 */
export const DeprecatedTerms = {
  GATEWAY_LANGUAGE: "Strategic Language",
  IS_STRATEGIC_LANGUAGE: "isStrategicLanguage",
  BIBLE_TEXTS: "Bible texts in various translations",
  GENERIC_TRANSLATION: "translation",
} as const;

/**
 * Correct replacements for deprecated terms
 */
export const CorrectTerms = {
  [DeprecatedTerms.GATEWAY_LANGUAGE]: "Strategic Language",
  [DeprecatedTerms.IS_GATEWAY_LANGUAGE]: "isStrategicLanguage",
  [DeprecatedTerms.BIBLE_TEXTS]: "ULT/GLT (Literal) and UST/GST (Simplified) Scripture texts",
  [DeprecatedTerms.GENERIC_TRANSLATION]: "specific resource type (ULT, UST, TN, TW, TWL, TQ, TA)",
} as const;

// Default export for convenience
export default {
  ResourceType,
  ResourceDescriptions,
  UserTypes,
  LanguageRoles,
  OrganizationPatterns,
  ResourceContainer,
  AlignmentMarkers,
  FileFormats,
  ApiResponseFormats,
  CacheKeyPatterns,
  TerminologyHelpers,
  DeprecatedTerms,
  CorrectTerms,
};
