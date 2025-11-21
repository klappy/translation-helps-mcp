"""
Optional Adapter Utilities for Converting MCP Tools and Prompts to AI Provider Formats.

⚠️ NOTE: This module contains OPTIONAL utilities. The core TranslationHelpsClient
provides MCP protocol functionality only. These adapters are convenience helpers for
users who want to integrate MCP tools/prompts with specific AI providers.

You can use these adapters, write your own conversion logic, or use MCP tools/prompts
directly if your provider supports MCP natively (e.g., Claude Desktop, Cursor).

This module provides utilities to convert MCP (Model Context Protocol) tools and prompts
into formats compatible with various AI providers like OpenAI, Anthropic, etc.

Provider Support for MCP Prompts:

**MCP-Compatible Interfaces (Native Support):**
- ✅ Claude Desktop: Native support via MCP protocol (prompts/list, prompts/get)
- ✅ Cursor: Native support via MCP protocol (prompts/list, prompts/get)
- ✅ OpenAI Agents SDK: Native support via `server.get_prompt()` method
  See: https://openai.github.io/openai-agents-python/mcp/#prompts

**Direct API Calls (No Native Support):**
- ❌ OpenAI Chat Completions API (openai package): No native support (must convert prompts to tools)
- ❌ Anthropic API (direct SDK): No native support (must use prompts/get to get instructions)

**Important Distinction:**
- `openai-agents`: Uses OpenAI Agents SDK (`agents` package) - supports MCP prompts natively
- `openai`: Uses direct Chat Completions API (`openai` package) - does NOT support MCP prompts

**Dynamic Detection:**
Instead of hardcoding provider names, you can use `detect_prompts_support_from_client()`
to check if the MCP server actually supports prompts by attempting to list them.
This works regardless of which provider you're using.
"""

from typing import List, Dict, Any, Literal, Optional
from .types import MCPTool, MCPPrompt

# Provider types
ProviderType = Literal["openai", "openai-agents", "anthropic", "claude-desktop", "cursor", "generic"]


def convert_tools_to_openai(tools: List[MCPTool]) -> List[Dict[str, Any]]:
    """
    Convert MCP tools to OpenAI function calling format.
    
    Args:
        tools: List of MCP tools from list_tools()
        
    Returns:
        List of OpenAI-compatible tool definitions
        
    Example:
        >>> tools = await client.list_tools()
        >>> openai_tools = convert_tools_to_openai(tools)
        >>> response = openai_client.chat.completions.create(
        ...     model="gpt-4",
        ...     messages=messages,
        ...     tools=openai_tools
        ... )
    """
    return [
        {
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool.get("description", ""),
                "parameters": tool.get("inputSchema", {}),
            }
        }
        for tool in tools
    ]


def convert_prompts_to_openai(
    prompts: List[MCPPrompt],
    prefix: str = "prompt_"
) -> List[Dict[str, Any]]:
    """
    Optional utility: Convert MCP prompts to OpenAI function calling format.
    
    ⚠️ This is an OPTIONAL utility. You can use this, write your own conversion,
    or use MCP prompts directly if your provider supports MCP natively.
    
    ⚠️ NOTE: This is a WORKAROUND because OpenAI doesn't support MCP prompts natively.
    
    MCP prompts are designed to return instructional messages (via `prompts/get`) that
    guide the AI to chain multiple tool calls. However, since OpenAI's API only supports
    function calling (tools), not MCP prompts, this function converts prompts into tools
    so they can be invoked via function calling.
    
    The converted prompts will execute via a custom `/api/execute-prompt` endpoint (not
    standard MCP `prompts/get`), which actually runs the workflow and returns results.
    
    For the "correct" MCP approach, use `client.get_prompt()` to retrieve prompt
    instructions and inject them into your conversation messages instead.
    
    Args:
        prompts: List of MCP prompts from list_prompts()
        prefix: Prefix to add to prompt names to distinguish them from tools.
                Default is "prompt_"
        
    Returns:
        List of OpenAI-compatible tool definitions
        
    Example (Workaround approach - converting to tools):
        >>> prompts = await client.list_prompts()
        >>> openai_prompts = convert_prompts_to_openai(prompts)
        >>> openai_tools.extend(openai_prompts)
    
    Example (Correct MCP approach - using prompt instructions):
        >>> prompt_response = await client.get_prompt("translation-helps-for-passage", {"reference": "John 3:16"})
        >>> # Add prompt_response["messages"] to your conversation
        >>> # AI will read instructions and make tool calls naturally
    """
    openai_tools = []
    
    for prompt in prompts:
        # Build parameters schema from prompt arguments
        properties = {}
        required = []
        
        if prompt.get("arguments"):
            for arg in prompt["arguments"]:
                arg_name = arg.get("name", "")
                if arg_name:
                    properties[arg_name] = {
                        "type": arg.get("type", "string"),
                        "description": arg.get("description", "")
                    }
                    if arg.get("required", False):
                        required.append(arg_name)
        
        openai_tools.append({
            "type": "function",
            "function": {
                "name": f"{prefix}{prompt['name']}",
                "description": prompt.get(
                    "description",
                    f"Execute the {prompt['name']} prompt"
                ),
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required
                }
            }
        })
    
    return openai_tools


