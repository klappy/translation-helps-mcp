"""
Test script to verify the Python SDK works correctly
This tests the SDK without requiring OpenAI API key

Make sure you've installed the package:
    pip install translation-helps-mcp-client

If you get "ModuleNotFoundError", make sure you're using the same Python
interpreter where you installed the package. You can check with:
    python -m pip show translation-helps-mcp-client
    
Or run: python find_python.py to find the correct Python interpreter.
"""
import asyncio
import sys
import subprocess
import os

def find_python_with_sdk():
    """Try to find a Python interpreter that has the SDK installed"""
    python_paths = [
        r"C:\Users\LENOVO\AppData\Local\Programs\Python\Python311\python.exe",
        r"C:\Users\LENOVO\AppData\Local\Programs\Python\Python310\python.exe",
        r"C:\Users\LENOVO\AppData\Local\Programs\Python\Python39\python.exe",
    ]
    
    # Check current Python first
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "show", "translation-helps-mcp-client"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return sys.executable
    except:
        pass
    
    # Check common paths
    for path in python_paths:
        if os.path.exists(path):
            try:
                result = subprocess.run(
                    [path, "-m", "pip", "show", "translation-helps-mcp-client"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    return path
            except:
                pass
    
    return None

try:
    from translation_helps import TranslationHelpsClient
except ImportError as e:
    print(f"ERROR: Import Error: {e}")
    print(f"\nCurrent Python: {sys.executable}")
    
    # Try to find a Python with the SDK
    print("\nSearching for Python interpreter with SDK installed...")
    python_path = find_python_with_sdk()
    
    if python_path and python_path != sys.executable:
        print(f"\nSUCCESS: Found SDK in: {python_path}")
        print(f"\nRun the test with:")
        print(f'  "{python_path}" test_sdk.py')
        print("\nOr install the SDK in the current Python:")
        print(f'  "{sys.executable}" -m pip install translation-helps-mcp-client')
    else:
        print("\nERROR: The package 'translation-helps-mcp-client' is not installed.")
        print("Install it with: pip install translation-helps-mcp-client")
        print("\nOr run: python find_python.py to find the correct Python interpreter.")
    
    sys.exit(1)

async def test_sdk():
    """Test basic SDK functionality"""
    print("Testing Translation Helps Python SDK...\n")
    
    # Initialize client
    # Use production server by default, allow override via environment variable
    import os
    server_url = os.getenv("MCP_SERVER_URL", "https://translation-helps-mcp-945.pages.dev/api/mcp")
    client = TranslationHelpsClient({
        "serverUrl": server_url
    })
    
    try:
        # Test connection
        print("1. Testing connection...")
        await client.connect()
        print("   ✅ Connected successfully\n")
        
        # Test listing tools
        print("2. Testing list_tools()...")
        tools = await client.list_tools()
        print(f"   ✅ Found {len(tools)} tools")
        print(f"   Tools: {', '.join([t['name'] for t in tools[:5]])}...\n")
        
        # Test listing prompts
        print("3. Testing list_prompts()...")
        prompts = await client.list_prompts()
        print(f"   ✅ Found {len(prompts)} prompts")
        print(f"   Prompts: {', '.join([p['name'] for p in prompts])}\n")
        
        # Test calling a tool
        print("4. Testing call_tool() - fetch_scripture...")
        result = await client.call_tool("fetch_scripture", {
            "reference": "John 3:16",
            "language": "en",
            "format": "text"
        })
        
        # Check response format
        if result.get("content"):
            text_content = ""
            for item in result["content"]:
                if item.get("type") == "text":
                    text_content += item.get("text", "")
            
            if text_content:
                print(f"   ✅ Tool call successful")
                print(f"   Response length: {len(text_content)} characters")
                print(f"   Preview: {text_content[:100]}...\n")
            else:
                print(f"   ⚠️  Tool call returned empty text content")
                print(f"   Response structure: {list(result.keys())}\n")
        else:
            print(f"   ⚠️  Tool call response missing 'content' field")
            print(f"   Response keys: {list(result.keys())}\n")
        
        # Test convenience method
        print("5. Testing convenience method - fetch_scripture()...")
        scripture = await client.fetch_scripture({
            "reference": "John 3:16",
            "language": "en"
        })
        print(f"   ✅ Convenience method works")
        print(f"   Scripture length: {len(scripture)} characters")
        print(f"   Preview: {scripture[:100]}...\n")
        
        print("✅ All SDK tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(test_sdk())




