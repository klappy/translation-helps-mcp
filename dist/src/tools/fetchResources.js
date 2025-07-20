/**
 * Fetch Resources Tool
 * Tool for fetching multiple types of translation resources
 * Uses shared core service for consistency with Netlify functions
 */
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { fetchResources } from "../../netlify/functions/_shared/resources-service.js";
import { estimateTokens } from "../utils/tokenCounter.js";
// Input schema
export const FetchResourcesArgs = z.object({
    reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
    language: z.string().optional().default("en").describe('Language code (default: "en")'),
    organization: z
        .string()
        .optional()
        .default("unfoldingWord")
        .describe('Organization (default: "unfoldingWord")'),
    resources: z
        .array(z.string())
        .optional()
        .default(["scripture", "notes", "questions", "words"])
        .describe("Resource types to fetch"),
    includeIntro: z.boolean().optional().default(true).describe("Include introduction notes"),
    includeVerseNumbers: z.boolean().optional().default(true).describe("Include verse numbers"),
    format: z.enum(["text", "usfm"]).optional().default("text").describe("Output format"),
});
/**
 * Handle the fetch resources tool call
 */
export async function handleFetchResources(args) {
    const startTime = Date.now();
    try {
        logger.info("Fetching multiple resources", {
            reference: args.reference,
            language: args.language,
            organization: args.organization,
            resources: args.resources,
        });
        // Use the shared resources service (same as Netlify functions)
        const result = await fetchResources({
            reference: args.reference,
            language: args.language,
            organization: args.organization,
            resources: args.resources,
            includeIntro: args.includeIntro,
            includeVerseNumbers: args.includeVerseNumbers,
            format: args.format,
        });
        // Build enhanced response format for MCP
        const response = {
            reference: result.reference,
            scripture: result.scripture,
            translationNotes: result.translationNotes,
            translationQuestions: result.translationQuestions,
            translationWords: result.translationWords,
            citations: result.citations,
            language: args.language,
            organization: args.organization,
            metadata: {
                responseTime: Date.now() - startTime,
                tokenEstimate: estimateTokens(JSON.stringify(result)),
                timestamp: new Date().toISOString(),
                resourcesRequested: result.metadata.resourcesRequested,
                resourcesFound: result.metadata.resourcesFound,
            },
        };
        logger.info("Resources fetched successfully", {
            reference: args.reference,
            resourcesRequested: result.metadata.resourcesRequested.length,
            resourcesFound: result.metadata.resourcesFound,
            responseTime: response.metadata.responseTime,
        });
        return response;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("Failed to fetch resources", {
            reference: args.reference,
            resources: args.resources,
            error: errorMessage,
            responseTime: Date.now() - startTime,
        });
        return {
            error: errorMessage,
            reference: args.reference,
            timestamp: new Date().toISOString(),
        };
    }
}
