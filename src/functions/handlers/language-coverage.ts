/**
 * Language Coverage Matrix API Handler
 * 
 * Returns a matrix showing which resources are available for each Strategic Language.
 * This helps users choose appropriate Strategic Languages with complete resource sets.
 * 
 * Based on Task 8 of the implementation plan.
 */

import type { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { ResourceType, ResourceDescriptions, CacheConfig } from "../constants/terminology";
import { detectResourceType } from "../resource-detector";
import { DCSApiClient } from "../../services/DCSApiClient";

interface LanguageCoverage {
  [languageCode: string]: {
    name: string;
    coverage: {
      [K in ResourceType]?: {
        available: boolean;
        version?: string;
        updated?: string;
        books?: number;
        articles?: number;
      };
    };
    completeness: number; // 0-100
    recommended: boolean;
  };
}

interface CoverageResponse {
  languages: LanguageCoverage;
  metadata: {
    totalLanguages: number;
    completeLanguages: number;
    lastUpdated: string;
    cacheKey: string;
  };
}

export const languageCoverageHandler: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const minCompleteness = parseInt(request.queryStringParameters.minCompleteness || "0");
    const includeRecommended = request.queryStringParameters.recommended !== "false";
    
    const client = new DCSApiClient();
    
    // Get all available languages and their resources
    const catalogResponse = await client.getCatalog();
    if (!catalogResponse.success || !catalogResponse.data) {
      throw new Error('Failed to fetch catalog data');
    }

    const coverage: LanguageCoverage = {};
    const resourcesByLanguage = new Map<string, any[]>();

    // Group resources by language
    catalogResponse.data.forEach((resource: any) => {
      const langCode = resource.language || 'unknown';
      if (!resourcesByLanguage.has(langCode)) {
        resourcesByLanguage.set(langCode, []);
      }
      resourcesByLanguage.get(langCode)!.push(resource);
    });

    // Build coverage matrix for each language
    for (const [langCode, resources] of resourcesByLanguage) {
      if (langCode === 'unknown') continue;

      const languageName = resources[0]?.language_title || langCode;
      const languageCoverage: LanguageCoverage[string] = {
        name: languageName,
        coverage: {},
        completeness: 0,
        recommended: false
      };

      // Detect and categorize resources for this language
      const detectedResources = resources.map(resource => ({
        ...resource,
        ...detectResourceType({
          identifier: resource.name || resource.identifier,
          subject: resource.subject || '',
          organization: resource.owner?.username || '',
          language: langCode
        })
      }));

      // Count available resource types
      const availableTypes = new Set<ResourceType>();
      
      Object.values(ResourceType).forEach(resourceType => {
        const resourcesOfType = detectedResources.filter(
          r => r.resourceType === resourceType && r.confidence >= 0.7
        );
        
        if (resourcesOfType.length > 0) {
          availableTypes.add(resourceType);
          
          // Get the most recent resource of this type
          const latestResource = resourcesOfType.sort(
            (a, b) => new Date(b.released || b.updated_at || '').getTime() - 
                     new Date(a.released || a.updated_at || '').getTime()
          )[0];

          languageCoverage.coverage[resourceType] = {
            available: true,
            version: latestResource.release?.tag_name || latestResource.tag_name || 'latest',
            updated: latestResource.released || latestResource.updated_at || new Date().toISOString().split('T')[0],
            // Additional metadata based on resource type
            ...(resourceType === ResourceType.TN || resourceType === ResourceType.TQ || resourceType === ResourceType.TWL 
              ? { books: resourcesOfType.length } 
              : {}),
            ...(resourceType === ResourceType.TW || resourceType === ResourceType.TA
              ? { articles: resourcesOfType.length }
              : {})
          };
        } else {
          languageCoverage.coverage[resourceType] = {
            available: false
          };
        }
      });

      // Calculate completeness score
      const totalTypes = Object.keys(ResourceType).length;
      const coreTypes = [ResourceType.ULT, ResourceType.UST, ResourceType.TN, ResourceType.TW]; // Core types for high score
      const availableCoreTypes = coreTypes.filter(type => availableTypes.has(type)).length;
      
      // Weighted scoring: core types worth more
      const coreWeight = 0.7;
      const supportWeight = 0.3;
      const coreScore = (availableCoreTypes / coreTypes.length) * coreWeight;
      const supportScore = (availableTypes.size / totalTypes) * supportWeight;
      
      languageCoverage.completeness = Math.round((coreScore + supportScore) * 100);
      
      // Mark as recommended if has good coverage
      languageCoverage.recommended = languageCoverage.completeness >= 70 && availableCoreTypes >= 3;

      coverage[langCode] = languageCoverage;
    }

    // Filter by completeness if requested
    const filteredCoverage = Object.fromEntries(
      Object.entries(coverage).filter(([_, lang]) => lang.completeness >= minCompleteness)
    );

    // Calculate metadata
    const totalLanguages = Object.keys(filteredCoverage).length;
    const completeLanguages = Object.values(filteredCoverage).filter(lang => lang.completeness >= 80).length;

    const response: CoverageResponse = {
      languages: includeRecommended 
        ? filteredCoverage 
        : Object.fromEntries(
            Object.entries(filteredCoverage).filter(([_, lang]) => lang.recommended)
          ),
      metadata: {
        totalLanguages,
        completeLanguages,
        lastUpdated: new Date().toISOString(),
        cacheKey: `coverage-${minCompleteness}-${includeRecommended}-${Date.now()}`
      }
    };

    const responseTime = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": `public, max-age=${CacheConfig.CATALOG_TTL}`, // 15 minute TTL
        "X-Response-Time": `${responseTime}ms`,
        "X-Total-Languages": totalLanguages.toString(),
        "X-Complete-Languages": completeLanguages.toString(),
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Language Coverage API Error:", error);
    const responseTime = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Response-Time": `${responseTime}ms`,
      },
      body: JSON.stringify({
        error: "Failed to generate language coverage matrix",
        code: "COVERAGE_ERROR",
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
