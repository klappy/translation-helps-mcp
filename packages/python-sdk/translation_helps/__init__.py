"""
Translation Helps MCP Client SDK

Official Python client for connecting to the Translation Helps MCP server.
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

__version__ = "1.0.0"
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
]

