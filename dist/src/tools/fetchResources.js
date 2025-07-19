/**
 * Fetch Resources Tool
 * Main tool for fetching Bible translation resources for a specific reference
 */
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { parseReference } from "../parsers/referenceParser.js";
import { ResourceAggregator } from "../services/ResourceAggregator.js";
import { estimateTokens } from "../utils/tokenCounter.js";
// Input schema
export const FetchResourcesArgs = z.object({
    reference: z.string(),
    language: z.string().optional().default("en"),
    organization: z.string().optional().default("unfoldingWord"),
    resources: z
        .array(z.string())
        .optional()
        .default(["scripture", "notes", "questions", "words", "links"]),
});
/**
 * Handle the fetch resources tool call
 */
export async function handleFetchResources(args) {
    const startTime = Date.now();
    try {
        logger.info("Fetching resources", {
            reference: args.reference,
            language: args.language,
            organization: args.organization,
            resources: args.resources,
        });
        // Parse the Bible reference
        const reference = parseReference(args.reference);
        if (!reference) {
            throw new Error(`Invalid Bible reference: ${args.reference}`);
        }
        // Set up options
        const options = {
            language: args.language,
            organization: args.organization,
            resources: args.resources,
        };
        // Fetch resources using aggregator
        const aggregator = new ResourceAggregator();
        const resources = await aggregator.aggregateResources(reference, options);
        // Build response
        const response = {
            reference: {
                book: reference.book,
                chapter: reference.chapter,
                verse: reference.verse,
                verseEnd: reference.endVerse,
            },
            scripture: resources.scripture
                ? {
                    text: resources.scripture.text,
                    rawUsfm: resources.scripture.rawUsfm,
                    translation: resources.scripture.translation,
                }
                : null,
            translationNotes: resources.translationNotes || [],
            translationQuestions: resources.translationQuestions || [],
            translationWords: resources.translationWords || [],
            translationWordLinks: resources.translationWordLinks || [],
            metadata: {
                language: args.language,
                organization: args.organization,
                timestamp: new Date().toISOString(),
                resourcesFound: Object.keys(resources).filter((key) => resources[key] &&
                    (Array.isArray(resources[key]) ? resources[key].length > 0 : true)),
                tokenEstimate: estimateTokens(JSON.stringify(resources)),
                responseTime: Date.now() - startTime,
            },
        };
        logger.info("Resources fetched successfully", {
            reference: args.reference,
            resourcesFound: response.metadata.resourcesFound,
            responseTime: response.metadata.responseTime,
        });
        return response;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("Failed to fetch resources", {
            reference: args.reference,
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
