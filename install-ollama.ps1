# Ollama Installation Script for Windows
# This script opens the download page and provides installation guidance

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ollama Installation for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Prerequisites Check..." -ForegroundColor Yellow
Write-Host ""

# Check if Ollama is already installed
$ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollamaPath) {
    Write-Host "✅ Ollama is already installed!" -ForegroundColor Green
    Write-Host "   Version: " -NoNewline
    & ollama --version
    Write-Host ""
    
    # Check for mistral model
    Write-Host "📦 Checking for Mistral 7B model..." -ForegroundColor Yellow
    $models = & ollama list 2>$null
    if ($models -match "mistral:7b") {
        Write-Host "✅ Mistral 7B is already installed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Everything is ready! You can start the CLI:" -ForegroundColor Green
        Write-Host "   npm run cli:start" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Mistral 7B not found" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📥 Pulling Mistral 7B model (4.1GB)..." -ForegroundColor Yellow
        Write-Host "This may take 5-10 minutes depending on your connection." -ForegroundColor Gray
        Write-Host ""
        & ollama pull mistral:7b
        Write-Host ""
        Write-Host "✅ Model installed! Ready to use." -ForegroundColor Green
    }
    exit 0
}

Write-Host "❌ Ollama is not installed" -ForegroundColor Red
Write-Host ""

# Check disk space
$drive = Get-PSDrive C
$freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
Write-Host "💾 Free space on C: drive: $freeSpaceGB GB" -ForegroundColor Cyan

if ($freeSpaceGB -lt 5) {
    Write-Host "⚠️  Warning: Less than 5GB free space. Recommended: 5GB+" -ForegroundColor Yellow
} else {
    Write-Host "✅ Sufficient disk space available" -ForegroundColor Green
}
Write-Host ""

# Check RAM
$totalRAM = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
Write-Host "🧠 Total RAM: $totalRAM GB" -ForegroundColor Cyan

if ($totalRAM -lt 8) {
    Write-Host "⚠️  Warning: Less than 8GB RAM. Performance may be slow." -ForegroundColor Yellow
} else {
    Write-Host "✅ Sufficient RAM for Ollama" -ForegroundColor Green
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣  Download Ollama" -ForegroundColor Yellow
Write-Host "   Opening download page in your browser..." -ForegroundColor Gray
Write-Host ""

# Open download page in default browser
Start-Process "https://ollama.com/download/windows"

Write-Host "2️⃣  Install Ollama" -ForegroundColor Yellow
Write-Host "   • Run the downloaded OllamaSetup.exe" -ForegroundColor Gray
Write-Host "   • Follow the installation wizard" -ForegroundColor Gray
Write-Host "   • Ollama will start automatically" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  After Installation" -ForegroundColor Yellow
Write-Host "   • Close this terminal and open a NEW terminal" -ForegroundColor Gray
Write-Host "   • Verify: ollama --version" -ForegroundColor Gray
Write-Host "   • Pull model: ollama pull mistral:7b" -ForegroundColor Gray
Write-Host "   • Start CLI: npm run cli:start" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Important Notes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  You MUST open a NEW terminal after installation" -ForegroundColor Yellow
Write-Host "   (So the ollama command is available in PATH)" -ForegroundColor Gray
Write-Host ""

Write-Host "📦 Total download size:" -ForegroundColor Cyan
Write-Host "   • Ollama installer: ~500MB" -ForegroundColor Gray
Write-Host "   • Mistral 7B model: ~4.1GB" -ForegroundColor Gray
Write-Host "   • Total: ~4.6GB" -ForegroundColor Gray
Write-Host ""

Write-Host "⏱️  Estimated time:" -ForegroundColor Cyan
Write-Host "   • Download installer: 2-5 minutes" -ForegroundColor Gray
Write-Host "   • Install Ollama: 2-3 minutes" -ForegroundColor Gray
Write-Host "   • Download model: 5-10 minutes" -ForegroundColor Gray
Write-Host "   • Total: ~15-20 minutes" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  After Setup Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Once Ollama is installed, run this script again to:" -ForegroundColor Green
Write-Host "   • Verify installation" -ForegroundColor Gray
Write-Host "   • Pull the Mistral 7B model automatically" -ForegroundColor Gray
Write-Host "   • Check everything is ready" -ForegroundColor Gray
Write-Host ""

Write-Host "Or run this script manually:" -ForegroundColor Green
Write-Host "   .\install-ollama.ps1" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Browser should now be opening to ollama.com..." -ForegroundColor Green
Write-Host "Please download and install Ollama, then run this script again." -ForegroundColor Green
Write-Host ""

