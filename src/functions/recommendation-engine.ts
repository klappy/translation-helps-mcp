/**
 * Smart Resource Recommendation Engine
 * 
 * Analyzes user context and suggests appropriate resources for their translation task.
 * Based on Task 9 of the implementation plan.
 */

import { ResourceType, ResourceDescriptions, WorkflowType } from '../constants/terminology';
import { detectResourceType } from './resource-detector';

export interface RecommendationContext {
  reference: ScriptureReference;
  userRole: 'translator' | 'checker' | 'consultant' | 'student';
  previousQueries: string[];
  languageCapabilities: string[];
  currentWorkflow?: WorkflowType;
  difficulty?: number; // 0-1 scale
}

export interface ScriptureReference {
  book: string;
  chapter: number;
  verse?: number;
  endVerse?: number;
}

export interface ResourceRecommendation {
  type: ResourceType;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  description: string;
  estimatedUsefulness: number; // 0-1 scale
  prerequisites?: ResourceType[];
}

export interface RecommendationResult {
  recommendations: ResourceRecommendation[];
  workflowSuggestion: WorkflowType;
  metadata: {
    context: RecommendationContext;
    analysisTime: number;
    confidenceScore: number;
  };
}

/**
 * Genre detection for passages (simplified heuristics)
 */
function detectGenre(reference: ScriptureReference): string {
  const { book } = reference;
  const bookLower = book.toLowerCase();
  
  // Narrative books
  if (['genesis', 'exodus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth', 
       '1samuel', '2samuel', '1kings', '2kings', '1chronicles', '2chronicles',
       'ezra', 'nehemiah', 'esther', 'matthew', 'mark', 'luke', 'john', 'acts'].includes(bookLower)) {
    return 'narrative';
  }
  
  // Wisdom literature
  if (['job', 'psalms', 'proverbs', 'ecclesiastes', 'songofsolomon'].includes(bookLower)) {
    return 'wisdom';
  }
  
  // Prophetic books
  if (['isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel',
       'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah',
       'haggai', 'zechariah', 'malachi', 'revelation'].includes(bookLower)) {
    return 'prophetic';
  }
  
  // Epistles
  if (['romans', 'galatians', 'ephesians', 'philippians', 'colossians',
       '1thessalonians', '2thessalonians', '1timothy', '2timothy', 'titus',
       'philemon', 'hebrews', 'james', '1peter', '2peter', '1john', '2john',
       '3john', 'jude'].includes(bookLower)) {
    return 'epistle';
  }
  
  // Law
  if (['leviticus'].includes(bookLower)) {
    return 'law';
  }
  
  return 'general';
}

/**
 * Assess passage difficulty based on various factors
 */
function assessDifficulty(reference: ScriptureReference): number {
  const { book, chapter, verse } = reference;
  const genre = detectGenre(reference);
  
  let difficulty = 0.5; // Base difficulty
  
  // Genre-based difficulty adjustments
  switch (genre) {
    case 'law':
      difficulty += 0.3; // Legal passages are complex
      break;
    case 'prophetic':
      difficulty += 0.2; // Symbolic and future-oriented
      break;
    case 'wisdom':
      difficulty += 0.1; // Poetic and metaphorical
      break;
    case 'epistle':
      difficulty += 0.15; // Theological complexity
      break;
    case 'narrative':
      difficulty -= 0.1; // Generally more straightforward
      break;
  }
  
  // Specific difficult passages (simplified examples)
  const difficultPassages = [
    { book: 'revelation', minDifficulty: 0.8 },
    { book: 'ezekiel', chapter: 1, minDifficulty: 0.9 }, // Vision of wheels
    { book: 'romans', chapter: 9, minDifficulty: 0.8 }, // Predestination
    { book: 'hebrews', chapter: 7, minDifficulty: 0.8 }, // Melchizedek
  ];
  
  for (const passage of difficultPassages) {
    if (book.toLowerCase() === passage.book && 
        (!passage.chapter || chapter === passage.chapter)) {
      difficulty = Math.max(difficulty, passage.minDifficulty);
    }
  }
  
  return Math.min(difficulty, 1.0);
}

/**
 * Main recommendation engine
 */
