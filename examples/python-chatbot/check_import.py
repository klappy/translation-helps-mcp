#!/usr/bin/env python
"""Check if package can be imported"""
import sys
print(f"Python: {sys.executable}")

try:
    from translation_helps import TranslationHelpsClient
    print("✅ Import successful: from translation_helps import TranslationHelpsClient")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    print("\nTrying alternative imports...")
    
    try:
        import translation_helps
        print(f"✅ Can import translation_helps module: {dir(translation_helps)}")
    except ImportError as e2:
        print(f"❌ Cannot import translation_helps: {e2}")

