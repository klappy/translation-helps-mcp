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
    let notes: any[] = [];
    
    // Collect all notes (verseNotes and contextNotes)
    if (data.verseNotes && Array.isArray(data.verseNotes)) {
      notes = notes.concat(data.verseNotes);
    }
    if (data.contextNotes && Array.isArray(data.contextNotes)) {
      notes = notes.concat(data.contextNotes);
    }
    if (data.notes && Array.isArray(data.notes)) {
      notes = notes.concat(data.notes);
    }
    
    if (notes.length === 0) {
      return 'No translation notes found';
    }
    
    // Format notes with proper markdown
    return notes.map((note: any, index: number) => {
      const content = note.text || note.note || note.Note || note.content || '';
      // Replace escaped newlines with actual newlines
      let unescapedContent = content.replace(/\\n/g, '\n');
      
      // Handle special reference links [[rc:///...]]
      // Convert to clickable prompts for learning more
      unescapedContent = unescapedContent.replace(/\[\[rc:\/\/\/([^\]]+)\]\]/g, (match, path) => {
        // Extract the article ID from the path (e.g., "ta/man/translate/translate-names" -> "translate/translate-names")
        const parts = path.split('/');
        if (parts[0] === 'ta' && parts[1] === 'man') {
          const articleId = parts.slice(2).join('/');
          const articleName = parts[parts.length - 1].replace(/-/g, ' ');
          return `📚 *[Learn more about ${articleName}](rc:${articleId})*`;
        }
        return `📚 *[Learn more](rc:${path})*`;
      });
      
      // Add support reference link if available
      if (note.supportReference || note.SupportReference) {
        const rcPath = (note.supportReference || note.SupportReference).replace('rc://*/', '');
        const parts = rcPath.split('/');
        if (parts[0] === 'ta' && parts[1] === 'man') {
          const articleId = parts.slice(2).join('/');
          const articleName = parts[parts.length - 1].replace(/-/g, ' ');
          unescapedContent += `\n📚 *[Learn more about ${articleName}](rc:${articleId})*`;
        }
      }
      
      // Format based on note type
      const reference = note.reference || note.Reference;
      if (reference?.includes('Introduction') || reference?.includes('Chapter')) {
        // Context notes (introductions) - show as markdown sections
        return `## ${reference}\n\n${unescapedContent}`;
      } else {
        // Verse notes - show with quote context when available
        let formattedNote = `**${index + 1}.**`;
        
        // Add quote if present (Greek/Hebrew with English translation)
        const quote = note.quote || note.Quote;
        if (quote && quote.trim()) {
          formattedNote += ` **${quote}**:`;
        }
        
        // Add the note content on the same line
        formattedNote += ` ${unescapedContent}`;
        
        return formattedNote;
      }
    }).join('\n\n');
  },

  questions: (data: any): string => {
    const questions = data.translationQuestions || data.questions || [];
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return 'No translation questions found';
    }
    
    return questions.map((q: any, index: number) => {
      const question = q.question || '';
      const answer = q.response || q.answer || '';
      
      // Format as markdown with bold question
      return `**Q${index + 1}: ${question}**\n\n${answer}`;
    }).join('\n\n---\n\n');
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