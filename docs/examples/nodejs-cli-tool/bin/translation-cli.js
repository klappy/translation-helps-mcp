#!/usr/bin/env node

/**
 * Translation CLI Tool
 * 
 * Command-line interface for accessing unfoldingWord Bible translation resources
 * Supports Mother Tongue Translators with Strategic Language resources
 */

const { Command } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const boxen = require('boxen');
const pkg = require('../package.json');

// Import commands
const scriptureCommand = require('../commands/scripture');
const notesCommand = require('../commands/notes');
const wordsCommand = require('../commands/words');
const questionsCommand = require('../commands/questions');
const languagesCommand = require('../commands/languages');
const downloadCommand = require('../commands/download');
const searchCommand = require('../commands/search');
const exportCommand = require('../commands/export');
const configCommand = require('../commands/config');

const program = new Command();

// Display banner
function showBanner() {
  console.log(
    chalk.blue(
      figlet.textSync('Translation CLI', {
        font: 'Standard',
        horizontalLayout: 'fitted'
      })
    )
  );
  
  console.log(
    boxen(
      chalk.white.bold('unfoldingWord Bible Translation Resources CLI\n') +
      chalk.gray('Access Scripture, Notes, Words, and Questions for Bible translation\n') +
      chalk.cyan('Supporting Mother Tongue Translators worldwide'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue'
      }
    )
  );
}

// Main program configuration
program
  .name('translation-cli')
  .description('Command-line tool for unfoldingWord Bible translation resources')
  .version(pkg.version)
  .option('-v, --verbose', 'Enable verbose output')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--no-color', 'Disable colored output')
  .option('--api-url <url>', 'Custom API base URL', 'https://api.translation.tools')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '10000')
  .option('--cache-dir <path>', 'Custom cache directory')
  .hook('preAction', (thisCommand) => {
    // Set global options
    global.cliOptions = {
      verbose: thisCommand.opts().verbose || false,
      quiet: thisCommand.opts().quiet || false,
      color: thisCommand.opts().color !== false,
      apiUrl: thisCommand.opts().apiUrl,
      timeout: parseInt(thisCommand.opts().timeout),
      cacheDir: thisCommand.opts().cacheDir
    };
    
    // Show banner unless quiet mode
    if (!global.cliOptions.quiet && process.argv.length === 2) {
      showBanner();
    }
  });

// Scripture Commands
program
  .command('scripture <reference>')
  .alias('s')
  .description('Fetch Scripture text in ULT/GLT and UST/GST translations')
  .option('-l, --language <code>', 'Strategic language code', 'en')
  .option('-f, --format <type>', 'Output format (text|json|markdown)', 'text')
  .option('--ult-only', 'Show only literal translation (ULT/GLT)')
  .option('--ust-only', 'Show only simplified translation (UST/GST)')
  .option('--with-alignment', 'Include word alignment data')
  .option('-o, --output <file>', 'Save output to file')
  .action(scriptureCommand);

// Translation Notes Commands  
program
  .command('notes <reference>')
  .alias('n')
  .description('Fetch translation notes for cultural context and explanations')
  .option('-l, --language <code>', 'Strategic language code', 'en')
  .option('-f, --format <type>', 'Output format (text|json|markdown)', 'text')
  .option('--with-links', 'Include Translation Academy links')
  .option('-o, --output <file>', 'Save output to file')
  .action(notesCommand);

// Translation Words Commands
program
  .command('words')
  .alias('w')
  .description('Manage translation words and biblical terms')
  .addCommand(
    new Command('lookup')
      .description('Look up a specific biblical term')
      .argument('<word>', 'Biblical term to look up')
      .option('-l, --language <code>', 'Strategic language code', 'en')
      .option('-f, --format <type>', 'Output format (text|json|markdown)', 'text')
      .option('--with-references', 'Include biblical usage examples')
      .action(wordsCommand.lookup)
  )
  .addCommand(
    new Command('list')
      .description('List translation words for a Scripture reference')
      .argument('<reference>', 'Scripture reference')
      .option('-l, --language <code>', 'Strategic language code', 'en')
      .option('-c, --category <type>', 'Filter by category (kt|names|other)')
      .option('-f, --format <type>', 'Output format (text|json|table)', 'table')
      .action(wordsCommand.list)
  );

// Translation Questions Commands
program
  .command('questions <reference>')
  .alias('q')
  .description('Fetch translation questions for validation and checking')
  .option('-l, --language <code>', 'Strategic language code', 'en')
  .option('-f, --format <type>', 'Output format (text|json|markdown)', 'text')
  .option('--answers', 'Include expected answers')
  .option('-o, --output <file>', 'Save output to file')
  .action(questionsCommand);

// Languages Commands
program
  .command('languages')
  .alias('lang')
  .description('Manage Strategic Languages and resource availability')
  .addCommand(
    new Command('list')
      .description('List available Strategic Languages')
      .option('-f, --format <type>', 'Output format (text|json|table)', 'table')
      .option('--strategic-only', 'Show only Strategic Languages')
      .option('--with-coverage', 'Include resource coverage information')
      .action(languagesCommand.list)
  )
  .addCommand(
    new Command('coverage')
      .description('Show resource coverage matrix for Strategic Languages')
      .option('-m, --min-completeness <percent>', 'Minimum completeness percentage', '70')
      .option('--recommended-only', 'Show only recommended languages')
      .option('-f, --format <type>', 'Output format (table|json|csv)', 'table')
      .action(languagesCommand.coverage)
  );

