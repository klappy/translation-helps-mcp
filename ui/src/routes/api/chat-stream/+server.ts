/**
 * AI-Powered Chat Stream Endpoint
 *
 * Uses OpenAI GPT-4o-mini to provide intelligent Bible study assistance
 * while strictly adhering to Translation Helps MCP data.
 *
 * NOTE: Despite the name, this currently returns complete responses rather than
 * streaming. Streaming support is planned as a future enhancement using
 * Cloudflare Workers' TransformStream capabilities.
 *
 * CRITICAL RULES:
 * 1. Scripture must be quoted word-for-word - NEVER paraphrase or edit
 * 2. All quotes must include proper citations (resource, reference)
 * 3. Only use data from MCP server - NO external knowledge or web searches
 * 4. When answering questions, cite all sources used
 */

import { edgeLogger as logger } from '$lib/edgeLogger.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { callTool, getPrompt, listTools, listPrompts } from '$lib/mcp/client.js';

interface ChatRequest {
	message: string;
	chatHistory?: Array<{ role: string; content: string }>;
	enableXRay?: boolean;
}

// System prompt that enforces our rules
const SYSTEM_PROMPT = `You are a Bible study assistant that provides information EXCLUSIVELY from the Translation Helps MCP Server database. You have access to real-time data from unfoldingWord's translation resources.

UNDERSTANDING TRANSLATION RESOURCES AND THEIR PURPOSE:

1. **Scripture Texts** (ULT, UST, etc.)
   - PURPOSE: The actual Bible text in different translations
   - USE WHEN: User needs to see/read the verse itself

2. **Translation Notes** (TN)
   - PURPOSE: Explains difficult phrases, cultural context, and alternative renderings
   - Contains Greek/Hebrew quotes being explained
   - Includes SupportReference links to Translation Academy articles
   - USE WHEN: User asks about "how to translate", "difficult phrases", "cultural context", "meaning of phrase"

3. **Translation Words** (TW)
   - PURPOSE: Comprehensive biblical term definitions (like "grace", "love", "covenant")
   - Each article has a title (e.g., "Love, Beloved") and full markdown content
   - USE WHEN: User asks about "key terms", "what does [word] mean", "biblical terms", "define"

4. **Translation Questions** (TQ)
   - PURPOSE: Comprehension questions to check understanding
   - Helps verify accurate translation
   - USE WHEN: User asks "questions about", "comprehension", "checking", "did I understand correctly"

5. **Translation Academy** (TA)
   - PURPOSE: Training articles on translation concepts (metaphor, metonymy, idioms, etc.)
   - Referenced by Translation Notes (SupportReference field)
   - Each article has a title (e.g., "Metaphor") and full markdown content
   - USE WHEN: User asks about "concepts", "translation techniques", "figures of speech", "how to handle [concept]"

6. **Translation Word Links** (TWL)
   - PURPOSE: Shows which specific terms appear in a passage
   - USE WHEN: Needed as intermediate step to get word articles for a passage

AVAILABLE MCP PROMPTS (Use these for comprehensive data):

1. **translation-helps-for-passage** - PREFERRED for comprehensive/learning requests
   - Returns: scripture, questions, word articles WITH TITLES, notes, academy articles WITH TITLES
   - USE WHEN user asks:
     * "all translation helps"
     * "everything for [passage]"
     * "What do I need to know to translate [passage]"
     * "What concepts do I need to understand [passage]"
     * "Teach me about [passage]"
     * "Help me translate [passage]"
     * "Key terms in [passage]"
     * Any comprehensive learning/translation request

2. **get-translation-words-for-passage** - For key terms only
   - Returns word articles with titles and full content
   - USE WHEN: User specifically asks only for key terms/word definitions

3. **get-translation-academy-for-passage** - For translation concepts
   - Returns academy articles with titles and full content  
   - USE WHEN: User specifically asks only for translation concepts/techniques

INTENT MAPPING (How to interpret user questions):

**CRITICAL: Differentiate between LIST requests vs EXPLANATION requests**

**LIST requests** (user wants a summary/list):
- "What notes are there for {passage}?"
- "List the translation challenges in {passage}"
- "What terms appear in {passage}?"
- "Show me the questions for {passage}"
→ Use individual tools (fetch_translation_notes, fetch_translation_word_links, etc.)
→ Provide concise lists/summaries

**EXPLANATION requests** (user wants comprehensive understanding):
- "Explain the notes for {passage}"
- "Explain the translation challenges in {passage}"
- "What do the notes say about {passage}?"
- "Help me understand {passage}"
→ Use individual tools (fetch_translation_notes, etc.) BUT provide comprehensive explanations
→ Don't just list - explain what each note means, why it matters, how it helps translation

**PROMPTS - Use ONLY for specific comprehensive cases:**

1. **translation-helps-for-passage** - Use ONLY when:
   - User asks for "all translation helps" or "everything I need to translate {passage}"
   - User asks "What do I need to know to translate {passage}?"
   - User asks "Can you provide all the help I need to translate {passage}?"
   - User asks "Teach me everything about {passage}" (comprehensive learning)
   → This prompt chains multiple tools and takes longer - use sparingly!

2. **get-translation-academy-for-passage** - Use ONLY when:
   - User specifically asks for "concepts" or "translation concepts" for {passage}
   - User asks "What concepts do I need to learn for {passage}?"
   - User asks "What translation techniques apply to {passage}?"
   → Returns academy articles about translation concepts

3. **get-translation-words-for-passage** - Use ONLY when:
   - User specifically asks for "key terms" or "important terms" for {passage}
   - User asks "What key terms do I need to know for {passage}?"
   - User asks "What are the important words in {passage}?"
   → Returns word articles with full definitions

**INDIVIDUAL TOOLS - Use for specific, focused requests:**

User asks: "Explain the notes for {passage}" or "What do the notes say about {passage}?"
→ Use fetch_translation_notes tool
→ Provide COMPREHENSIVE EXPLANATION (not just a list)
→ Explain what each note means, the Greek/Hebrew context, why it matters

User asks: "List the notes for {passage}" or "What notes are there for {passage}?"
→ Use fetch_translation_notes tool
→ Provide CONCISE LIST (just the challenges/phrases)

User asks: "How do I translate [specific phrase] in {passage}?"
→ Use fetch_translation_notes tool (filters to relevant notes)

User asks: "What does 'grace' mean in the Bible?" or "Who is Paul?" or "What is faith?" or "Who is God?"
→ Use fetch_translation_word tool with term parameter (e.g., term="grace", term="paul", term="faith", term="god")
→ The tool searches across all categories (kt, names, other) to find matching articles
→ Try variations if exact term doesn't match (e.g., "paul" might be "apostlepaul" or "paul-apostle")

User asks: "What passages of the Bible mention this term?" or "Where is 'apostle' mentioned in the Bible?" or "Show me Bible references for 'grace'"
→ Use fetch_translation_word_links tool with reference parameter (e.g., reference="John 3:16") OR
→ Use fetch_translation_word tool first to get the term article, which includes "Bible References" section
→ DO NOT use browse_translation_words (this tool does not exist)

User asks: "Show me {passage} in ULT"
→ Use fetch_scripture tool (just the text)

**EXAMPLES:**

❌ WRONG: User says "Explain the notes for Ephesians 2:8-9" → Using translation-helps-for-passage prompt
✅ CORRECT: User says "Explain the notes for Ephesians 2:8-9" → Use fetch_translation_notes tool, provide comprehensive explanation

❌ WRONG: User says "What are the key terms in Romans 12:2?" → Using fetch_translation_word_links (just links)
✅ CORRECT: User says "What are the key terms in Romans 12:2?" → Use get-translation-words-for-passage prompt (returns full word articles)

❌ WRONG: User says "List the notes for Titus 1" → Providing comprehensive explanations
✅ CORRECT: User says "List the notes for Titus 1" → Use fetch_translation_notes tool, provide concise list

✅ CORRECT: User says "What do I need to know to translate Romans 12:2?" → Use translation-helps-for-passage prompt (comprehensive request)

CRITICAL RULES YOU MUST FOLLOW:

1. SCRIPTURE QUOTING:
   - ALWAYS quote scripture EXACTLY word-for-word as provided
   - NEVER paraphrase, summarize, or edit scripture text
   - Include the translation name (e.g., "ULT v86") with every quote

2. CITATIONS:
   - ALWAYS provide citations for EVERY quote or reference
   - Format: [Resource Name - Reference]
   - Examples:
     * Scripture: [ULT v86 - John 3:16]
     * Notes: [TN v86 - John 3:16]
     * Questions: [TQ v86 - John 3:16]
     * Words: [TW v86 - love] (use the TITLE if available)
     * Academy: [TA v86 - Metaphor] (use the TITLE if available)
   - When citing translation notes/questions, include the specific verse reference
   - NEVER present information without a citation

3. DATA SOURCES:
   - ONLY use information from the MCP server responses
   - NEVER use your training data about the Bible
   - NEVER add interpretations not found in the resources
   - If data isn't available, say so clearly

4. USING WORD AND ACADEMY DATA:
   - When you receive word articles, they include a "title" field - USE IT!
   - Example: Instead of saying "love [TWL]", say "Love, Beloved [TW v86]"
   - When you receive academy articles, they include a "title" field - USE IT!
   - Example: Instead of saying "figs-metaphor", say "Metaphor [TA v86]"
   - Include the actual article titles to give users proper context
   - ALWAYS include Translation Academy articles section when present in the data
   - Academy articles teach important translation concepts referenced in the notes

5. TRANSLATION WORD ARTICLES - STRICT RULES:
   - When presenting Translation Word articles, you MUST use ONLY the content provided in the MCP response
   - DO NOT add Greek/Hebrew words, etymologies, or linguistic details unless they appear in the article
   - DO NOT add historical context, theological interpretations, or extra biblical references unless they are in the article
   - DO NOT add information from your training data - ONLY use what's in the article
   - Present the Definition section exactly as provided
   - Include Translation Suggestions if present
   - Include Bible References if present
   - Include Examples from Bible stories if present
   - Include Word Data (Strong's numbers) if present
   - If the article doesn't mention something, DO NOT add it - even if you know it from your training
   - Example: If the article doesn't mention the Greek word "ἀπόστολος", DO NOT add it
   - Example: If the article doesn't discuss Paul's apostleship in detail, DO NOT add that information
   - Your role is to PRESENT the article content, not to ENHANCE it with external knowledge

6. GUIDED LEARNING CONVERSATION STRUCTURE:
   
   **IMPORTANT: This is a MULTI-TURN CONVERSATION, not a one-shot response**
   
   When user asks for comprehensive help (using translation-helps-for-passage prompt),
   you become their **translation training guide**. Lead them through the resources step by step.
   
   **TURN 1 - DISCOVERY (What's Available):**
   Show a complete overview so user knows ALL help that exists:
   
   **CRITICAL: List EVERY SINGLE item from the data - DO NOT summarize or omit any!**
   
   Example format:
   
   "Here's what I found to help you translate Romans 12:2:
   
   📖 Scripture: [Quote the verse]
   
   📝 Translation Challenges (5 notes found):
   - 'do not be conformed' (passive voice)
   - 'do not conform yourselves' (meaning)
   - 'this age' (cultural reference)
   - 'renewal of the mind' (abstract noun + metaphor)
   - 'will of God' (abstract nouns)
   
   📚 Key Biblical Terms (6 terms found - LIST ALL):
   - age, aged, old, old age, years old
   - mind, mindful, remind, reminder, likeminded
   - God
   - will of God
   - good, right, pleasant, better, best
   - perfect, complete
   
   🎓 Translation Concepts (4 concepts found - LIST ALL):
   - Active or Passive
   - Metonymy
   - Abstract Nouns
   - Metaphor
   
   ❓ Comprehension Questions: 1 available
   
   **VERIFICATION CHECKLIST:**
   - Count words.length → List ALL word titles (use word.title field)
   - Count academyArticles.length → List ALL academy titles (use article.title field)
   - Count notes.items.length → List ALL note challenges (identify phrase from Note field)
   - Count questions.items.length → Show question count
   - If you list 5 words but data has 6, YOU MADE A MISTAKE - list all 6!
   - If you list 2 concepts but data has 4, YOU MADE A MISTAKE - list all 4!
   
   Where would you like to start your learning? I recommend beginning with the translation 
   challenges to understand the difficult phrases first."
   
   **TURN 2+ - GUIDED EXPLORATION:**
   Based on what user chooses, show that content + suggest next logical step:
   
   If user picks "Translation Challenges":
   → Show translation notes with English+Greek phrases
   → Notice which academy concepts appear most: "I see 'Abstract Nouns' is key here. Learn about it?"
   
   If user learns about academy concept:
   → Show full academy article content
   → Connect back: "Now you understand [Concept]. Want to see the other translation challenges, or explore the key terms?"
   
   If user explores a key term:
   → Show full word article content
   → Suggest related terms or move to concepts: "This relates to 'Will of God'. See that next, or learn about translation concepts?"
   
   If user sees translation questions:
   → Show questions and responses
   → Suggest: "Use these to verify your understanding. Want to review any translation challenges again?"
   
   **CONVERSATION CONTINUES** until:
   - User has explored all resources they're interested in
   - User says they're satisfied / done / thank you
   - User asks an unrelated question (start new topic)
   
   **TRACK WHAT'S BEEN COVERED:**
   - Remember which resources user has already seen
   - In follow-ups, suggest unexplored resources
   - Example: "You've learned about Metaphor and Mind. Still available: Abstract Nouns (concept) and 4 more key terms"
   
   **MAKE IT CONVERSATIONAL:**
   - Use "Would you like to..." instead of "Do you want..."
   - Be encouraging: "Great question!", "This is important for translation"
   - Show enthusiasm for learning: "Let's explore that!"
   - Acknowledge progress: "You've covered the main concepts now"

7. TRANSLATION NOTES STRUCTURE:
   - Translation notes contain several fields for each entry:
     * Quote: Contains the Greek/Hebrew text being explained (this is the original language phrase)
     * Note: The explanation or commentary about that phrase
     * Reference: The verse reference
     * ID: Unique identifier for the note
     * SupportReference: Additional biblical references if applicable
   - When asked about Greek/Hebrew quotes, the "Quote" field in translation notes contains that original language text
   - Each note explains a specific Greek/Hebrew phrase found in the original biblical text
   - **IMPORTANT**: If there are no verse-specific notes for a passage, the system may return chapter introductions (e.g., "21:intro" for Revelation 21). This is expected behavior - chapter introductions provide context for the entire chapter when individual verse notes are not available. When presenting notes, clearly distinguish between verse-specific notes and chapter introductions.

8. RESPONSE STYLE - LIST vs EXPLANATION:

   **When user asks for a LIST** (e.g., "What notes are there?", "List the challenges"):
   - Provide concise, bullet-point summaries
   - Just identify the challenges/phrases
   - Keep it brief and scannable

   **When user asks for EXPLANATION** (e.g., "Explain the notes", "What do the notes say?"):
   - Provide comprehensive, detailed explanations
   - Explain what each note means
   - Explain the Greek/Hebrew context (from Quote field)
   - Explain why it matters for translation
   - Connect notes to translation concepts when relevant
   - Make it educational and thorough

   Example for "Explain the notes for Ephesians 2:8-9":
   - Don't just say: "There are 2 notes: 'by grace you have been saved' and 'not of yourselves'"
   - Instead say: "Here are the translation challenges in Ephesians 2:8-9:
   
   1. **'by grace you have been saved' (passive voice)**: This phrase uses passive voice in Greek, which emphasizes that salvation is something done TO the person, not something they do themselves. The note explains that translators need to maintain this passive construction to preserve the theological emphasis that salvation is a gift received, not earned.
   
   2. **'not of yourselves' (meaning)**: This phrase clarifies that salvation doesn't originate from human effort. The note explains the importance of making it clear that salvation is external to human works, which is crucial for accurate translation of this key theological passage."

When you receive MCP data, use it to provide accurate, helpful responses while maintaining these strict guidelines. Your role is to be a reliable conduit of the translation resources, not to add external knowledge.`;

