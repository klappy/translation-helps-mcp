/**
 * Terminology Constants Module
 * 
 * Single source of truth for all unfoldingWord terminology and resource types.
 * This module ensures consistency across the codebase and prevents terminology drift.
 * 
 * Based on the UW Translation Resources Guide and PRD specifications.
 */

/**
 * Resource Types according to unfoldingWord standards
 */
export enum ResourceType {
  // Scripture Texts
  ULT = 'ult', // unfoldingWord Literal Text (form-centric)
  GLT = 'glt', // Gateway Literal Text (form-centric)
  UST = 'ust', // unfoldingWord Simplified Text (meaning-based)
  GST = 'gst', // Gateway Simplified Text (meaning-based)
  
  // Translation Helps
  TN = 'tn',   // Translation Notes
  TW = 'tw',   // Translation Words
  TWL = 'twl', // Translation Words Links
  TQ = 'tq',   // Translation Questions
  TA = 'ta',   // Translation Academy
  
  // Supporting Resources
  ALIGNMENT = 'alignment', // Word Alignment Data
  VERSIFICATION = 'versification' // Versification System
}

/**
 * Detailed descriptions for each resource type
 */
export const ResourceDescriptions = {
  [ResourceType.ULT]: 'Form-centric translation preserving original language structure, word order, and idioms',
  [ResourceType.GLT]: 'Gateway Literal Text - form-centric translation in Strategic Languages',
  [ResourceType.UST]: 'Meaning-based translation in clear, natural language demonstrating clear expression',
  [ResourceType.GST]: 'Gateway Simplified Text - meaning-based translation in Strategic Languages',
  [ResourceType.TN]: 'Verse-by-verse explanations for difficult passages with cultural background',
  [ResourceType.TW]: 'Comprehensive biblical term definitions with consistent terminology',
  [ResourceType.TWL]: 'Precise mapping of original language words to Translation Words definitions',
  [ResourceType.TQ]: 'Comprehension validation questions for translation checking',
  [ResourceType.TA]: 'Translation methodology and theory with best practices',
  [ResourceType.ALIGNMENT]: 'Word-level connections between Strategic Language and original Hebrew/Greek',
  [ResourceType.VERSIFICATION]: 'Canonical chapter/verse structure and reference validation'
};

/**
 * User and Language Types
 */
export const UserTypes = {
  MTT: 'Mother Tongue Translator',
  STRATEGIC_LANGUAGE: 'Strategic Language',
  HEART_LANGUAGE: 'Heart Language',
  TRANSLATION_CONSULTANT: 'Translation Consultant',
  AI_ASSISTANT: 'AI Assistant'
} as const;

/**
 * Language Type Descriptions
 */
export const LanguageTypeDescriptions = {
  STRATEGIC_LANGUAGE: 'Bridge languages (formerly Gateway Languages) used by Mother Tongue Translators to access translation resources',
  HEART_LANGUAGE: 'Target languages being translated into - the native languages of the translators',
  ORIGINAL_LANGUAGE: 'Biblical Hebrew and Greek source texts'
} as const;

/**
 * Error Codes
 */
export enum ErrorCode {
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  INVALID_REFERENCE = 'INVALID_REFERENCE',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  FETCH_ERROR = 'FETCH_ERROR',
  ALIGNMENT_ERROR = 'ALIGNMENT_ERROR',
  RC_LINK_ERROR = 'RC_LINK_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}
