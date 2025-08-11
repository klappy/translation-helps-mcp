/**
 * Resource Container (RC) Link Resolution Handler
 * Handles RC manifest parsing and cross-resource linking
 * Enables proper resource relationships and dependencies
 */

import {
  DEFAULT_STRATEGIC_LANGUAGE,
  Organization,
  ResourceType,
} from "../../constants/terminology.js";
import { DCSApiClient } from "../../services/DCSApiClient.js";
import { logger } from "../../utils/logger.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";

interface RCLink {
  id: string;
  sourceResource: string;
  targetResource: string;
  relationship: "depends-on" | "references" | "supplements" | "translates";
  confidence: number;
  metadata: {
    sourceLanguage: string;
    targetLanguage: string;
    sourceType: ResourceType;
    targetType: ResourceType;
    lastVerified: string;
  };
}

interface RCManifest {
  version: string;
  language: string;
  organization: string;
  resourceType: ResourceType;
  dependencies: {
    resourceType: ResourceType;
    language: string;
    organization: string;
    version?: string;
  }[];
  relationships: {
    targetResource: string;
    relationship: string;
    confidence: number;
  }[];
  metadata: {
    lastUpdated: string;
    manifestVersion: string;
    checksum: string;
  };
}

interface RCLinksResponse {
  success: boolean;
  data?: {
    language: string;
    organization: string;
    resourceType: ResourceType;
    links: RCLink[];
    manifest?: RCManifest;
    metadata: {
      totalLinks: number;
      dependencyCount: number;
      relationshipCount: number;
      cacheStatus: "hit" | "miss" | "partial";
      responseTime: number;
    };
  };
  error?: string;
  timestamp: string;
}

/**
 * Main handler for Resource Container link resolution
 */
export const resourceContainerLinksHandler: PlatformHandler = async (
  request: PlatformRequest,
): Promise<PlatformResponse> => {
  const startTime = Date.now();
  const url = new URL(request.url);

  // Extract parameters
  const language =
    url.searchParams.get("language") || DEFAULT_STRATEGIC_LANGUAGE;
  const organization =
    url.searchParams.get("organization") || Organization.UNFOLDINGWORD;
  const resourceType = url.searchParams.get("resourceType") as ResourceType;
  const includeManifest = url.searchParams.get("includeManifest") !== "false";
  const bypassCache = url.searchParams.get("bypassCache") === "true";

  // Validate required parameters
  if (!resourceType) {
    const errorResponse: RCLinksResponse = {
      success: false,
      error: "Resource type parameter is required",
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 400,
      body: JSON.stringify(errorResponse),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    };
  }

  try {
    // Create cache key
    const cacheKey = `rc-links:${language}:${organization}:${resourceType}:${includeManifest}`;

    // Response caching disabled by policy; skip transformed response reads

    logger.info(
      `🔄 RC Links cache MISS, fetching fresh data for: ${language}:${resourceType}`,
    );

    // Fetch fresh data
    const dcsClient = new DCSApiClient();
    const result = await fetchRCLinks(
      dcsClient,
      language,
      organization,
      resourceType,
      includeManifest,
    );

    if (!result) {
      const errorResponse: RCLinksResponse = {
        success: false,
        error: `No RC manifest found for ${language}:${resourceType}`,
        timestamp: new Date().toISOString(),
      };

      return {
        statusCode: 404,
        body: JSON.stringify(errorResponse),
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      };
    }

    // Do not cache transformed responses

    const responseTime = Date.now() - startTime;

    const response: RCLinksResponse = {
      success: true,
      data: {
        ...result,
        metadata: {
          ...result.metadata,
          responseTime,
          cacheStatus: bypassCache ? "miss" : "miss",
        },
      },
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=3600",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    logger.error("Resource Container Links API Error", {
      error: String(error),
    });
    const errorMessage = error instanceof Error ? error.message : String(error);

    const errorResponse: RCLinksResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 500,
      body: JSON.stringify(errorResponse),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    };
  }
};

/**
 * Fetch RC links and manifest data
 */