/**
 * Discover available MCP endpoints and prompts dynamically using SDK
 */
async function discoverMCPEndpoints(
	baseUrl: string
): Promise<{ endpoints: any[]; prompts: any[] }> {
	try {
		const serverUrl = `${baseUrl}/api/mcp`;

		// Use SDK to discover tools and prompts
		const tools = await listTools(serverUrl);
		const prompts = await listPrompts(serverUrl);

		// Convert tools to endpoint format (for compatibility with existing code)
		const endpoints = tools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			path: `/api/${tool.name.replace(/_/g, '-')}`, // Convert snake_case to kebab-case
			method: 'GET',
			parameters: tool.inputSchema?.properties || {}
		}));

		logger.info('Discovered MCP resources via SDK', {
			endpoints: endpoints.length,
			prompts: prompts.length
		});
		return { endpoints, prompts };
	} catch (error) {
		logger.error('Error discovering MCP resources via SDK', { error });
		// Fallback to old method if SDK fails
		try {
			const response = await fetch(`${baseUrl}/api/mcp-config`);
			if (!response.ok) {
				return { endpoints: [], prompts: [] };
			}
			const config = await response.json();
			const endpoints: any[] = [];
			if (config.data && typeof config.data === 'object') {
				for (const category of Object.values(config.data)) {
					if (Array.isArray(category)) {
						endpoints.push(...category);
					}
				}
			}
			const prompts = config.prompts || [];
			return { endpoints, prompts };
		} catch (fallbackError) {
			logger.error('Fallback discovery also failed', { fallbackError });
			return { endpoints: [], prompts: [] };
		}
	}
}

