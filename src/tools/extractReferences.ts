/**
 * Extract References Tool
 * Extract Bible references from text
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";

// Input schema
export const ExtractReferencesArgs = z.object({
  text: z.string(),
  context: z.string().optional(),
});

export type ExtractReferencesArgs = z.infer<typeof ExtractReferencesArgs>;

/**
 * Handle the extract references tool call
 */
export async function handleExtractReferences(args: ExtractReferencesArgs) {
  const startTime = Date.now();

  try {
    logger.info("Extracting references from text", { textLength: args.text.length });

    // Simple regex patterns for Bible references
    const patterns = [
      /\b(?:1|2|3)\s*(?:John|Peter|Kings|Samuel|Chronicles|Corinthians|Thessalonians|Timothy)\s+\d+(?::\d+(?:-\d+)?)?/gi,
      /\b(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi)\s+\d+(?::\d+(?:-\d+)?)?/gi,
      /\b(?:Matthew|Mark|Luke|John|Acts|Romans|Galatians|Ephesians|Philippians|Colossians|Philemon|Hebrews|James|Jude|Revelation)\s+\d+(?::\d+(?:-\d+)?)?/gi,
      /\b(?:Gen|Ex|Lev|Num|Deut|Josh|Judg|Ruth|1Sam|2Sam|1Kgs|2Kgs|1Chr|2Chr|Ezra|Neh|Est|Job|Ps|Prov|Eccl|Song|Isa|Jer|Lam|Ezek|Dan|Hos|Joel|Am|Ob|Jon|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Mt|Mk|Lk|Jn|Acts|Rom|1Cor|2Cor|Gal|Eph|Phil|Col|1Th|2Th|1Tim|2Tim|Tit|Phlm|Heb|Jas|1Pet|2Pet|1Jn|2Jn|3Jn|Jude|Rev)\.?\s*\d+(?::\d+(?:-\d+)?)?/gi,
    ];

    const foundReferences: Array<{
      text: string;
      startIndex: number;
      endIndex: number;
      book: string;
      chapter?: string;
      verse?: string;
      confidence: number;
    }> = [];

    // Extract references using patterns
    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(args.text)) !== null) {
        const referenceText = match[0];
        const parts = referenceText.split(/[\s:]+/);

        foundReferences.push({
          text: referenceText,
          startIndex: match.index,
          endIndex: match.index + referenceText.length,
          book: parts[0],
          chapter: parts[1],
          verse: parts[2],
          confidence: 0.8, // Placeholder confidence
        });
      }
    });

    // Remove duplicates and sort by position
    const uniqueReferences = foundReferences
      .filter(
        (ref, index, self) =>
          index === self.findIndex((r) => r.text === ref.text && r.startIndex === ref.startIndex)
      )
      .sort((a, b) => a.startIndex - b.startIndex);

    const results = {
      text: args.text,
      context: args.context,
      references: uniqueReferences,
      totalFound: uniqueReferences.length,
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
    logger.error("Failed to extract references", {
      args: { textLength: args.text.length, context: args.context },
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
              textLength: args.text.length,
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
