/**
 * Resource Type Detection Service
 *
 * Provides intelligent detection of unfoldingWord resource types from catalog responses.
 * Handles various naming patterns, organization differences, and provides confidence scores.
 *
 * Based on: docs/UW_TRANSLATION_RESOURCES_GUIDE.md
 * Created for Task 7 of the implementation plan
 */

import { ResourceType } from "../constants/terminology.js";
import type { Resource } from "../types/dcs.js";

/**
 * Result of resource type detection with confidence score
 */
export interface DetectionResult {
  type: ResourceType | null;
  confidence: number; // 0.0 to 1.0
  reason: string;
  patterns: string[];
}

/**
 * Detection patterns for each resource type
 * Each pattern includes regex, priority, and confidence boost
 */
interface DetectionPattern {
  regex: RegExp;
  priority: number; // Higher number = higher priority
  confidence: number; // Base confidence (0.0-1.0)
  description: string;
}

/**
 * Comprehensive patterns for resource type detection
 */
const DETECTION_PATTERNS: Record<ResourceType, DetectionPattern[]> = {
  [ResourceType.ULT]: [
    {
      regex: /^[a-z]{2,3}[-_]?ult$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct ULT identifier pattern",
    },
    {
      regex: /unfoldingword.*literal/i,
      priority: 8,
      confidence: 0.9,
      description: "unfoldingWord Literal Text description",
    },
    {
      regex: /literal.*text.*align/i,
      priority: 7,
      confidence: 0.85,
      description: "Literal text with alignment reference",
    },
    {
      regex: /form.*centric.*translation/i,
      priority: 6,
      confidence: 0.8,
      description: "Form-centric translation description",
    },
  ],

  [ResourceType.GLT]: [
    {
      regex: /^[a-z]{2,3}[-_]?glt$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct GLT identifier pattern",
    },
    {
      regex: /(gateway|strategic).*literal/i,
      priority: 8,
      confidence: 0.9,
      description: "Strategic/Gateway Literal Text description",
    },
    {
      regex: /literal.*strategic/i,
      priority: 7,
      confidence: 0.85,
      description: "Literal Strategic Language text",
    },
  ],

  [ResourceType.UST]: [
    {
      regex: /^[a-z]{2,3}[-_]?ust$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct UST identifier pattern",
    },
    {
      regex: /unfoldingword.*simplified/i,
      priority: 8,
      confidence: 0.9,
      description: "unfoldingWord Simplified Text description",
    },
    {
      regex: /meaning.*based.*translation/i,
      priority: 7,
      confidence: 0.85,
      description: "Meaning-based translation description",
    },
    {
      regex: /clear.*natural.*language/i,
      priority: 6,
      confidence: 0.8,
      description: "Clear natural language description",
    },
  ],

  [ResourceType.GST]: [
    {
      regex: /^[a-z]{2,3}[-_]?gst$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct GST identifier pattern",
    },
    {
      regex: /(gateway|strategic).*simplified/i,
      priority: 8,
      confidence: 0.9,
      description: "Strategic/Gateway Simplified Text description",
    },
    {
      regex: /simplified.*strategic/i,
      priority: 7,
      confidence: 0.85,
      description: "Simplified Strategic Language text",
    },
  ],

  [ResourceType.TN]: [
    {
      regex: /^[a-z]{2,3}[-_]?tn$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct TN identifier pattern",
    },
    {
      regex: /translation.*notes?/i,
      priority: 9,
      confidence: 0.9,
      description: "Translation Notes description",
    },
    {
      regex: /cultural.*linguistic/i,
      priority: 7,
      confidence: 0.85,
      description: "Cultural and linguistic content",
    },
    {
      regex: /verse.*guidance/i,
      priority: 6,
      confidence: 0.8,
      description: "Verse-by-verse guidance",
    },
  ],

  [ResourceType.TW]: [
    {
      regex: /^[a-z]{2,3}[-_]?tw$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct TW identifier pattern",
    },
    {
      regex: /translation.*words?/i,
      priority: 9,
      confidence: 0.9,
      description: "Translation Words description",
    },
    {
      regex: /biblical.*terms?/i,
      priority: 8,
      confidence: 0.85,
      description: "Biblical terms reference",
    },
    {
      regex: /definitions.*cross.*references?/i,
      priority: 7,
      confidence: 0.8,
      description: "Definitions with cross-references",
    },
  ],

  [ResourceType.TWL]: [
    {
      regex: /^[a-z]{2,3}[-_]?twl$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct TWL identifier pattern",
    },
    {
      regex: /translation.*words?.*links?/i,
      priority: 9,
      confidence: 0.9,
      description: "Translation Words Links description",
    },
    {
      regex: /word.*level.*links?/i,
      priority: 8,
      confidence: 0.85,
      description: "Word-level links reference",
    },
    {
      regex: /occurrence.*mapping/i,
      priority: 7,
      confidence: 0.8,
      description: "Word occurrence mapping",
    },
  ],

  [ResourceType.TQ]: [
    {
      regex: /^[a-z]{2,3}[-_]?tq$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct TQ identifier pattern",
    },
    {
      regex: /translation.*questions?/i,
      priority: 9,
      confidence: 0.9,
      description: "Translation Questions description",
    },
    {
      regex: /comprehension.*validation/i,
      priority: 8,
      confidence: 0.85,
      description: "Comprehension validation reference",
    },
    {
      regex: /community.*checking/i,
      priority: 7,
      confidence: 0.8,
      description: "Community checking reference",
    },
  ],

  [ResourceType.TA]: [
    {
      regex: /^[a-z]{2,3}[-_]?ta$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct TA identifier pattern",
    },
    {
      regex: /translation.*academy/i,
      priority: 9,
      confidence: 0.9,
      description: "Translation Academy description",
    },
    {
      regex: /methodology.*best.*practices/i,
      priority: 8,
      confidence: 0.85,
      description: "Methodology and best practices",
    },
    {
      regex: /training.*modules?/i,
      priority: 7,
      confidence: 0.8,
      description: "Training modules reference",
    },
  ],

  [ResourceType.UHB]: [
    {
      regex: /^uhb$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct UHB identifier",
    },
    {
      regex: /hebrew.*bible/i,
      priority: 9,
      confidence: 0.9,
      description: "Hebrew Bible description",
    },
    {
      regex: /original.*hebrew/i,
      priority: 8,
      confidence: 0.85,
      description: "Original Hebrew text",
    },
    {
      regex: /morphological.*analysis/i,
      priority: 7,
      confidence: 0.8,
      description: "Morphological analysis reference",
    },
  ],

  [ResourceType.UGNT]: [
    {
      regex: /^ugnt$/i,
      priority: 10,
      confidence: 0.95,
      description: "Direct UGNT identifier",
    },
    {
      regex: /greek.*testament/i,
      priority: 9,
      confidence: 0.9,
      description: "Greek New Testament description",
    },
    {
      regex: /original.*greek/i,
      priority: 8,
      confidence: 0.85,
      description: "Original Greek text",
    },
    {
      regex: /grammatical.*details/i,
      priority: 7,
      confidence: 0.8,
      description: "Grammatical details reference",
    },
  ],
};

