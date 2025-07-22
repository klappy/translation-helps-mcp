/**
 * Translation Helps Platform - Terminology Constants
 * Centralized source of truth for all unfoldingWord terminology
 * Prevents terminology drift and ensures UW compliance
 */

// ===== RESOURCE TYPES =====
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

  // Supporting Resources
  OBS = "obs", // Open Bible Stories
  SN = "sn", // Study Notes
  SQ = "sq", // Study Questions

  // Original Language Texts
  UHB = "uhb", // unfoldingWord Hebrew Bible
  UGNT = "ugnt", // unfoldingWord Greek New Testament
}

// ===== RESOURCE DESCRIPTIONS =====
export const ResourceDescriptions = {
  [ResourceType.ULT]:
    "Form-centric translation preserving original language structure and word order",
  [ResourceType.GLT]: "Gateway Literal Text - form-centric translation in Strategic Languages",
  [ResourceType.UST]: "Meaning-based translation demonstrating clear, natural expression",
  [ResourceType.GST]: "Gateway Simplified Text - meaning-based translation in Strategic Languages",
  [ResourceType.TN]: "Verse-by-verse explanations for difficult passages with cultural background",
  [ResourceType.TW]: "Comprehensive biblical term definitions with cross-references",
  [ResourceType.TWL]: "Maps word occurrences to Translation Words articles",
  [ResourceType.TQ]: "Comprehension validation questions for translation checking",
  [ResourceType.TA]: "Translation methodology and best practices training modules",
  [ResourceType.OBS]: "Open Bible Stories for chronological Scripture overview",
  [ResourceType.SN]: "Detailed study notes for deeper biblical understanding",
  [ResourceType.SQ]: "Study questions for group discussion and reflection",
  [ResourceType.UHB]: "Original Hebrew Bible text with morphological data",
  [ResourceType.UGNT]: "Original Greek New Testament with linguistic markup",
} as const;

// ===== USER TYPES =====
export enum UserType {
  MTT = "mother-tongue-translator",
  STRATEGIC_LANGUAGE = "strategic-language",
  HEART_LANGUAGE = "heart-language",
  CONSULTANT = "translation-consultant",
  CHECKER = "translation-checker",
  FACILITATOR = "translation-facilitator",
}

export const UserTypeDescriptions = {
  [UserType.MTT]: "Mother Tongue Translator - Native speaker translating into their heart language",
  [UserType.STRATEGIC_LANGUAGE]:
    "Strategic Language - Bridge language with comprehensive resources (English, Spanish, etc.)",
  [UserType.HEART_LANGUAGE]: "Heart Language - Target language being translated into",
  [UserType.CONSULTANT]: "Translation Consultant - Provides quality assurance and guidance",
  [UserType.CHECKER]: "Translation Checker - Reviews and validates translation accuracy",
  [UserType.FACILITATOR]: "Translation Facilitator - Coordinates and manages translation projects",
} as const;

// ===== LANGUAGE CATEGORIES =====
export enum LanguageCategory {
  STRATEGIC = "strategic",
  HEART = "heart",
  SOURCE = "source",
  BRIDGE = "bridge",
}

export const LanguageCategoryDescriptions = {
  [LanguageCategory.STRATEGIC]:
    "Languages with comprehensive translation resources (English, Spanish, French, etc.)",
  [LanguageCategory.HEART]: "Target languages being translated into by Mother Tongue Translators",
  [LanguageCategory.SOURCE]: "Original biblical languages (Hebrew, Aramaic, Greek)",
  [LanguageCategory.BRIDGE]: "Intermediate languages used in multi-step translation processes",
} as const;

// ===== TRANSLATION APPROACHES =====
export enum TranslationApproach {
  FORM_CENTRIC = "form-centric",
  MEANING_BASED = "meaning-based",
  BALANCED = "balanced",
}

export const TranslationApproachDescriptions = {
  [TranslationApproach.FORM_CENTRIC]:
    "Preserves original language structure, word order, and forms (ULT/GLT)",
  [TranslationApproach.MEANING_BASED]:
    "Prioritizes clear meaning expression in natural receptor language (UST/GST)",
  [TranslationApproach.BALANCED]: "Balances form preservation with meaning clarity",
} as const;

// ===== ALIGNMENT TYPES =====
export enum AlignmentType {
  WORD_LEVEL = "word",
  PHRASE_LEVEL = "phrase",
  SENTENCE_LEVEL = "sentence",
  DISCOURSE_LEVEL = "discourse",
}

export const AlignmentTypeDescriptions = {
  [AlignmentType.WORD_LEVEL]: "Precise word-to-word connections between languages",
  [AlignmentType.PHRASE_LEVEL]: "Phrase-level semantic alignments",
  [AlignmentType.SENTENCE_LEVEL]: "Sentence-level structural alignments",
  [AlignmentType.DISCOURSE_LEVEL]: "Discourse-level thematic alignments",
} as const;

// ===== RESOURCE FORMATS =====
export enum ResourceFormat {
  USFM = "usfm",
  TSV = "tsv",
  JSON = "json",
  YAML = "yaml",
  MARKDOWN = "md",
  TXT = "txt",
}

export const ResourceFormatDescriptions = {
  [ResourceFormat.USFM]: "Unified Standard Format Markers - Scripture text with embedded markup",
  [ResourceFormat.TSV]: "Tab-Separated Values - Translation helps in structured format",
  [ResourceFormat.JSON]: "JavaScript Object Notation - API responses and structured data",
  [ResourceFormat.YAML]: "YAML Ain't Markup Language - Configuration and metadata files",
  [ResourceFormat.MARKDOWN]: "Markdown - Human-readable documentation and articles",
  [ResourceFormat.TXT]: "Plain text - Simple unformatted content",
} as const;

