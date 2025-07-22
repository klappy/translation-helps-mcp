# Translation CLI - Node.js Command Line Tool

A powerful command-line interface for accessing unfoldingWord Bible translation resources. This tool provides Mother Tongue Translators with comprehensive access to Strategic Language resources for Bible translation work.

## 🌟 Features

### Core Commands
- **Scripture Lookup**: Fetch ULT/GLT (literal) and UST/GST (simplified) translations
- **Translation Notes**: Get cultural context and explanations for difficult passages
- **Translation Words**: Look up biblical terms with comprehensive definitions
- **Translation Questions**: Access validation questions for translation checking
- **Language Management**: List Strategic Languages and resource coverage
- **Bulk Downloads**: Download complete resource sets for offline use
- **Export Tools**: Create study guides and translation kits

### Advanced Features
- **Smart Caching**: Memory and file-based caching for offline access
- **Multiple Output Formats**: Text, JSON, Markdown, CSV, HTML, PDF
- **Interactive Mode**: Guided interface for new users
- **Batch Processing**: Process multiple references at once
- **Configuration Management**: Persistent settings and preferences
- **Performance Monitoring**: Track API usage and response times

## 🚀 Installation

### Global Installation (Recommended)
```bash
# Install globally for system-wide access
npm install -g translation-cli

# Verify installation
tcli --version
```

### Local Installation
```bash
# Clone or download this example
cd nodejs-cli-tool

# Install dependencies
npm install

# Run locally
npm start -- --help

# Or use directly
node bin/translation-cli.js --help
```

### Binary Distribution
```bash
# Build standalone binaries
npm run build

# Use the binary (no Node.js required)
./dist/translation-cli-linux
./dist/translation-cli-win.exe
./dist/translation-cli-macos
```

## 📖 Quick Start

### Basic Usage
```bash
# Get help and see all commands
tcli --help

# Fetch Scripture in both literal and simplified translations
tcli scripture "John 3:16"

# Get translation notes with cultural context
tcli notes "Romans 8:28"

# Look up a biblical term
tcli words lookup grace

# List available Strategic Languages
tcli languages list

# Download resources for offline use
tcli download passage "Psalm 23"

# Start interactive mode for guided usage
tcli interactive
```

### Advanced Examples
```bash
# Get Scripture in Spanish with alignment data
tcli scripture "Juan 3:16" --language es --with-alignment

# Export translation notes as Markdown
tcli notes "Genesis 1:1" --format markdown --output genesis-notes.md

# Get comprehensive language coverage report
tcli languages coverage --format csv --output coverage-report.csv

# Create a complete study guide
tcli export study-guide "Ephesians 2:8-9" --include-all --format pdf

# Download all resources for the book of Romans
tcli download book Romans --language en --dir ./romans-resources

# Search across all resources
tcli search "salvation" --type scripture notes words --limit 20
```

## 🔧 Command Reference

### Scripture Commands
```bash
# Basic scripture lookup
tcli scripture <reference> [options]

Options:
  -l, --language <code>    Strategic language code (default: en)
  -f, --format <type>      Output format: text|json|markdown (default: text)
  --ult-only              Show only literal translation (ULT/GLT)
  --ust-only              Show only simplified translation (UST/GST)
  --with-alignment        Include word alignment data
  -o, --output <file>     Save output to file

Examples:
  tcli scripture "John 3:16"
  tcli scripture "Genesis 1:1-5" --language es --format json
  tcli scripture "Psalm 23" --ult-only --output psalm23.txt
```

### Translation Notes Commands
```bash
# Get translation notes
tcli notes <reference> [options]

Options:
  -l, --language <code>    Strategic language code (default: en)
  -f, --format <type>      Output format: text|json|markdown (default: text)
  --with-links            Include Translation Academy links
  -o, --output <file>     Save output to file

Examples:
  tcli notes "Matthew 5:3"
  tcli notes "Romans 1:1" --format markdown --with-links
```