def convert_tools_to_anthropic(tools: List[MCPTool]) -> List[Dict[str, Any]]:
    """
    Optional utility: Convert MCP tools to Anthropic Claude format.
    
    ⚠️ This is an OPTIONAL utility. You can use this, write your own conversion,
    or use MCP tools directly if your provider supports MCP natively.
    
    Args:
        tools: List of MCP tools from list_tools()
        
    Returns:
        List of Anthropic-compatible tool definitions
        
    Example:
        >>> tools = await client.list_tools()
        >>> anthropic_tools = convert_tools_to_anthropic(tools)
        >>> response = anthropic_client.messages.create(
        ...     model="claude-3-opus-20240229",
        ...     messages=messages,
        ...     tools=anthropic_tools
        ... )
    """
    return [
        {
            "name": tool["name"],
            "description": tool.get("description", ""),
            "input_schema": tool.get("inputSchema", {}),
        }
        for tool in tools
    ]


def convert_all_to_openai(
    tools: List[MCPTool],
    prompts: List[MCPPrompt],
    prompt_prefix: str = "prompt_"
) -> List[Dict[str, Any]]:
    """
    Optional utility: Convert both MCP tools and prompts to OpenAI format in a single call.
    
    ⚠️ This is an OPTIONAL utility. You can use this, write your own conversion,
    or use MCP tools/prompts directly if your provider supports MCP natively.
    
    ⚠️ NOTE: This converts prompts to tools as a workaround. See convert_prompts_to_openai()
    documentation for details on why this is necessary and the alternative approach.
    
    This is a convenience function that combines convert_tools_to_openai()
    and convert_prompts_to_openai().
    
    Args:
        tools: List of MCP tools from list_tools()
        prompts: List of MCP prompts from list_prompts()
        prompt_prefix: Prefix to add to prompt names. Default is "prompt_"
        
    Returns:
        Combined list of OpenAI-compatible tool definitions
        
    Example:
        >>> tools = await client.list_tools()
        >>> prompts = await client.list_prompts()
        >>> all_tools = convert_all_to_openai(tools, prompts)
        >>> response = openai_client.chat.completions.create(
        ...     model="gpt-4",
        ...     messages=messages,
        ...     tools=all_tools
        ... )
    """
    openai_tools = convert_tools_to_openai(tools)
    openai_prompts = convert_prompts_to_openai(prompts, prefix=prompt_prefix)
    return openai_tools + openai_prompts


def provider_supports_prompts(provider: ProviderType) -> bool:
    """
    Check if a provider supports MCP prompts natively.
    
    Providers that support prompts natively can use `prompts/list` and `prompts/get`
    directly without converting prompts to tools.
    
    Args:
        provider: The AI provider type
        
    Returns:
        True if the provider supports MCP prompts natively, False otherwise
        
    Example:
        >>> if provider_supports_prompts("claude-desktop"):
        ...     # Use prompts natively
        ...     prompt = await client.get_prompt("translation-helps-for-passage", {...})
        ... else:
        ...     # Convert prompts to tools
        ...     tools = convert_all_to_openai(tools, prompts)
    
    Note:
        - "openai-agents" uses OpenAI Agents SDK which supports prompts natively
        - "openai" uses direct Chat Completions API which does NOT support prompts
        See: https://openai.github.io/openai-agents-python/mcp/#prompts
    """
    # Providers that support MCP prompts natively via the MCP protocol
    native_support = {"claude-desktop", "cursor", "openai-agents"}
    
    # Providers that don't support prompts natively (must convert to tools)
    no_support = {"openai", "anthropic"}
    
    if provider in native_support:
        return True
    elif provider in no_support:
        return False
    else:
        # Generic/unknown providers - assume no support unless proven otherwise
        return False


async def detect_prompts_support_from_client(client) -> bool:
    """
    Dynamically detect if prompts are supported by checking the MCP client.
    
    This is a more dynamic approach than hardcoding provider names. It checks
    if the MCP server actually supports prompts by attempting to list them.
    This works regardless of which AI provider you're using.
    
    Note: This checks if the MCP SERVER supports prompts, not the AI provider.
    Even if the server supports prompts, you may still need to convert them
    to tools if you're using direct API calls (OpenAI/Anthropic SDKs) instead
    of an MCP-compatible interface (Claude Desktop/Cursor).
    
    Args:
        client: A TranslationHelpsClient instance (must be connected)
        
    Returns:
        True if the MCP server supports prompts, False otherwise
        
    Example:
        >>> from translation_helps import TranslationHelpsClient, detect_prompts_support_from_client
        >>> client = TranslationHelpsClient()
        >>> await client.connect()
        >>> 
        >>> # Check if server supports prompts
        >>> if await detect_prompts_support_from_client(client):
        ...     # Server supports prompts
        ...     # If using MCP interface (Claude Desktop/Cursor), use natively:
        ...     prompts = await client.list_prompts()
        ...     # If using direct API (OpenAI SDK), convert to tools:
        ...     tools = convert_all_to_openai(tools, prompts)
    """
    try:
        # Check if client has the method (it's an MCP client)
        if hasattr(client, 'check_prompts_support'):
            return await client.check_prompts_support()
        # Fallback: try to list prompts directly
        if hasattr(client, 'list_prompts'):
            await client.list_prompts()
            return True
    except Exception:
        return False
    return False