// ===== ORGANIZATION IDENTIFIERS =====
export enum Organization {
  UNFOLDINGWORD = "unfoldingWord",
  DOOR43 = "Door43-Catalog",
  WA = "WA",
  STR = "STR",
  GLO = "GLO",
}

export const OrganizationDescriptions = {
  [Organization.UNFOLDINGWORD]:
    "unfoldingWord - Primary producer of open-licensed biblical content",
  [Organization.DOOR43]: "Door43 Catalog - Community-driven translation resources",
  [Organization.WA]: "Wycliffe Associates - Bible translation organization",
  [Organization.STR]: "STR - Strategic Translation Resources",
  [Organization.GLO]: "GLO - Global Language Organization",
} as const;

// ===== QUALITY LEVELS =====
export enum QualityLevel {
  DRAFT = "draft",
  COMMUNITY = "community",
  REVIEWED = "reviewed",
  PUBLISHED = "published",
}

export const QualityLevelDescriptions = {
  [QualityLevel.DRAFT]: "Initial draft quality - work in progress",
  [QualityLevel.COMMUNITY]: "Community reviewed - peer feedback incorporated",
  [QualityLevel.REVIEWED]: "Professionally reviewed - expert validation completed",
  [QualityLevel.PUBLISHED]: "Published quality - ready for widespread use",
} as const;

// ===== STATUS TYPES =====
export enum ResourceStatus {
  AVAILABLE = "available",
  PROCESSING = "processing",
  ERROR = "error",
  OUTDATED = "outdated",
  DEPRECATED = "deprecated",
}

// ===== CONTENT TYPES =====
export enum ContentType {
  SCRIPTURE = "scripture",
  NOTES = "notes",
  WORDS = "words",
  QUESTIONS = "questions",
  ACADEMY = "academy",
  STORIES = "stories",
}

// ===== TYPESCRIPT INTERFACES =====
export interface ResourceIdentifier {
  type: ResourceType;
  language: string;
  organization: Organization;
  version?: string;
  book?: string;
  chapter?: number;
  verse?: number;
}

export interface LanguageInfo {
  code: string;
  name: string;
  category: LanguageCategory;
  direction: "ltr" | "rtl";
  script?: string;
  region?: string;
}

export interface ResourceMetadata {
  identifier: ResourceIdentifier;
  format: ResourceFormat;
  quality: QualityLevel;
  status: ResourceStatus;
  lastModified: string;
  version: string;
  size?: number;
  checksum?: string;
}

export interface AlignmentData {
  type: AlignmentType;
  source: {
    text: string;
    position: number;
    length: number;
  };
  target: {
    text: string;
    position: number;
    length: number;
  };
  confidence: number;
  metadata?: Record<string, any>;
}

// ===== VALIDATION FUNCTIONS =====
export function isValidResourceType(type: string): type is ResourceType {
  return Object.values(ResourceType).includes(type as ResourceType);
}

export function isValidUserType(type: string): type is UserType {
  return Object.values(UserType).includes(type as UserType);
}

export function isValidLanguageCategory(category: string): category is LanguageCategory {
  return Object.values(LanguageCategory).includes(category as LanguageCategory);
}

export function isValidOrganization(org: string): org is Organization {
  return Object.values(Organization).includes(org as Organization);
}

// ===== UTILITY FUNCTIONS =====
export function getResourceDescription(type: ResourceType): string {
  return ResourceDescriptions[type] || "Unknown resource type";
}

export function getUserTypeDescription(type: UserType): string {
  return UserTypeDescriptions[type] || "Unknown user type";
}

export function isScriptureResource(type: ResourceType): boolean {
  return [
    ResourceType.ULT,
    ResourceType.GLT,
    ResourceType.UST,
    ResourceType.GST,
    ResourceType.UHB,
    ResourceType.UGNT,
  ].includes(type);
}

export function isHelpsResource(type: ResourceType): boolean {
  return [
    ResourceType.TN,
    ResourceType.TW,
    ResourceType.TWL,
    ResourceType.TQ,
    ResourceType.TA,
  ].includes(type);
}

export function getResourcesByCategory(
  category: "scripture" | "helps" | "original" | "stories"
): ResourceType[] {
  switch (category) {
    case "scripture":
      return [ResourceType.ULT, ResourceType.GLT, ResourceType.UST, ResourceType.GST];
    case "helps":
      return [ResourceType.TN, ResourceType.TW, ResourceType.TWL, ResourceType.TQ, ResourceType.TA];
    case "original":
      return [ResourceType.UHB, ResourceType.UGNT];
    case "stories":
      return [ResourceType.OBS];
    default:
      return [];
  }
}

// ===== DEPRECATED TERMINOLOGY MAPPING =====
// For backward compatibility and migration assistance
export const DeprecatedTerms = {
  "gateway-language": UserType.STRATEGIC_LANGUAGE,
  "gateway language": UserType.STRATEGIC_LANGUAGE,
  gatewayLanguage: UserType.STRATEGIC_LANGUAGE,
  gl: UserType.STRATEGIC_LANGUAGE,
} as const;

export function migrateDeprecatedTerm(oldTerm: string): string {
  const normalized = oldTerm.toLowerCase().replace(/[_\s]/g, "-");
  return DeprecatedTerms[normalized as keyof typeof DeprecatedTerms] || oldTerm;
}

// ===== CONSTANTS FOR COMMON USAGE =====
export const DEFAULT_STRATEGIC_LANGUAGE = "en";
export const DEFAULT_ORGANIZATION = Organization.UNFOLDINGWORD;
export const DEFAULT_RESOURCE_FORMAT = ResourceFormat.JSON;
export const DEFAULT_QUALITY_LEVEL = QualityLevel.PUBLISHED;