### Translation Words Commands
```bash
# Look up a specific word
tcli words lookup <word> [options]

# List words for a reference
tcli words list <reference> [options]

Options:
  -l, --language <code>    Strategic language code (default: en)
  -c, --category <type>    Filter by category: kt|names|other
  -f, --format <type>      Output format: text|json|table (default: table)
  --with-references       Include biblical usage examples

Examples:
  tcli words lookup grace --with-references
  tcli words list "John 3:16" --category kt
```

### Languages Commands
```bash
# List available languages
tcli languages list [options]

# Show resource coverage matrix
tcli languages coverage [options]

Options:
  --strategic-only        Show only Strategic Languages
  --with-coverage         Include resource availability info
  -m, --min-completeness <percent>  Minimum completeness (default: 70)
  --recommended-only      Show only recommended languages
  -f, --format <type>     Output format: table|json|csv (default: table)

Examples:
  tcli languages list --strategic-only
  tcli languages coverage --min-completeness 80 --format csv
```

### Download Commands
```bash
# Download resources for a passage
tcli download passage <reference> [options]

# Download all resources for a book
tcli download book <book> [options]

# Download popular passages
tcli download popular [options]

Options:
  -l, --language <code>    Strategic language code (default: en)
  -d, --dir <path>        Download directory (default: ./downloads)
  --scripture             Include Scripture texts
  --notes                 Include translation notes
  --words                 Include translation words
  --questions             Include translation questions

Examples:
  tcli download passage "John 3:16" --all-resources
  tcli download book Genesis --language es --dir ./genesis-spanish
  tcli download popular --language fr
```

### Export Commands
```bash
# Create a study guide
tcli export study-guide <reference> [options]

# Create a translation kit
tcli export translation-kit <reference> [options]

Options:
  -l, --language <code>    Strategic language code (default: en)
  -f, --format <type>      Output format: pdf|html|markdown|docx (default: markdown)
  -o, --output <file>     Output file path
  --include-all           Include all available resources
  --format <type>         Kit format: folder|zip|tar (default: folder)

Examples:
  tcli export study-guide "Romans 8:28" --format pdf
  tcli export translation-kit "Matthew 5" --format zip
```

### Configuration Commands
```bash
# Set configuration
tcli config set <key> <value>

# Get configuration
tcli config get [key]

# Reset to defaults
tcli config reset

Examples:
  tcli config set default-language es
  tcli config set api-url https://custom-api.example.com
  tcli config get
```

### Utility Commands
```bash
# Clear cache
tcli cache clear

# Show cache statistics
tcli cache stats

# Check API health
tcli health --detailed

# Interactive mode
tcli interactive
```

## ⚙️ Configuration

### Configuration File
The CLI automatically creates a configuration file at `~/.translation-cli/config.json`:

```json
{
  "defaultLanguage": "en",
  "apiUrl": "https://api.translation.tools",
  "timeout": 10000,
  "cacheDir": "~/.translation-cli/cache",
  "outputFormat": "text",
  "downloadDir": "./downloads",
  "preferences": {
    "showBanner": true,
    "colorOutput": true,
    "verboseErrors": false
  }
}
```

### Environment Variables
```bash
# Override API settings
export TRANSLATION_API_URL="https://custom-api.example.com"
export TRANSLATION_API_TIMEOUT="15000"
export TRANSLATION_CACHE_DIR="/custom/cache/path"

# Authentication (if required)
export TRANSLATION_API_KEY="your-api-key"
```

### Command Line Options
```bash
# Global options (apply to all commands)
tcli --api-url https://custom-api.example.com scripture "John 3:16"
tcli --timeout 15000 --verbose languages list
tcli --no-color --quiet notes "Romans 1:1"
```

## 📁 Output Formats