def get_prompt_strategy(
    provider: ProviderType,
    tools: List[MCPTool],
    prompts: List[MCPPrompt]
) -> Dict[str, Any]:
    """
    Determine the best strategy for handling prompts based on provider capabilities.
    
    Returns a dictionary with:
    - "supports_prompts": Whether provider supports prompts natively
    - "convert_prompts_to_tools": Whether prompts should be converted to tools
    - "tools": List of tools to use (may include converted prompts)
    - "prompts": List of prompts to use natively (if supported)
    - "recommendation": Suggested approach for using prompts
    
    Args:
        provider: The AI provider type
        tools: List of MCP tools
        prompts: List of MCP prompts
        
    Returns:
        Dictionary with strategy information
        
    Example:
        >>> strategy = get_prompt_strategy("openai", tools, prompts)
        >>> if strategy["convert_prompts_to_tools"]:
        ...     all_tools = strategy["tools"]  # Includes converted prompts
        >>> else:
        ...     native_tools = strategy["tools"]
        ...     native_prompts = strategy["prompts"]
    
    Note:
        - "openai-agents" supports prompts natively via `server.get_prompt()`
        - "openai" (Chat Completions API) requires converting prompts to tools
    """
    supports_native = provider_supports_prompts(provider)
    
    if supports_native:
        # Provider supports prompts natively - use them as-is
        if provider == "openai-agents":
            # OpenAI Agents SDK - use server.get_prompt() method
            return {
                "supports_prompts": True,
                "convert_prompts_to_tools": False,
                "tools": tools,  # Keep as MCP tools - Agents SDK handles MCP protocol
                "prompts": prompts,  # Use prompts natively via server.get_prompt()
                "recommendation": "Use prompts natively via server.get_prompt() method. See: https://openai.github.io/openai-agents-python/mcp/#prompts"
            }
        else:
            # Other MCP-compatible interfaces (Claude Desktop, Cursor)
            return {
                "supports_prompts": True,
                "convert_prompts_to_tools": False,
                "tools": tools,  # Keep as MCP tools - provider handles MCP protocol
                "prompts": prompts,  # Use prompts natively
                "recommendation": "Use prompts natively via client.get_prompt() and inject messages into conversation"
            }
    else:
        # Provider doesn't support prompts - convert them to tools
        if provider == "openai":
            converted_tools = convert_all_to_openai(tools, prompts)
        elif provider == "anthropic":
            # Convert tools to Anthropic format, prompts to tools
            anthropic_tools = convert_tools_to_anthropic(tools)
            openai_prompts = convert_prompts_to_openai(prompts)
            # Anthropic uses same format as OpenAI for function calling
            converted_tools = anthropic_tools + openai_prompts
        else:
            # Generic provider - convert to OpenAI format as default
            converted_tools = convert_all_to_openai(tools, prompts)
        
        return {
            "supports_prompts": False,
            "convert_prompts_to_tools": True,
            "tools": converted_tools,
            "prompts": [],  # Don't use prompts natively
            "recommendation": "Prompts converted to tools. Use the returned 'tools' list with your provider."
        }


def prepare_tools_for_provider(
    provider: ProviderType,
    tools: List[MCPTool],
    prompts: List[MCPPrompt]
) -> List[Dict[str, Any]]:
    """
    Optional convenience helper: Prepare MCP tools and prompts for use with a specific AI provider.
    
    ⚠️ This is an OPTIONAL utility. You can use this, write your own conversion logic,
    or use MCP tools/prompts directly if your provider supports MCP natively.
    
    This is a declarative helper that automatically handles conversion based on
    provider capabilities. It's a convenience wrapper around get_prompt_strategy().
    
    For full control, use the low-level conversion functions directly:
    - convert_tools_to_openai()
    - convert_prompts_to_openai()
    - convert_all_to_openai()
    
    Args:
        provider: The AI provider type
        tools: List of MCP tools from client.list_tools()
        prompts: List of MCP prompts from client.list_prompts()
        
    Returns:
        List of tools ready to use with the provider (may include converted prompts)
        
    Example:
        >>> # Optional: Use convenience helper
        >>> tools = await client.list_tools()
        >>> prompts = await client.list_prompts()
        >>> openai_tools = prepare_tools_for_provider("openai", tools, prompts)
        >>> response = openai_client.chat.completions.create(
        ...     model="gpt-4",
        ...     messages=messages,
        ...     tools=openai_tools
        ... )
        
        >>> # Alternative: Use low-level functions for more control
        >>> openai_tools = convert_all_to_openai(tools, prompts)
        
        >>> # Alternative: Write your own conversion logic
        >>> # (MCP tools/prompts are just dictionaries - convert as needed)
    """
    strategy = get_prompt_strategy(provider, tools, prompts)
    return strategy["tools"]

