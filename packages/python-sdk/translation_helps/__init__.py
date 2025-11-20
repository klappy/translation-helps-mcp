"""
Translation Helps MCP Client SDK

Official Python client for connecting to the Translation Helps MCP server.

Core Functionality:
- TranslationHelpsClient: MCP protocol client for tools, prompts, and resources
- All MCP protocol methods (list_tools, list_prompts, call_tool, get_prompt, etc.)

Optional Adapter Utilities:
- Adapter functions in adapters module are OPTIONAL convenience helpers
- Use them if you want provider-specific conversions, or write your own logic
- Core client works with any MCP-compatible interface (Claude Desktop, Cursor, etc.)
"""

from .client import TranslationHelpsClient
from .types import (
    ClientOptions,
    FetchScriptureOptions,
    FetchTranslationNotesOptions,
    FetchTranslationQuestionsOptions,
    FetchTranslationWordOptions,
    FetchTranslationWordLinksOptions,
    FetchTranslationAcademyOptions,
    GetLanguagesOptions,
    MCPTool,
    MCPPrompt,
)
from .adapters import (
    convert_tools_to_openai,
    convert_prompts_to_openai,
    convert_tools_to_anthropic,
    convert_all_to_openai,
    provider_supports_prompts,
    get_prompt_strategy,
    detect_prompts_support_from_client,
    prepare_tools_for_provider,
)
from .prompts import (
    get_system_prompt,
    detect_request_type,
    RequestType,
)

__version__ = "1.2.0"
__all__ = [
    "TranslationHelpsClient",
    "ClientOptions",
    "FetchScriptureOptions",
    "FetchTranslationNotesOptions",
    "FetchTranslationQuestionsOptions",
    "FetchTranslationWordOptions",
    "FetchTranslationWordLinksOptions",
    "FetchTranslationAcademyOptions",
    "GetLanguagesOptions",
    "MCPTool",
    "MCPPrompt",
    "convert_tools_to_openai",
    "convert_prompts_to_openai",
    "convert_tools_to_anthropic",
    "convert_all_to_openai",
    "provider_supports_prompts",
    "get_prompt_strategy",
    "detect_prompts_support_from_client",
    "prepare_tools_for_provider",
    "get_system_prompt",
    "detect_request_type",
    "RequestType",
]

