/**
 * Smart Resource Recommendation Engine
 *
 * Suggests appropriate unfoldingWord resources based on user context, scripture references,
 * and translation needs. Uses intelligent analysis to guide users to the most helpful resources.
 *
 * Implements Task 9 from the implementation plan
 */

import {
  ResourceDescriptions,
  ResourceType,
} from "../constants/terminology.js";

export interface ScriptureReference {
  book: string;
  chapter: number;
  verse?: number;
  endVerse?: number;
}

export interface RecommendationContext {
  reference: ScriptureReference;
  userRole: "translator" | "checker" | "consultant" | "facilitator";
  previousQueries: string[];
  languageCapabilities: string[];
  targetLanguage?: string;
  sourceLanguages?: string[];
}

export interface ResourceRecommendation {
  type: ResourceType;
  priority: "high" | "medium" | "low";
  reason: string;
  description: string;
  confidence: number; // 0-1, how confident we are in this recommendation
  context?: {
    specificSections?: string[];
    searchTerms?: string[];
    relatedPassages?: ScriptureReference[];
  };
}

export interface RecommendationResponse {
  recommendations: ResourceRecommendation[];
  metadata: {
    totalRecommendations: number;
    analysisTime: number;
    userRole: string;
    passage: {
      reference: string;
      genre: string;
      difficulty: number;
      themes: string[];
    };
  };
}

// Book categorization for genre detection
const BOOK_GENRES = {
  // Pentateuch/Law
  genesis: "narrative",
  exodus: "narrative",
  leviticus: "law",
  numbers: "narrative",
  deuteronomy: "law",

  // Historical
  joshua: "narrative",
  judges: "narrative",
  ruth: "narrative",
  "1samuel": "narrative",
  "2samuel": "narrative",
  "1kings": "narrative",
  "2kings": "narrative",
  "1chronicles": "narrative",
  "2chronicles": "narrative",
  ezra: "narrative",
  nehemiah: "narrative",
  esther: "narrative",

  // Wisdom/Poetry
  job: "wisdom",
  psalms: "poetry",
  proverbs: "wisdom",
  ecclesiastes: "wisdom",
  songofsolomon: "poetry",

  // Prophets
  isaiah: "prophecy",
  jeremiah: "prophecy",
  lamentations: "poetry",
  ezekiel: "prophecy",
  daniel: "apocalyptic",
  hosea: "prophecy",
  joel: "prophecy",
  amos: "prophecy",
  obadiah: "prophecy",
  jonah: "narrative",
  micah: "prophecy",
  nahum: "prophecy",
  habakkuk: "prophecy",
  zephaniah: "prophecy",
  haggai: "prophecy",
  zechariah: "prophecy",
  malachi: "prophecy",

  // Gospels
  matthew: "gospel",
  mark: "gospel",
  luke: "gospel",
  john: "gospel",

  // NT History
  acts: "narrative",

  // Epistles
  romans: "epistle",
  "1corinthians": "epistle",
  "2corinthians": "epistle",
  galatians: "epistle",
  ephesians: "epistle",
  philippians: "epistle",
  colossians: "epistle",
  "1thessalonians": "epistle",
  "2thessalonians": "epistle",
  "1timothy": "epistle",
  "2timothy": "epistle",
  titus: "epistle",
  philemon: "epistle",
  hebrews: "epistle",
  james: "epistle",
  "1peter": "epistle",
  "2peter": "epistle",
  "1john": "epistle",
  "2john": "epistle",
  "3john": "epistle",
  jude: "epistle",

  // Apocalyptic
  revelation: "apocalyptic",
} as const;

