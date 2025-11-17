/**
 * Common Parameter Schemas
 *
 * Shared Zod schemas for common parameters used across MCP tools and HTTP endpoints.
 * This provides a single source of truth for parameter definitions.
 */

import { z } from "zod";

/**
 * Common reference parameter
 * Used for Bible reference inputs (e.g., "John 3:16", "Genesis 1:1-5")
 */
export const ReferenceParam = z
  .string()
  .describe('Bible reference (e.g., "John 3:16", "Genesis 1:1-5", "Psalm 23")')
  .min(3)
  .max(50);

/**
 * Common language parameter
 * Language code for translation resources
 */
export const LanguageParam = z
  .string()
  .optional()
  .default("en")
  .describe('Language code (default: "en")');

/**
 * Common organization parameter
 * Organization providing the translation resources
 */
export const OrganizationParam = z
  .string()
  .optional()
  .default("unfoldingWord")
  .describe('Organization (default: "unfoldingWord")');

/**
 * Common format parameter
 * Output format for responses
 */
export const FormatParam = z
  .enum(["text", "usfm", "json", "md", "markdown"])
  .optional()
  .default("json")
  .describe('Output format (default: "json")');

/**
 * Common resource parameter
 * Scripture resource type (ult, ust, t4t, ueb, or all)
 */
export const ResourceParam = z
  .string()
  .optional()
  .default("all")
  .describe(
    "Scripture resource type(s) - single resource (ult, ust, t4t, ueb), comma-separated (ult,ust), or 'all' for all available",
  );

/**
 * Common includeAlignment parameter
 * Whether to include word alignment data
 */
export const IncludeAlignmentParam = z
  .boolean()
  .optional()
  .default(false)
  .describe("Include word alignment data (only available with USFM format)");

/**
 * Common includeVerseNumbers parameter
 * Whether to include verse numbers in scripture text
 */
export const IncludeVerseNumbersParam = z
  .boolean()
  .optional()
  .default(true)
  .describe("Include verse numbers in the text (default: true)");

/**
 * Common includeIntro parameter
 * Whether to include book/chapter introduction notes
 */
export const IncludeIntroParam = z
  .boolean()
  .optional()
  .default(true)
  .describe(
    "Include book and chapter introduction notes for context (default: true)",
  );

/**
 * Common includeContext parameter
 * Whether to include contextual notes from related passages
 */
export const IncludeContextParam = z
  .boolean()
  .optional()
  .default(true)
  .describe("Include contextual notes from related passages (default: true)");

/**
 * Common term parameter
 * Translation word term to lookup
 */
export const TermParam = z
  .string()
  .optional()
  .describe(
    'Translation word term to lookup (e.g., "love", "grace", "salvation", "paul", "god", "faith")',
  );

/**
 * Common path parameter
 * Explicit path to a resource file
 */
export const PathParam = z
  .string()
  .optional()
  .describe("Explicit path to the resource file (e.g., bible/kt/love.md)");

/**
 * Common rcLink parameter
 * RC link to a resource
 */
export const RCLinkParam = z
  .string()
  .optional()
  .describe('RC link to the resource (e.g., "rc://*/tw/dict/bible/kt/love")');

/**
 * Common moduleId parameter
 * Translation Academy module ID
 */
export const ModuleIdParam = z
  .string()
  .optional()
  .describe(
    'Academy module ID (e.g., "figs-metaphor"). Searches in order: translate, process, checking, intro',
  );

/**
 * Helper function to create a schema object with common reference-based parameters
 */
export function createReferenceBasedSchema<T extends z.ZodRawShape>(
  additionalFields: T,
) {
  return z.object({
    reference: ReferenceParam,
    language: LanguageParam,
    organization: OrganizationParam,
    ...additionalFields,
  });
}

/**
 * Helper function to create a schema object with common term-based parameters
 */
export function createTermBasedSchema<T extends z.ZodRawShape>(
  additionalFields: T,
) {
  return z.object({
    term: TermParam,
    path: PathParam,
    rcLink: RCLinkParam,
    language: LanguageParam,
    organization: OrganizationParam,
    ...additionalFields,
  });
}
