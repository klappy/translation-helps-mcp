/**
 * Single Source of Truth for MCP Tool Contracts
 * This defines the EXACT interface between Chat, MCP, and Endpoints
 */

export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface ScriptureToolArgs {
  reference: string;
  language?: string;
  organization?: string;
  version?: string;
}

export interface TranslationNotesToolArgs {
  reference: string;
  language?: string;
  organization?: string;
}

export interface TranslationQuestionsToolArgs {
  reference: string;
  language?: string;
  organization?: string;
}

export interface TranslationWordToolArgs {
  wordId: string;
  language?: string;
}

// Define the exact response formatters
export const ToolFormatters = {
  scripture: (data: any): string => {
    if (data.scriptures && Array.isArray(data.scriptures)) {
      const ult = data.scriptures.find((s: any) => s.translation?.includes('Literal Text'));
      const ust = data.scriptures.find((s: any) => s.translation?.includes('Simplified Text'));
      return ult?.text || ust?.text || data.scriptures[0]?.text || 'Scripture not found';
    }
    return data.text || data.ult || data.ust || 'Scripture not found';
  },

  notes: (data: any): string => {
    if (data.notes && Array.isArray(data.notes)) {
      return data.notes.map((note: any, index: number) => 
        `${index + 1}. ${note.text || note.note || note.content}`
      ).join('\n\n') || 'No translation notes found';
    }
    if (data.verseNotes && Array.isArray(data.verseNotes)) {
      return data.verseNotes.map((note: any, index: number) => 
        `${index + 1}. ${note.note || note.text}`
      ).join('\n\n') || 'No translation notes found';
    }
    return 'No translation notes found';
  },

  questions: (data: any): string => {
    if (data.translationQuestions && Array.isArray(data.translationQuestions)) {
      return data.translationQuestions.map((q: any, index: number) => 
        `Q${index + 1}: ${q.question}\nA: ${q.response || q.answer}`
      ).join('\n\n') || 'No translation questions found';
    }
    if (data.questions && Array.isArray(data.questions)) {
      return data.questions.map((q: any, index: number) => 
        `Q${index + 1}: ${q.question}\nA: ${q.response || q.answer}`
      ).join('\n\n') || 'No translation questions found';
    }
    return 'No translation questions found';
  },

  words: (data: any): string => {
    if (data.words && Array.isArray(data.words)) {
      return data.words.map((word: any) => 
        `**${word.term}**\n${word.definition}`
      ).join('\n\n') || 'No translation words found';
    }
    if (data.term && data.definition) {
      return `**${data.term}**\n${data.definition}`;
    }
    return 'No translation words found';
  }
};

// Tool registry with endpoint mappings
export const ToolRegistry = {
  fetch_scripture: {
    endpoint: '/api/fetch-scripture',
    formatter: ToolFormatters.scripture,
    requiredParams: ['reference']
  },
  fetch_translation_notes: {
    endpoint: '/api/fetch-translation-notes',
    formatter: ToolFormatters.notes,
    requiredParams: ['reference']
  },
  fetch_translation_questions: {
    endpoint: '/api/fetch-translation-questions',
    formatter: ToolFormatters.questions,
    requiredParams: ['reference']
  },
  get_translation_word: {
    endpoint: '/api/fetch-translation-words',
    formatter: ToolFormatters.words,
    requiredParams: ['wordId']
  }
};