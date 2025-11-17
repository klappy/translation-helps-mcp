#!/usr/bin/env python
"""Test SDK by calling a tool directly without full connection"""
import asyncio
import sys
import os

try:
    from translation_helps import TranslationHelpsClient
except ImportError as e:
    print(f"ERROR: Import Error: {e}")
    print("Please install: pip install translation-helps-mcp-client")
    sys.exit(1)

async def test_direct_tool():
    """Test SDK by calling a tool directly"""
    print("Testing Translation Helps Python SDK (Direct Tool Call)...\n")
    
    # Initialize client
    server_url = os.getenv("MCP_SERVER_URL", "https://translation-helps-mcp.pages.dev/api/mcp")
    client = TranslationHelpsClient({
        "serverUrl": server_url
    })
    
    try:
        # Try to call a tool directly without full connection
        print(f"1. Testing direct tool call to: {server_url}")
        print("   Calling fetch_scripture for John 3:16...\n")
        
        # Try calling the tool endpoint directly
        result = await client.call_tool("fetch_scripture", {
            "reference": "John 3:16",
            "language": "en",
            "format": "text"
        })
        
        if result.get("content"):
            text_content = ""
            for item in result["content"]:
                if item.get("type") == "text":
                    text_content += item.get("text", "")
            
            if text_content:
                print("   ✅ Tool call successful!")
                print(f"   Response length: {len(text_content)} characters")
                print(f"   Preview: {text_content[:200]}...\n")
                print("✅ SDK is working correctly!")
                return True
            else:
                print("   ⚠️  Tool call returned empty text content")
                print(f"   Response structure: {list(result.keys())}\n")
        else:
            print(f"   ⚠️  Tool call response missing 'content' field")
            print(f"   Response keys: {list(result.keys())}\n")
            print(f"   Full response: {result}\n")
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await client.close()

if __name__ == "__main__":
    success = asyncio.run(test_direct_tool())
    sys.exit(0 if success else 1)

