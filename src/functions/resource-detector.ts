/**
 * Resource Type Detection Module
 * 
 * Provides intelligent detection of resource types from catalog responses
 * to properly categorize resources regardless of organization or naming variations.
 * 
 * Based on Task 7 of the implementation plan.
 */

import { ResourceType } from '../constants/terminology';

export interface ResourceIdentifier {
  identifier: string;
  subject: string;
  organization?: string;
  language?: string;
}

export interface DetectionResult {
  resourceType: ResourceType | null;
  confidence: number;
  reason: string;
}

/**
 * Detect resource type from catalog entry with confidence scoring
 */
export function detectResourceType(resource: ResourceIdentifier): DetectionResult {
  const { identifier, subject, organization = '', language = '' } = resource;
  
  // Normalize inputs for pattern matching
  const id = identifier.toLowerCase();
  const subj = subject.toLowerCase();
  
  // Check subject field first (most reliable indicator)
  if (subj === 'bible' || subj === 'aligned bible') {
    // Bible subject - check for ULT/GLT vs UST/GST
    if (id.includes('ult') || id.includes('literal')) {
      return {
        resourceType: ResourceType.ULT,
        confidence: 0.95,
        reason: 'Subject "Bible" + identifier contains "ult" or "literal"'
      };
    }
    
    if (id.includes('glt') || id.includes('gateway') && id.includes('literal')) {
      return {
        resourceType: ResourceType.GLT,
        confidence: 0.95,
        reason: 'Subject "Bible" + identifier contains "glt" or "gateway literal"'
      };
    }
    
    if (id.includes('ust') || id.includes('simplified')) {
      return {
        resourceType: ResourceType.UST,
        confidence: 0.95,
        reason: 'Subject "Bible" + identifier contains "ust" or "simplified"'
      };
    }
    
    if (id.includes('gst') || id.includes('gateway') && id.includes('simplified')) {
      return {
        resourceType: ResourceType.GST,
        confidence: 0.95,
        reason: 'Subject "Bible" + identifier contains "gst" or "gateway simplified"'
      };
    }
    
    // Generic bible text - try to infer from organization
    if (organization.toLowerCase().includes('unfoldingword')) {
      return {
        resourceType: ResourceType.ULT, // Default to ULT for unfoldingWord
        confidence: 0.7,
        reason: 'Subject "Bible" + unfoldingWord organization (defaulting to ULT)'
      };
    }
    
    return {
      resourceType: null,
      confidence: 0.5,
      reason: 'Subject "Bible" but unable to determine specific type'
    };
  }
  
  // Pattern matching for help resources using identifier patterns
  const patterns: Record<ResourceType, RegExp[]> = {
    [ResourceType.ULT]: [/^[a-z]{2,3}[-_]ult$/i, /ult[-_]?bible/i],
    [ResourceType.GLT]: [/^[a-z]{2,3}[-_]glt$/i, /glt[-_]?bible/i],
    [ResourceType.UST]: [/^[a-z]{2,3}[-_]ust$/i, /ust[-_]?bible/i],
    [ResourceType.GST]: [/^[a-z]{2,3}[-_]gst$/i, /gst[-_]?bible/i],
    [ResourceType.TN]: [/^[a-z]{2,3}[-_]tn$/i, /translation[-_]?notes?/i],
    [ResourceType.TW]: [/^[a-z]{2,3}[-_]tw$/i, /translation[-_]?words?/i],
    [ResourceType.TWL]: [/^[a-z]{2,3}[-_]twl$/i, /translation[-_]?word[-_]?links?/i],
    [ResourceType.TQ]: [/^[a-z]{2,3}[-_]tq$/i, /translation[-_]?questions?/i],
    [ResourceType.TA]: [/^[a-z]{2,3}[-_]ta$/i, /translation[-_]?academy/i],
    [ResourceType.ALIGNMENT]: [/alignment/i, /word[-_]?alignment/i],
    [ResourceType.VERSIFICATION]: [/versification/i, /verse[-_]?system/i]
  };
  
  // Check patterns with confidence scoring
  for (const [resourceType, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      if (regex.test(id) || regex.test(subj)) {
        const confidence = regex.test(id) ? 0.9 : 0.8; // Higher confidence for identifier match
        return {
          resourceType: resourceType as ResourceType,
          confidence,
          reason: `Pattern match: ${regex.source} in ${regex.test(id) ? 'identifier' : 'subject'}`
        };
      }
    }
  }
  
  // Fallback: check for common keywords in subject
  const subjectKeywords: Record<string, ResourceType> = {
    'translation notes': ResourceType.TN,
    'transliteration notes': ResourceType.TN,
    'translation words': ResourceType.TW,
    'translation questions': ResourceType.TQ,
    'translation academy': ResourceType.TA,
    'study notes': ResourceType.TN,
    'study questions': ResourceType.TQ
  };
  
  for (const [keyword, type] of Object.entries(subjectKeywords)) {
    if (subj.includes(keyword)) {
      return {
        resourceType: type,
        confidence: 0.75,
        reason: `Subject contains keyword: "${keyword}"`
      };
    }
  }
  
  return {
    resourceType: null,
    confidence: 0.0,
    reason: 'No recognizable patterns found'
  };
}

/**
 * Batch detect resource types for multiple resources
 */
export function detectResourceTypes(resources: ResourceIdentifier[]): DetectionResult[] {
  return resources.map(detectResourceType);
}

/**
 * Filter resources by detected type
 */
export function filterResourcesByType(
  resources: ResourceIdentifier[], 
  targetType: ResourceType
): Array<ResourceIdentifier & DetectionResult> {
  return resources
    .map(resource => ({
      ...resource,
      ...detectResourceType(resource)
    }))
    .filter(result => result.resourceType === targetType);
}

/**
 * Get confidence statistics for a batch of detections
 */
export function getDetectionStats(results: DetectionResult[]): {
  totalResources: number;
  detected: number;
  averageConfidence: number;
  highConfidence: number; // confidence >= 0.8
  lowConfidence: number;  // confidence < 0.5
} {
  const detected = results.filter(r => r.resourceType !== null);
  const confidences = detected.map(r => r.confidence);
  
  return {
    totalResources: results.length,
    detected: detected.length,
    averageConfidence: confidences.length > 0 
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
      : 0,
    highConfidence: detected.filter(r => r.confidence >= 0.8).length,
    lowConfidence: detected.filter(r => r.confidence < 0.5).length
  };
}

/**
 * Validate resource type detection against known good examples
 */
export function validateDetection(
  resource: ResourceIdentifier,
  expectedType: ResourceType
): boolean {
  const result = detectResourceType(resource);
  return result.resourceType === expectedType && result.confidence >= 0.7;
}