// Download Commands
program
  .command('download')
  .alias('dl')
  .description('Download translation resources for offline use')
  .addCommand(
    new Command('passage')
      .description('Download all resources for a specific passage')
      .argument('<reference>', 'Scripture reference')
      .option('-l, --language <code>', 'Strategic language code', 'en')
      .option('-d, --dir <path>', 'Download directory', './downloads')
      .option('--scripture', 'Include Scripture texts')
      .option('--notes', 'Include translation notes')
      .option('--words', 'Include translation words')
      .option('--questions', 'Include translation questions')
      .action(downloadCommand.passage)
  )
  .addCommand(
    new Command('book')
      .description('Download all resources for an entire book')
      .argument('<book>', 'Bible book name (e.g., "Genesis", "John")')
      .option('-l, --language <code>', 'Strategic language code', 'en')
      .option('-d, --dir <path>', 'Download directory', './downloads')
      .action(downloadCommand.book)
  )
  .addCommand(
    new Command('popular')
      .description('Download popular passages for offline use')
      .option('-l, --language <code>', 'Strategic language code', 'en')
      .option('-d, --dir <path>', 'Download directory', './downloads')
      .action(downloadCommand.popular)
  );

// Search Commands
program
  .command('search <query>')
  .description('Search across all translation resources')
  .option('-l, --language <code>', 'Strategic language code', 'en')
  .option('-t, --type <types...>', 'Resource types to search (scripture|notes|words|questions)')
  .option('-f, --format <type>', 'Output format (text|json|table)', 'text')
  .option('--limit <number>', 'Maximum number of results', '10')
  .action(searchCommand);

// Export Commands
program
  .command('export')
  .description('Export translation resources in various formats')
  .addCommand(
    new Command('study-guide')
      .description('Create a study guide for a passage')
      .argument('<reference>', 'Scripture reference')
      .option('-l, --language <code>', 'Strategic language code', 'en')
      .option('-f, --format <type>', 'Output format (pdf|html|markdown|docx)', 'markdown')
      .option('-o, --output <file>', 'Output file path')
      .option('--include-all', 'Include all available resources')
      .action(exportCommand.studyGuide)
  )
  .addCommand(
    new Command('translation-kit')
      .description('Create a complete translation kit for a book or passage')
      .argument('<reference>', 'Scripture reference or book name')
      .option('-l, --language <code>', 'Strategic language code', 'en')
      .option('-d, --dir <path>', 'Output directory', './translation-kit')
      .option('--format <type>', 'Kit format (folder|zip|tar)', 'folder')
      .action(exportCommand.translationKit)
  );

// Configuration Commands
program
  .command('config')
  .description('Manage CLI configuration and settings')
  .addCommand(
    new Command('set')
      .description('Set configuration values')
      .argument('<key>', 'Configuration key')
      .argument('<value>', 'Configuration value')
      .action(configCommand.set)
  )
  .addCommand(
    new Command('get')
      .description('Get configuration values')
      .argument('[key]', 'Configuration key (optional, shows all if omitted)')
      .action(configCommand.get)
  )
  .addCommand(
    new Command('reset')
      .description('Reset configuration to defaults')
      .option('--confirm', 'Skip confirmation prompt')
      .action(configCommand.reset)
  );

// Utility Commands
program
  .command('cache')
  .description('Manage local cache')
  .addCommand(
    new Command('clear')
      .description('Clear all cached data')
      .option('--confirm', 'Skip confirmation prompt')
      .action(require('../commands/cache').clear)
  )
  .addCommand(
    new Command('stats')
      .description('Show cache statistics')
      .action(require('../commands/cache').stats)
  );

program
  .command('health')
  .description('Check API health and connectivity')
  .option('--detailed', 'Show detailed health information')
  .action(require('../commands/health'));

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode for guided usage')
  .action(require('../commands/interactive'));

// Handle unknown commands
program.on('command:*', function (operands) {
  console.error(
    chalk.red(`\n❌ Unknown command '${operands[0]}'.\n`)
  );
  console.log(chalk.yellow('📖 See available commands:'));
  program.help();
});

// Global error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Unexpected error:'), error.message);
  if (global.cliOptions?.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 Unhandled promise rejection:'), reason);
  if (global.cliOptions?.verbose) {
    console.error('Promise:', promise);
  }
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  showBanner();
  
  console.log(chalk.yellow('\n🚀 Quick Start Examples:\n'));
  console.log(chalk.cyan('  tcli scripture "John 3:16"') + chalk.gray('          # Get Scripture text'));
  console.log(chalk.cyan('  tcli notes "Romans 8:28"') + chalk.gray('           # Get translation notes'));
  console.log(chalk.cyan('  tcli words lookup grace') + chalk.gray('           # Look up biblical term'));
  console.log(chalk.cyan('  tcli languages list') + chalk.gray('              # List Strategic Languages'));
  console.log(chalk.cyan('  tcli download passage "Psalm 23"') + chalk.gray(' # Download resources'));
  console.log(chalk.cyan('  tcli interactive') + chalk.gray('                 # Start guided mode'));
  
  console.log(chalk.yellow('\n📖 For detailed help: ') + chalk.cyan('tcli --help'));
  console.log(chalk.yellow('📖 Command help: ') + chalk.cyan('tcli <command> --help'));
  console.log(chalk.yellow('📖 Documentation: ') + chalk.cyan('https://docs.translation.tools\n'));
}
