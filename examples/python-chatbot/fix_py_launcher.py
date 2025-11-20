#!/usr/bin/env python
"""
Fix Windows Python Launcher (py) to use Python 3.11 as default

This script creates/updates py.ini to set Python 3.11 as the default version,
fixing the issue where 'py chatbot.py' tries to use non-existent Python 3.13.
"""

import os
import sys

def get_py_ini_path():
    """Get the path to py.ini file"""
    # py.ini can be in LOCALAPPDATA (user-specific) or WINDIR (system-wide)
    # User-specific takes precedence
    local_appdata = os.environ.get('LOCALAPPDATA')
    if local_appdata:
        user_ini = os.path.join(local_appdata, 'py.ini')
        if os.path.exists(user_ini):
            return user_ini
        # Create in user directory
        return user_ini
    
    # Fallback to system directory (requires admin)
    windir = os.environ.get('WINDIR')
    if windir:
        return os.path.join(windir, 'py.ini')
    
    return None

def create_py_ini():
    """Create or update py.ini to set Python 3.11 as default"""
    ini_path = get_py_ini_path()
    
    if not ini_path:
        print("❌ Could not determine py.ini location")
        print("   Please set LOCALAPPDATA or WINDIR environment variable")
        return False
    
    print(f"📝 Configuring Python launcher: {ini_path}")
    
    # Read existing content if file exists
    existing_content = ""
    if os.path.exists(ini_path):
        try:
            with open(ini_path, 'r', encoding='utf-8') as f:
                existing_content = f.read()
            print(f"   Found existing py.ini, will update it")
        except Exception as e:
            print(f"   Warning: Could not read existing file: {e}")
    
    # Create new content
    new_content = """[defaults]
python=3.11

"""
    
    # If file exists and has other settings, preserve them
    if existing_content and '[defaults]' not in existing_content:
        new_content = existing_content + "\n" + new_content
    
    try:
        # Create directory if needed
        os.makedirs(os.path.dirname(ini_path), exist_ok=True)
        
        # Write the file
        with open(ini_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✅ Successfully configured py.ini")
        print(f"   Default Python version set to 3.11")
        print(f"\n   Now you can use:")
        print(f"     py chatbot.py")
        print(f"   Instead of:")
        print(f"     py -3.11 chatbot.py")
        return True
    except PermissionError:
        print(f"❌ Permission denied. You may need to run as administrator.")
        print(f"   Or create the file manually at: {ini_path}")
        print(f"\n   File content should be:")
        print(f"   [defaults]")
        print(f"   python=3.11")
        return False
    except Exception as e:
        print(f"❌ Error creating py.ini: {e}")
        return False

def main():
    print("="*60)
    print("Fix Windows Python Launcher Configuration")
    print("="*60)
    print()
    
    if create_py_ini():
        print("\n" + "="*60)
        print("✅ Configuration complete!")
        print("="*60)
        print("\nRestart your terminal and try:")
        print("  py chatbot.py")
        return True
    else:
        print("\n" + "="*60)
        print("❌ Configuration failed")
        print("="*60)
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

