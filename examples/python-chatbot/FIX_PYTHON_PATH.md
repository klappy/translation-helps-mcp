# Fixing Python PATH Issue

## Problem

When you run `python`, Windows is finding **Inkscape's Python** first instead of your system Python:

```
Current PATH order:
1. C:\Program Files\Inkscape\bin\python.exe  ❌ (Inkscape's Python - no pip, no packages)
2. C:\Users\LENOVO\AppData\Local\Programs\Python\Python311\python.exe  ✅ (Your Python - has packages)
```

This is why we needed workaround scripts like `run_chatbot.py` and `find_python.py`.

## Solution: Fix Windows PATH

### Option 1: Remove Inkscape from PATH (Recommended)

1. **Open System Environment Variables:**
   - Press `Win + R`
   - Type `sysdm.cpl` and press Enter
   - Click "Environment Variables" button

2. **Edit PATH:**
   - Under "User variables" or "System variables", find `Path`
   - Click "Edit"
   - Find `C:\Program Files\Inkscape\bin` in the list
   - Select it and click "Remove"
   - Click "OK" on all dialogs

3. **Restart your terminal** (close and reopen Git Bash/CMD/PowerShell)

4. **Verify:**
   ```bash
   python --version
   where python
   # Should show: C:\Users\LENOVO\AppData\Local\Programs\Python\Python311\python.exe
   ```

### Option 2: Reorder PATH (Keep Inkscape)

1. **Open System Environment Variables** (same as Option 1)

2. **Edit PATH:**
   - Find `C:\Program Files\Inkscape\bin`
   - Click "Move Down" until it's after your Python path
   - Or move your Python path to the top

3. **Restart your terminal**

### Option 3: Use Python Launcher (Windows-specific)

Windows has a Python launcher (`py`) that's smarter:

```bash
# Instead of: python chatbot.py
# Use: py chatbot.py

# Or specify version:
py -3.11 chatbot.py
```

You can create an alias in Git Bash:

```bash
# Add to ~/.bashrc
alias python='py -3.11'
```

## After Fixing

Once PATH is fixed, you can run directly:

```bash
cd examples/python-chatbot
python chatbot.py
```

No need for `run_chatbot.py` anymore!

## Verify the Fix

```bash
# Check which Python is found
python --version
where python

# Check if packages are available
python -m pip show translation-helps-mcp-client

# Test the chatbot
python chatbot.py
```

## Alternative: Use Python Launcher

If you can't modify PATH, you can use Windows' Python launcher:

```bash
# Use py launcher (finds Python automatically)
py chatbot.py

# Or specify version explicitly
py -3.11 chatbot.py
```

You can also create a simple batch file `run.bat`:

```batch
@echo off
py -3.11 chatbot.py
```

Then just run: `run.bat`

