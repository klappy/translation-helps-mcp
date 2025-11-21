#!/usr/bin/env python
"""Check if PYPI_API_TOKEN is set"""
import os

token = os.environ.get('PYPI_API_TOKEN')
if token:
    print(f"✅ PYPI_API_TOKEN is set (length: {len(token)})")
    print(f"   Starts with: {token[:10]}...")
else:
    print("❌ PYPI_API_TOKEN is not set")
    print("   Set it with: export PYPI_API_TOKEN='pypi-your-token-here'")