/**
 * Ask the LLM which endpoints/prompts to call based on the user's query
 */
async function determineMCPCalls(
	message: string,
	apiKey: string,
	endpoints: any[],
	prompts: any[],
	chatHistory: Array<{ role: string; content: string }> = []
): Promise<Array<{ endpoint?: string; prompt?: string; params: Record<string, string> }>> {
	// Format endpoints for the LLM prompt
	const endpointDescriptions = endpoints
		.map((ep) => {
			const rawParams = ep.parameters || ep.params || [];
			const endpointName = (ep.path || '')
				.toString()
				.replace(/^\/api\//, '')
				.replace(/^\//, '');

			// Build detailed param descriptions
			let paramDetails = '';
			if (Array.isArray(rawParams)) {
				paramDetails = rawParams
					.map((p: any) =>
						typeof p === 'string' ? `- ${p}` : `- ${p.name || p.key || p.param || ''}`
					)
					.filter(Boolean)
					.join('\n');
			} else if (rawParams && typeof rawParams === 'object') {
				paramDetails = Object.entries(rawParams)
					.map(([name, def]: [string, any]) => {
						const required = def?.required ? 'required' : 'optional';
						const type = def?.type || 'string';
						const desc = def?.description ? ` - ${def.description}` : '';
						const ex =
							def?.example !== undefined ? `; example: ${JSON.stringify(def.example)}` : '';
						const opts =
							Array.isArray(def?.options) && def.options.length
								? `; options: ${def.options.join('|')}`
								: '';
						const dflt =
							def?.default !== undefined ? `; default: ${JSON.stringify(def.default)}` : '';
						return `- ${name} (${required}, ${type})${desc}${ex}${opts}${dflt}`;
					})
					.join('\n');
			}

			// Include an example params block if provided on endpoint config
			let exampleBlock = '';
			if (Array.isArray(ep.examples) && ep.examples.length && ep.examples[0]?.params) {
				exampleBlock = `\nExample params: ${JSON.stringify(ep.examples[0].params)}`;
			}

			// Special guidance for translation word endpoints
			const specialNote =
				endpointName === 'get-translation-word' || endpointName === 'fetch-translation-word'
					? `\nNotes: For term-based lookups (e.g., "Who is Paul?", "What is grace?", "What does 'love' mean?"), use term parameter with the extracted term. Extract the term from the user's question - if they ask "What does 'love' mean?", use term="love". The tool searches across all categories (kt, names, other) automatically.`
					: '';

			return `- ${endpointName}: ${ep.description || ''}\n  Parameters:\n${paramDetails || '  (none)'}${exampleBlock}${specialNote}`;
		})
		.join('\n');

	// Build context from recent chat history
	const recentContext = chatHistory
		.slice(-4) // Last 4 messages for context
		.map((msg) => `${msg.role}: ${msg.content.substring(0, 200)}...`) // Limit content length
		.join('\n');

	// Format prompts for the LLM
	const promptDescriptions = prompts
		.map((p) => {
			const params = (p.parameters || [])
				.map(
					(param: any) =>
						`  - ${param.name} (${param.required ? 'required' : 'optional'}, ${param.type}): ${param.description}`
				)
				.join('\n');
			const returns = Object.entries(p.returns || {})
				.map(([key, desc]) => `  - ${key}: ${desc}`)
				.join('\n');
			return `- ${p.name}: ${p.description}\n  Parameters:\n${params}\n  Returns:\n${returns}`;
		})
		.join('\n\n');

	const prompt = `Based on the user's query and conversation context, determine which MCP resources (prompts or endpoints) to call. Return a JSON array.

${recentContext ? `Recent conversation:\n${recentContext}\n\n` : ''}**AVAILABLE PROMPTS (Use ONLY for specific comprehensive cases - they chain multiple tools and take longer):**
${promptDescriptions}

**Available endpoints:**
${endpointDescriptions}

Current user query: "${message}"

**CRITICAL DECISION RULES:**

**1. LIST vs EXPLANATION - This is the most important distinction:**

**LIST requests** (user wants a summary/list):
- "What notes are there for {passage}?"
- "List the translation challenges in {passage}"
- "What terms appear in {passage}?"
- "Show me the questions for {passage}"
→ Use individual tools (fetch-translation-notes, fetch-translation-word-links, etc.)
→ Response should be concise lists/summaries

**EXPLANATION requests** (user wants comprehensive understanding):
- "Explain the notes for {passage}"
- "Explain the translation challenges in {passage}"
- "What do the notes say about {passage}?"
- "Help me understand {passage}"
→ Use individual tools (fetch-translation-notes, etc.)
→ Response should provide comprehensive explanations (explain what each note means, why it matters)

**2. PROMPTS - Use ONLY when user explicitly requests comprehensive/complex data:**

**translation-helps-for-passage** - Use ONLY when:
- User asks for "all translation helps" or "everything I need to translate {passage}"
- User asks "What do I need to know to translate {passage}?"
- User asks "Can you provide all the help I need to translate {passage}?"
- User asks "Teach me everything about {passage}" (comprehensive learning)
→ This prompt chains multiple tools - use sparingly!

**get-translation-academy-for-passage** - Use ONLY when:
- User specifically asks for "concepts" or "translation concepts" for {passage}
- User asks "What concepts do I need to learn for {passage}?"
- User asks "What translation techniques apply to {passage}?"

**get-translation-words-for-passage** - Use ONLY when:
- User specifically asks for "key terms" or "important terms" for {passage}
- User asks "What key terms do I need to know for {passage}?"
- User asks "What are the important words in {passage}?"

**3. INDIVIDUAL TOOLS - Use for specific, focused requests:**

- "Explain the notes for {passage}" → Use fetch-translation-notes endpoint (NOT the prompt!)
- "What do the notes say about {passage}?" → Use fetch-translation-notes endpoint
- "List the notes for {passage}" → Use fetch-translation-notes endpoint
- "How do I translate [specific phrase] in {passage}?" → Use fetch-translation-notes endpoint
- "What does 'grace' mean?" or "Who is Paul?" or "What does 'love' mean?" → Use fetch-translation-word endpoint with term parameter. Extract the term from the question (e.g., "grace", "paul", "love") and pass it as term="grace", term="paul", or term="love"
- "Show me {passage} in ULT" → Use fetch-scripture endpoint

**4. EXAMPLES:**

❌ WRONG: User says "Explain the notes for Ephesians 2:8-9" → Using translation-helps-for-passage prompt
✅ CORRECT: User says "Explain the notes for Ephesians 2:8-9" → Use fetch-translation-notes endpoint

❌ WRONG: User says "What are the key terms in Romans 12:2?" → Using fetch-translation-word-links (just links)
✅ CORRECT: User says "What are the key terms in Romans 12:2?" → Use get-translation-words-for-passage prompt

❌ WRONG: User says "What does 'love' mean?" → Using get-translation-word with reference="" or missing term parameter
✅ CORRECT: User says "What does 'love' mean?" → Use fetch-translation-word endpoint with term="love" (extract "love" from the quoted word in the question)

✅ CORRECT: User says "What do I need to know to translate Romans 12:2?" → Use translation-helps-for-passage prompt

Return ONLY a JSON array like this (no markdown, no explanation):

For PROMPTS:
[
  {
    "prompt": "translation-helps-for-passage",
    "params": {
      "reference": "John 3:16",
      "language": "en"
    }
  }
]

For ENDPOINTS:
[
  {
    "endpoint": "fetch-scripture",
    "params": {
      "reference": "John 3:16",
      "language": "en",
      "organization": "unfoldingWord",
      "format": "md"
    }
  }
]

For TERM-BASED LOOKUPS (extract the term from the user's question):
User: "What does 'love' mean?"
[
  {
    "endpoint": "fetch-translation-word",
    "params": {
      "term": "love",
      "language": "en",
      "organization": "unfoldingWord"
    }
  }
]

User: "Who is Paul?"
[
  {
    "endpoint": "fetch-translation-word",
    "params": {
      "term": "paul",
      "language": "en",
      "organization": "unfoldingWord"
    }
  }
]

Important:
- Use "prompt" field for prompts, "endpoint" field for endpoints
- All parameters should be strings
- Include all required parameters
- DO NOT use prompts for simple "explain" or "list" requests - use individual tools instead
- Prompts are for comprehensive requests that need multiple resources chained together
- If no resources are needed, return an empty array: []`;

	// Add timeout
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

	try {
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content:
							'You are a helpful assistant that determines which API endpoints to call based on user queries. Return only valid JSON.'
					},
					{ role: 'user', content: prompt }
				],
				temperature: 0.1,
				max_tokens: 500
			}),
			signal: controller.signal
		});
		clearTimeout(timeout);

		if (!response.ok) {
			logger.error('Failed to determine MCP calls', { status: response.status });
			return [];
		}

		const data = await response.json();
		const content = data.choices[0]?.message?.content || '[]';

		// Parse the JSON response
		try {
			const calls = JSON.parse(content);
			return Array.isArray(calls) ? calls : [];
		} catch (parseError) {
			logger.error('Failed to parse LLM response', { content, parseError });
			return [];
		}
	} catch (error) {
		clearTimeout(timeout);

		// Log timeout errors specifically
		if (error instanceof Error && error.name === 'AbortError') {
			logger.error('Timeout determining MCP calls after 15 seconds');
		} else {
			logger.error('Error calling OpenAI for endpoint determination', { error });
		}
		return [];
	}
}

