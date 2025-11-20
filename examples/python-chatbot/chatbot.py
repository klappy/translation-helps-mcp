import asyncio
import os
import json
import argparse
import random
import httpx
from dotenv import load_dotenv
from openai import OpenAI
from translation_helps import TranslationHelpsClient
# Optional: Use adapter utilities for provider-specific conversion
from translation_helps.adapters import prepare_tools_for_provider

# Load environment variables
load_dotenv()

def parse_args():
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(
        description="Translation Helps MCP Chatbot - Interactive Bible study assistant",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Run with default settings
  %(prog)s --verbose          # Show detailed debug output
  %(prog)s --quiet            # Minimal output (errors only)
  %(prog)s --debug            # Show all debug info including tool execution details
        """
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show verbose output including connection status and tool counts"
    )
    parser.add_argument(
        "--debug", "-d",
        action="store_true",
        help="Show detailed debug output including tool execution progress"
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Minimal output - only show errors and final responses"
    )
    parser.add_argument(
        "--server-url",
        type=str,
        default=None,
        help="Override MCP server URL (default: from MCP_SERVER_URL env var or production server)"
    )
    return parser.parse_args()

async def main(verbose=False, debug=False, quiet=False, server_url_override=None):
    # Initialize clients
    # Use production server by default, allow override via environment variable or CLI
    server_url = server_url_override or os.getenv("MCP_SERVER_URL", "https://translation-helps-mcp-945.pages.dev/api/mcp")
    mcp_client = TranslationHelpsClient({
        "serverUrl": server_url
    })
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Create a shared HTTP client for prompt execution (reuse connections for better performance)
    http_client = httpx.AsyncClient(timeout=60.0)
    
    try:
        # Connect to MCP server
        await mcp_client.connect()
        if verbose or debug:
            print("✅ Connected to Translation Helps MCP server")
        
        # Get available tools and prompts
        tools = await mcp_client.list_tools()
        prompts = await mcp_client.list_prompts()
        if verbose or debug:
            print(f"✅ Found {len(tools)} available tools")
            print(f"✅ Found {len(prompts)} available prompts")

        # Optional: Use adapter utility to prepare tools for OpenAI
        # (You could also use convert_all_to_openai() or write custom conversion logic)
        openai_tools = prepare_tools_for_provider("openai", tools, prompts)
        
        # System prompt - matches the Svelte chat interface configuration
        SYSTEM_PROMPT = """You are a Bible study assistant that provides information EXCLUSIVELY from the Translation Helps MCP Server database. You have access to real-time data from unfoldingWord's translation resources.

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

AVAILABLE MCP PROMPTS (Use these for comprehensive data - call as prompt_[name]):

1. **prompt_translation-helps-for-passage** - PREFERRED for comprehensive/learning requests
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

2. **prompt_get-translation-words-for-passage** - For key terms only
   - Returns word articles with titles and full content
   - USE WHEN: User specifically asks only for key terms/word definitions

3. **prompt_get-translation-academy-for-passage** - For translation concepts
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

User asks: "Show me {passage} in ULT"
→ Use fetch_scripture tool (just the text)

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
   - If a tool call returns empty results, fails, or returns an error, you MUST respond that you could not find the requested information

4. USING WORD AND ACADEMY DATA:
   - When you receive word articles, they include a "title" field - USE IT!
   - Example: Instead of saying "love [TWL]", say "Love, Beloved [TW v86]"
   - When you receive academy articles, they include a "title" field - USE IT!
   - Example: Instead of saying "figs-metaphor", say "Metaphor [TA v86]"
   - Include the actual article titles to give users proper context

5. TRANSLATION WORD ARTICLES - STRICT RULES:
   - **CRITICAL: When a user asks about a translation word (e.g., "Who is God?", "What is grace?", "What does 'love' mean?"), you MUST render the COMPLETE article content**
   - The article content is provided in FULL MARKDOWN format in the MCP response - you MUST include ALL of it
   - DO NOT just say "I can provide that information" or "Let me find that for you" - you MUST actually present the full article
   - The article includes sections like: Definition, Facts, Examples, Translation Suggestions, Bible References, Word Data, etc.
   - Present the ENTIRE article content as provided - do not summarize or truncate
   - When presenting Translation Word articles, you MUST use ONLY the content provided in the MCP response
   - DO NOT add Greek/Hebrew words, etymologies, or linguistic details unless they appear in the article
   - DO NOT add historical context, theological interpretations, or extra biblical references unless they are in the article
   - DO NOT add information from your training data - ONLY use what's in the article
   - If the article doesn't mention something, DO NOT add it - even if you know it from your training
   - Example: If the article doesn't mention the Greek word "ἀπόστολος", DO NOT add it
   - Example: If the article doesn't discuss Paul's apostleship in detail, DO NOT add that information
   - Your role is to PRESENT the COMPLETE article content, not to ENHANCE it with external knowledge or provide empty acknowledgments

6. TRANSLATION NOTES STRUCTURE:
   - Translation notes contain several fields for each entry:
     * Quote: Contains the Greek/Hebrew text being explained (this is the original language phrase)
     * Note: The explanation or commentary about that phrase
     * Reference: The verse reference
   - When asked about Greek/Hebrew quotes, the "Quote" field in translation notes contains that original language text
   - Each note explains a specific Greek/Hebrew phrase found in the original biblical text

7. GUIDED LEARNING CONVERSATION STRUCTURE:
   
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
   
   **CRITICAL: ALWAYS END WITH FOLLOW-UP QUESTIONS - THIS IS MANDATORY:**
   After providing your response, you MUST ALWAYS include 2-3 helpful follow-up questions that guide the user to explore more. This is REQUIRED for EVERY response, even simple ones.
   
   **For simple verse requests** (e.g., "Show me Romans 14:2"):
   - After showing the verse, suggest: "Would you like to see the translation notes for this verse?", "Would you like to explore the key terms in this passage?", or "Would you like to learn about the translation challenges here?"
   
   **For comprehensive requests** (e.g., "Teach me about Romans 14:2"):
   - After the overview, suggest: "Would you like to explore the translation challenges in more detail?", "Should we dive deeper into any of the key biblical terms?", "Would you like to learn about the translation concepts mentioned?", "Would you like to see the comprehension questions for this passage?"
   
   **Examples of follow-up questions:**
   - "Would you like to explore the translation challenges in more detail?"
   - "Should we dive deeper into any of the key biblical terms?"
   - "Would you like to learn about the translation concepts mentioned?"
   - "Would you like to see the comprehension questions for this passage?"
   - "Would you like to explore a related passage or concept?"
   - "Would you like to see the translation notes for this verse?"
   - "Would you like to understand the key terms used here?"
   
   **REMEMBER: Every single response MUST end with follow-up questions. If your response doesn't have them, you haven't completed your task.**
   
   **TURN 2+ - GUIDED EXPLORATION:**
   Based on what user chooses, show that content + suggest next logical step:
   
   If user picks "Translation Challenges":
   → Show translation notes with English+Greek phrases
   → Notice which academy concepts appear most: "I see 'Abstract Nouns' is key here. Learn about it?"
   → End with: "Would you like to explore the key terms next, or dive into the translation concepts?"
   
   If user learns about academy concept:
   → Show full academy article content
   → Connect back: "Now you understand [Concept]. Want to see the other translation challenges, or explore the key terms?"
   → End with: "What would you like to explore next?"
   
   If user explores a key term:
   → Show full word article content
   → Suggest related terms or move to concepts: "This relates to 'Will of God'. See that next, or learn about translation concepts?"
   → End with: "Would you like to explore another term or concept?"
   
   If user sees translation questions:
   → Show questions and responses
   → Suggest: "Use these to verify your understanding. Want to review any translation challenges again?"
   → End with: "Would you like to explore any other aspects of this passage?"
   
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
   - ALWAYS end responses with follow-up questions to keep the conversation going

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

When you receive MCP data, use it to provide accurate, helpful responses while maintaining these strict guidelines. Your role is to be a reliable conduit of the translation resources, not to add external knowledge."""

        # Chat loop
        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            }
        ]
        
        if not quiet:
            print("\n🤖 Chatbot ready! Type 'quit' to exit.\n")
        
        while True:
            # Get user input
            user_input = input("You: ").strip()
            if user_input.lower() in ['quit', 'exit', 'q']:
                break
            
            if not user_input:
                continue
            
            # Add user message
            messages.append({"role": "user", "content": user_input})
            
            # Call OpenAI with tools
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",  # or "gpt-4" for better results
                messages=messages,
                tools=openai_tools,
                tool_choice="auto",
                temperature=0.3,  # Lower temperature for more factual responses (matches Svelte config)
                max_tokens=2000  # Enough for overviews with titles and follow-up questions (matches Svelte config)
            )
            
            # Get assistant message
            assistant_message = response.choices[0].message
            messages.append({
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    } for tc in (assistant_message.tool_calls or [])
                ]
            } if assistant_message.tool_calls else {
                "role": "assistant",
                "content": assistant_message.content
            })
            
            # Print assistant response if no tool calls
            # If no tools are called, remind the AI to use tools
            if assistant_message.content and not assistant_message.tool_calls:
                # Check if the user is asking about Bible/translation content
                user_question_lower = user_input.lower()
                bible_keywords = ['bible', 'scripture', 'verse', 'chapter', 'translation', 'word', 'note', 'john', 'matthew', 'mark', 'luke', 'acts', 'romans', 'corinthians', 'ephesians', 'philippians', 'colossians', 'thessalonians', 'timothy', 'titus', 'philemon', 'hebrews', 'james', 'peter', 'jude', 'revelation', 'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth', 'samuel', 'kings', 'chronicles', 'ezra', 'nehemiah', 'esther', 'job', 'psalm', 'proverbs', 'ecclesiastes', 'song', 'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi']
                
                if any(keyword in user_question_lower for keyword in bible_keywords):
                    # User asked about Bible content but AI didn't use tools
                    # Add a reminder and get a new response
                    messages.append({
                        "role": "system",
                        "content": "The user asked about Bible or translation content, but you didn't use any tools. You MUST use the available tools to fetch information from Translation Helps resources before answering. Please call the appropriate tool(s) now."
                    })
                    
                    # Get a new response that should use tools
                    response = openai_client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=messages,
                        tools=openai_tools,
                        tool_choice="auto"
                    )
                    assistant_message = response.choices[0].message
                    # Update the last message in messages to include tool calls
                    messages[-1] = {
                        "role": "assistant",
                        "content": assistant_message.content,
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments
                                }
                            } for tc in (assistant_message.tool_calls or [])
                        ]
                    } if assistant_message.tool_calls else {
                        "role": "assistant",
                        "content": assistant_message.content
                    }
                    
                    # If still no tool calls, check for follow-up questions and add if missing
                    if not assistant_message.tool_calls:
                        response_content = assistant_message.content
                        content_lower = response_content.lower()
                        followup_indicators = [
                            "would you like", "should we", "would you like to", 
                            "do you want to", "want to explore", "interested in", 
                            "follow-up", "next step"
                        ]
                        has_followups = any(indicator in content_lower for indicator in followup_indicators)
                        
                        if not has_followups:
                            # Extract reference if possible
                            import re
                            user_question = user_input.lower()
                            reference_match = None
                            ref_pattern = r'\b([1-3]?\s?[a-z]+)\s+(\d+):(\d+)'
                            ref_match = re.search(ref_pattern, user_question)
                            if ref_match:
                                book = ref_match.group(1).strip().title()
                                chapter = ref_match.group(2)
                                verse = ref_match.group(3)
                                reference_match = f"{book} {chapter}:{verse}"
                            
                            if reference_match:
                                response_content += f"\n\nWould you like to explore more? Would you like to see the translation notes for {reference_match}? Would you like to explore the key terms in {reference_match}? Or would you like to learn about the translation challenges in {reference_match}?"
                            else:
                                response_content += f"\n\nWould you like to explore more? Would you like to see the translation notes for this verse? Would you like to explore the key terms in this passage? Or would you like to learn about the translation challenges here?"
                        
                        # Update the message with potentially modified content
                        messages[-1] = {
                            "role": "assistant",
                            "content": response_content
                        }
                        
                        if not quiet:
                            print(f"\nAssistant: {response_content}\n")
                else:
                    # Not a Bible-related question, just print the response
                    if not quiet:
                        print(f"\nAssistant: {assistant_message.content}\n")
            
            # Execute tool calls in parallel for better performance
            if assistant_message.tool_calls:
                # Show immediate polite response to user (better UX - don't leave them waiting)
                if not quiet:
                    polite_messages = [
                        "💭 Let me gather that information for you...",
                        "🔍 I'll look that up for you right away...",
                        "📚 Let me fetch the relevant translation resources...",
                        "🔎 Gathering the information you requested...",
                        "💡 Let me retrieve that for you..."
                    ]
                    print(f"\nAssistant: {random.choice(polite_messages)}\n")
                elif debug:
                    print("\n🔧 Executing tool calls...")
                
                async def execute_tool_call(tool_call):
                    """Execute a single tool call and return the result"""
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)  # Parse JSON string
                    
                    if debug:
                        print(f"  → Calling {tool_name}...")
                    
                    try:
                        # Check if this is a prompt (starts with "prompt_")
                        if tool_name.startswith("prompt_"):
                            # Extract the actual prompt name
                            prompt_name = tool_name.replace("prompt_", "")
                            
                            # Execute prompt via REST API (reuse shared HTTP client)
                            prompt_response = await http_client.post(
                                f"{server_url.replace('/api/mcp', '/api/execute-prompt')}",
                                json={
                                    "promptName": prompt_name,  # Server expects 'promptName', not 'name'
                                    "parameters": tool_args     # Server expects 'parameters', not 'arguments'
                                }
                            )
                            # Check response status before parsing
                            prompt_response.raise_for_status()
                            
                            prompt_data = prompt_response.json()
                            
                            # The server returns the data directly (not wrapped in MCP format)
                            # Convert to text format for the LLM
                            tool_result_text = ""
                            
                            # Handle different response formats
                            if isinstance(prompt_data, dict):
                                # Check for error in response
                                if prompt_data.get("error"):
                                    error_msg = prompt_data.get("message", prompt_data.get("error", "Unknown error"))
                                    raise Exception(f"Prompt execution failed: {error_msg}")
                                
                                # Convert structured data to readable format (compact JSON for speed)
                                tool_result_text = json.dumps(prompt_data, indent=2)
                            elif isinstance(prompt_data, str):
                                tool_result_text = prompt_data
                            
                            # Check if result is empty
                            if not tool_result_text or tool_result_text.strip() == "":
                                if debug:
                                    print(f"  ⚠️  {tool_name} returned no data")
                                tool_result_text = "[NO_DATA] The prompt returned no information. This means the requested data was not found in the Translation Helps resources."
                            else:
                                if debug:
                                    print(f"  ✅ {tool_name} completed ({len(tool_result_text)} chars)")
                            
                            return {
                                "tool_call_id": tool_call.id,
                                "name": tool_name,
                                "content": tool_result_text
                            }
                        
                        # Regular tool call via MCP SDK
                        result = await mcp_client.call_tool(tool_name, tool_args)
                        
                        # Extract text from result
                        tool_result_text = ""
                        if result.get("content"):
                            # Handle both list and single item formats
                            content_items = result["content"]
                            if not isinstance(content_items, list):
                                content_items = [content_items]
                            
                            for item in content_items:
                                if isinstance(item, dict):
                                    # First check if item has "text" key directly (most common)
                                    if "text" in item:
                                        tool_result_text += str(item.get("text", ""))
                                    # Also check for text type (MCP standard format)
                                    elif item.get("type") == "text" and "text" in item:
                                        tool_result_text += item.get("text", "")
                                elif isinstance(item, str):
                                    # If content item is directly a string
                                    tool_result_text += item
                        
                        # Also check if result has text directly (not in content array)
                        if not tool_result_text and result.get("text"):
                            tool_result_text = result["text"]
                        
                        # Check if result is empty or indicates failure
                        if not tool_result_text or tool_result_text.strip() == "":
                            if debug:
                                print(f"  ⚠️  {tool_name} returned no data")
                            tool_result_text = "[NO_DATA] The tool returned no information. This means the requested data was not found in the Translation Helps resources."
                        else:
                            if debug:
                                print(f"  ✅ {tool_name} completed ({len(tool_result_text)} chars)")
                        
                        return {
                            "tool_call_id": tool_call.id,
                            "name": tool_name,
                            "content": tool_result_text
                        }
                    except Exception as e:
                        error_msg = f"[ERROR] The tool call failed: {str(e)}. This means the requested information could not be retrieved from the Translation Helps resources."
                        if debug or verbose:
                            print(f"  ❌ {tool_name} failed: {str(e)}")
                        return {
                            "tool_call_id": tool_call.id,
                            "name": tool_name,
                            "content": error_msg
                        }
                
                # Execute all tool calls in parallel using asyncio.gather
                tool_results = await asyncio.gather(*[execute_tool_call(tc) for tc in assistant_message.tool_calls])
                
                # Add all tool results to messages
                for result in tool_results:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": result["tool_call_id"],
                        "name": result["name"],
                        "content": result["content"]
                    })
                
                # Check if any tool calls returned data
                # Only check the tool results we just added (last N messages where N = number of tool calls)
                has_data = False
                tool_call_count = len(assistant_message.tool_calls or [])
                # Check the last tool_call_count messages (which should be our tool results)
                recent_messages = messages[-tool_call_count:] if tool_call_count > 0 else []
                for msg in recent_messages:
                    if msg.get("role") == "tool":
                        content = msg.get("content", "")
                        # Check if content exists and is not a no-data or error marker
                        if content and content.strip() and "[NO_DATA]" not in content and "[ERROR]" not in content:
                            has_data = True
                            break
                
                # Get final response from OpenAI with tool results
                # Add a reminder if no data was found
                if not has_data:
                    messages.append({
                        "role": "system",
                        "content": "IMPORTANT: All tool calls returned [NO_DATA] or [ERROR]. You MUST inform the user that you could not find the requested information in the Translation Helps resources. Do NOT make up or guess information."
                    })
                
                # Check if the last assistant message already has follow-up questions
                # If not, add a reminder before generating the final response
                last_assistant_msg = next(
                    (msg for msg in reversed(messages) if msg.get("role") == "assistant"),
                    None
                )
                needs_followups = True
                if last_assistant_msg and last_assistant_msg.get("content"):
                    content_lower = last_assistant_msg["content"].lower()
                    # Check if response already contains follow-up question indicators
                    followup_indicators = [
                        "would you like",
                        "should we",
                        "would you like to",
                        "do you want to",
                        "want to explore",
                        "interested in",
                        "follow-up",
                        "next step"
                    ]
                    needs_followups = not any(indicator in content_lower for indicator in followup_indicators)
                
                if needs_followups:
                    # Add reminder to include follow-up questions
                    messages.append({
                        "role": "system",
                        "content": "CRITICAL REMINDER: Your response MUST end with 2-3 follow-up questions. Examples: 'Would you like to see the translation notes for this verse?', 'Would you like to explore the key terms?', 'Would you like to learn about the translation challenges here?' Every response requires follow-up questions - this is mandatory."
                    })
                
                final_response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages
                )
                
                final_message = final_response.choices[0].message
                final_content = final_message.content
                
                # Post-process: Check if follow-up questions are present, if not, add them
                content_lower = final_content.lower()
                followup_indicators = [
                    "would you like",
                    "should we",
                    "would you like to",
                    "do you want to",
                    "want to explore",
                    "interested in",
                    "follow-up",
                    "next step"
                ]
                has_followups = any(indicator in content_lower for indicator in followup_indicators)
                
                if not has_followups:
                    # Extract reference from user's question if possible
                    import re
                    user_question = ""
                    for msg in reversed(messages):
                        if msg.get("role") == "user":
                            user_question = msg.get("content", "")
                            break
                    
                    reference_match = None
                    # Try to extract Bible reference (book name + chapter:verse)
                    ref_pattern = r'\b([1-3]?\s?[a-z]+)\s+(\d+):(\d+)'
                    ref_match = re.search(ref_pattern, user_question.lower())
                    if ref_match:
                        book = ref_match.group(1).strip().title()
                        chapter = ref_match.group(2)
                        verse = ref_match.group(3)
                        reference_match = f"{book} {chapter}:{verse}"
                    
                    # Add follow-up questions
                    if reference_match:
                        followup_suggestions = [
                            f"Would you like to see the translation notes for {reference_match}?",
                            f"Would you like to explore the key terms in {reference_match}?",
                            f"Would you like to learn about the translation challenges in {reference_match}?"
                        ]
                        final_content += f"\n\nWould you like to explore more? {followup_suggestions[0]} {followup_suggestions[1]} Or {followup_suggestions[2].lower()}?"
                    else:
                        followup_suggestions = [
                            "Would you like to see the translation notes for this verse?",
                            "Would you like to explore the key terms in this passage?",
                            "Would you like to learn about the translation challenges here?"
                        ]
                        final_content += f"\n\nWould you like to explore more? {followup_suggestions[0]} {followup_suggestions[1]} Or {followup_suggestions[2].lower()}?"
                
                messages.append({
                    "role": "assistant",
                    "content": final_content
                })
                
                if not quiet:
                    print(f"\nAssistant: {final_content}\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Clean up resources
        await http_client.aclose()  # Close the shared HTTP client
        await mcp_client.close()
        if not quiet:
            print("\n👋 Goodbye!")

if __name__ == "__main__":
    args = parse_args()
    
    # Handle mutually exclusive flags
    if args.quiet:
        verbose = False
        debug = False
    else:
        verbose = args.verbose
        debug = args.debug or args.verbose  # --verbose implies --debug
    
    asyncio.run(main(
        verbose=verbose,
        debug=debug,
        quiet=args.quiet,
        server_url_override=args.server_url
    ))