// Difficult passages that often need extra help
const DIFFICULT_PASSAGES = {
  // Theological complexity
  "romans:9": {
    difficulty: 0.9,
    themes: ["predestination", "election", "sovereignty"],
  },
  "ephesians:1": { difficulty: 0.8, themes: ["predestination", "election"] },
  "1corinthians:11": {
    difficulty: 0.8,
    themes: ["gender roles", "head covering", "culture"],
  },
  "1timothy:2": {
    difficulty: 0.9,
    themes: ["gender roles", "women teaching", "culture"],
  },

  // Cultural complexity
  "1corinthians:8": {
    difficulty: 0.8,
    themes: ["idols", "food sacrificed", "conscience"],
  },
  "acts:15": { difficulty: 0.7, themes: ["gentiles", "circumcision", "law"] },
  "galatians:3": { difficulty: 0.8, themes: ["law vs grace", "justification"] },

  // Prophetic/apocalyptic
  "daniel:7": {
    difficulty: 0.9,
    themes: ["prophecy", "kingdoms", "symbolism"],
  },
  "revelation:13": {
    difficulty: 0.9,
    themes: ["beast", "prophecy", "symbolism"],
  },
  "ezekiel:38": { difficulty: 0.9, themes: ["gog", "magog", "prophecy"] },

  // Poetic/metaphorical
  "songofsolomon:1": {
    difficulty: 0.7,
    themes: ["metaphor", "love", "poetry"],
  },
  "ecclesiastes:3": {
    difficulty: 0.6,
    themes: ["time", "philosophy", "wisdom"],
  },

  // Historical/genealogical
  "1chronicles:1": { difficulty: 0.4, themes: ["genealogy", "names"] },
  "numbers:1": { difficulty: 0.4, themes: ["census", "organization"] },
} as const;

// Key theological terms that often need TW support
const THEOLOGICAL_TERMS = [
  "righteousness",
  "justification",
  "sanctification",
  "redemption",
  "atonement",
  "covenant",
  "election",
  "predestination",
  "grace",
  "faith",
  "works",
  "kingdom",
  "gospel",
  "salvation",
  "forgiveness",
  "reconciliation",
  "sacrifice",
  "priest",
  "temple",
  "altar",
  "offering",
  "blood",
  "holy",
  "sacred",
  "clean",
  "unclean",
  "law",
  "commandment",
  "prophet",
  "prophecy",
  "vision",
  "dream",
  "revelation",
  "word",
  "spirit",
  "soul",
  "heart",
  "mind",
  "flesh",
  "body",
  "death",
  "life",
];

/**
 * Main recommendation function
 */
export function recommendResources(
  context: RecommendationContext,
): RecommendationResponse {
  const startTime = Date.now();
  const recommendations: ResourceRecommendation[] = [];

  // Analyze the passage
  const passageAnalysis = analyzePassage(context.reference);

  // Get base recommendations for all users
  recommendations.push(...getBaseRecommendations(context, passageAnalysis));

  // Add role-specific recommendations
  recommendations.push(
    ...getRoleSpecificRecommendations(context, passageAnalysis),
  );

  // Add difficulty-based recommendations
  recommendations.push(
    ...getDifficultyBasedRecommendations(context, passageAnalysis),
  );

  // Add genre-specific recommendations
  recommendations.push(
    ...getGenreSpecificRecommendations(context, passageAnalysis),
  );

  // Sort by priority and confidence
  recommendations.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityWeight[a.priority];
    const bPriority = priorityWeight[b.priority];

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    return b.confidence - a.confidence; // Higher confidence first
  });

  // Remove duplicates (keep highest priority/confidence)
  const uniqueRecommendations = recommendations.filter(
    (rec, index, arr) => arr.findIndex((r) => r.type === rec.type) === index,
  );

  return {
    recommendations: uniqueRecommendations,
    metadata: {
      totalRecommendations: uniqueRecommendations.length,
      analysisTime: Date.now() - startTime,
      userRole: context.userRole,
      passage: {
        reference: formatReference(context.reference),
        genre: passageAnalysis.genre,
        difficulty: passageAnalysis.difficulty,
        themes: passageAnalysis.themes,
      },
    },
  };
}

/**
 * Analyze a scripture passage for genre, difficulty, and themes
 */
