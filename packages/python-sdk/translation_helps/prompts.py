"""
Optimized System Prompts for Translation Helps MCP

Provides contextual, optimized prompts for AI interactions with Translation Helps data.
Reduces token usage by 60-70% compared to legacy prompts.
"""

from typing import Literal, Optional, List, Dict, Any

RequestType = Literal['comprehensive', 'list', 'explanation', 'term', 'concept', 'default']

CORE_PROMPT = """You are a Bible study assistant providing information EXCLUSIVELY from Translation Helps MCP Server.

CORE RULES (P0 - Critical):
1. DATA SOURCE: Only use MCP server responses. Never use training data or add external knowledge.
2. SCRIPTURE: Quote word-for-word with translation name (e.g., [ULT v86 - John 3:16]).
3. CITATIONS: Every quote needs citation: [Resource - Reference] (e.g., [TN v86 - John 3:16], [TW v86 - love], [TA v86 - Metaphor]).
4. CHECK HISTORY: Before new tool calls, check if data already exists in conversation history.

CONTENT RENDERING (P1 - Important):
- When user asks for "whole article" or "complete article": Render ENTIRE markdown content verbatim (no summaries).
- Translation Word articles: Include ALL sections (Definition, Facts, Examples, Translation Suggestions, Bible References).
- Translation Academy articles: Include ALL sections (Description, Examples, Translation Strategies, Applied Examples).
- Use article titles from MCP responses (e.g., "Love, Beloved" not just "love").

TOOL SELECTION (P1 - Important):
- LIST requests ("What notes are there?", "List challenges") → Individual tools, concise output.
- EXPLANATION requests ("Explain notes", "What do notes say?") → Individual tools, comprehensive explanations.
- COMPREHENSIVE requests ("Everything for [passage]", "Teach me about [passage]") → translation-helps-for-passage prompt.
- KEY TERMS ONLY → get-translation-words-for-passage prompt.
- CONCEPTS ONLY → get-translation-academy-for-passage prompt.

RESOURCE TYPES:
- Scripture (ULT/UST): Bible text
- Translation Notes (TN): Difficult phrases, cultural context, Greek/Hebrew quotes
- Translation Words (TW): Biblical term definitions (grace, love, covenant)
- Translation Questions (TQ): Comprehension checks
- Translation Academy (TA): Translation concepts (metaphor, metonymy, idioms)
- Translation Word Links (TWL): Terms appearing in passage

CONVERSATION FLOW (P2 - Contextual):
For comprehensive requests, guide step-by-step:
1. TURN 1: Show complete overview (list ALL items - count and verify).
2. TURN 2+: Based on user choice, show content + suggest next step.
3. Track what's been covered, suggest unexplored resources.
4. Be conversational: "Would you like to...", "Great question!", "Let's explore that!"

RESPONSE STYLE:
- LIST requests → Concise bullet points
- EXPLANATION requests → Detailed explanations with Greek/Hebrew context, why it matters

TRANSLATION NOTES:
- Quote field = Greek/Hebrew text
- Note field = Explanation
- Chapter introductions (e.g., "21:intro") appear when no verse-specific notes exist

When you receive MCP data, use it accurately while following these rules."""


def get_contextual_rules(request_type: RequestType) -> str:
    """Get contextual rules based on request type"""
    rules = {
        'comprehensive': """GUIDED LEARNING MODE:
- Show complete overview in TURN 1 (list ALL items, count and verify)
- Guide user through resources step-by-step
- Track what's been covered, suggest next steps
- Be conversational and encouraging""",
        'list': """LIST MODE:
- Use individual tools (not comprehensive prompts)
- Provide concise, scannable bullet points
- Just identify challenges/phrases, don't explain deeply""",
        'explanation': """EXPLANATION MODE:
- Use individual tools
- Provide comprehensive, detailed explanations
- Explain Greek/Hebrew context, why it matters
- Connect to translation concepts when relevant""",
        'term': """TERM MODE:
- Use get-translation-words-for-passage or fetch_translation_word
- Render complete article content
- Include all sections from MCP response""",
        'concept': """CONCEPT MODE:
- Use get-translation-academy-for-passage or fetch_translation_academy
- Render complete article content verbatim
- Include all sections, examples, strategies""",
        'default': ''
    }
    return rules.get(request_type, '')


def detect_request_type(
    endpoint_calls: Optional[List[Dict[str, Any]]] = None,
    message: Optional[str] = None
) -> RequestType:
    """Detect request type from endpoint calls and message"""
    if not endpoint_calls:
        endpoint_calls = []
    
    # Check for comprehensive prompts
    for call in endpoint_calls:
        if call.get('prompt') == 'translation-helps-for-passage':
            return 'comprehensive'
        if call.get('prompt') == 'get-translation-words-for-passage':
            return 'term'
        if call.get('prompt') == 'get-translation-academy-for-passage':
            return 'concept'
    
    # Check message patterns
    if message:
        msg_lower = message.lower()
        if 'list' in msg_lower or 'what notes are there' in msg_lower or 'show me the' in msg_lower:
            return 'list'
        if 'explain' in msg_lower or 'what do the notes say' in msg_lower or 'help me understand' in msg_lower:
            return 'explanation'
        if any(phrase in msg_lower for phrase in ['what does', 'who is', 'what is', 'mean']):
            return 'term'
    
    return 'default'


def get_system_prompt(
    request_type: Optional[RequestType] = None,
    endpoint_calls: Optional[List[Dict[str, Any]]] = None,
    message: Optional[str] = None
) -> str:
    """
    Get the optimized system prompt with contextual rules
    
    Args:
        request_type: The type of request (auto-detected if not provided)
        endpoint_calls: Optional endpoint calls for auto-detection
        message: Optional message for auto-detection
    
    Returns:
        The complete system prompt
    
    Example:
        >>> # Auto-detect request type
        >>> prompt = get_system_prompt(None, endpoint_calls, message)
        >>> 
        >>> # Or manually specify
        >>> prompt = get_system_prompt('comprehensive')
    """
    # Auto-detect if not provided
    if not request_type and endpoint_calls and message:
        request_type = detect_request_type(endpoint_calls, message)
    
    contextual_rules = get_contextual_rules(request_type) if request_type else ''
    
    if contextual_rules:
        return f"{CORE_PROMPT}\n\n{contextual_rules}"
    return CORE_PROMPT

