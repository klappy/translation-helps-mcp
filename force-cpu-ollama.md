# Force Ollama to Use CPU Instead of GPU

If your GPU doesn't have enough memory, you can force Ollama to use CPU instead.

## Windows Instructions

### 1. Stop Ollama Service

Right-click Ollama icon in system tray → "Quit Ollama"

Or via Task Manager:

- Press `Ctrl+Shift+Esc`
- Find "Ollama" process
- Right-click → "End Task"

### 2. Set Environment Variable

Open PowerShell as Administrator:

```powershell
# Add to user environment
[System.Environment]::SetEnvironmentVariable('OLLAMA_GPU_LAYERS', '0', 'User')

# Restart Ollama
Start-Process "C:\Users\LENOVO\AppData\Local\Programs\Ollama\ollama app.exe"
```

Or manually:

1. Press `Win + R`
2. Type `sysdm.cpl` and press Enter
3. Go to "Advanced" tab
4. Click "Environment Variables"
5. Under "User variables", click "New"
6. Variable name: `OLLAMA_GPU_LAYERS`
7. Variable value: `0`
8. Click OK, OK, OK
9. Restart Ollama from Start Menu

### 3. Verify CPU Mode

```bash
# This should now work (but slower)
ollama run mistral:7b "Hello"
```

## Notes

- **CPU mode is MUCH slower** (10-30x slower than GPU)
- But it will work without memory errors
- Consider using a smaller model instead for better experience
- You can revert by deleting the `OLLAMA_GPU_LAYERS` variable

## Recommended: Use Smaller Model Instead

Instead of forcing CPU, use a smaller model:

```bash
# Smallest and fastest
ollama pull llama3.2:1b

# Start CLI with smaller model
npm run cli:start -- --model llama3.2:1b
```

This will be much faster than CPU mode with the large model!