function analyzePassage(reference: ScriptureReference) {
  const bookKey = reference.book.toLowerCase().replace(/\s+/g, "");
  const genre = BOOK_GENRES[bookKey as keyof typeof BOOK_GENRES] || "unknown";

  // Check for specific difficult passages
  const passageKey = `${bookKey}:${reference.chapter}`;
  const knownDifficulty =
    DIFFICULT_PASSAGES[passageKey as keyof typeof DIFFICULT_PASSAGES];

  let difficulty = 0.3; // Base difficulty
  let themes: string[] = [];

  if (knownDifficulty) {
    difficulty = knownDifficulty.difficulty;
    themes = [...knownDifficulty.themes]; // Convert readonly to mutable array
  } else {
    // Calculate difficulty based on genre
    const genreDifficulty = {
      law: 0.7,
      prophecy: 0.8,
      apocalyptic: 0.9,
      wisdom: 0.6,
      poetry: 0.5,
      epistle: 0.6,
      gospel: 0.4,
      narrative: 0.3,
    };

    difficulty = genreDifficulty[genre as keyof typeof genreDifficulty] || 0.3;

    // Add themes based on genre
    const genreThemes = {
      law: ["commandments", "ceremonial", "civil"],
      prophecy: ["judgment", "restoration", "messianic"],
      apocalyptic: ["symbolism", "prophecy", "future"],
      wisdom: ["practical living", "philosophy"],
      poetry: ["metaphor", "emotion", "worship"],
      epistle: ["doctrine", "practical application"],
      gospel: ["jesus", "teaching", "miracles"],
      narrative: ["historical", "story", "characters"],
    };

    themes = genreThemes[genre as keyof typeof genreThemes] || [];
  }

  return { genre, difficulty, themes };
}

/**
 * Get base recommendations that apply to all users
 */
function getBaseRecommendations(
  context: RecommendationContext,
  analysis: ReturnType<typeof analyzePassage>,
): ResourceRecommendation[] {
  const recommendations: ResourceRecommendation[] = [];

  // Always recommend ULT/GLT and UST/GST for scripture
  recommendations.push({
    type: ResourceType.ULT,
    priority: "high",
    reason:
      "Essential for understanding the original language structure and meaning",
    description: ResourceDescriptions[ResourceType.ULT],
    confidence: 0.95,
    context: {
      specificSections: ["Main text", "Word alignment data"],
    },
  });

  recommendations.push({
    type: ResourceType.UST,
    priority: "high",
    reason:
      "Provides clear, natural expression of the meaning for translation guidance",
    description: ResourceDescriptions[ResourceType.UST],
    confidence: 0.95,
    context: {
      specificSections: ["Main text", "Natural language examples"],
    },
  });

  return recommendations;
}

/**
 * Get recommendations based on user role
 */
function getRoleSpecificRecommendations(
  context: RecommendationContext,
  analysis: ReturnType<typeof analyzePassage>,
): ResourceRecommendation[] {
  const recommendations: ResourceRecommendation[] = [];

  switch (context.userRole) {
    case "translator":
      // Translators need practical helps
      recommendations.push({
        type: ResourceType.TN,
        priority: "high",
        reason:
          "Translation Notes provide essential cultural and linguistic context for accurate translation",
        description: ResourceDescriptions[ResourceType.TN],
        confidence: 0.9,
        context: {
          specificSections: [`Notes for ${formatReference(context.reference)}`],
        },
      });

      if (analysis.themes.some((theme) => THEOLOGICAL_TERMS.includes(theme))) {
        recommendations.push({
          type: ResourceType.TW,
          priority: "high",
          reason:
            "This passage contains key theological terms that need precise definition",
          description: ResourceDescriptions[ResourceType.TW],
          confidence: 0.85,
          context: {
            searchTerms: analysis.themes.filter((theme) =>
              THEOLOGICAL_TERMS.includes(theme),
            ),
          },
        });
      }
      break;

    case "checker":
      // Checkers focus on accuracy and quality
      recommendations.push({
        type: ResourceType.TQ,
        priority: "high",
        reason:
          "Translation Questions help verify accuracy and comprehension during checking",
        description: ResourceDescriptions[ResourceType.TQ],
        confidence: 0.9,
        context: {
          specificSections: [
            `Questions for ${formatReference(context.reference)}`,
          ],
        },
      });

      recommendations.push({
        type: ResourceType.TWL,
        priority: "medium",
        reason:
          "Word links help verify that key terms are translated consistently",
        description: ResourceDescriptions[ResourceType.TWL],
        confidence: 0.7,
      });
      break;

    case "consultant":
      // Consultants need comprehensive resources
      recommendations.push({
        type: ResourceType.TA,
        priority: "medium",
        reason:
          "Translation Academy provides methodology guidance for training and mentoring",
        description: ResourceDescriptions[ResourceType.TA],
        confidence: 0.8,
        context: {
          specificSections: ["Translation principles", "Quality assurance"],
        },
      });
      break;

    case "facilitator":
      // Facilitators coordinate and manage
      recommendations.push({
        type: ResourceType.TA,
        priority: "high",
        reason:
          "Translation Academy essential for project management and team coordination",
        description: ResourceDescriptions[ResourceType.TA],
        confidence: 0.85,
        context: {
          specificSections: ["Project management", "Team coordination"],
        },
      });
      break;
  }

  return recommendations;
}