/**
 * Subject field patterns for additional context
 */
const SUBJECT_PATTERNS: Record<string, { types: ResourceType[]; confidence: number }> = {
  Bible: {
    types: [ResourceType.ULT, ResourceType.GLT, ResourceType.UST, ResourceType.GST],
    confidence: 0.9,
  },
  "Aligned Bible": { types: [ResourceType.ULT, ResourceType.UST], confidence: 0.95 },
  "Translation Notes": { types: [ResourceType.TN], confidence: 0.95 },
  "Translation Words": { types: [ResourceType.TW], confidence: 0.95 },
  "Translation Questions": { types: [ResourceType.TQ], confidence: 0.95 },
  "Translation Academy": { types: [ResourceType.TA], confidence: 0.95 },
  "Hebrew Old Testament": { types: [ResourceType.UHB], confidence: 0.95 },
  "Greek New Testament": { types: [ResourceType.UGNT], confidence: 0.95 },
};

/**
 * Main resource type detection function
 *
 * @param resource - DCS resource object
 * @returns Detection result with type, confidence, and reasoning
 */
export function detectResourceType(resource: Resource): DetectionResult {
  const results: DetectionResult[] = [];

  // Prepare search text from all available fields
  const searchFields = [resource.name || "", resource.full_name || "", resource.description || ""];

  const searchText = searchFields.join(" ").toLowerCase();
  const identifier = (resource.name || "").toLowerCase();

  // Check description field for subject-like patterns
  for (const [subjectPattern, subjectInfo] of Object.entries(SUBJECT_PATTERNS)) {
    if (searchText.includes(subjectPattern.toLowerCase())) {
      // For descriptions that match subject patterns, use identifier to disambiguate
      for (const type of subjectInfo.types) {
        const typePatterns = DETECTION_PATTERNS[type];
        const identifierMatch = typePatterns.find((pattern) => pattern.regex.test(identifier));

        if (identifierMatch) {
          results.push({
            type,
            confidence: Math.min(subjectInfo.confidence + identifierMatch.confidence, 1.0),
            reason: `Description contains '${subjectPattern}' + identifier '${identifier}' pattern: ${identifierMatch.description}`,
            patterns: [subjectPattern, identifierMatch.description],
          });
        }
      }
    }
  }

  // Check all resource type patterns
  for (const [resourceType, patterns] of Object.entries(DETECTION_PATTERNS)) {
    const type = resourceType as ResourceType;

    for (const pattern of patterns) {
      if (pattern.regex.test(identifier)) {
        // Higher confidence for identifier matches
        results.push({
          type,
          confidence: Math.min(pattern.confidence + 0.1, 1.0),
          reason: `Identifier match: ${pattern.description}`,
          patterns: [pattern.description],
        });
      } else if (pattern.regex.test(searchText)) {
        // Lower confidence for description matches
        results.push({
          type,
          confidence: pattern.confidence * 0.8,
          reason: `Description match: ${pattern.description}`,
          patterns: [pattern.description],
        });
      }
    }
  }

  // Return highest confidence result
  if (results.length === 0) {
    return {
      type: null,
      confidence: 0,
      reason: "No matching patterns found",
      patterns: [],
    };
  }

  // Sort by confidence (highest first), then by priority
  results.sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) < 0.01) {
      // If confidence is very close, prefer results with more specific patterns
      return b.patterns.length - a.patterns.length;
    }
    return b.confidence - a.confidence;
  });

  return results[0];
}

