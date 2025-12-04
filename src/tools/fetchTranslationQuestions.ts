/**
 * Fetch Translation Questions Tool
 * Tool for fetching translation questions for a specific Bible reference
 * Uses shared core service for consistency with Netlify functions
 *
 * SUPPORTS FORMAT PARAMETER:
 * - json: Raw JSON (default)
 * - md/markdown: TRUE markdown with YAML frontmatter
 * - text: Plain text
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { fetchTranslationQuestions } from "../functions/translation-questions-service.js";
import { buildMetadata } from "../utils/metadata-builder.js";
import { handleMCPError } from "../utils/mcp-error-handler.js";
import {
  formatMCPResponse,
  type OutputFormat,
} from "../utils/mcp-response-formatter.js";
import {
  ReferenceParam,
  LanguageParam,
  OrganizationParam,
  FormatParam,
} from "../schemas/common-params.js";

// Input schema - using shared common parameters
export const FetchTranslationQuestionsArgs = z.object({
  reference: ReferenceParam,
  language: LanguageParam,
  organization: OrganizationParam,
  format: FormatParam,
});

export type FetchTranslationQuestionsArgs = z.infer<
  typeof FetchTranslationQuestionsArgs
>;

/**
 * Handle the fetch translation questions tool call
 */
export async function handleFetchTranslationQuestions(
  args: FetchTranslationQuestionsArgs,
) {
  const startTime = Date.now();

  try {
    logger.info("Fetching translation questions", {
      reference: args.reference,
      language: args.language,
      organization: args.organization,
    });

    // Use the shared translation questions service (same as Netlify functions)
    const result = await fetchTranslationQuestions({
      reference: args.reference,
      language: args.language,
      organization: args.organization,
    });

    // Build metadata using shared utility
    const metadata = buildMetadata({
      startTime,
      data: result,
      serviceMetadata: result.metadata,
      additionalFields: {
        questionsFound: result.metadata.questionsFound,
      },
    });

    // Build response data for formatter
    const responseData = {
      reference: args.reference,
      questions: result.translationQuestions,
      citation: result.citation,
      language: args.language,
      organization: args.organization,
      metadata,
    };

    logger.info("Translation questions fetched successfully", {
      reference: args.reference,
      format: args.format,
      ...metadata,
    });

    // Format based on requested format
    const format = (args.format || "md") as OutputFormat;
    return formatMCPResponse(responseData, format, "translation-questions");
  } catch (error) {
    return handleMCPError({
      toolName: "fetch_translation_questions",
      args: {
        reference: args.reference,
        language: args.language,
        organization: args.organization,
      },
      startTime,
      originalError: error,
    });
  }
}