### Text Format (Default)
Clean, readable output optimized for terminal display:
```
═══════════════════════════════════════════════════════════
📖 John 3:16
Language: EN • Format: text
═══════════════════════════════════════════════════════════

🔤 Literal Text (ULT/GLT):
Form-centric translation preserving original structure

For God so loved the world that he gave his one and only Son...

💬 Simplified Text (UST/GST):
Meaning-based translation for clear communication

God loved the people in the world so much that he gave his only Son...
```

### JSON Format
Machine-readable format for integration with other tools:
```json
{
  "scripture": {
    "citation": "John 3:16",
    "ult": {
      "text": "For God so loved the world..."
    },
    "ust": {
      "text": "God loved the people in the world..."
    }
  },
  "metadata": {
    "responseTime": 234,
    "cached": false,
    "language": "en"
  }
}
```

### Markdown Format
Documentation-ready format for study guides:
```markdown
# John 3:16

## Literal Text (ULT/GLT)
*Form-centric translation preserving original structure*

For God so loved the world that he gave his one and only Son...

## Simplified Text (UST/GST) 
*Meaning-based translation for clear communication*

God loved the people in the world so much that he gave his only Son...
```

### Table Format
Organized display for comparison and analysis:
```
┌────────────────┬──────────────────────────────────────┐
│ Translation    │ Text                                 │
├────────────────┼──────────────────────────────────────┤
│ ULT/GLT        │ For God so loved the world that...   │
│ UST/GST        │ God loved the people in the world... │
└────────────────┴──────────────────────────────────────┘
```

## 🔄 Caching System

### Cache Hierarchy
1. **Memory Cache**: Fast access for current session (5-minute TTL)
2. **File Cache**: Persistent across sessions (24-hour TTL)
3. **Network**: Fresh data from API when cache misses

### Cache Management
```bash
# View cache statistics
tcli cache stats
# Output:
# Memory Cache: 45 keys, 89% hit rate
# File Cache: /Users/username/.translation-cli/cache
# Cache Size: 12.3 MB

# Clear all cached data
tcli cache clear

# Clear only memory cache
tcli cache clear --memory-only

# Clear only file cache
tcli cache clear --files-only
```

### Cache Locations
- **Linux/macOS**: `~/.translation-cli/cache/`
- **Windows**: `%USERPROFILE%\.translation-cli\cache\`
- **Custom**: Set via `--cache-dir` or config file

## 🧪 Testing and Development

### Running Tests
```bash
# Install development dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test suites
npm test -- --grep "Scripture"
npm test -- --grep "API"
```

### Development Setup
```bash
# Clone the repository
git clone https://github.com/unfoldingword/translation-helps-mcp.git
cd translation-helps-mcp/docs/examples/nodejs-cli-tool

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

### Adding New Commands
1. Create command file in `commands/` directory
2. Implement command logic with proper error handling
3. Add command to main CLI file
4. Write tests for the new command
5. Update documentation

Example command structure:
```javascript
// commands/my-command.js
module.exports = async function myCommand(arg, options) {
  const spinner = ora('Processing...').start();
  
  try {
    // Command logic here
    const result = await doSomething(arg, options);
    
    spinner.succeed('Command completed');
    displayResult(result, options);
    
  } catch (error) {
    spinner.fail('Command failed');
    handleError(error);
  }
};
```

## 🔧 Troubleshooting

### Common Issues

**Command Not Found**
```bash
# If globally installed
which tcli
npm list -g translation-cli

# Fix: Reinstall globally
npm uninstall -g translation-cli
npm install -g translation-cli
```

**API Connection Issues**
```bash
# Test API connectivity
tcli health --detailed

# Check network/proxy settings
curl https://api.translation.tools/api/health

# Use custom API URL
tcli --api-url https://api.translation.tools scripture "John 3:16"
```

**Cache Issues**
```bash
# Clear corrupted cache
tcli cache clear

# Check cache permissions
ls -la ~/.translation-cli/

# Use custom cache directory
tcli --cache-dir /tmp/translation-cache scripture "John 3:16"
```