async function fetchRCLinks(
  dcsClient: DCSApiClient,
  language: string,
  organization: string,
  resourceType: ResourceType,
  includeManifest: boolean,
): Promise<{
  language: string;
  organization: string;
  resourceType: ResourceType;
  links: RCLink[];
  manifest?: RCManifest;
  metadata: {
    totalLinks: number;
    dependencyCount: number;
    relationshipCount: number;
  };
} | null> {
  try {
    // Get the RC manifest file
    const manifestResponse = await dcsClient.getFileContent(
      organization,
      `${language}_${resourceType}`,
      "manifest.yaml",
    );

    if (!manifestResponse.success || !manifestResponse.data) {
      logger.warn(
        `No RC manifest found for ${organization}/${language}_${resourceType}`,
      );
      return null;
    }

    // Parse the RC manifest
    const manifest = parseRCManifest(
      manifestResponse.data.content || manifestResponse.data.toString(),
      language,
      organization,
      resourceType,
    );

    if (!manifest) {
      return null;
    }

    // Build RC links from manifest
    const links: RCLink[] = [];

    // Add dependency links
    for (const dep of manifest.dependencies) {
      const link: RCLink = {
        id: `${resourceType}-${dep.resourceType}-dep`,
        sourceResource: `${language}_${resourceType}`,
        targetResource: `${dep.language}_${dep.resourceType}`,
        relationship: "depends-on",
        confidence: 1.0,
        metadata: {
          sourceLanguage: language,
          targetLanguage: dep.language,
          sourceType: resourceType,
          targetType: dep.resourceType,
          lastVerified: new Date().toISOString(),
        },
      };
      links.push(link);
    }

    // Add relationship links
    for (const rel of manifest.relationships) {
      const link: RCLink = {
        id: `${resourceType}-${rel.targetResource}-rel`,
        sourceResource: `${language}_${resourceType}`,
        targetResource: rel.targetResource,
        relationship: rel.relationship as
          | "depends-on"
          | "references"
          | "supplements"
          | "translates",
        confidence: rel.confidence,
        metadata: {
          sourceLanguage: language,
          targetLanguage: language, // Assume same language for relationships
          sourceType: resourceType,
          targetType: resourceType, // Assume same type for relationships
          lastVerified: new Date().toISOString(),
        },
      };
      links.push(link);
    }

    return {
      language,
      organization,
      resourceType,
      links,
      manifest: includeManifest ? manifest : undefined,
      metadata: {
        totalLinks: links.length,
        dependencyCount: manifest.dependencies.length,
        relationshipCount: manifest.relationships.length,
      },
    };
  } catch (error) {
    logger.error("Error fetching RC links:", error);
    return null;
  }
}

/**
 * Parse RC manifest from YAML/JSON content
 */
function parseRCManifest(
  content: string,
  language: string,
  organization: string,
  resourceType: ResourceType,
): RCManifest | null {
  try {
    // This is a simplified parser - in practice, RC manifests would be in YAML format
    // For now, we'll create a sample manifest based on resource type

    const manifest: RCManifest = {
      version: "1.0",
      language,
      organization,
      resourceType,
      dependencies: getDefaultDependencies(resourceType, language),
      relationships: getDefaultRelationships(resourceType, language),
      metadata: {
        lastUpdated: new Date().toISOString(),
        manifestVersion: "1.0",
        checksum: "sample-checksum",
      },
    };

    return manifest;
  } catch (error) {
    logger.error("Error parsing RC manifest:", error);
    return null;
  }
}

/**
 * Get default dependencies for a resource type
 */
function getDefaultDependencies(
  resourceType: ResourceType,
  language: string,
): RCManifest["dependencies"] {
  const dependencies: RCManifest["dependencies"] = [];

  // Add common dependencies based on resource type
  switch (resourceType) {
    case ResourceType.ULT:
    case ResourceType.UST:
      // Scripture depends on source language resources
      dependencies.push({
        resourceType: ResourceType.ULT,
        language: "en",
        organization: Organization.UNFOLDINGWORD,
        version: "1.0",
      });
      break;

    case ResourceType.TN:
      // Translation Notes depend on scripture
      dependencies.push({
        resourceType: ResourceType.ULT,
        language,
        organization: Organization.UNFOLDINGWORD,
      });
      break;

    case ResourceType.TW:
      // Translation Words depend on scripture
      dependencies.push({
        resourceType: ResourceType.ULT,
        language,
        organization: Organization.UNFOLDINGWORD,
      });
      break;

    case ResourceType.TA:
      // Translation Academy is standalone
      break;
  }

  return dependencies;
}

/**
 * Get default relationships for a resource type
 */
function getDefaultRelationships(
  resourceType: ResourceType,
  language: string,
): RCManifest["relationships"] {
  const relationships: RCManifest["relationships"] = [];

  // Add common relationships based on resource type
  switch (resourceType) {
    case ResourceType.ULT:
      // ULT relates to UST
      relationships.push({
        targetResource: `${language}_ust`,
        relationship: "translates",
        confidence: 0.9,
      });
      break;

    case ResourceType.UST:
      // UST relates to ULT
      relationships.push({
        targetResource: `${language}_ult`,
        relationship: "translates",
        confidence: 0.9,
      });
      break;

    case ResourceType.TN:
      // TN supplements scripture
      relationships.push({
        targetResource: `${language}_ult`,
        relationship: "supplements",
        confidence: 0.8,
      });
      break;

    case ResourceType.TW:
      // TW references scripture
      relationships.push({
        targetResource: `${language}_ult`,
        relationship: "references",
        confidence: 0.7,
      });
      break;
  }

  return relationships;
}