export function recommendResources(context: RecommendationContext): RecommendationResult {
  const startTime = Date.now();
  const recommendations: ResourceRecommendation[] = [];
  
  const { reference, userRole, currentWorkflow = WorkflowType.FORM_CENTRIC } = context;
  const genre = detectGenre(reference);
  const difficulty = context.difficulty || assessDifficulty(reference);
  
  // Always recommend appropriate scripture texts first
  if (currentWorkflow === WorkflowType.FORM_CENTRIC) {
    recommendations.push({
      type: ResourceType.ULT,
      priority: 'high',
      reason: 'Form-centric workflow requires literal text preservation',
      description: ResourceDescriptions[ResourceType.ULT],
      estimatedUsefulness: 0.95
    });
    
    recommendations.push({
      type: ResourceType.UST,
      priority: 'medium',
      reason: 'Comparison with meaning-based text provides translation options',
      description: ResourceDescriptions[ResourceType.UST],
      estimatedUsefulness: 0.8
    });
  } else if (currentWorkflow === WorkflowType.MEANING_BASED) {
    recommendations.push({
      type: ResourceType.UST,
      priority: 'high',
      reason: 'Meaning-based workflow prioritizes clear expression',
      description: ResourceDescriptions[ResourceType.UST],
      estimatedUsefulness: 0.95
    });
    
    recommendations.push({
      type: ResourceType.ULT,
      priority: 'medium',
      reason: 'Reference to original structure helps maintain accuracy',
      description: ResourceDescriptions[ResourceType.ULT],
      estimatedUsefulness: 0.7
    });
  }
  
  // Difficulty-based recommendations
  if (difficulty > 0.7) {
    recommendations.push({
      type: ResourceType.TN,
      priority: 'high',
      reason: 'This passage contains complex cultural or theological concepts',
      description: ResourceDescriptions[ResourceType.TN],
      estimatedUsefulness: 0.9
    });
    
    recommendations.push({
      type: ResourceType.TA,
      priority: 'medium',
      reason: 'Difficult passages benefit from translation methodology guidance',
      description: ResourceDescriptions[ResourceType.TA],
      estimatedUsefulness: 0.7
    });
  }
  
  // Genre-specific recommendations
  switch (genre) {
    case 'wisdom':
      recommendations.push({
        type: ResourceType.TW,
        priority: 'high',
        reason: 'Wisdom literature contains many key theological terms',
        description: ResourceDescriptions[ResourceType.TW],
        estimatedUsefulness: 0.85
      });
      break;
      
    case 'prophetic':
      recommendations.push({
        type: ResourceType.TN,
        priority: 'high',
        reason: 'Prophetic literature requires cultural and historical context',
        description: ResourceDescriptions[ResourceType.TN],
        estimatedUsefulness: 0.9
      });
      break;
      
    case 'narrative':
      recommendations.push({
        type: ResourceType.TQ,
        priority: 'medium',
        reason: 'Narrative passages benefit from comprehension checking',
        description: ResourceDescriptions[ResourceType.TQ],
        estimatedUsefulness: 0.7
      });
      break;
      
    case 'law':
      recommendations.push({
        type: ResourceType.TW,
        priority: 'high',
        reason: 'Legal texts contain many technical terms requiring definition',
        description: ResourceDescriptions[ResourceType.TW],
        estimatedUsefulness: 0.9
      });
      
      recommendations.push({
        type: ResourceType.TWL,
        priority: 'medium',
        reason: 'Precise term mapping essential for legal accuracy',
        description: ResourceDescriptions[ResourceType.TWL],
        estimatedUsefulness: 0.8
      });
      break;
  }
  
  // User role specific recommendations
  switch (userRole) {
    case 'checker':
      recommendations.push({
        type: ResourceType.TQ,
        priority: 'high',
        reason: 'Checkers need validation questions for quality assurance',
        description: ResourceDescriptions[ResourceType.TQ],
        estimatedUsefulness: 0.9
      });
      break;
      
    case 'consultant':
      recommendations.push({
        type: ResourceType.TA,
        priority: 'medium',
        reason: 'Consultants benefit from methodology guidance for training',
        description: ResourceDescriptions[ResourceType.TA],
        estimatedUsefulness: 0.8
      });
      break;
      
    case 'student':
      recommendations.push({
        type: ResourceType.TQ,
        priority: 'high',
        reason: 'Students learn through comprehension questions',
        description: ResourceDescriptions[ResourceType.TQ],
        estimatedUsefulness: 0.85
      });
      
      recommendations.push({
        type: ResourceType.TA,
        priority: 'medium',
        reason: 'Students need foundational translation principles',
        description: ResourceDescriptions[ResourceType.TA],
        estimatedUsefulness: 0.75
      });
      break;
  }
  
  // Add word alignment for all users
  recommendations.push({
    type: ResourceType.ALIGNMENT,
    priority: 'medium',
    reason: 'Word-level precision supports accurate translation decisions',
    description: ResourceDescriptions[ResourceType.ALIGNMENT],
    estimatedUsefulness: 0.8
  });
  
  // Remove duplicates and sort by priority and usefulness
  const uniqueRecommendations = recommendations.reduce((acc, rec) => {
    const existing = acc.find(r => r.type === rec.type);
    if (!existing || existing.estimatedUsefulness < rec.estimatedUsefulness) {
      return [...acc.filter(r => r.type !== rec.type), rec];
    }
    return acc;
  }, [] as ResourceRecommendation[]);
  
  uniqueRecommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.estimatedUsefulness - a.estimatedUsefulness;
  });
  
  // Determine workflow suggestion
  let workflowSuggestion = currentWorkflow;
  if (!currentWorkflow) {
    workflowSuggestion = difficulty > 0.6 
      ? WorkflowType.FORM_CENTRIC // Difficult passages need structural precision
      : WorkflowType.MEANING_BASED; // Simpler passages can focus on clarity
  }
  
  const analysisTime = Date.now() - startTime;
  const confidenceScore = Math.min(0.95, 0.6 + (uniqueRecommendations.length * 0.05));
  
  return {
    recommendations: uniqueRecommendations,
    workflowSuggestion,
    metadata: {
      context,
      analysisTime,
      confidenceScore
    }
  };
}

/**
 * Get workflow-specific recommendations
 */
export function getWorkflowRecommendations(workflow: WorkflowType): ResourceType[] {
  switch (workflow) {
    case WorkflowType.FORM_CENTRIC:
      return [ResourceType.ULT, ResourceType.TN, ResourceType.TW, ResourceType.ALIGNMENT];
      
    case WorkflowType.MEANING_BASED:
      return [ResourceType.UST, ResourceType.TN, ResourceType.TQ];
      
    case WorkflowType.CHECKING:
      return [ResourceType.TQ, ResourceType.ULT, ResourceType.UST, ResourceType.TN];
      
    case WorkflowType.METHODOLOGY:
      return [ResourceType.TA, ResourceType.TN, ResourceType.TW];
      
    default:
      return [ResourceType.ULT, ResourceType.UST, ResourceType.TN];
  }
}