/**
 * Batch detection for multiple resources
 */
export function detectResourceTypes(resources: Resource[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();

  for (const resource of resources) {
    const key = `${resource.name}_${resource.owner?.username || "unknown"}`;
    results.set(key, detectResourceType(resource));
  }

  return results;
}

/**
 * Get resources by detected type
 */
export function getResourcesByType(
  resources: Resource[],
  targetType: ResourceType,
  minConfidence: number = 0.7
): Array<{ resource: Resource; detection: DetectionResult }> {
  const results: Array<{ resource: Resource; detection: DetectionResult }> = [];

  for (const resource of resources) {
    const detection = detectResourceType(resource);

    if (detection.type === targetType && detection.confidence >= minConfidence) {
      results.push({ resource, detection });
    }
  }

  // Sort by confidence (highest first)
  return results.sort((a, b) => b.detection.confidence - a.detection.confidence);
}

/**
 * Validate detected resource type against expected patterns
 */
export function validateDetection(
  resource: Resource,
  expectedType: ResourceType
): { valid: boolean; confidence: number; issues: string[] } {
  const detection = detectResourceType(resource);
  const issues: string[] = [];

  if (detection.type !== expectedType) {
    issues.push(`Expected ${expectedType}, detected ${detection.type || "unknown"}`);
  }

  if (detection.confidence < 0.8) {
    issues.push(`Low confidence detection: ${detection.confidence.toFixed(2)}`);
  }

  if (!detection.type) {
    issues.push("No resource type detected");
  }

  return {
    valid: issues.length === 0,
    confidence: detection.confidence,
    issues,
  };
}

/**
 * Get detection statistics for a set of resources
 */
export function getDetectionStats(resources: Resource[]): {
  totalResources: number;
  detectedTypes: Record<ResourceType, number>;
  undetected: number;
  averageConfidence: number;
  highConfidenceCount: number;
} {
  const stats = {
    totalResources: resources.length,
    detectedTypes: {} as Record<ResourceType, number>,
    undetected: 0,
    averageConfidence: 0,
    highConfidenceCount: 0,
  };

  // Initialize type counts
  for (const type of Object.values(ResourceType)) {
    stats.detectedTypes[type] = 0;
  }

  let totalConfidence = 0;

  for (const resource of resources) {
    const detection = detectResourceType(resource);

    if (detection.type) {
      stats.detectedTypes[detection.type]++;
      if (detection.confidence >= 0.8) {
        stats.highConfidenceCount++;
      }
    } else {
      stats.undetected++;
    }

    totalConfidence += detection.confidence;
  }

  stats.averageConfidence = stats.totalResources > 0 ? totalConfidence / stats.totalResources : 0;

  return stats;
}
