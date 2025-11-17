"""
Translation Helps MCP Client

Connects to the Translation Helps MCP server via HTTP (remote).
"""

import json
from typing import Dict, Any, Optional, List
import httpx
from .types import (
    ClientOptions,
    MCPTool,
    MCPPrompt,
    FetchScriptureOptions,
    FetchTranslationNotesOptions,
    FetchTranslationQuestionsOptions,
    FetchTranslationWordOptions,
    FetchTranslationWordLinksOptions,
    FetchTranslationAcademyOptions,
    GetLanguagesOptions,
)

DEFAULT_SERVER_URL = "https://translation-helps-mcp-945.pages.dev/api/mcp"
DEFAULT_TIMEOUT = 30.0


class TranslationHelpsClient:
    """
    Client for connecting to the Translation Helps MCP server.
    
    Example:
        >>> client = TranslationHelpsClient()
        >>> await client.connect()
        >>> scripture = await client.fetch_scripture(reference="John 3:16")
    """

    def __init__(self, options: Optional[ClientOptions] = None):
        """
        Initialize the client.
        
        Args:
            options: Optional client configuration
        """
        options = options or {}
        self.server_url = options.get("serverUrl") or DEFAULT_SERVER_URL
        self.timeout = options.get("timeout") or (DEFAULT_TIMEOUT * 1000)  # Convert to ms
        self.headers = {
            "Content-Type": "application/json",
            **(options.get("headers") or {}),
        }
        self.tools_cache: Optional[List[MCPTool]] = None
        self.prompts_cache: Optional[List[MCPPrompt]] = None
        self.initialized = False
        self._http_client: Optional[httpx.AsyncClient] = None

    async def connect(self) -> None:
        """Initialize connection to the MCP server."""
        if self.initialized:
            return

        try:
            # Create HTTP client
            self._http_client = httpx.AsyncClient(
                timeout=self.timeout / 1000,  # Convert ms to seconds
                headers=self.headers,
            )

            # Initialize the server
            init_response = await self._send_request("initialize")

            if "serverInfo" not in init_response:
                raise ValueError("Invalid server response: missing serverInfo")

            # Cache tools and prompts
            await self._refresh_tools()
            # Prompts may not be supported by all servers - handle gracefully
            try:
                await self._refresh_prompts()
            except Exception as e:
                # If prompts/list is not supported, continue without prompts
                # This allows the SDK to work with servers that only support tools
                self.prompts_cache = []
                if "prompts/list" in str(e) or "500" in str(e):
                    # Server doesn't support prompts - this is okay
                    pass
                else:
                    # Re-raise if it's a different error
                    raise

            self.initialized = True
        except Exception as e:
            raise ConnectionError(
                f"Failed to connect to MCP server: {str(e)}"
            ) from e

    async def close(self) -> None:
        """Close the HTTP client connection."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None
        self.initialized = False

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

    async def _send_request(
        self, method: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send a request to the MCP server."""
        if not self._http_client:
            raise RuntimeError("Client not connected. Call connect() first.")

        payload: Dict[str, Any] = {"method": method}
        if params:
            payload["params"] = params

        try:
            response = await self._http_client.post(
                self.server_url,
                json=payload,
            )
            response.raise_for_status()

            data = response.json()

            # Handle MCP error responses
            if "error" in data:
                raise RuntimeError(
                    data["error"].get("message", "MCP server error")
                )

            return data
        except httpx.HTTPError as e:
            raise ConnectionError(f"HTTP error: {str(e)}") from e

    async def _refresh_tools(self) -> None:
        """Refresh the tools cache."""
        response = await self._send_request("tools/list")
        self.tools_cache = response.get("tools", [])

    async def _refresh_prompts(self) -> None:
        """Refresh the prompts cache."""
        response = await self._send_request("prompts/list")
        self.prompts_cache = response.get("prompts", [])

    async def _ensure_initialized(self) -> None:
        """Ensure the client is initialized."""
        if not self.initialized:
            await self.connect()

    async def list_tools(self) -> List[MCPTool]:
        """List available tools."""
        await self._ensure_initialized()
        if not self.tools_cache:
            await self._refresh_tools()
        return self.tools_cache or []

    async def list_prompts(self) -> List[MCPPrompt]:
        """List available prompts."""
        await self._ensure_initialized()
        if not self.prompts_cache:
            await self._refresh_prompts()
        return self.prompts_cache or []

    async def call_tool(
        self, name: str, arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Call a tool by name."""
        await self._ensure_initialized()
        return await self._send_request("tools/call", {
            "name": name,
            "arguments": arguments,
        })

    async def get_prompt(
        self, name: str, arguments: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Get a prompt template."""
        await self._ensure_initialized()
        return await self._send_request("prompts/get", {
            "name": name,
            "arguments": arguments or {},
        })

    # Convenience methods for common operations

    async def fetch_scripture(
        self, options: FetchScriptureOptions
    ) -> str:
        """Fetch Bible scripture text."""
        response = await self.call_tool("fetch_scripture", {
            "reference": options["reference"],
            "language": options.get("language", "en"),
            "organization": options.get("organization", "unfoldingWord"),
            "format": options.get("format", "text"),
            "includeVerseNumbers": options.get("includeVerseNumbers", True),
        })

        # Extract text from response
        if response.get("content") and response["content"][0].get("text"):
            return response["content"][0]["text"]

        raise ValueError("Invalid response format from fetch_scripture")

    async def fetch_translation_notes(
        self, options: FetchTranslationNotesOptions
    ) -> Dict[str, Any]:
        """Fetch translation notes."""
        response = await self.call_tool("fetch_translation_notes", {
            "reference": options["reference"],
            "language": options.get("language", "en"),
            "organization": options.get("organization", "unfoldingWord"),
            "includeIntro": options.get("includeIntro", True),
            "includeContext": options.get("includeContext", True),
        })

        if response.get("content") and response["content"][0].get("text"):
            return json.loads(response["content"][0]["text"])

        raise ValueError("Invalid response format from fetch_translation_notes")

    async def fetch_translation_questions(
        self, options: FetchTranslationQuestionsOptions
    ) -> Dict[str, Any]:
        """Fetch translation questions."""
        response = await self.call_tool("fetch_translation_questions", {
            "reference": options["reference"],
            "language": options.get("language", "en"),
            "organization": options.get("organization", "unfoldingWord"),
        })

        if response.get("content") and response["content"][0].get("text"):
            return json.loads(response["content"][0]["text"])

        raise ValueError("Invalid response format from fetch_translation_questions")

    async def fetch_translation_word(
        self, options: FetchTranslationWordOptions
    ) -> Dict[str, Any]:
        """Fetch translation word (by term or reference)."""
        response = await self.call_tool("fetch_translation_word", {
            "reference": options.get("reference"),
            "term": options.get("term"),
            "language": options.get("language", "en"),
            "organization": options.get("organization", "unfoldingWord"),
            "category": options.get("category"),
        })

        if response.get("content") and response["content"][0].get("text"):
            return json.loads(response["content"][0]["text"])

        raise ValueError("Invalid response format from fetch_translation_word")

    async def fetch_translation_word_links(
        self, options: FetchTranslationWordLinksOptions
    ) -> Dict[str, Any]:
        """Fetch translation word links."""
        response = await self.call_tool("fetch_translation_word_links", {
            "reference": options["reference"],
            "language": options.get("language", "en"),
            "organization": options.get("organization", "unfoldingWord"),
        })

        if response.get("content") and response["content"][0].get("text"):
            return json.loads(response["content"][0]["text"])

        raise ValueError("Invalid response format from fetch_translation_word_links")

    async def fetch_translation_academy(
        self, options: FetchTranslationAcademyOptions
    ) -> Any:
        """Fetch translation academy articles."""
        response = await self.call_tool("fetch_translation_academy", {
            "reference": options.get("reference"),
            "rcLink": options.get("rcLink"),
            "moduleId": options.get("moduleId"),
            "path": options.get("path"),
            "language": options.get("language", "en"),
            "organization": options.get("organization", "unfoldingWord"),
            "format": options.get("format", "json"),
        })

        if response.get("content") and response["content"][0].get("text"):
            text = response["content"][0]["text"]
            if options.get("format") == "markdown":
                return text
            return json.loads(text)

        raise ValueError("Invalid response format from fetch_translation_academy")

    async def get_languages(
        self, options: Optional[GetLanguagesOptions] = None
    ) -> Dict[str, Any]:
        """Get available languages."""
        options = options or {}
        response = await self.call_tool("get_languages", {
            "organization": options.get("organization"),
        })

        if response.get("content") and response["content"][0].get("text"):
            return json.loads(response["content"][0]["text"])

        raise ValueError("Invalid response format from get_languages")

    async def get_system_prompt(
        self, include_implementation_details: bool = False
    ) -> str:
        """Get system prompt."""
        response = await self.call_tool("get_system_prompt", {
            "includeImplementationDetails": include_implementation_details,
        })

        if response.get("content") and response["content"][0].get("text"):
            return response["content"][0]["text"]

        raise ValueError("Invalid response format from get_system_prompt")

    def is_connected(self) -> bool:
        """Check if client is initialized."""
        return self.initialized

