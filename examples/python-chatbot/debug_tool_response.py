#!/usr/bin/env python
"""Debug script to see the actual tool response format"""
import asyncio
import json
from translation_helps import TranslationHelpsClient

async def test():
    client = TranslationHelpsClient({
        "serverUrl": "https://translation-helps-mcp-945.pages.dev/api/mcp"
    })
    
    try:
        await client.connect()
        print("Connected!\n")
        
        result = await client.call_tool("fetch_scripture", {
            "reference": "John 3:16",
            "language": "en",
            "format": "text"
        })
        
        print("Full result:")
        print(json.dumps(result, indent=2))
        print("\n" + "="*60)
        print("Result keys:", list(result.keys()))
        print("Content type:", type(result.get("content")))
        print("Content:", result.get("content"))
        
        # Try to extract text
        tool_result_text = ""
        if result.get("content"):
            content_items = result["content"]
            if not isinstance(content_items, list):
                content_items = [content_items]
            
            for item in content_items:
                print(f"\nItem type: {type(item)}")
                print(f"Item: {item}")
                if isinstance(item, dict):
                    if item.get("type") == "text":
                        tool_result_text += item.get("text", "")
                    elif "text" in item:
                        tool_result_text += str(item.get("text", ""))
                elif isinstance(item, str):
                    tool_result_text += item
        
        print("\n" + "="*60)
        print(f"Extracted text length: {len(tool_result_text)}")
        print(f"Extracted text (first 200 chars): {tool_result_text[:200]}")
        
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(test())

