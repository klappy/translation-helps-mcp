"""
Comprehensive test suite for Translation Helps MCP Python SDK
Tests all major functionality before PyPI publication
"""
import asyncio
import sys
from translation_helps import TranslationHelpsClient

async def test_connection():
    """Test basic connection"""
    print("=" * 60)
    print("TEST 1: Connection")
    print("=" * 60)
    client = TranslationHelpsClient({
        "serverUrl": "https://translation-helps-mcp-945.pages.dev/api/mcp"
    })
    try:
        await client.connect()
        print("✅ Connection successful")
        return client
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        raise

async def test_list_tools(client):
    """Test listing tools"""
    print("\n" + "=" * 60)
    print("TEST 2: List Tools")
    print("=" * 60)
    try:
        tools = await client.list_tools()
        print(f"✅ Found {len(tools)} tools")
        tool_names = [t["name"] for t in tools]
        print(f"   Tools: {', '.join(tool_names[:5])}...")
        assert len(tools) > 0, "No tools found"
        return tools
    except Exception as e:
        print(f"❌ List tools failed: {e}")
        raise

async def test_list_prompts(client):
    """Test listing prompts"""
    print("\n" + "=" * 60)
    print("TEST 3: List Prompts")
    print("=" * 60)
    try:
        prompts = await client.list_prompts()
        print(f"✅ Found {len(prompts)} prompts")
        prompt_names = [p["name"] for p in prompts]
        print(f"   Prompts: {', '.join(prompt_names)}")
        return prompts
    except Exception as e:
        print(f"❌ List prompts failed: {e}")
        raise

async def test_fetch_scripture(client):
    """Test fetching scripture"""
    print("\n" + "=" * 60)
    print("TEST 4: Fetch Scripture")
    print("=" * 60)
    try:
        scripture = await client.fetch_scripture({
            "reference": "John 3:16",
            "language": "en"
        })
        print(f"✅ Scripture fetched successfully")
        print(f"   Length: {len(scripture)} characters")
        print(f"   Preview: {scripture[:100]}...")
        assert len(scripture) > 0, "Scripture is empty"
        return scripture
    except Exception as e:
        print(f"❌ Fetch scripture failed: {e}")
        raise

async def test_fetch_translation_notes(client):
    """Test fetching translation notes"""
    print("\n" + "=" * 60)
    print("TEST 5: Fetch Translation Notes")
    print("=" * 60)
    try:
        notes = await client.fetch_translation_notes({
            "reference": "John 3:16",
            "language": "en"
        })
        print(f"✅ Translation notes fetched successfully")
        print(f"   Type: {type(notes)}")
        if isinstance(notes, dict):
            print(f"   Keys: {list(notes.keys())[:5]}...")
        return notes
    except Exception as e:
        print(f"❌ Fetch translation notes failed: {e}")
        raise

async def test_fetch_translation_word(client):
    """Test fetching translation word"""
    print("\n" + "=" * 60)
    print("TEST 6: Fetch Translation Word")
    print("=" * 60)
    try:
        word = await client.fetch_translation_word({
            "term": "love",
            "language": "en"
        })
        print(f"✅ Translation word fetched successfully")
        print(f"   Type: {type(word)}")
        if isinstance(word, dict):
            print(f"   Keys: {list(word.keys())[:5]}...")
        return word
    except Exception as e:
        print(f"❌ Fetch translation word failed: {e}")
        raise

async def test_call_tool_directly(client):
    """Test calling tool directly"""
    print("\n" + "=" * 60)
    print("TEST 7: Call Tool Directly")
    print("=" * 60)
    try:
        result = await client.call_tool("fetch_scripture", {
            "reference": "John 3:16",
            "language": "en",
            "format": "text"
        })
        print(f"✅ Tool call successful")
        print(f"   Response type: {type(result)}")
        if isinstance(result, dict):
            print(f"   Response keys: {list(result.keys())}")
            if "content" in result:
                print(f"   Content items: {len(result['content'])}")
        return result
    except Exception as e:
        print(f"❌ Call tool failed: {e}")
        raise

async def test_context_manager():
    """Test context manager usage"""
    print("\n" + "=" * 60)
    print("TEST 8: Context Manager")
    print("=" * 60)
    try:
        async with TranslationHelpsClient({
            "serverUrl": "https://translation-helps-mcp-945.pages.dev/api/mcp"
        }) as client:
            tools = await client.list_tools()
            print(f"✅ Context manager works")
            print(f"   Found {len(tools)} tools")
    except Exception as e:
        print(f"❌ Context manager failed: {e}")
        raise

async def test_error_handling(client):
    """Test error handling"""
    print("\n" + "=" * 60)
    print("TEST 9: Error Handling")
    print("=" * 60)
    try:
        # Test invalid reference
        try:
            await client.fetch_scripture({
                "reference": "InvalidBook 999:999",
                "language": "en"
            })
            print("⚠️  Invalid reference didn't raise error (might be handled by server)")
        except Exception as e:
            print(f"✅ Error handling works: {type(e).__name__}")
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        raise

async def run_all_tests():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("TRANSLATION HELPS MCP PYTHON SDK - COMPREHENSIVE TEST")
    print("=" * 60)
    
    client = None
    try:
        # Test 1: Connection
        client = await test_connection()
        
        # Test 2: List tools
        tools = await test_list_tools(client)
        
        # Test 3: List prompts
        prompts = await test_list_prompts(client)
        
        # Test 4: Fetch scripture
        scripture = await test_fetch_scripture(client)
        
        # Test 5: Fetch translation notes
        notes = await test_fetch_translation_notes(client)
        
        # Test 6: Fetch translation word
        word = await test_fetch_translation_word(client)
        
        # Test 7: Call tool directly
        tool_result = await test_call_tool_directly(client)
        
        # Test 8: Context manager
        await test_context_manager()
        
        # Test 9: Error handling
        await test_error_handling(client)
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\nSDK is ready for PyPI publication!")
        
    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ TESTS FAILED: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if client:
            await client.close()

if __name__ == "__main__":
    asyncio.run(run_all_tests())


