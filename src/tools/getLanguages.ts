/**
 * Get Languages Tool
 * Get available languages from the translation resources
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";

// Input schema
export const GetLanguagesArgs = z.object({
  organization: z.string().optional(),
});

export type GetLanguagesArgs = z.infer<typeof GetLanguagesArgs>;

/**
 * Handle the get languages tool call
 */
export async function handleGetLanguages(args: GetLanguagesArgs) {
  const startTime = Date.now();

  try {
    logger.info("Getting available languages", args);

    // Placeholder implementation with common languages
    const languages = [
      { code: "en", name: "English", direction: "ltr", organization: "unfoldingWord" },
      { code: "es", name: "Español", direction: "ltr", organization: "unfoldingWord" },
      { code: "fr", name: "Français", direction: "ltr", organization: "unfoldingWord" },
      { code: "ar", name: "العربية", direction: "rtl", organization: "unfoldingWord" },
      { code: "hi", name: "हिन्दी", direction: "ltr", organization: "unfoldingWord" },
      { code: "zh", name: "中文", direction: "ltr", organization: "unfoldingWord" },
    ];

    const filteredLanguages = args.organization
      ? languages.filter((lang) => lang.organization === args.organization)
      : languages;

    const results = {
      languages: filteredLanguages,
      total: filteredLanguages.length,
      organization: args.organization,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error("Failed to get languages", {
      args,
      error: (error as Error).message,
      responseTime: Date.now() - startTime,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: (error as Error).message,
              organization: args.organization,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}
