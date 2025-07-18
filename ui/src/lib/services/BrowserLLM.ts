/**
 * BrowserLLM.ts
 * Enhanced AI service for Bible translation assistance
 * Follows the same pattern as the original translation-helps AI Assistant
 */

interface TranslationNote {
	id: number;
	text: string;
	quote?: string;
	occurrence?: string;
	tags?: string;
	supportReference?: string;
	reference?: string;
}

interface ScriptureData {
	ult?: string;
	ust?: string;
	t4t?: string;
	ueb?: string;
}

interface TranslationQuestion {
	id: number;
	question: string;
}

interface TranslationWord {
	id: number;
	term: string;
	definition?: string;
	content?: string;
}

interface TranslationWordLink {
	id: number;
	word: string;
	term?: string;
}

interface ResourceContext {
	scripture?: ScriptureData;
	translationNotes?: TranslationNote[];
	translationQuestions?: TranslationQuestion[];
	translationWords?: TranslationWord[];
	translationWordLinks?: TranslationWordLink[];
}

export class BrowserLLM {
	private isInitialized = false;

	constructor() {
		this.initialize();
	}

	private initialize() {
		if (this.isInitialized) return;

		console.log('🚀 Initializing AI system with improved prompts...');
		this.isInitialized = true;
		console.log('✅ AI system initialized successfully!');
	}

	/**
	 * Generate an intelligent response using the same pattern as the original translation-helps AI Assistant
	 */
	public async generateResponse(userQuestion: string, contextPrompt: string): Promise<string> {
		console.log('=== AI SERVICE DEBUG: generateResponse ===');
		console.log('User question:', userQuestion);
		console.log('Context prompt length:', contextPrompt.length);

		// Extract and structure the context data
		const context = this.extractContextFromPrompt(contextPrompt);
		console.log('=== AI SERVICE DEBUG: Extracted context ===');
		console.log('Scripture translations:', Object.keys(context.scripture || {}));
		console.log('Translation notes count:', context.translationNotes?.length || 0);
		console.log('Translation questions count:', context.translationQuestions?.length || 0);
		console.log('Translation words count:', context.translationWords?.length || 0);

		// Generate response based on question type and available resources
		return this.generateIntelligentResponse(userQuestion, context);
	}

	private extractContextFromPrompt(prompt: string): ResourceContext {
		const context: ResourceContext = {};

		console.log('=== AI SERVICE DEBUG: Extracting context from prompt ===');
		console.log('Prompt length:', prompt.length);

		// Extract Bible context from the prompt
		const contextStart = prompt.indexOf('## 📖 Bible Context');
		if (contextStart !== -1) {
			const contextSection = prompt.substring(contextStart);
			const lines = contextSection.split('\n');

			let currentSection = '';
			const scriptureLines: string[] = [];
			const translationNotesLines: string[] = [];
			const translationQuestionsLines: string[] = [];
			const translationWordsLines: string[] = [];

			for (const line of lines) {
				if (line.startsWith('### Scripture Translations') || line.startsWith('### Scripture')) {
					currentSection = 'scripture';
				} else if (line.startsWith('### 📝 Translation Notes')) {
					currentSection = 'translationNotes';
				} else if (line.startsWith('### ❓ Translation Questions')) {
					currentSection = 'translationQuestions';
				} else if (line.startsWith('### 📚 Translation Words')) {
					currentSection = 'translationWords';
				} else if (line.trim() && !line.startsWith('#')) {
					switch (currentSection) {
						case 'scripture':
							scriptureLines.push(line);
							break;
						case 'translationNotes':
							translationNotesLines.push(line);
							break;
						case 'translationQuestions':
							translationQuestionsLines.push(line);
							break;
						case 'translationWords':
							translationWordsLines.push(line);
							break;
					}
				}
			}

			// Parse scripture data
			if (scriptureLines.length > 0) {
				context.scripture = {};
				scriptureLines.forEach((line) => {
					const match = line.match(/\*\*([^*]+)\*\*: (.+)/);
					if (match) {
						const translation = match[1].toLowerCase();
						const text = match[2];
						(context.scripture as ScriptureData)[translation as keyof ScriptureData] = text;
					}
				});
			}

			// Parse translation notes
			if (translationNotesLines.length > 0) {
				console.log('=== AI SERVICE DEBUG: Parsing translation notes ===');
				console.log('Translation notes lines:', translationNotesLines);
				context.translationNotes = this.parseTranslationNotes(translationNotesLines);
				console.log('Parsed translation notes:', context.translationNotes);
			}

			// Parse translation questions
			if (translationQuestionsLines.length > 0) {
				context.translationQuestions = this.parseTranslationQuestions(translationQuestionsLines);
			}

			// Parse translation words
			if (translationWordsLines.length > 0) {
				context.translationWords = this.parseTranslationWords(translationWordsLines);
			}
		}

		console.log('=== AI SERVICE DEBUG: Extracted context ===');
		console.log('Scripture translations:', Object.keys(context.scripture || {}));
		console.log('Translation notes count:', context.translationNotes?.length || 0);
		console.log('Translation questions count:', context.translationQuestions?.length || 0);
		console.log('Translation words count:', context.translationWords?.length || 0);

		return context;
	}