/**
 * Get recommendations based on passage difficulty
 */
function getDifficultyBasedRecommendations(
  context: RecommendationContext,
  analysis: ReturnType<typeof analyzePassage>,
): ResourceRecommendation[] {
  const recommendations: ResourceRecommendation[] = [];

  if (analysis.difficulty > 0.7) {
    // High difficulty passages need extra help
    recommendations.push({
      type: ResourceType.TN,
      priority: "high",
      reason:
        "This is a complex passage that requires detailed cultural and theological explanation",
      description: ResourceDescriptions[ResourceType.TN],
      confidence: 0.95,
      context: {
        specificSections: ["Cultural background", "Theological significance"],
      },
    });

    recommendations.push({
      type: ResourceType.TW,
      priority: "high",
      reason:
        "Complex passages often contain theological terms requiring precise definition",
      description: ResourceDescriptions[ResourceType.TW],
      confidence: 0.9,
      context: {
        searchTerms: analysis.themes,
      },
    });
  }

  return recommendations;
}

/**
 * Get recommendations based on passage genre
 */
function getGenreSpecificRecommendations(
  _context: RecommendationContext,
  analysis: ReturnType<typeof analyzePassage>,
): ResourceRecommendation[] {
  const recommendations: ResourceRecommendation[] = [];

  switch (analysis.genre) {
    case "poetry":
    case "wisdom":
      recommendations.push({
        type: ResourceType.TN,
        priority: "medium",
        reason:
          "Poetic and wisdom literature often uses figurative language requiring cultural explanation",
        description: ResourceDescriptions[ResourceType.TN],
        confidence: 0.8,
        context: {
          specificSections: ["Figurative language", "Cultural metaphors"],
          relatedPassages: [_context.reference], // Use the context reference
        },
      });
      break;

    case "prophecy":
    case "apocalyptic":
      recommendations.push({
        type: ResourceType.TN,
        priority: "high",
        reason:
          "Prophetic literature contains symbolic language and historical context crucial for understanding",
        description: ResourceDescriptions[ResourceType.TN],
        confidence: 0.9,
        context: {
          specificSections: [
            "Symbolic language",
            "Historical context",
            "Fulfillment",
          ],
          relatedPassages: [_context.reference], // Use the context reference
        },
      });
      break;

    case "law":
      recommendations.push({
        type: ResourceType.TW,
        priority: "high",
        reason:
          "Legal texts contain technical terms and concepts requiring precise definition",
        description: ResourceDescriptions[ResourceType.TW],
        confidence: 0.85,
        context: {
          searchTerms: [
            "law",
            "commandment",
            "statute",
            "ordinance",
            "covenant",
          ],
          relatedPassages: [_context.reference], // Use the context reference
        },
      });
      break;
  }

  return recommendations;
}

/**
 * Format scripture reference for display
 */
function formatReference(reference: ScriptureReference): string {
  let formatted = `${reference.book} ${reference.chapter}`;

  if (reference.verse) {
    formatted += `:${reference.verse}`;
    if (reference.endVerse && reference.endVerse !== reference.verse) {
      formatted += `-${reference.endVerse}`;
    }
  }

  return formatted;
}
