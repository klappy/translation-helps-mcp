#!/usr/bin/env python
"""Find Python interpreters that have the SDK installed"""
import subprocess
import sys
import os

def find_python_with_sdk():
    """Find Python interpreters that have translation-helps-mcp-client installed"""
    print("Searching for Python interpreters with translation-helps-mcp-client installed...\n")
    
    # Common Python locations on Windows
    python_paths = [
        r"C:\Users\LENOVO\AppData\Local\Programs\Python\Python311\python.exe",
        r"C:\Users\LENOVO\AppData\Local\Programs\Python\Python310\python.exe",
        r"C:\Users\LENOVO\AppData\Local\Programs\Python\Python39\python.exe",
        r"C:\Python311\python.exe",
        r"C:\Python310\python.exe",
        r"C:\Python39\python.exe",
    ]
    
    found = []
    
    # Check current Python
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "show", "translation-helps-mcp-client"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            found.append(sys.executable)
            print(f"✅ Current Python ({sys.executable}) has the SDK installed")
    except:
        pass
    
    # Check common paths
    for path in python_paths:
        if os.path.exists(path):
            try:
                result = subprocess.run(
                    [path, "-m", "pip", "show", "translation-helps-mcp-client"],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0 and path not in found:
                    found.append(path)
                    print(f"✅ Found: {path}")
            except:
                pass
    
    if not found:
        print("❌ No Python interpreter found with translation-helps-mcp-client installed")
        print("\nInstall it with:")
        print("  pip install translation-helps-mcp-client")
        return None
    
    print(f"\n✅ Found {len(found)} Python interpreter(s) with the SDK")
    print(f"\nRecommended: Use the first one listed above")
    return found[0] if found else None

if __name__ == "__main__":
    find_python_with_sdk()