	/**
	 * Parse translation notes from lines, following the original pattern
	 */
	private parseTranslationNotes(lines: string[]): TranslationNote[] {
		const notes: TranslationNote[] = [];
		let currentNote: Partial<TranslationNote> = {};
		let noteIndex = 0;

		console.log('=== AI SERVICE DEBUG: parseTranslationNotes ===');
		console.log('Input lines:', lines);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmedLine = line.trim();

			console.log(`Processing line ${i}:`, trimmedLine);

			// Check if this is a new note (starts with Reference or Note header)
			if (trimmedLine.startsWith('#### Note ') || trimmedLine.startsWith('**Reference**: ')) {
				// Save previous note if exists and has content
				if (Object.keys(currentNote).length > 0 && currentNote.text) {
					console.log('Saving note:', currentNote);
					notes.push(currentNote as TranslationNote);
				}

				// Start new note
				noteIndex++;
				currentNote = { id: noteIndex };
				console.log('Starting new note:', noteIndex);
			}

			// Parse the current line
			if (trimmedLine.startsWith('**Reference**: ')) {
				currentNote.reference = trimmedLine.replace('**Reference**: ', '');
				console.log('Set reference:', currentNote.reference);
			} else if (trimmedLine.startsWith('**Greek Quote**: ')) {
				currentNote.quote = trimmedLine.replace('**Greek Quote**: ', '');
				console.log('Set quote:', currentNote.quote);
			} else if (trimmedLine.startsWith('**Occurrence**: ')) {
				currentNote.occurrence = trimmedLine.replace('**Occurrence**: ', '');
				console.log('Set occurrence:', currentNote.occurrence);
			} else if (trimmedLine.startsWith('**Tags**: ')) {
				currentNote.tags = trimmedLine.replace('**Tags**: ', '');
				console.log('Set tags:', currentNote.tags);
			} else if (trimmedLine.startsWith('**Support Reference**: ')) {
				currentNote.supportReference = trimmedLine.replace('**Support Reference**: ', '');
				console.log('Set support reference:', currentNote.supportReference);
			} else if (trimmedLine.startsWith('**Note**: ')) {
				currentNote.text = trimmedLine.replace('**Note**: ', '');
				console.log('Set text:', currentNote.text);
			}
		}

		// Add the last note
		if (Object.keys(currentNote).length > 0 && currentNote.text) {
			console.log('Saving final note:', currentNote);
			notes.push(currentNote as TranslationNote);
		}

