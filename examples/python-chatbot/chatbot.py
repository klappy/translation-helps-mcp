import asyncio
import os
import json
from dotenv import load_dotenv
from openai import OpenAI
from translation_helps import TranslationHelpsClient

# Load environment variables
load_dotenv()

async def main():
    # Initialize clients
    # Use production server by default, allow override via environment variable
    server_url = os.getenv("MCP_SERVER_URL", "https://translation-helps-mcp-945.pages.dev/api/mcp")
    mcp_client = TranslationHelpsClient({
        "serverUrl": server_url
    })
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    try:
        # Connect to MCP server
        await mcp_client.connect()
        print("✅ Connected to Translation Helps MCP server")
        
        # Get available tools
        tools = await mcp_client.list_tools()
        print(f"✅ Found {len(tools)} available tools")
        
        # Convert MCP tools to OpenAI format
        openai_tools = []
        for tool in tools:
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get("inputSchema", {})
                }
            })
        
        # Chat loop
        messages = [
            {
                "role": "system",
                "content": """You are a helpful assistant that answers questions about Bible translation using ONLY the Translation Helps resources from the MCP server.

CRITICAL RULES:
1. You MUST use the available tools to fetch information before answering any question
2. You can ONLY provide answers based on the actual tool responses you receive
3. If a tool call returns empty results, fails, or returns an error, you MUST respond that you could not find the requested information
4. NEVER make up or guess information - only use what is provided in the tool responses
5. If no tools are called or all tool calls fail/return empty, you MUST say: "I'm sorry, I couldn't find that information in the Translation Helps resources."

Use the available tools to fetch scripture, translation notes, questions, and word definitions when needed."""
            }
        ]
        
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
                tool_choice="auto"
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
                    
                    # If still no tool calls, just print the response
                    if not assistant_message.tool_calls:
                        print(f"\nAssistant: {assistant_message.content}\n")
                else:
                    # Not a Bible-related question, just print the response
                    print(f"\nAssistant: {assistant_message.content}\n")
            
            # Execute tool calls
            if assistant_message.tool_calls:
                print("\n🔧 Executing tool calls...")
                for tool_call in assistant_message.tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)  # Parse JSON string
                    
                    print(f"  → Calling {tool_name}...")
                    
                    try:
                        # Call tool via MCP SDK
                        result = await mcp_client.call_tool(tool_name, tool_args)
                        
                        # Extract text from result
                        # Match the format used in the SDK's convenience methods
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
                            # Debug: print what we got
                            print(f"  ⚠️  {tool_name} returned no data")
                            print(f"  Debug - Result keys: {list(result.keys())}")
                            print(f"  Debug - Content: {result.get('content')}")
                            tool_result_text = "[NO_DATA] The tool returned no information. This means the requested data was not found in the Translation Helps resources."
                        else:
                            print(f"  ✅ {tool_name} completed ({len(tool_result_text)} chars)")
                            # Debug: show first 100 chars of result
                            print(f"  Debug - First 100 chars: {tool_result_text[:100]}...")
                        
                        # Add tool result to messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": tool_name,
                            "content": tool_result_text
                        })
                    except Exception as e:
                        error_msg = f"[ERROR] The tool call failed: {str(e)}. This means the requested information could not be retrieved from the Translation Helps resources."
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": tool_name,
                            "content": error_msg
                        })
                        print(f"  ❌ {tool_name} failed: {str(e)}")
                
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
                
                final_response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages
                )
                
                final_message = final_response.choices[0].message
                messages.append({
                    "role": "assistant",
                    "content": final_message.content
                })
                
                print(f"\nAssistant: {final_message.content}\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await mcp_client.close()
        print("\n👋 Goodbye!")

if __name__ == "__main__":
    asyncio.run(main())

