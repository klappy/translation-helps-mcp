"""
Basic usage example for Translation Helps MCP Client

This example shows the correct MCP flow:
1. AI receives user query + available tools
2. AI decides which tools to call
3. Client executes tool calls via MCP server
4. Tool results fed back to AI
5. AI provides final answer
"""

import asyncio
from translation_helps import TranslationHelpsClient
# Import your AI provider's SDK
# from anthropic import Anthropic
# from openai import OpenAI


async def main():
    # Create MCP client
    mcp_client = TranslationHelpsClient({
        "serverUrl": "https://translation-helps-mcp-945.pages.dev/api/mcp"
    })

    try:
        # Connect to MCP server and get available tools and prompts
        print("Connecting to MCP server...")
        await mcp_client.connect()
        
        tools = await mcp_client.list_tools()
        prompts = await mcp_client.list_prompts()
        print(f"✅ Connected! Available tools: {', '.join(t['name'] for t in tools)}")
        print(f"✅ Available prompts: {', '.join(p['name'] for p in prompts)}\n")

        # Convert MCP tools to your AI provider's format
        # Each provider has different formats - refer to their documentation
        available_tools = [{
            "name": tool["name"],
            "description": tool.get("description"),
            "input_schema": tool.get("inputSchema"),
            # Adapt this format to match your provider's requirements
        } for tool in tools]
        
        # Note: Prompts are typically used differently - they provide instructions/templates
        # Some AI providers support prompts as a separate feature, others integrate them as tools
        # Refer to your provider's documentation for how to use prompts

        # Initialize your AI provider's client
        # ai_client = YourAIProvider(api_key=os.getenv("YOUR_API_KEY"))

        # User's question
        user_query = "What does John 3:16 say and what are the key translation considerations?"

        print(f"User query: {user_query}\n")

        # Send query to AI with available tools
        # The AI will decide which tools to call
        messages = [
            {"role": "user", "content": user_query}
        ]

        # Call your AI provider's API with tools
        # Refer to your provider's documentation for the exact API call format
        # Example pattern:
        # response = await ai_client.messages.create(
        #     model="your-model",
        #     messages=messages,
        #     tools=available_tools
        # )

        # Handle your provider's response format
        # Different providers return tool calls differently:
        # - Anthropic: response.content with tool_use items
        # - OpenAI: response.choices[0].message.tool_calls
        # - Others: Check their documentation

        # When your AI requests a tool call:
        # for tool_call in <extract_tool_calls_from_response>:
        #     tool_name = tool_call.name  # or tool_call.function.name (provider-dependent)
        #     tool_args = tool_call.input  # or tool_call.function.arguments (provider-dependent)
        #     
        #     print(f"\\n🔧 AI requested tool: {tool_name}")
        #     
        #     # Execute tool call via MCP server (this is where the SDK helps!)
        #     try:
        #         result = await mcp_client.call_tool(tool_name, tool_args)
        #         
        #         # Extract text from tool result
        #         tool_result_text = ""
        #         if result.get("content"):
        #             for item in result["content"]:
        #                 if item.get("type") == "text":
        #                     tool_result_text += item.get("text", "")
        #         
        #         print(f"✅ Tool result received ({len(tool_result_text)} chars)")
        #         
        #         # Add tool result back to your AI provider's conversation format
        #         # Format depends on your provider - refer to their documentation
        #         messages.append({
        #             "role": "assistant",
        #             "content": <format_assistant_message_with_tool_call>
        #         })
        #         messages.append({
        #             "role": "user",  # or "tool" for some providers
        #             "content": <format_tool_result_for_provider>
        #         })
        #         
        #         # Get AI's response with the tool data
        #         # response = await ai_client.messages.create(...)
        #         # Extract final text from response
        #         
        #     except Exception as e:
        #         print(f"❌ Tool execution error: {e}")

        print("\n📝 Note: This is a template example.")
        print("Uncomment and adapt the code above for your AI provider.")
        print("The key is: AI decides → SDK executes → AI responds")

        # Clean up
        await mcp_client.close()
    except Exception as e:
        print(f"Error: {e}")
        await mcp_client.close()
        raise


if __name__ == "__main__":
    asyncio.run(main())