		console.log('Final parsed notes:', notes);
		return notes;
	}

	/**
	 * Parse translation questions from lines
	 */
	private parseTranslationQuestions(lines: string[]): TranslationQuestion[] {
		const questions: TranslationQuestion[] = [];
		let currentQuestion: Partial<TranslationQuestion> = {};
		let questionText = '';

		for (const line of lines) {
			const questionMatch = line.match(/^(\d+)\.\s*(.+)/);
			if (questionMatch && currentQuestion.id !== undefined) {
				// Save previous question
				if (questionText.trim()) {
					currentQuestion.question = questionText.trim();
					questions.push(currentQuestion as TranslationQuestion);
				}

				// Start new question
				currentQuestion = { id: parseInt(questionMatch[1]) - 1 };
				questionText = questionMatch[2];
			} else if (currentQuestion.id !== undefined) {
				// Continue current question
				questionText += ' ' + line;
			}
		}

		// Save last question
		if (currentQuestion.id !== undefined && questionText.trim()) {
			currentQuestion.question = questionText.trim();
			questions.push(currentQuestion as TranslationQuestion);
		}

		return questions;
	}

	/**
	 * Parse translation words from lines
	 */
	private parseTranslationWords(lines: string[]): TranslationWord[] {
		const words: TranslationWord[] = [];
		let currentWord: Partial<TranslationWord> = {};
		let wordText = '';

		for (const line of lines) {
			const wordMatch = line.match(/^(\d+)\.\s*(.+)/);
			if (wordMatch && currentWord.id !== undefined) {
				// Save previous word
				if (wordText.trim()) {
					currentWord.term = wordText.trim();
					words.push(currentWord as TranslationWord);
				}

				// Start new word
				currentWord = { id: parseInt(wordMatch[1]) - 1 };
				wordText = wordMatch[2];
			} else if (currentWord.id !== undefined) {
				// Continue current word
				wordText += ' ' + line;
			}
		}

		// Save last word
		if (currentWord.id !== undefined && wordText.trim()) {
			currentWord.term = wordText.trim();
			words.push(currentWord as TranslationWord);
		}

		return words;
	}

	/**
	 * Generate intelligent response following the original translation-helps pattern
	 */
	private generateIntelligentResponse(userQuestion: string, context: ResourceContext): string {
		const lowerQuestion = userQuestion.toLowerCase();

		console.log('=== AI SERVICE DEBUG: generateIntelligentResponse ===');
		console.log('User question:', userQuestion);
		console.log('Lower question:', lowerQuestion);
		console.log('Has scripture:', !!context.scripture);
		console.log('Has translation notes:', !!context.translationNotes?.length);
		console.log('Has translation questions:', !!context.translationQuestions?.length);
		console.log('Has translation words:', !!context.translationWords?.length);

		// If asking what a verse says, provide the direct quote
		if (lowerQuestion.includes('what does') && lowerQuestion.includes('say')) {
			console.log('Taking "what does it say" branch');
			if (context.scripture) {
				let response = `## 📖 Scripture Text\n\n**${userQuestion}**\n\n---\n\n`;

				Object.entries(context.scripture).forEach(([translation, text]) => {
					response += `**${translation.toUpperCase()}**: ${text}\n\n`;
				});

				response += `📚 **Source**: unfoldingWord® Bible Translations`;
				return response;
			}
		}

		// If asking about translation notes, provide the insights
		if (lowerQuestion.includes('translation') || lowerQuestion.includes('notes')) {
			console.log('Taking "translation notes" branch');
			console.log('Translation notes available:', context.translationNotes?.length || 0);
			if (context.translationNotes && context.translationNotes.length > 0) {
				let response = `## 📝 Translation Notes\n\n**${userQuestion}**\n\n---\n\n`;

				context.translationNotes.forEach((note, index) => {
					response += `${index + 1}. ${note.text}\n\n`;
				});

				response += `📚 **Source**: unfoldingWord® Translation Notes`;
				return response;
			}
		}

		// If asking about word definitions, provide the meanings
		if (
			lowerQuestion.includes('word') ||
			lowerQuestion.includes('definition') ||
			lowerQuestion.includes('meaning')
		) {
			console.log('Taking "word definitions" branch');
			if (context.translationWords && context.translationWords.length > 0) {
				let response = `## 📚 Translation Words\n\n**${userQuestion}**\n\n---\n\n`;

				context.translationWords.forEach((word, index) => {
					response += `${index + 1}. **${word.term}**: ${word.definition || word.content || 'Definition not available'}\n\n`;
				});

				response += `📚 **Source**: unfoldingWord® Translation Words`;
				return response;
			}
		}

		// For general questions, provide a comprehensive response with all available context
		console.log('Taking "general response" branch');
		let response = `## 🤖 AI Response\n\n**${userQuestion}**\n\n---\n\n`;

		// Include scripture if available
		if (context.scripture) {
			response += `### 📖 Scripture Context\n\n`;
			Object.entries(context.scripture).forEach(([translation, text]) => {
				response += `**${translation.toUpperCase()}**: ${text}\n\n`;
			});
		}

		// Include translation notes if available
		if (context.translationNotes && context.translationNotes.length > 0) {
			response += `### 📝 Translation Notes\n\n`;
			context.translationNotes.forEach((note, index) => {
				response += `${index + 1}. ${note.text}\n\n`;
			});
		}

		// Include translation questions if available
		if (context.translationQuestions && context.translationQuestions.length > 0) {
			response += `### ❓ Translation Questions\n\n`;
			context.translationQuestions.forEach((question, index) => {
				response += `${index + 1}. ${question.question}\n\n`;
			});
		}

		// Include translation words if available
		if (context.translationWords && context.translationWords.length > 0) {
			response += `### 📚 Translation Words\n\n`;
			context.translationWords.forEach((word, index) => {
				response += `${index + 1}. **${word.term}**: ${word.definition || word.content || 'Definition not available'}\n\n`;
			});
		}

		response += `📚 **Sources**: unfoldingWord® Translation Resources`;
		return response;
	}
}
