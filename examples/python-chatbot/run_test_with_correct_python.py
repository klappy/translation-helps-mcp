#!/usr/bin/env python
"""Run test_sdk.py with the correct Python interpreter"""
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
    python_path = find_python_with_sdk()
    
    if not python_path:
        print("ERROR: Could not find Python with translation-helps-mcp-client installed")
        return 1
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    test_script = os.path.join(script_dir, "test_sdk.py")
    
    print(f"Running test with: {python_path}\n")
    result = subprocess.run([python_path, test_script], cwd=script_dir)
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())

