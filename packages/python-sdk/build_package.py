#!/usr/bin/env python
"""Build script for Translation Helps MCP Python SDK"""
import subprocess
import sys
import os
import shutil

def find_python():
    """Find a Python executable with pip"""
    # Try common Python locations
    candidates = [
        r"C:\Users\LENOVO\AppData\Local\Programs\Python\Python311\python.exe",
        r"C:\Python311\python.exe",
        r"C:\Python39\python.exe",
        r"C:\Python310\python.exe",
    ]
    
    # Also try python3 or python from PATH
    for cmd in ['python3', 'python']:
        try:
            result = subprocess.run([cmd, '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                # Check if it has pip
                pip_check = subprocess.run([cmd, '-m', 'pip', '--version'], capture_output=True)
                if pip_check.returncode == 0:
                    return cmd
        except:
            pass
    
    # Try candidate paths
    for path in candidates:
        if os.path.exists(path):
            # Check if it has pip
            try:
                pip_check = subprocess.run([path, '-m', 'pip', '--version'], capture_output=True)
                if pip_check.returncode == 0:
                    return path
            except:
                pass
    
    # Fallback to sys.executable
    return sys.executable

def run_command(cmd_list, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"{description}")
    print(f"{'='*60}")
    result = subprocess.run(cmd_list, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    if result.stdout:
        print(result.stdout)
    return True

def main():
    print("Building Translation Helps MCP Python SDK for PyPI")
    
    # Find correct Python
    python_exe = find_python()
    print(f"Using Python: {python_exe}")
    
    # Clean previous builds
    print("\nCleaning previous builds...")
    for dir_name in ['dist', 'build']:
        if os.path.exists(dir_name):
            shutil.rmtree(dir_name)
            print(f"  Removed {dir_name}/")
    
    for item in os.listdir('.'):
        if item.endswith('.egg-info'):
            shutil.rmtree(item)
            print(f"  Removed {item}/")
    
    # Install build tools
    if not run_command([python_exe, "-m", "pip", "install", "-q", "build", "twine"], "Installing build tools"):
        return False
    
    # Build package
    if not run_command([python_exe, "-m", "build"], "Building package"):
        return False
    
    # Check package - need to use shell for glob
    import glob
    dist_files = glob.glob("dist/*")
    if dist_files:
        if not run_command([python_exe, "-m", "twine", "check"] + dist_files, "Checking package"):
            return False
    
    print("\n" + "="*60)
    print("✅ Build successful!")
    print("="*60)
    print("\nPackage files created:")
    if os.path.exists('dist'):
        for file in os.listdir('dist'):
            size = os.path.getsize(os.path.join('dist', file))
            print(f"  {file} ({size:,} bytes)")
    
    print("\n" + "="*60)
    print("Ready to publish!")
    print("="*60)
    print("\nTo publish to PyPI, run:")
    print(f"  {python_exe} -m twine upload dist/*")
    print("\nYou'll need your PyPI API token.")
    print("Get it from: https://pypi.org/manage/account/token/")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

