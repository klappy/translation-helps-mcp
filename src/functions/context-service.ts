/**
 * Context Service
 * Shared implementation for extracting contextual information from translation notes
 * Used by both Netlify functions and MCP tools for consistency
 */

import {
  fetchTranslationNotes,
  TranslationNote,
} from "./translation-notes-service";

export interface ContextOptions {
  reference: string;
  language?: string;
  organization?: string;
  includeRawData?: boolean;
  maxTokens?: number;
  deepAnalysis?: boolean;
}

export interface BookContext {
  title: string;
  author: string;
  audience: string;
  purpose: string;
  outline: string[];
  mainThemes: string[];
  historicalBackground: string;
  literaryGenre: string;
  titleSuggestions: string[];
  culturalAdaptations: string[];
  commonPhrases: string[];
}

export interface ChapterContext {
  number: number;
  structure: string;
  formatting: string;
  religiousConcepts: string[];
  culturalConcepts: string[];
  translationIssues: string[];
  grammarIssues: string[];
}

export interface VerseContext {
  specificNotes: TranslationNote[];
  keyTerms: string[];
  translationChallenges: string[];
  crossReferences: string[];
}

export interface ContextResult {
  reference: string;
  language: string;
  organization: string;
  bookContext: BookContext;
  chapterContext: ChapterContext;
  verseContext: VerseContext;
  translationGuidance: {
    titleSuggestions: string[];
    grammarIssues: string[];
    culturalAdaptations: string[];
    commonPhrases: string[];
  };
  metadata: {
    sourceNotes: number;
    bookIntroFound: boolean;
    chapterIntroFound: boolean;
    verseNotesFound: number;
    includeRawData: boolean;
    maxTokens?: number;
    timestamp: string;
    responseTime: number;
    tokenEstimate: number;
  };
}

/**
 * Extract contextual information from translation notes
 */
export async function getContextFromTranslationNotes(
  options: ContextOptions,
): Promise<ContextResult> {
  const startTime = Date.now();
  const {
    reference: referenceParam,
    language = "en",
    organization = "unfoldingWord",
    includeRawData = false,
    maxTokens,
    deepAnalysis = true,
  } = options;

  console.log(`🔍 Context service called with:`, {
    reference: referenceParam,
    language,
    organization,
    deepAnalysis,
  });

  // Fetch translation notes with intro content using the shared service
  const notesResult = await fetchTranslationNotes({
    reference: referenceParam,
    language,
    organization,
    includeIntro: true,
    includeContext: deepAnalysis,
  });

  const allNotes = [...notesResult.verseNotes, ...notesResult.contextNotes];

  // Parse the reference to get book name and chapter
  const referenceMatch = referenceParam.match(
    /^(\w+(?:\s+\w+)*)\s+(\d+)(?::(\d+))?/,
  );
  const bookName = referenceMatch ? referenceMatch[1] : "Unknown";
  const chapterNum = referenceMatch ? parseInt(referenceMatch[2]) : 1;

  // Extract contextual information from the notes
  const bookContext = extractBookIntroContext(allNotes, bookName);
  const chapterContext = extractChapterIntroContext(allNotes, chapterNum);
  const verseContext = extractVerseSpecificContext(allNotes);

  // Build comprehensive context response using REAL data
  const context: ContextResult = {
    reference: referenceParam,
    language,
    organization,

    bookContext,
    chapterContext,
    verseContext,

    translationGuidance: {
      titleSuggestions: bookContext.titleSuggestions,
      grammarIssues: chapterContext.grammarIssues,
      culturalAdaptations: bookContext.culturalAdaptations,
      commonPhrases: bookContext.commonPhrases,
    },

    metadata: {
      sourceNotes: allNotes.length,
      bookIntroFound:
        bookContext.title !== "Unknown" && bookContext.author !== "Unknown",
      chapterIntroFound: chapterContext.structure !== "Unknown",
      verseNotesFound: verseContext.specificNotes.length,
      includeRawData,
      maxTokens,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      tokenEstimate: 0, // Will be calculated by caller
    },
  };

  console.log(`✅ Context extracted successfully:`, {
    bookIntroFound: context.metadata.bookIntroFound,
    chapterIntroFound: context.metadata.chapterIntroFound,
    verseNotesFound: context.metadata.verseNotesFound,
    responseTime: context.metadata.responseTime,
  });

  return context;
}

