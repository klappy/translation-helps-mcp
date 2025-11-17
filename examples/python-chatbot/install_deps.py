#!/usr/bin/env python
"""Install dependencies using the correct Python interpreter"""
import subprocess
import sys
import os

def find_python_with_sdk():
    """Find Python interpreter that has the SDK installed"""
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

def main():
    print("Finding Python interpreter with SDK installed...")
    python_path = find_python_with_sdk()
    
    if not python_path:
        print("ERROR: Could not find Python with translation-helps-mcp-client installed")
        print("Please install it first: pip install translation-helps-mcp-client")
        return 1
    
    print(f"Using Python: {python_path}\n")
    print("Installing dependencies from requirements.txt...")
    
    result = subprocess.run(
        [python_path, "-m", "pip", "install", "-r", "requirements.txt"],
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    
    if result.returncode == 0:
        print("\nSUCCESS: Dependencies installed!")
        print(f"\nYou can now run the chatbot with:")
        print(f'  "{python_path}" chatbot.py')
        return 0
    else:
        print("\nERROR: Failed to install dependencies")
        return 1

if __name__ == "__main__":
    sys.exit(main())

