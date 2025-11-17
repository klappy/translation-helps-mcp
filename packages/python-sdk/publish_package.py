#!/usr/bin/env python
"""Publish Translation Helps MCP Python SDK to PyPI"""
import subprocess
import sys
import os
import glob
import getpass

def find_python():
    """Find a Python executable with pip"""
    candidates = [
        r"C:\Users\LENOVO\AppData\Local\Programs\Python\Python311\python.exe",
        r"C:\Python311\python.exe",
        r"C:\Python39\python.exe",
        r"C:\Python310\python.exe",
    ]
    
    for cmd in ['python3', 'python']:
        try:
            result = subprocess.run([cmd, '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                pip_check = subprocess.run([cmd, '-m', 'pip', '--version'], capture_output=True)
                if pip_check.returncode == 0:
                    return cmd
        except:
            pass
    
    for path in candidates:
        if os.path.exists(path):
            try:
                pip_check = subprocess.run([path, '-m', 'pip', '--version'], capture_output=True)
                if pip_check.returncode == 0:
                    return path
            except:
                pass
    
    return sys.executable

def main():
    print("="*60)
    print("Publishing Translation Helps MCP Python SDK to PyPI")
    print("="*60)
    
    python_exe = find_python()
    print(f"Using Python: {python_exe}\n")
    
    # Check if dist directory exists
    if not os.path.exists('dist'):
        print("❌ Error: dist/ directory not found. Run build_package.py first.")
        return False
    
    dist_files = glob.glob("dist/*")
    if not dist_files:
        print("❌ Error: No package files found in dist/. Run build_package.py first.")
        return False
    
    print("Package files to upload:")
    for file in dist_files:
        size = os.path.getsize(file)
        print(f"  {os.path.basename(file)} ({size:,} bytes)")
    
    # Check for environment variable first
    pypi_token = os.environ.get('PYPI_API_TOKEN')
    
    if not pypi_token:
        print("\n" + "="*60)
        print("PyPI Authentication")
        print("="*60)
        print("\nYou need a PyPI API token to publish.")
        print("Get it from: https://pypi.org/manage/account/token/")
        print("\nYou can either:")
        print("  1. Set PYPI_API_TOKEN environment variable")
        print("  2. Enter it when prompted below")
        print("\n" + "-"*60)
        pypi_token = getpass.getpass("Enter your PyPI API token: ").strip()
    
    if not pypi_token:
        print("\n❌ No API token provided. Cannot publish.")
        return False
    
    print("\n" + "="*60)
    print("Uploading to PyPI...")
    print("="*60)
    
    # Set environment variables for twine
    env = os.environ.copy()
    env['TWINE_USERNAME'] = '__token__'
    env['TWINE_PASSWORD'] = pypi_token
    
    # Upload to PyPI
    cmd = [python_exe, "-m", "twine", "upload"] + dist_files
    result = subprocess.run(cmd, env=env)
    
    if result.returncode == 0:
        print("\n" + "="*60)
        print("✅ Successfully published to PyPI!")
        print("="*60)
        print("\nPackage is now available at:")
        print("  https://pypi.org/project/translation-helps-mcp-client/")
        print("\nInstall with:")
        print("  pip install translation-helps-mcp-client")
        return True
    else:
        print("\n❌ Upload failed.")
        print("\nCommon issues:")
        print("  - Invalid API token")
        print("  - Token doesn't have upload permissions")
        print("  - Package name already exists (need to increment version)")
        print("\nTry with verbose output:")
        print(f"  {python_exe} -m twine upload --verbose dist/*")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
