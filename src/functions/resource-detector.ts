/**
 * Resource Type Detection System
 * Intelligently identifies ULT/GLT, UST/GST, and all help resources from catalog responses
 * Handles organization-specific variations and provides confidence scoring
 *
 * Implements Task 7 from the implementation plan
 */

import { ResourceType } from "../constants/terminology.js";

export interface ResourceDetectionResult {
  type: ResourceType | null;
  confidence: number; // 0-1, higher = more confident
  reasoning: string[]; // Explanation of detection logic
  alternatives: Array<{
    type: ResourceType;
    confidence: number;
    reason: string;
  }>;
}

export interface ResourceContext {
  identifier: string;
  subject: string;
  organization: string;
  language: string;
  name?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface ResourcePattern {
  identifiers: readonly RegExp[];
  subjects: readonly string[];
  keywords: readonly string[];
  organizationHints: readonly string[];
  confidence: number;
}

// Pattern definitions for resource detection
const RESOURCE_PATTERNS: Record<ResourceType, ResourcePattern> = {
  [ResourceType.ULT]: {
    identifiers: [/^[a-z]{2,3}[-_]ult$/i, /^ult$/i, /unfoldingword.*literal/i],
    subjects: ["Bible", "Aligned Bible", "Scripture"],
    keywords: [
      "literal",
      "form-centric",
      "unfoldingword",
      "original structure",
    ],
    organizationHints: ["unfoldingWord"],
    confidence: 0.9,
  },
  [ResourceType.GLT]: {
    identifiers: [/^[a-z]{2,3}[-_]glt$/i, /^glt$/i, /gateway.*literal/i],
    subjects: ["Bible", "Aligned Bible", "Scripture"],
    keywords: ["literal", "gateway", "form-centric", "strategic"],
    organizationHints: ["unfoldingWord", "Door43-Catalog"],
    confidence: 0.9,
  },
  [ResourceType.UST]: {
    identifiers: [
      /^[a-z]{2,3}[-_]ust$/i,
      /^ust$/i,
      /unfoldingword.*simplified/i,
    ],
    subjects: ["Bible", "Aligned Bible", "Scripture"],
    keywords: ["simplified", "meaning-based", "unfoldingword", "clear"],
    organizationHints: ["unfoldingWord"],
    confidence: 0.9,
  },
  [ResourceType.GST]: {
    identifiers: [/^[a-z]{2,3}[-_]gst$/i, /^gst$/i, /gateway.*simplified/i],
    subjects: ["Bible", "Aligned Bible", "Scripture"],
    keywords: ["simplified", "gateway", "meaning-based", "strategic"],
    organizationHints: ["unfoldingWord", "Door43-Catalog"],
    confidence: 0.9,
  },
  [ResourceType.TN]: {
    identifiers: [/^[a-z]{2,3}[-_]tn$/i, /^tn$/i, /translation.*notes?$/i],
    subjects: ["Translation Notes", "Notes", "Translation Academy"],
    keywords: ["notes", "translation", "explanation", "commentary"],
    organizationHints: ["unfoldingWord", "Door43-Catalog"],
    confidence: 0.95,
  },
  [ResourceType.TW]: {
    identifiers: [/^[a-z]{2,3}[-_]tw$/i, /^tw$/i, /translation.*words?$/i],
    subjects: ["Translation Words", "Dictionary", "Lexicon"],
    keywords: ["words", "dictionary", "terms", "lexicon", "definitions"],
    organizationHints: ["unfoldingWord", "Door43-Catalog"],
    confidence: 0.95,
  },
  [ResourceType.TWL]: {
    identifiers: [
      /^[a-z]{2,3}[-_]twl$/i,
      /^twl$/i,
      /translation.*words?.*links?$/i,
    ],
    subjects: ["Translation Words Links", "Translation Words"],
    keywords: ["links", "words", "connections", "mappings"],
    organizationHints: ["unfoldingWord", "Door43-Catalog"],
    confidence: 0.9,
  },
  [ResourceType.TQ]: {
    identifiers: [/^[a-z]{2,3}[-_]tq$/i, /^tq$/i, /translation.*questions?$/i],
    subjects: ["Translation Questions", "Questions"],
    keywords: ["questions", "checking", "comprehension", "validation"],
    organizationHints: ["unfoldingWord", "Door43-Catalog"],
    confidence: 0.95,
  },
  [ResourceType.TA]: {
    identifiers: [/^[a-z]{2,3}[-_]ta$/i, /^ta$/i, /translation.*academy$/i],
    subjects: ["Translation Academy", "Academy", "Manual"],
    keywords: ["academy", "manual", "methodology", "training", "principles"],
    organizationHints: ["unfoldingWord", "Door43-Catalog"],
    confidence: 0.95,
  },
  [ResourceType.OBS]: {
    identifiers: [/^[a-z]{2,3}[-_]obs$/i, /^obs$/i, /open.*bible.*stories$/i],
    subjects: ["Open Bible Stories", "Stories", "Bible Stories"],
    keywords: ["stories", "open", "narrative", "chronological"],
    organizationHints: ["unfoldingWord", "Door43-Catalog"],
    confidence: 0.9,
  },
  [ResourceType.UHB]: {
    identifiers: [/^uhb$/i, /unfoldingword.*hebrew$/i, /hebrew.*bible$/i],
    subjects: ["Hebrew Bible", "Original Language", "Hebrew"],
    keywords: ["hebrew", "original", "uhb", "masoretic"],
    organizationHints: ["unfoldingWord"],
    confidence: 0.95,
  },
  [ResourceType.UGNT]: {
    identifiers: [/^ugnt$/i, /unfoldingword.*greek$/i, /greek.*testament$/i],
    subjects: ["Greek New Testament", "Original Language", "Greek"],
    keywords: ["greek", "testament", "ugnt", "original"],
    organizationHints: ["unfoldingWord"],
    confidence: 0.95,
  },
  // Add missing resource types with default patterns
  [ResourceType.SN]: {
    identifiers: [/^[a-z]{2,3}[-_]sn$/i, /^sn$/i, /study.*notes?$/i],
    subjects: ["Study Notes", "Notes"],
    keywords: ["study", "notes", "commentary", "detailed"],
    organizationHints: ["unfoldingWord"],
    confidence: 0.9,
  },
  [ResourceType.SQ]: {
    identifiers: [/^[a-z]{2,3}[-_]sq$/i, /^sq$/i, /study.*questions?$/i],
    subjects: ["Study Questions", "Questions"],
    keywords: ["study", "questions", "discussion", "reflection"],
    organizationHints: ["unfoldingWord"],
    confidence: 0.9,
  },
};

/**
 * Main resource detection function
 */
export function detectResourceType(
  context: ResourceContext,
): ResourceDetectionResult {
  const alternatives: ResourceDetectionResult["alternatives"] = [];
  let bestMatch: ResourceType | null = null;
  let bestConfidence = 0;
  const reasoning: string[] = [];

  // Check each resource type pattern
  for (const [resourceType, pattern] of Object.entries(RESOURCE_PATTERNS)) {
    const type = resourceType as ResourceType;
    const confidence = calculateConfidence(context, pattern);

    if (confidence > 0.1) {
      // Only consider reasonable matches
      alternatives.push({
        type,
        confidence,
        reason: generateReason(context, pattern, confidence),
      });

      if (confidence > bestConfidence) {
        bestMatch = type;
        bestConfidence = confidence;
      }
    }
  }

  // Sort alternatives by confidence
  alternatives.sort((a, b) => b.confidence - a.confidence);

  // Generate reasoning for best match
  if (bestMatch) {
    const pattern = RESOURCE_PATTERNS[bestMatch];
    reasoning.push(
      `Identified as ${bestMatch.toUpperCase()} with ${(bestConfidence * 100).toFixed(1)}% confidence`,
    );

    // Add specific reasons
    if (matchesIdentifierPattern(context.identifier, pattern.identifiers)) {
      reasoning.push(
        `Identifier "${context.identifier}" matches ${bestMatch.toUpperCase()} pattern`,
      );
    }

    if (matchesSubject(context.subject, pattern.subjects)) {
      reasoning.push(
        `Subject "${context.subject}" indicates ${bestMatch.toUpperCase()} resource`,
      );
    }

    if (
      context.organization &&
      pattern.organizationHints.includes(context.organization)
    ) {
      reasoning.push(
        `Organization "${context.organization}" commonly produces ${bestMatch.toUpperCase()}`,
      );
    }

    // Language-specific logic
    if (bestMatch === ResourceType.ULT && context.language !== "en") {
      reasoning.push(
        `Warning: ULT typically only available in English, found language "${context.language}"`,
      );
      bestConfidence *= 0.7; // Reduce confidence
    } else if (bestMatch === ResourceType.UST && context.language !== "en") {
      reasoning.push(
        `Warning: UST typically only available in English, found language "${context.language}"`,
      );
      bestConfidence *= 0.7; // Reduce confidence
    }
  }

  return {
    type: bestMatch,
    confidence: bestConfidence,
    reasoning,
    alternatives: alternatives.slice(0, 3), // Top 3 alternatives
  };
}

/**
 * Calculate confidence score for a resource type pattern
 */
function calculateConfidence(
  context: ResourceContext,
  pattern: ResourcePattern,
): number {
  let confidence = 0;
  let factors = 0;

  // Identifier matching (highest weight)
  if (matchesIdentifierPattern(context.identifier, pattern.identifiers)) {
    confidence += 0.4;
    factors++;
  }

  // Subject matching (high weight)
  if (matchesSubject(context.subject, pattern.subjects)) {
    confidence += 0.3;
    factors++;
  }

  // Organization hint (medium weight)
  if (
    context.organization &&
    pattern.organizationHints.includes(context.organization)
  ) {
    confidence += 0.15;
    factors++;
  }

  // Keyword matching in name/title/description (lower weight)
  const textContent = [context.name, context.title, context.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const keywordMatches = pattern.keywords.filter((keyword: string) =>
    textContent.includes(keyword.toLowerCase()),
  );

  if (keywordMatches.length > 0) {
    confidence += 0.1 * (keywordMatches.length / pattern.keywords.length);
    factors++;
  }

  // Language validation for language-specific resources
  if (
    isLanguageSpecificResource(pattern) &&
    !isValidLanguageCode(context.language)
  ) {
    confidence *= 0.5; // Reduce confidence for invalid language codes
  }

  // Normalize confidence based on pattern base confidence
  confidence *= pattern.confidence;

  // Apply minimum threshold
  return factors > 0 ? Math.min(confidence, 1.0) : 0;
}

/**
 * Check if identifier matches any of the patterns
 */
function matchesIdentifierPattern(
  identifier: string,
  patterns: readonly RegExp[],
): boolean {
  return patterns.some((pattern) => pattern.test(identifier));
}

/**
 * Check if subject matches expected subjects
 */
function matchesSubject(
  subject: string,
  expectedSubjects: readonly string[],
): boolean {
  if (!subject) return false;

  return expectedSubjects.some(
    (expected) =>
      subject.toLowerCase().includes(expected.toLowerCase()) ||
      expected.toLowerCase().includes(subject.toLowerCase()),
  );
}

/**
 * Generate human-readable reason for match
 */
function generateReason(
  context: ResourceContext,
  pattern: ResourcePattern,
  confidence: number,
): string {
  const reasons: string[] = [];

  if (matchesIdentifierPattern(context.identifier, pattern.identifiers)) {
    reasons.push("identifier pattern");
  }

  if (matchesSubject(context.subject, pattern.subjects)) {
    reasons.push("subject match");
  }

  if (
    context.organization &&
    pattern.organizationHints.includes(context.organization)
  ) {
    reasons.push("organization hint");
  }

  const reasonText =
    reasons.length > 0 ? `(${reasons.join(", ")})` : "(keyword similarity)";
  return `${(confidence * 100).toFixed(1)}% ${reasonText}`;
}

/**
 * Check if resource type is language-specific
 */
function isLanguageSpecificResource(pattern: ResourcePattern): boolean {
  // Most UW resources are language-specific except original language texts
  return !pattern.keywords.includes("original");
}

/**
 * Basic language code validation
 */
function isValidLanguageCode(language: string): boolean {
  if (!language) return false;

  // Allow standard language codes (2-3 letters) and common variants
  return /^[a-z]{2,3}(-[a-z0-9]+)*$/i.test(language);
}

/**
 * Detect multiple resources from a catalog response
 */
export function detectResourcesFromCatalog(
  catalogData: Record<string, unknown>[],
): Array<{
  resource: Record<string, unknown>;
  detection: ResourceDetectionResult;
}> {
  return catalogData.map((resource) => {
    const context: ResourceContext = {
      identifier:
        (resource.name as string) || (resource.identifier as string) || "",
      subject: (resource.subject as string) || "",
      organization:
        ((resource.owner as Record<string, unknown>)?.login as string) ||
        (resource.organization as string) ||
        "",
      language: (resource.language as string) || "",
      name: (resource.name as string) || "",
      title: (resource.title as string) || "",
      description: (resource.description as string) || "",
      metadata: resource,
    };

    const detection = detectResourceType(context);

    return {
      resource,
      detection,
    };
  });
}

/**
 * Filter resources by type with confidence threshold
 */
export function filterResourcesByType(
  detectedResources: ReturnType<typeof detectResourcesFromCatalog>,
  resourceType: ResourceType,
  minConfidence = 0.5,
): Record<string, unknown>[] {
  return detectedResources
    .filter(
      (item) =>
        item.detection.type === resourceType &&
        item.detection.confidence >= minConfidence,
    )
    .map((item) => ({
      ...item.resource,
      detectionConfidence: item.detection.confidence,
      detectionReasoning: item.detection.reasoning,
    }));
}

/**
 * Get resource statistics from detected resources
 */
export function getResourceStats(
  detectedResources: ReturnType<typeof detectResourcesFromCatalog>,
) {
  const stats = {
    total: detectedResources.length,
    detected: 0,
    byType: {} as Record<ResourceType, number>,
    averageConfidence: 0,
    highConfidence: 0, // > 0.8
    mediumConfidence: 0, // 0.5 - 0.8
    lowConfidence: 0, // < 0.5
    undetected: 0,
  };

  let totalConfidence = 0;

  for (const item of detectedResources) {
    if (item.detection.type) {
      stats.detected++;
      stats.byType[item.detection.type] =
        (stats.byType[item.detection.type] || 0) + 1;
      totalConfidence += item.detection.confidence;

      if (item.detection.confidence > 0.8) {
        stats.highConfidence++;
      } else if (item.detection.confidence >= 0.5) {
        stats.mediumConfidence++;
      } else {
        stats.lowConfidence++;
      }
    } else {
      stats.undetected++;
    }
  }

  stats.averageConfidence =
    stats.detected > 0 ? totalConfidence / stats.detected : 0;

  return stats;
}

/**
 * Suggest improvements for low-confidence detections
 */
export function suggestImprovements(
  detection: ResourceDetectionResult,
): string[] {
  const suggestions: string[] = [];

  if (detection.confidence < 0.5) {
    suggestions.push(
      "Consider adding more descriptive identifiers (e.g., en_ult, es_tn)",
    );
    suggestions.push(
      "Ensure subject field accurately describes the resource type",
    );
    suggestions.push(
      "Add keywords in title or description that match resource type",
    );
  }

  if (detection.alternatives.length > 1) {
    const topAlt = detection.alternatives[1];
    if (Math.abs(detection.confidence - topAlt.confidence) < 0.1) {
      suggestions.push(
        `Detection is ambiguous - could also be ${topAlt.type.toUpperCase()} (${(topAlt.confidence * 100).toFixed(1)}%)`,
      );
    }
  }

  if (!detection.type) {
    suggestions.push(
      "Resource type could not be determined - consider using standard UW naming conventions",
    );
  }

  return suggestions;
}
