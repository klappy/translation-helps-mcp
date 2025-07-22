/**
 * Scripture Command Implementation
 * 
 * Fetches Scripture text in ULT/GLT (literal) and UST/GST (simplified) translations
 * with various output formats and options
 */

const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const { table } = require('table');
const TranslationAPI = require('../lib/TranslationAPI');
const { formatScriptureText, formatScriptureMarkdown, formatScriptureJson } = require('../utils/formatters');
const { validateReference, normalizeReference } = require('../utils/validators');
const logger = require('../utils/logger');

module.exports = async function scriptureCommand(reference, options) {
  const spinner = ora('Fetching Scripture text...').start();
  
  try {
    // Validate and normalize the reference
    if (!validateReference(reference)) {
      spinner.fail(chalk.red('Invalid Scripture reference format'));
      console.log(chalk.yellow('\n💡 Examples of valid references:'));
      console.log('  • John 3:16');
      console.log('  • Genesis 1:1-5');
      console.log('  • Psalm 23');
      console.log('  • Matthew 5:3-12');
      process.exit(1);
    }

    const normalizedRef = normalizeReference(reference);
    const api = new TranslationAPI();

    // Update spinner message
    spinner.text = `Fetching ${normalizedRef} in ${options.language.toUpperCase()}...`;

    // Fetch Scripture data
    const scriptureData = await api.fetchScripture(normalizedRef, options.language, {
      includeAlignment: options.withAlignment,
      includeVerseNumbers: true
    });

    spinner.succeed(chalk.green('Scripture retrieved successfully'));

    // Process and display the data
    await displayScripture(scriptureData, options, normalizedRef);

  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch Scripture'));
    
    if (global.cliOptions.verbose) {
      console.error(chalk.red('\nError details:'), error.message);
      console.error(error.stack);
    } else {
      console.error(chalk.red('\nError:'), error.message);
      console.log(chalk.yellow('\n💡 Try running with --verbose for more details'));
    }

    // Suggest alternatives
    if (error.message.includes('not found')) {
      console.log(chalk.yellow('\n🔍 Suggestions:'));
      console.log('  • Check the reference spelling');
      console.log('  • Try a different Strategic Language (--language)');
      console.log('  • Use: tcli languages list --strategic-only');
    }

    process.exit(1);
  }
};

async function displayScripture(scriptureData, options, reference) {
  const scripture = scriptureData.scripture || {};
  const hasUlt = scripture.ult;
  const hasUst = scripture.ust;
  const fallbackText = scripture.text;

  // Header
  if (!global.cliOptions.quiet) {
    console.log('\n' + chalk.blue('═'.repeat(60)));
    console.log(chalk.bold.blue(`📖 ${scripture.citation || reference}`));
    console.log(chalk.gray(`Language: ${options.language.toUpperCase()} • Format: ${options.format}`));
    console.log(chalk.blue('═'.repeat(60)));
  }

  // Handle different output formats
  switch (options.format) {
    case 'json':
      await outputJson(scriptureData, options);
      break;
    case 'markdown':
      await outputMarkdown(scripture, options, reference);
      break;
    default: // text
      await outputText(scripture, options, hasUlt, hasUst, fallbackText);
      break;
  }

  // Show metadata
  if (!global.cliOptions.quiet && scriptureData.metadata) {
    console.log('\n' + chalk.gray('─'.repeat(40)));
    console.log(chalk.gray('�� Response Metadata:'));
    
    const metadata = scriptureData.metadata;
    if (metadata.responseTime) {
      console.log(chalk.gray(`   ⚡ Response time: ${metadata.responseTime}ms`));
    }
    if (metadata.cached) {
      console.log(chalk.gray('   💾 Served from cache'));
    }
    if (metadata.filesFound) {
      console.log(chalk.gray(`   📁 Files found: ${metadata.filesFound}`));
    }
  }
}

async function outputText(scripture, options, hasUlt, hasUst, fallbackText) {
  // Display based on options
  if (options.ultOnly && hasUlt) {
    console.log(chalk.green('\n🔤 Literal Text (ULT/GLT):'));
    console.log(chalk.gray('Form-centric translation preserving original structure\n'));
    console.log(formatScriptureText(hasUlt.text || hasUlt));
    
  } else if (options.ustOnly && hasUst) {
    console.log(chalk.blue('\n💬 Simplified Text (UST/GST):'));
    console.log(chalk.gray('Meaning-based translation for clear communication\n'));
    console.log(formatScriptureText(hasUst.text || hasUst));
    
  } else if (hasUlt || hasUst) {
    // Show both translations
    if (hasUlt) {
      console.log(chalk.green('\n🔤 Literal Text (ULT/GLT):'));
      console.log(chalk.gray('Form-centric translation preserving original structure\n'));
      console.log(formatScriptureText(hasUlt.text || hasUlt));
    }
    
    if (hasUst) {
      console.log(chalk.blue('\n💬 Simplified Text (UST/GST):'));
      console.log(chalk.gray('Meaning-based translation for clear communication\n'));
      console.log(formatScriptureText(hasUst.text || hasUst));
    }
    
  } else if (fallbackText) {
    console.log(chalk.yellow('\n📜 Scripture Text:'));
    console.log(formatScriptureText(fallbackText));
    
  } else {
    console.log(chalk.red('\n❌ No Scripture text available for this reference'));
  }

  // Show word alignment if requested
  if (options.withAlignment && (hasUlt?.alignment || hasUst?.alignment)) {
    console.log(chalk.magenta('\n🔗 Word Alignment Data:'));
    console.log(chalk.gray('Precise word-level connections to original Hebrew/Greek\n'));
    
    if (hasUlt?.alignment) {
      console.log(chalk.green('ULT/GLT Alignment:'));
      console.log(JSON.stringify(hasUlt.alignment, null, 2));
    }
    
    if (hasUst?.alignment) {
      console.log(chalk.blue('\nUST/GST Alignment:'));
      console.log(JSON.stringify(hasUst.alignment, null, 2));
    }
  }
}

async function outputMarkdown(scripture, options, reference) {
  const markdown = formatScriptureMarkdown(scripture, reference, options);
  
  if (options.output) {
    await saveToFile(markdown, options.output, 'markdown');
  } else {
    console.log(markdown);
  }
}

async function outputJson(scriptureData, options) {
  const json = formatScriptureJson(scriptureData, options);
  
  if (options.output) {
    await saveToFile(json, options.output, 'json');
  } else {
    console.log(json);
  }
}

async function saveToFile(content, outputPath, format) {
  try {
    // Ensure directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    // Write file
    await fs.writeFile(outputPath, content, 'utf8');
    
    console.log(chalk.green(`\n✅ Output saved to: ${outputPath}`));
    
    // Log the action
    logger.info(`Scripture exported to ${outputPath} (${format})`);
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Failed to save file: ${error.message}`));
    process.exit(1);
  }
}
