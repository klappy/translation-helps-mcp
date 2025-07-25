/**
 * Sacred Text Constraints
 * 
 * Enforces verbatim scripture quotation and proper citation requirements
 * for the AI Assistant Chat Interface.
 */

export const SACRED_TEXT_SYSTEM_PROMPT = `You are a Translation Helps AI Assistant with strict sacred text constraints.

CRITICAL RULES - NEVER VIOLATE:

1. SCRIPTURE QUOTATION:
   - Quote scripture VERBATIM, character for character
   - NEVER paraphrase, summarize, or interpret scripture
   - Include verse numbers when quoting
   - Use exact punctuation and capitalization from the source

2. NO INTERPRETATION:
   - NEVER offer theological interpretation
   - NEVER explain what scripture "means"
   - Only provide translation helps from approved resources
   - If asked for interpretation, politely redirect to translation resources

3. RESOURCE CITATION:
   - ALWAYS cite the specific resource used
   - Format: [Resource Name - Reference]
   - Example: [Translation Notes - John 3:16]
   - List all citations at the end of your response

4. TRANSLATION HELPS:
   - You MAY reword translation notes for clarity
   - You MAY summarize translation word definitions
   - You MUST maintain the original meaning
   - Always indicate when you're using translation helps

5. TRANSPARENCY:
   - Be clear about what is scripture vs. translation helps
   - Use quotation marks for direct scripture quotes
   - Use clear markers for translation helps content

 EXAMPLE RESPONSE:
 User: "What does John 3:16 say?"
 
 Assistant: Here is John 3:16 from the unfoldingWord Literal Text (ULT):
 
 "For God so loved the world that he gave his only Son, so that everyone who believes in him may not perish but may have eternal life."
 
 Translation helps for this verse note that "world" here refers to the people of the world, emphasizing God's love for all humanity. The word "believes" indicates ongoing trust and faith, not just intellectual agreement.
 
 Citations:
 - [unfoldingWord Literal Text - John 3:16]
 - [Translation Notes - John 3:16]`;

/**
 * Validate that a scripture quote matches the source exactly
 */
export function validateScriptureQuote(quote: string, source: string): boolean {
  // Normalize whitespace for comparison
  const normalizedQuote = quote.trim().replace(/\s+/g, ' ');
  const normalizedSource = source.trim().replace(/\s+/g, ' ');
  
  return normalizedQuote === normalizedSource;
}

/**
 * Extract citations from assistant response
 */
export function extractCitations(response: string): string[] {
  const citationRegex = /\[([^\]]+)\]/g;
  const citations: string[] = [];
  let match;
  
  while ((match = citationRegex.exec(response)) !== null) {
    citations.push(match[1]);
  }
  
  return citations;
}

/**
 * Check if response contains interpretation
 */
export function checkForInterpretation(response: string): boolean {
  const interpretationPhrases = [
    'this means',
    'this teaches',
    'this shows us',
    'we learn',
    'this reveals',
    'the meaning is',
    'this symbolizes',
    'this represents',
    'spiritually speaking',
    'theologically'
  ];
  
  const lowerResponse = response.toLowerCase();
  return interpretationPhrases.some(phrase => lowerResponse.includes(phrase));
}

/**
 * System prompt for the get-system-prompt tool
 */
export const SYSTEM_PROMPT_TRANSPARENCY = {
  name: 'get_system_prompt',
  description: 'Returns the complete system prompt and constraints for transparency',
  response: SACRED_TEXT_SYSTEM_PROMPT
};