/**
 * Extract book context from front:intro notes
 */
function extractBookIntroContext(
  notes: TranslationNote[],
  bookName: string,
): BookContext {
  // Find the front:intro note
  const frontIntro = notes.find((note) =>
    note.reference.includes("front:intro"),
  );

  const context: BookContext = {
    title: bookName,
    author: "Unknown",
    audience: "Unknown",
    purpose: "Unknown",
    outline: [],
    mainThemes: [],
    historicalBackground: "Unknown",
    literaryGenre: "Unknown",
    titleSuggestions: [],
    culturalAdaptations: [],
    commonPhrases: [],
  };

  if (!frontIntro) {
    console.log(`⚠️ No front:intro note found for ${bookName}`);
    return context;
  }

  const introText = frontIntro.note;
  console.log(`📖 Found front:intro note (${introText.length} chars)`);

  // Parse the structured intro content
  // Extract outline (numbered lists)
  const outlineMatches = introText.match(/\d+\.\s+[^(\n]+\([^)]+\)/g);
  if (outlineMatches) {
    context.outline = outlineMatches;
    console.log(`📋 Extracted ${outlineMatches.length} outline points`);
  }

  // Extract author information
  const authorMatch = introText.match(/### Who wrote[^?]*\?\s*\n\n([^#]*)/);
  if (authorMatch) {
    context.author = authorMatch[1].replace(/\n/g, " ").trim();
    console.log(`👤 Extracted author: ${context.author.substring(0, 50)}...`);
  }

  // Extract purpose/about information
  const aboutMatch = introText.match(
    /### What is[^?]*about[^?]*\?\s*\n\n([^#]*)/,
  );
  if (aboutMatch) {
    context.purpose = aboutMatch[1].replace(/\n/g, " ").trim();
    console.log(`🎯 Extracted purpose: ${context.purpose.substring(0, 50)}...`);
  }

  // Extract title suggestions
  const titleMatch = introText.match(
    /### How should the title[^?]*\?\s*\n\n([^#]*)/,
  );
  if (titleMatch) {
    const titleText = titleMatch[1];
    const suggestions = titleText.match(/"([^"]+)"/g);
    if (suggestions) {
      context.titleSuggestions = suggestions.map((s: string) =>
        s.replace(/"/g, ""),
      );
      console.log(
        `📝 Extracted ${context.titleSuggestions.length} title suggestions`,
      );
    }
  }

  // Extract religious and cultural concepts
  const conceptsMatch = introText.match(
    /## Part 2: Important Religious and Cultural Concepts\s*\n\n([^#]*)/,
  );
  if (conceptsMatch) {
    context.historicalBackground = conceptsMatch[1].replace(/\n/g, " ").trim();
    console.log(
      `🏛️ Extracted historical background: ${context.historicalBackground.substring(0, 50)}...`,
    );
  }

  // Extract common phrases and translation issues
  const phrasesMatch = introText.match(
    /### What is the meaning of[^?]*\?\s*\n\n([^#]*)/,
  );
  if (phrasesMatch) {
    context.commonPhrases.push(phrasesMatch[1].replace(/\n/g, " ").trim());
    console.log(`💬 Extracted common phrases`);
  }

  // Determine literary genre from content
  if (
    introText.toLowerCase().includes("letter") ||
    introText.toLowerCase().includes("epistle")
  ) {
    context.literaryGenre = "Epistle/Letter";
  } else if (introText.toLowerCase().includes("gospel")) {
    context.literaryGenre = "Gospel";
  } else if (
    introText.toLowerCase().includes("prophecy") ||
    introText.toLowerCase().includes("prophet")
  ) {
    context.literaryGenre = "Prophecy";
  } else if (
    introText.toLowerCase().includes("narrative") ||
    introText.toLowerCase().includes("history")
  ) {
    context.literaryGenre = "Historical Narrative";
  }

  return context;
}

/**
 * Extract chapter context from chapter intro notes
 */
function extractChapterIntroContext(
  notes: TranslationNote[],
  chapterNum: number,
): ChapterContext {
  // Find the chapter intro note
  const chapterIntro = notes.find((note) =>
    note.reference.includes(`${chapterNum}:intro`),
  );

  const context: ChapterContext = {
    number: chapterNum,
    structure: "Unknown",
    formatting: "Unknown",
    religiousConcepts: [],
    culturalConcepts: [],
    translationIssues: [],
    grammarIssues: [],
  };

  if (!chapterIntro) {
    console.log(`⚠️ No chapter intro note found for chapter ${chapterNum}`);
    return context;
  }

  const introText = chapterIntro.note;
  console.log(`📖 Found chapter intro note (${introText.length} chars)`);

  // Extract structure and formatting
  const structureMatch = introText.match(
    /## Structure and Formatting\s*\n\n([^#]*)/,
  );
  if (structureMatch) {
    context.structure = structureMatch[1].replace(/\n/g, " ").trim();
    console.log(
      `🏗️ Extracted structure: ${context.structure.substring(0, 50)}...`,
    );
  }

  // Extract religious concepts
  const religiousMatch = introText.match(
    /## Religious[^#]*Concepts[^#]*\n\n([^#]*)/,
  );
  if (religiousMatch) {
    const concepts = religiousMatch[1].split(/\n\n### /);
    context.religiousConcepts = concepts
      .map((c: string) => c.replace(/\n/g, " ").trim())
      .filter((c: string) => c.length > 0);
    console.log(
      `⛪ Extracted ${context.religiousConcepts.length} religious concepts`,
    );
  }

  // Extract cultural concepts
  const culturalMatch = introText.match(
    /## [^#]*Cultural[^#]*Concepts[^#]*\n\n([^#]*)/,
  );
  if (culturalMatch) {
    const concepts = culturalMatch[1].split(/\n\n### /);
    context.culturalConcepts = concepts
      .map((c: string) => c.replace(/\n/g, " ").trim())
      .filter((c: string) => c.length > 0);
    console.log(
      `🌍 Extracted ${context.culturalConcepts.length} cultural concepts`,
    );
  }

  // Extract translation issues
  const translationMatch = introText.match(
    /## Translation Issues[^#]*\n\n([^#]*)/,
  );
  if (translationMatch) {
    const issues = translationMatch[1].split(/\n\n### /);
    context.translationIssues = issues
      .map((i: string) => i.replace(/\n/g, " ").trim())
      .filter((i: string) => i.length > 0);
    console.log(
      `🔄 Extracted ${context.translationIssues.length} translation issues`,
    );
  }

  return context;
}

/**
 * Extract verse-specific context from translation notes
 */
function extractVerseSpecificContext(notes: TranslationNote[]): VerseContext {
  // Find verse-specific notes (exclude intro notes)
  const verseNotes = notes.filter(
    (note) =>
      !note.reference.includes("intro") && !note.reference.includes("front:"),
  );

  const keyTerms: string[] = [];
  const challenges: string[] = [];
  const crossReferences: string[] = [];

  for (const note of verseNotes) {
    // Extract quoted terms
    if (note.quote && note.quote.trim()) {
      keyTerms.push(note.quote);
    }

    // Extract translation challenges
    if (
      note.note.toLowerCase().includes("difficult") ||
      note.note.toLowerCase().includes("unclear") ||
      note.note.toLowerCase().includes("translation")
    ) {
      challenges.push(note.note.substring(0, 150) + "...");
    }

    // Extract cross-references (look for verse patterns)
    const refMatches = note.note.match(/\b[A-Z][a-z]+ \d+:\d+(-\d+)?\b/g);
    if (refMatches) {
      crossReferences.push(...refMatches);
    }
  }

  console.log(
    `📝 Processed ${verseNotes.length} verse notes, found ${keyTerms.length} key terms, ${challenges.length} challenges, ${crossReferences.length} cross-references`,
  );

  return {
    specificNotes: verseNotes.slice(0, 5), // Limit to first 5 notes
    keyTerms: [...new Set(keyTerms)].slice(0, 10),
    translationChallenges: [...new Set(challenges)].slice(0, 3),
    crossReferences: [...new Set(crossReferences)].slice(0, 10),
  };
}