**Performance Issues**
```bash
# Check cache statistics
tcli cache stats

# Increase timeout for slow connections
tcli --timeout 30000 scripture "John 3:16"

# Use verbose mode to diagnose
tcli --verbose scripture "John 3:16"
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=translation-cli:* tcli scripture "John 3:16"

# Verbose error output
tcli --verbose scripture "InvalidReference"

# Test mode (no API calls, use mock data)
NODE_ENV=test tcli scripture "John 3:16"
```

### Support and Issues
- **Documentation**: [docs.translation.tools](https://docs.translation.tools)
- **Issues**: [GitHub Issues](https://github.com/unfoldingword/translation-helps-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/unfoldingword/translation-helps-mcp/discussions)

## �� Performance and Limits

### Performance Targets
- **Response Time**: < 2 seconds for most operations
- **Cache Hit Rate**: > 70% for optimal performance
- **Memory Usage**: < 100MB for typical usage
- **Disk Cache**: Automatically managed, configurable limits

### Rate Limits
- **API Calls**: No hard limits, but respectful usage encouraged
- **Concurrent Requests**: Limited to 5 simultaneous connections
- **Bulk Operations**: Automatically batched and throttled

### Optimization Tips
```bash
# Pre-warm cache for better performance
tcli download popular --language en

# Use batch operations instead of individual commands
tcli download book Romans  # Better than individual chapters

# Monitor performance
tcli cache stats
tcli health --detailed
```

## 🌐 Integration Examples

### Bash Scripts
```bash
#!/bin/bash
# Generate study materials for a sermon series

SERIES_PASSAGES=(
  "John 3:16"
  "Romans 8:28" 
  "Ephesians 2:8-9"
  "Philippians 4:13"
)

for passage in "${SERIES_PASSAGES[@]}"; do
  echo "Generating study guide for $passage..."
  tcli export study-guide "$passage" \
    --format markdown \
    --include-all \
    --output "study-guides/${passage// /-}.md"
done
```

### Python Integration
```python
import subprocess
import json

def get_scripture(reference, language='en'):
    """Get Scripture using the CLI tool"""
    result = subprocess.run([
        'tcli', 'scripture', reference,
        '--language', language,
        '--format', 'json'
    ], capture_output=True, text=True)
    
    if result.returncode == 0:
        return json.loads(result.stdout)
    else:
        raise Exception(f"Failed to get scripture: {result.stderr}")

# Usage
scripture = get_scripture("John 3:16", "es")
print(scripture['scripture']['text'])
```

### GitHub Actions
```yaml
name: Update Translation Resources
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  update-resources:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Install Translation CLI
      run: npm install -g translation-cli
      
    - name: Download latest resources
      run: |
        tcli download popular --language en --dir ./resources
        tcli download popular --language es --dir ./resources
        
    - name: Generate coverage report
      run: |
        tcli languages coverage --format csv --output coverage.csv
        
    - name: Commit updates
      run: |
        git add .
        git commit -m "Update translation resources"
        git push
```

## 📄 License

This CLI tool is licensed under the MIT License. See [LICENSE](../../../LICENSE) for details.

## 🙏 Acknowledgments

- **unfoldingWord** for providing comprehensive Bible translation resources
- **Door43 Community** for maintaining high-quality content
- **Node.js Community** for excellent CLI development tools
- **Mother Tongue Translators** worldwide for their invaluable feedback

---

**Ready to enhance your Bible translation workflow?** The Translation CLI provides powerful command-line access to unfoldingWord's comprehensive Strategic Language resources.

**Need help getting started?** Run `tcli interactive` for a guided tour of the tool's capabilities.

For questions, suggestions, or contributions, visit our [GitHub repository](https://github.com/unfoldingword/translation-helps-mcp).