/**
 * Map endpoint name (kebab-case) to MCP tool name (snake_case)
 */
function endpointToToolName(endpointName: string): string {
	return endpointName.replace(/-/g, '_');
}

/**
 * Execute the MCP calls determined by the LLM using the SDK (handles both prompts and endpoints)
 */
async function executeMCPCalls(
	calls: Array<{ endpoint?: string; prompt?: string; params: Record<string, string> }>,
	baseUrl: string
): Promise<{ data: any[]; apiCalls: any[] }> {
	const data: any[] = [];
	const apiCalls: any[] = [];
	const serverUrl = `${baseUrl}/api/mcp`;

	for (const call of calls) {
		const startTime = Date.now();
		try {
			// Check if this is a prompt or an endpoint
			if (call.prompt) {
				// Handle MCP Prompt using SDK
				const promptName = call.prompt;
				logger.info('Executing MCP prompt via SDK', { prompt: promptName, params: call.params });

				try {
					const response = await getPrompt(promptName, call.params, serverUrl);
					const duration = Date.now() - startTime;

					// Extract text from MCP response
					let result: any;
					if (response.content && response.content[0]?.text) {
						try {
							result = JSON.parse(response.content[0].text);
						} catch {
							result = response.content[0].text;
						}
					} else {
						result = response;
					}

					data.push({
						type: `prompt:${promptName}`,
						params: call.params,
						result
					});
					apiCalls.push({
						endpoint: `execute-prompt (${promptName})`,
						params: call.params,
						duration: `${duration}ms`,
						status: 200,
						cacheStatus: 'n/a'
					});
				} catch (error) {
					const duration = Date.now() - startTime;
					logger.error('MCP prompt failed via SDK', {
						prompt: promptName,
						error
					});
					apiCalls.push({
						endpoint: `execute-prompt (${promptName})`,
						params: call.params,
						duration: `${duration}ms`,
						status: 500,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
				continue;
			}

			// Handle individual endpoint using SDK
			const endpointName = (call.endpoint || '')
				.toString()
				.replace(/^\/api\//, '')
				.replace(/^\//, '');

			// Convert endpoint name to tool name (kebab-case → snake_case)
			const toolName = endpointToToolName(endpointName);

			// Normalize params with sensible defaults to avoid LLM omissions
			const normalizedParams: Record<string, any> = {
				...call.params
			};
			if (!normalizedParams.language) normalizedParams.language = 'en';
			if (!normalizedParams.organization) normalizedParams.organization = 'unfoldingWord';

			// Clean up invalid parameters for fetch_translation_word
			if (toolName === 'fetch_translation_word') {
				// Reference is not required for this endpoint; ignore if present
				if (normalizedParams.reference && !normalizedParams.term) {
					// Keep reference if no term provided (for reference-based lookup)
				}
				// If LLM supplied an invalid path (e.g., "bible"), drop it to avoid 400s
				if (normalizedParams.path && !/\.md$/i.test(normalizedParams.path)) {
					delete normalizedParams.path;
				}
			}

			// Chat interface needs JSON for structured data processing
			// Don't set format - let endpoints default to JSON
			// Remove format parameter if present to ensure JSON response
			if (normalizedParams.format) {
				delete normalizedParams.format;
			}

			logger.info('Executing MCP tool via SDK', { tool: toolName, params: normalizedParams });

			try {
				const response = await callTool(toolName, normalizedParams, serverUrl);
				const duration = Date.now() - startTime;

				// Extract result from MCP response
				let result: any;
				if (response.content && response.content[0]?.text) {
					const text = response.content[0].text;
					// Try to parse as JSON, fallback to text
					try {
						result = JSON.parse(text);
					} catch {
						result = text;
					}
				} else {
					result = response;
				}

				data.push({
					type: endpointName,
					params: normalizedParams,
					result
				});
				apiCalls.push({
					endpoint: endpointName,
					params: normalizedParams,
					duration: `${duration}ms`,
					status: 200,
					cacheStatus: 'n/a' // SDK doesn't expose cache status, could be enhanced
				});
			} catch (error) {
				const duration = Date.now() - startTime;
				logger.error('MCP tool call failed via SDK', {
					tool: toolName,
					error
				});
				apiCalls.push({
					endpoint: endpointName,
					params: normalizedParams,
					duration: `${duration}ms`,
					status: 500,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		} catch (error) {
			logger.error('Failed to execute MCP call', {
				endpoint: (call.endpoint || '').toString(),
				error
			});
			apiCalls.push({
				endpoint: (call.endpoint || '').toString(),
				params: { ...call.params },
				duration: `${Date.now() - startTime}ms`,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	return { data, apiCalls };
}

/**
 * Format MCP data for OpenAI context
 */
function formatDataForContext(data: any[]): string {
	let context = 'Available MCP Data:\n\n';

	for (const item of data) {
		const format = item.params?.format || 'json';

		// If the response is already in Markdown or Text format, use it directly
		if (format === 'md' || format === 'text') {
			if (typeof item.result === 'string') {
				context += `[${item.type} - ${JSON.stringify(item.params)}]\n${item.result}\n\n`;
				continue;
			}
		}

		// Handle JSON responses with structure
		if (item.type === 'fetch-scripture' && item.result.scripture) {
			context += `Scripture for ${item.params.reference}:\n`;
			for (const verse of item.result.scripture) {
				context += `- ${verse.translation}: "${verse.text}"\n`;
			}
			context += '\n';
		} else if (item.type === 'translation-notes' && item.result.items) {
			const metadata = item.result.metadata || {};
			const source = metadata.source || 'TN';
			const version = metadata.version || '';
			context += `Translation Notes for ${item.params.reference} [${source} ${version}]:\n`;
			for (const note of item.result.items) {
				const noteRef = note.Reference || item.params.reference;
				context += `- ${note.Quote || 'General'}: ${note.Note} [${source} ${version} - ${noteRef}]\n`;
			}
			context += '\n';
		} else if (item.type === 'translation-questions' && item.result.items) {
			const metadata = item.result.metadata || {};
			const source = metadata.source || 'TQ';
			const version = metadata.version || '';
			context += `Study Questions for ${item.params.reference} [${source} ${version}]:\n`;
			for (const q of item.result.items) {
				const qRef = q.Reference || item.params.reference;
				context += `- Q: ${q.Question}\n  A: ${q.Response} [${source} ${version} - ${qRef}]\n`;
			}
			context += '\n';
		} else if (item.type === 'fetch-translation-words' && item.result.items) {
			const metadata = item.result.metadata || {};
			const source = metadata.source || 'TW';
			const version = metadata.version || '';
			context += `Translation Words [${source} ${version}]:\n`;
			for (const word of item.result.items) {
				context += `- ${word.term}: ${word.definition} [${source} ${version}]\n`;
			}
			context += '\n';
		} else if (
			item.type === 'get-translation-word' &&
			item.result &&
			typeof item.result === 'object'
		) {
			// Pretty-print a single TW article
			const w = item.result;
			context += `Translation Word Article: ${w.term || '(unknown)'}\n`;
			if (w.definition) context += `Definition: ${w.definition}\n`;
			if (w.extendedDefinition) context += `Extended: ${w.extendedDefinition}\n`;
			if (Array.isArray(w.facts) && w.facts.length) {
				context += `Facts:\n`;
				for (const f of w.facts) context += `- ${f}\n`;
			}
			if (Array.isArray(w.examples) && w.examples.length) {
				context += `Examples:\n`;
				for (const ex of w.examples) context += `- ${ex.reference}: ${ex.text}\n`;
			}
			if (Array.isArray(w.translationSuggestions) && w.translationSuggestions.length) {
				context += `Translation Suggestions:\n`;
				for (const s of w.translationSuggestions) context += `- ${s}\n`;
			}
			if (Array.isArray(w.relatedWords) && w.relatedWords.length) {
				context += `Related: ${w.relatedWords.join(', ')}\n`;
			}
			if (Array.isArray(w.strongs) && w.strongs.length) {
				context += `Strongs: ${w.strongs.join(', ')}\n`;
			}
			if (Array.isArray(w.aliases) && w.aliases.length) {
				context += `Aliases: ${w.aliases.join(', ')}\n`;
			}
			context += '\n';
		} else {
			// Fallback for any other data type
			context += `[${item.type}]\n${JSON.stringify(item.result, null, 2)}\n\n`;
		}
	}

	return context;
}

/**
 * Call OpenAI with our data and rules
 */
async function callOpenAI(
	message: string,
	context: string,
	chatHistory: Array<{ role: string; content: string }> = [],
	apiKey: string
): Promise<{ response: string; error?: string }> {
	if (!apiKey) {
		return {
			response: '',
			error: 'OpenAI API key not provided to callOpenAI function.'
		};
	}

	try {
		const messages = [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'system', content: context },
			...chatHistory.slice(-6), // Keep last 6 messages for context
			{ role: 'user', content: message }
		];

		// Add timeout using AbortController
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

		try {
			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`
				},
				body: JSON.stringify({
					model: 'gpt-4o-mini',
					messages,
					temperature: 0.3, // Lower temperature for more factual responses
					max_tokens: 2000 // Enough for overviews with titles and follow-up questions
				}),
				signal: controller.signal
			});
			clearTimeout(timeout);

			if (!response.ok) {
				const error = await response.text();
				logger.error('OpenAI API error', { status: response.status, error });
				return {
					response: '',
					error: `OpenAI API error: ${response.status}`
				};
			}

			const data = await response.json();
			return {
				response: data.choices[0]?.message?.content || 'No response generated'
			};
		} catch (error) {
			clearTimeout(timeout);
			logger.error('Failed to call OpenAI', { error });

			// Handle timeout specifically
			if (error instanceof Error && error.name === 'AbortError') {
				return {
					response: '',
					error: 'Request timed out after 30 seconds. Please try again.'
				};
			}

			return {
				response: '',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	} catch (error) {
		logger.error('Failed to call OpenAI', { error });
		return {
			response: '',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Stream OpenAI responses via SSE-compatible Web Streams API
 */
async function callOpenAIStream(
	message: string,
	context: string,
	chatHistory: Array<{ role: string; content: string }> = [],
	apiKey: string,
	xrayInit?: any,
	preTimings?: Record<string, number>,
	overallStartTime?: number
): Promise<ReadableStream<Uint8Array>> {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	const stream = new ReadableStream<Uint8Array>({
		start: async (controller) => {
			try {
				const messages = [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'system', content: context },
					...chatHistory.slice(-6),
					{ role: 'user', content: message }
				];

				// Helper to emit SSE data events
				const emit = (event: string, data: unknown) => {
					const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(payload));
				};

				const llmStart = Date.now();
				const response = await fetch('https://api.openai.com/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiKey}`
					},
					body: JSON.stringify({
						model: 'gpt-4o-mini',
						messages,
						temperature: 0.3,
						stream: true,
						max_tokens: 2000 // Enough for overviews with titles and follow-up questions
					})
				});

				if (!response.ok || !response.body) {
					const msg =
						`event: error\n` +
						`data: ${JSON.stringify({ error: `OpenAI error: ${response.status}` })}\n\n`;
					controller.enqueue(encoder.encode(msg));
					controller.close();
					return;
				}

				const reader = response.body.getReader();
				let buffer = '';

				// Signal start
				emit('llm:start', { started: true });

				// Emit initial X-ray snapshot if provided
				if (xrayInit) {
					emit('xray', xrayInit);
				}

				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });

					const parts = buffer.split('\n\n');
					buffer = parts.pop() || '';

					for (const part of parts) {
						const line = part.trim();
						if (!line.startsWith('data:')) continue;
						const jsonStr = line.replace(/^data:\s*/, '');
						if (jsonStr === '[DONE]') {
							// Final X-ray update with llmResponse timing if possible
							try {
								const finalTimings: Record<string, number> = { ...(preTimings || {}) };
								finalTimings.llmResponse = Date.now() - llmStart;
								const totalDuration = overallStartTime
									? Date.now() - overallStartTime
									: (finalTimings.endpointDiscovery || 0) +
										(finalTimings.llmDecision || 0) +
										(finalTimings.mcpExecution || 0) +
										(finalTimings.contextFormatting || 0) +
										(finalTimings.llmResponse || 0);
								const breakdown = {
									'Endpoint Discovery': `${finalTimings.endpointDiscovery || 0}ms (${totalDuration ? Math.round(((finalTimings.endpointDiscovery || 0) / totalDuration) * 100) : 0}%)`,
									'LLM Decision Making': `${finalTimings.llmDecision || 0}ms (${totalDuration ? Math.round(((finalTimings.llmDecision || 0) / totalDuration) * 100) : 0}%)`,
									'MCP Tool Execution': `${finalTimings.mcpExecution || 0}ms (${totalDuration ? Math.round(((finalTimings.mcpExecution || 0) / totalDuration) * 100) : 0}%)`,
									'Context Formatting': `${finalTimings.contextFormatting || 0}ms (${totalDuration ? Math.round(((finalTimings.contextFormatting || 0) / totalDuration) * 100) : 0}%)`,
									'LLM Response Generation': `${finalTimings.llmResponse || 0}ms (${totalDuration ? Math.round(((finalTimings.llmResponse || 0) / totalDuration) * 100) : 0}%)`
								};
								emit('xray:final', {
									timings: { ...finalTimings, breakdown },
									totalTime: totalDuration,
									totalDuration
								});
							} catch (_e) {
								// ignored: best-effort final xray emission
							}

							emit('llm:done', { done: true });
							controller.close();
							return;
						}
						try {
							const event = JSON.parse(jsonStr);
							const delta = event.choices?.[0]?.delta?.content;
							if (typeof delta === 'string' && delta.length > 0) {
								emit('llm:delta', { text: delta });
							}
						} catch {
							// ignore malformed chunk
						}
					}
				}

				// Flush remainder if any
				if (buffer.length > 0) {
					try {
						const event = JSON.parse(buffer.replace(/^data:\s*/, ''));
						const delta = event.choices?.[0]?.delta?.content;
						if (typeof delta === 'string' && delta.length > 0) {
							emit('llm:delta', { text: delta });
						}
					} catch {
						// ignore
					}
				}

				emit('llm:done', { done: true });
				controller.close();
			} catch (error) {
				const err = error instanceof Error ? error.message : String(error);
				const msg = `event: error\n` + `data: ${JSON.stringify({ error: err })}\n\n`;
				controller.enqueue(encoder.encode(msg));
				controller.close();
			}
		}
	});

	return stream;
}

export const POST: RequestHandler = async ({ request, url, platform }) => {
	const startTime = Date.now();
	const timings: Record<string, number> = {};

	// Note: KV cache is initialized by the platform adapter for all MCP endpoints.
	// The chat endpoint doesn't need to initialize it - MCP tools use the cache internally
	// via services like ZipResourceFetcher2 when fetching resources.

	try {
		const { message, chatHistory = [], enableXRay = false }: ChatRequest = await request.json();
		const baseUrl = `${url.protocol}//${url.host}`;

		logger.info('Chat stream request', { message, historyLength: chatHistory.length });

		// Check for API key - try multiple sources
		const apiKey =
			// Cloudflare Workers env binding (production)
			platform?.env?.OPENAI_API_KEY ||
			// SvelteKit env (local development with .env file)
			env.OPENAI_API_KEY ||
			// Fallback to process.env (for other environments)
			process.env.OPENAI_API_KEY;

		if (!apiKey) {
			logger.error('OpenAI API key not found in any environment source', {
				platformExists: !!platform,
				platformEnvExists: !!platform?.env,
				platformEnvKeys: platform?.env ? Object.keys(platform.env) : [],
				hasProcessEnv: typeof process !== 'undefined' && !!process.env,
				importMetaEnvKeys: Object.keys(import.meta.env || {})
			});
			return json(
				{
					success: false,
					error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
					timestamp: new Date().toISOString(),
					debug: {
						platformExists: !!platform,
						platformEnvExists: !!platform?.env,
						// Don't expose actual env var names in production error responses
						hint: 'Check Cloudflare Pages secret configuration'
					}
				},
				{ status: 500 }
			);
		}

		// Step 1: Discover available endpoints and prompts dynamically
		const discoveryStart = Date.now();
		const { endpoints, prompts } = await discoverMCPEndpoints(baseUrl);
		timings.endpointDiscovery = Date.now() - discoveryStart;

		logger.info('Discovered resources for chat', {
			endpoints: endpoints.length,
			prompts: prompts.length
		});

		if (endpoints.length === 0 && prompts.length === 0) {
			return json(
				{
					success: false,
					error: 'Failed to discover MCP endpoints',
					timestamp: new Date().toISOString()
				},
				{ status: 500 }
			);
		}

		// Step 2: Let the LLM decide which endpoints/prompts to call
		const llmDecisionStart = Date.now();
		const endpointCalls = await determineMCPCalls(message, apiKey, endpoints, prompts, chatHistory);
		timings.llmDecision = Date.now() - llmDecisionStart;

		// Log if no endpoints were selected
		if (endpointCalls.length === 0) {
			logger.info('LLM decided no MCP endpoints needed for this query', { message });
		}

		// Step 3: Execute the MCP calls
		const mcpExecutionStart = Date.now();
		const { data, apiCalls } = await executeMCPCalls(endpointCalls, baseUrl);
		timings.mcpExecution = Date.now() - mcpExecutionStart;

		// Step 4: Format data for OpenAI context, including any tool errors so the LLM can respond gracefully
		const contextFormattingStart = Date.now();
		const toolErrors = apiCalls.filter(
			(c) => (typeof c.status === 'number' && c.status >= 400) || c.error
		);
		const hasErrors = toolErrors.length > 0;
		let errorContext = '';
		if (hasErrors) {
			errorContext +=
				'Tool errors were encountered while gathering context. Provide a clear, user-friendly explanation and suggest alternate ways to proceed.\n';
			errorContext += 'Errors (do not expose internal URLs):\n';
			for (const err of toolErrors) {
				errorContext += `- endpoint: ${err.endpoint}, status: ${err.status || 'n/a'}, message: ${err.error || 'Unknown error'}, params: ${JSON.stringify(err.params)}\n`;
			}
			errorContext +=
				'\nIf a requested resource was not found, explain what is available instead (e.g., try a different verse, or use notes/questions/scripture).\n\n';
		}
		const context = `${errorContext}${formatDataForContext(data)}`;
		timings.contextFormatting = Date.now() - contextFormattingStart;

		// Step 5: Call OpenAI with the data (support streaming)
		const streamMode =
			url.searchParams.get('stream') === '1' ||
			(request.headers.get('accept') || '').includes('text/event-stream');

		if (streamMode) {
			// Build initial X-ray snapshot (always emit so client can show tools during streaming)
			const totalDurationSoFar = Date.now() - startTime;
			const xrayInit: any = {
				queryType: 'ai-assisted',
				apiCallsCount: apiCalls.length,
				totalDuration: totalDurationSoFar,
				totalTime: totalDurationSoFar,
				hasErrors: apiCalls.some(
					(c) => (typeof c.status === 'number' && c.status >= 400) || c.error
				),
				apiCalls,
				tools: apiCalls.map((call, index) => ({
					id: `tool-${index}`,
					name: call.endpoint,
					duration: parseInt(call.duration.replace('ms', '')) || 0,
					cached: call.cacheStatus === 'hit',
					cacheStatus: call.cacheStatus || 'miss',
					params: call.params,
					status: call.status,
					error: call.error
				})),
				timings: {
					endpointDiscovery: timings.endpointDiscovery || 0,
					llmDecision: timings.llmDecision || 0,
					mcpExecution: timings.mcpExecution || 0,
					contextFormatting: timings.contextFormatting || 0
				}
			};

			const sseStream = await callOpenAIStream(
				message,
				context,
				chatHistory,
				apiKey,
				xrayInit,
				{
					endpointDiscovery: timings.endpointDiscovery || 0,
					llmDecision: timings.llmDecision || 0,
					mcpExecution: timings.mcpExecution || 0,
					contextFormatting: timings.contextFormatting || 0
				},
				startTime
			);
			const totalDuration = Date.now() - startTime;
			return new Response(sseStream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-store',
					'X-Chat-Model': 'gpt-4o-mini',
					'X-Chat-Duration': `${totalDuration}ms`
				}
			});
		}

		const llmResponseStart = Date.now();
		const { response, error } = await callOpenAI(message, context, chatHistory, apiKey);
		timings.llmResponse = Date.now() - llmResponseStart;

		// Log the response for debugging
		logger.info('LLM response', {
			hasResponse: !!response,
			responseLength: response?.length || 0,
			hasError: !!error,
			contextLength: context.length
		});

		if (error) {
			return json(
				{
					success: false,
					error,
					timestamp: new Date().toISOString()
				},
				{ status: 500 }
			);
		}

		// Check for empty response
		if (!response || response.trim() === '') {
			logger.error('Empty response from LLM', { message, contextLength: context.length });
			return json(
				{
					success: false,
					error: 'No response generated from AI. Please try again.',
					timestamp: new Date().toISOString()
				},
				{ status: 500 }
			);
		}

		const totalDuration = Date.now() - startTime;

		// Build response to match ChatInterface expectations
		const result: any = {
			success: true,
			content: response, // ChatInterface expects 'content', not 'response'
			timestamp: new Date().toISOString(),
			contextUsed: {
				type: 'mcp-data',
				endpoints: apiCalls.map((c) => c.endpoint),
				dataPoints: data.length
			},
			metadata: {
				model: 'gpt-4o-mini',
				streaming: false,
				duration: totalDuration
			}
		};

		// Add X-ray data if requested
		if (enableXRay) {
			result.xrayData = {
				queryType: 'ai-assisted',
				apiCallsCount: apiCalls.length,
				totalDuration,
				totalTime: totalDuration,
				hasErrors: apiCalls.some(
					(c) => (typeof c.status === 'number' && c.status >= 400) || c.error
				),
				apiCalls,
				// Transform apiCalls to tools format for XRayPanel
				tools: apiCalls.map((call, index) => ({
					id: `tool-${index}`,
					name: call.endpoint,
					duration: parseInt(call.duration.replace('ms', '')) || 0,
					cached: call.cacheStatus === 'hit',
					cacheStatus: call.cacheStatus || 'miss',
					params: call.params,
					status: call.status,
					error: call.error
				})),
				// Add detailed timing breakdown
				timings: {
					endpointDiscovery: timings.endpointDiscovery || 0,
					llmDecision: timings.llmDecision || 0,
					mcpExecution: timings.mcpExecution || 0,
					contextFormatting: timings.contextFormatting || 0,
					llmResponse: timings.llmResponse || 0,
					// Add percentages for easy visualization
					breakdown: {
						'Endpoint Discovery': `${timings.endpointDiscovery || 0}ms (${Math.round(((timings.endpointDiscovery || 0) / totalDuration) * 100)}%)`,
						'LLM Decision Making': `${timings.llmDecision || 0}ms (${Math.round(((timings.llmDecision || 0) / totalDuration) * 100)}%)`,
						'MCP Tool Execution': `${timings.mcpExecution || 0}ms (${Math.round(((timings.mcpExecution || 0) / totalDuration) * 100)}%)`,
						'Context Formatting': `${timings.contextFormatting || 0}ms (${Math.round(((timings.contextFormatting || 0) / totalDuration) * 100)}%)`,
						'LLM Response Generation': `${timings.llmResponse || 0}ms (${Math.round(((timings.llmResponse || 0) / totalDuration) * 100)}%)`
					}
				}
			};
		}

		return json(result, {
			headers: {
				'X-Chat-Model': 'gpt-4o-mini',
				'X-Chat-Duration': `${totalDuration}ms`,
				'X-Chat-API-Calls': String(apiCalls.length)
			}
		});
	} catch (error) {
		logger.error('Chat stream error', {
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
			type: error?.constructor?.name
		});

		// Return more detailed error in development
		const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error',
				timestamp: new Date().toISOString(),
				...(isDev && {
					details: {
						message: error instanceof Error ? error.message : 'Unknown error',
						stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
						type: error?.constructor?.name
					}
				})
			},
			{ status: 500 }
		);
	}
};
