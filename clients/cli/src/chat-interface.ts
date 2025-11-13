/**
 * Interactive Chat Interface
 *
 * REPL-style chat with streaming AI responses and special commands.
 * Supports offline indicators and Bible reference detection.
 */

import chalk from "chalk";
import inquirer from "inquirer";
import type { AIProvider, ChatMessage } from "./ai-provider.js";
import type { MCPClient } from "./mcp-client.js";
import type { ConfigManager } from "./config.js";

export class ChatInterface {
  private messages: ChatMessage[] = [];
  private aiProvider: AIProvider;
  private mcpClient: MCPClient;
  private configManager: ConfigManager;
  private isOnline: boolean = true;

  constructor(
    aiProvider: AIProvider,
    mcpClient: MCPClient,
    configManager: ConfigManager,
  ) {
    this.aiProvider = aiProvider;
    this.mcpClient = mcpClient;
    this.configManager = configManager;

    // Add comprehensive system message (matching UI chat behavior)
    this.messages.push({
      role: "system",
      content: `You are a Bible study assistant that provides information EXCLUSIVELY from the Translation Helps MCP Server database. You have access to real-time data from unfoldingWord's translation resources.

UNDERSTANDING TRANSLATION RESOURCES AND THEIR PURPOSE:

1. **Scripture Texts** (ULT, UST, etc.)
   - PURPOSE: The actual Bible text in different translations
   - USE WHEN: User needs to see/read the verse itself

2. **Translation Notes** (TN)
   - PURPOSE: Explains difficult phrases, cultural context, and alternative renderings
   - Contains Greek/Hebrew quotes being explained
   - Includes SupportReference links to Translation Academy articles
   - USE WHEN: User asks about "how to translate", "difficult phrases", "cultural context", "meaning of phrase"

3. **Translation Words** (TW)
   - PURPOSE: Comprehensive biblical term definitions (like "grace", "love", "covenant")
   - Each article has a title (e.g., "Love, Beloved") and full markdown content
   - USE WHEN: User asks about "key terms", "what does [word] mean", "biblical terms", "define"
   - TOOL USAGE: Use fetch_translation_word tool with term parameter for questions like:
     * "Who is Paul?" → term="paul"
     * "What is grace?" → term="grace"
     * "Who is God?" → term="god"
     * "What is faith?" → term="faith"
   - The tool searches across all categories (kt, names, other) automatically
   - Try variations if exact term doesn't match (e.g., "paul" might be "apostlepaul")

4. **Translation Questions** (TQ)
   - PURPOSE: Comprehension questions to check understanding
   - Helps verify accurate translation
   - USE WHEN: User asks "questions about", "comprehension", "checking", "did I understand correctly"

5. **Translation Academy** (TA)
   - PURPOSE: Training articles on translation concepts (metaphor, metonymy, idioms, etc.)
   - Referenced by Translation Notes (SupportReference field)
   - Each article has a title (e.g., "Metaphor") and full markdown content
   - USE WHEN: User asks about "concepts", "translation techniques", "figures of speech", "how to handle [concept]"

6. **Translation Word Links** (TWL)
   - PURPOSE: Shows which specific terms appear in a passage
   - USE WHEN: Needed as intermediate step to get word articles for a passage

CRITICAL RULES YOU MUST FOLLOW:

1. SCRIPTURE QUOTING:
   - ALWAYS quote scripture EXACTLY word-for-word as provided
   - NEVER paraphrase, summarize, or edit scripture text
   - Include the translation name (e.g., "ULT v86") with every quote

2. CITATIONS:
   - ALWAYS provide citations for EVERY quote or reference
   - Format: [Resource Name - Reference]
   - Examples:
     * Scripture: [ULT v86 - John 3:16]
     * Notes: [TN v86 - John 3:16]
     * Questions: [TQ v86 - John 3:16]
     * Words: [TW v86 - love] (use the TITLE if available)
     * Academy: [TA v86 - Metaphor] (use the TITLE if available)
   - When citing translation notes/questions, include the specific verse reference
   - NEVER present information without a citation

3. DATA SOURCES:
   - ONLY use information from the MCP server responses provided to you
   - NEVER use your training data about the Bible
   - NEVER add interpretations not found in the resources
   - If data isn't available, say so clearly

4. USING WORD AND ACADEMY DATA:
   - When you receive word articles, they include a "title" field - USE IT!
   - Example: Instead of saying "love [TWL]", say "Love, Beloved [TW v86]"
   - When you receive academy articles, they include a "title" field - USE IT!
   - Example: Instead of saying "figs-metaphor", say "Metaphor [TA v86]"
   - Include the actual article titles to give users proper context
   - ALWAYS include Translation Academy articles section when present in the data

5. GUIDED LEARNING CONVERSATION STRUCTURE:
   
   **IMPORTANT: This is a MULTI-TURN CONVERSATION, not a one-shot response**
   
   When user asks for comprehensive help, you become their **translation training guide**. Lead them through the resources step by step.
   
   **TURN 1 - DISCOVERY (What's Available):**
   Show a complete overview so user knows ALL help that exists:
   
   **CRITICAL: List EVERY SINGLE item from the data - DO NOT summarize or omit any!**
   
   Example format:
   
   "Here's what I found to help you translate Romans 12:2:
   
   📖 Scripture: [Quote the verse]
   
   📝 Translation Challenges (5 notes found):
   - 'do not be conformed' (passive voice)
   - 'do not conform yourselves' (meaning)
   - 'this age' (cultural reference)
   - 'renewal of the mind' (abstract noun + metaphor)
   - 'will of God' (abstract nouns)
   
   📚 Key Biblical Terms (6 terms found - LIST ALL):
   - age, aged, old, old age, years old
   - mind, mindful, remind, reminder, likeminded
   - God
   - will of God
   - good, right, pleasant, better, best
   - perfect, complete
   
   🎓 Translation Concepts (4 concepts found - LIST ALL):
   - Active or Passive
   - Metonymy
   - Abstract Nouns
   - Metaphor
   
   ❓ Comprehension Questions: 1 available
   
   Where would you like to start your learning? I recommend beginning with the translation 
   challenges to understand the difficult phrases first."
   
   **TURN 2+ - GUIDED EXPLORATION:**
   Based on what user chooses, show that content + suggest next logical step.
   
   **MAKE IT CONVERSATIONAL:**
   - Use "Would you like to..." instead of "Do you want..."
   - Be encouraging: "Great question!", "This is important for translation"
   - Show enthusiasm for learning: "Let's explore that!"
   - Acknowledge progress: "You've covered the main concepts now"

6. TRANSLATION NOTES STRUCTURE:
   - Translation notes contain several fields for each entry:
     * Quote: Contains the Greek/Hebrew text being explained (this is the original language phrase)
     * Note: The explanation or commentary about that phrase
     * Reference: The verse reference
     * ID: Unique identifier for the note
     * SupportReference: Additional biblical references if applicable
   - When asked about Greek/Hebrew quotes, the "Quote" field in translation notes contains that original language text
   - Each note explains a specific Greek/Hebrew phrase found in the original biblical text

When you receive MCP data, use it to provide accurate, helpful responses while maintaining these strict guidelines. Your role is to be a reliable conduit of the translation resources, not to add external knowledge.`,
    });
  }

  /**
   * Start the interactive chat
   */
  async start(): Promise<void> {
    console.log(chalk.bold.blue("\n📖 Translation Helps CLI\n"));
    const currentModel = (this.aiProvider as any).getModel?.();
    const modelInfo = currentModel ? ` (${currentModel})` : "";
    console.log(
      chalk.gray(
        `AI: ${this.aiProvider.name}${modelInfo} | MCP: ${this.mcpClient.isConnected() ? "Connected" : "Disconnected"}`,
      ),
    );
    console.log(chalk.gray(`Type /help for commands or /exit to quit\n`));

    // Show welcome message (matching UI behavior)
    const welcomeMessage = `Hello! I'm an MCP Bible study assistant. I provide information exclusively from our translation resources database.

I can help you access:
• **Scripture** - "Show me John 3:16"
• **Translation Notes** - "What do the notes say about Titus 1?"
• **Word Definitions** - "Define 'agape' from Translation Words"
• **Study Questions** - "Questions for Genesis 1"
• **Translation Academy** - "Article about metaphors"

Important: I only share what's available in our MCP database - no external biblical interpretations. All my responses come directly from unfoldingWord's translation resources.

Try one of these to get started:
  📖 "Show me John 3:16"
  💝 "What does 'love' mean in the Bible?" or "Who is Paul?" or "What is grace?"
  📝 "Explain the notes on Ephesians 2:8-9"
  ❓ "What questions should I consider for Genesis 1?"

Just ask naturally - I'll fetch the exact resources you need! 📚`;

    console.log(chalk.cyan(welcomeMessage));
    console.log(); // Empty line

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const { message } = await inquirer.prompt([
          {
            type: "input",
            name: "message",
            message: this.getPrompt(),
            prefix: "",
          },
        ]);

        const trimmed = message.trim();

        if (!trimmed) continue;

        // Check for special commands
        if (trimmed.startsWith("/")) {
          const shouldContinue = await this.handleCommand(trimmed);
          if (!shouldContinue) break;
          continue;
        }

        // Regular chat message
        await this.handleChatMessage(trimmed);
      } catch (error) {
        if ((error as any).isTtyError) {
          console.error(
            chalk.red("Prompt couldn't be rendered in this environment"),
          );
          break;
        }
        console.error(chalk.red("Error:"), error);
      }
    }
  }

  /**
   * Get prompt with offline indicator
   */
  private getPrompt(): string {
    const offlineIndicator = this.isOnline ? "" : chalk.red(" [OFFLINE]");
    return chalk.cyan("You") + offlineIndicator + chalk.gray(":");
  }

  /**
   * Handle special commands
   */
  private async handleCommand(command: string): Promise<boolean> {
    const parts = command.slice(1).split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "help":
        this.showHelp();
        break;

      case "exit":
      case "quit":
        console.log(chalk.gray("\n👋 Goodbye!\n"));
        return false;

      case "clear":
        this.messages = this.messages.slice(0, 1); // Keep only system message
        console.log(chalk.gray("✅ Conversation cleared"));
        break;

      case "status":
        await this.showStatus();
        break;

      case "config":
        this.configManager.display();
        break;

      case "providers":
        await this.showProviders();
        break;

      case "model":
        if (args.length > 0) {
          // Switch model
          if (this.aiProvider.name === "ollama") {
            const model = args[0];
            (this.aiProvider as any).setModel(model);
            console.log(chalk.green(`✅ Switched to model: ${model}`));
          } else if (this.aiProvider.name === "openai") {
            const model = args[0];
            (this.aiProvider as any).setModel(model);
            console.log(chalk.green(`✅ Switched to model: ${model}`));
          } else {
            console.log(
              chalk.yellow("Model switching not supported for this provider"),
            );
          }
        } else {
          // Show current model
          this.showCurrentModel();
        }
        break;

      case "models":
        await this.listAvailableModels();
        break;

      case "offline":
        this.isOnline = !this.isOnline;
        console.log(
          chalk.gray(`${this.isOnline ? "🌐 Online" : "📴 Offline"} mode`),
        );
        break;

      case "provider":
        if (args.length > 0) {
          const provider = args[0].toLowerCase() as "ollama" | "openai";
          if (provider === "ollama" || provider === "openai") {
            await this.switchProvider(provider);
          } else {
            console.log(chalk.yellow("Provider must be 'ollama' or 'openai'"));
          }
        } else {
          this.showCurrentProvider();
        }
        break;

      case "set-openai-key":
        // Always use secure input (masked)
        await this.setOpenAIKeySecurely();
        break;

      default:
        console.log(chalk.red(`Unknown command: /${cmd}`));
        console.log(chalk.gray("Type /help for available commands"));
    }

    return true;
  }

  /**
   * Handle regular chat message
   */
  private async handleChatMessage(message: string): Promise<void> {
    // Add user message
    this.messages.push({
      role: "user",
      content: message,
    });

    try {
      // Check if message contains a Bible reference
      const bibleRef = this.extractBibleReference(message);

      let contextMessage = "";

      if (bibleRef && this.mcpClient.isConnected()) {
        // Discover available prompts dynamically (like Svelte app)
        const prompts = await this.mcpClient.listPrompts();
        const prompt = prompts.find(
          (p) => p.name === "translation-helps-for-passage",
        );

        if (prompt) {
          console.log(chalk.gray(`\n📖 Fetching data for ${bibleRef}...`));
          console.log(chalk.gray(`🔧 MCP Prompt: ${prompt.name}`));
          console.log(
            chalk.gray(`🔧 Description: ${prompt.description || "N/A"}`),
          );
          console.log(
            chalk.gray(`🔧 Parameters: { reference: "${bibleRef}" }`),
          );
        } else {
          console.log(
            chalk.yellow(
              `\n⚠️  Prompt 'translation-helps-for-passage' not found, using direct tool calls`,
            ),
          );
        }

        try {
          const data = await this.mcpClient.executePrompt(
            "translation-helps-for-passage",
            { reference: bibleRef },
          );

          if (data) {
            // Log the actual data received
            console.log(chalk.gray(`\n✅ MCP Response Received:`));

            if (data.scripture?.text) {
              const fullText = data.scripture.text.trim();
              console.log(chalk.cyan(`\n📖 SCRIPTURE (ULT):`));
              console.log(chalk.white(`"${fullText}"`));
              console.log(
                chalk.gray(`Length: ${fullText.length} characters\n`),
              );
            } else {
              console.log(chalk.yellow(`⚠️  No scripture text in response`));
            }

            if (data.notes?.items) {
              console.log(
                chalk.gray(`📝 Notes: ${data.notes.items.length} items`),
              );
            }

            if (data.words) {
              console.log(chalk.gray(`📚 Words: ${data.words.length} items`));
            }

            if (data.academyArticles) {
              console.log(
                chalk.gray(
                  `🎓 Academy: ${data.academyArticles.length} articles`,
                ),
              );
            }

            if (data.questions?.items) {
              console.log(
                chalk.gray(
                  `❓ Questions: ${data.questions.items.length} items`,
                ),
              );
            }

            console.log(chalk.gray(`\n🤖 Sending to AI with this data...\n`));

            // Optionally save full response for debugging
            if (process.env.DEBUG_MCP === "true") {
              const fs = await import("fs");
              const debugFile = `.mcp-debug-${Date.now()}.json`;
              fs.writeFileSync(debugFile, JSON.stringify(data, null, 2));
              console.log(
                chalk.gray(`💾 Full MCP response saved to: ${debugFile}\n`),
              );
            }

            contextMessage = this.formatTranslationData(data, bibleRef);
          } else {
            console.log(chalk.yellow(`⚠️  MCP returned no data`));
          }
        } catch (error) {
          console.log(
            chalk.red(
              `\n❌ MCP Error: ${error instanceof Error ? error.message : String(error)}\n`,
            ),
          );
        }
      }

      // Add context to messages if we have it (clean format matching UI)
      if (contextMessage) {
        // Add system message with data (the system prompt already has all the rules)
        this.messages.push({
          role: "system",
          content: contextMessage,
        });
        // User message stays as-is - the system prompt handles the rules
      }

      // Show AI is thinking
      process.stdout.write(chalk.green("AI: "));

      // Get AI response with streaming
      let response = "";
      await this.aiProvider.chat(this.messages, (chunk) => {
        response += chunk;
        process.stdout.write(chunk);
      });

      console.log("\n"); // New line after response

      // Add AI response to history
      this.messages.push({
        role: "assistant",
        content: response,
      });

      // Remove the context message from history to avoid bloat
      // Keep only user message and assistant response
      if (contextMessage) {
        const sysIndex = this.messages.findIndex(
          (m) => m.role === "system" && m.content === contextMessage,
        );
        if (sysIndex > 0) {
          this.messages.splice(sysIndex, 1);
        }
      }
    } catch (error) {
      console.log(
        chalk.red(
          `\n\nError: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Extract Bible reference from user message
   * Matches patterns like "Romans 12:2", "John 3:16", "Genesis 1:1-3"
   */
  private extractBibleReference(message: string): string | null {
    // Common Bible book names
    const books = [
      "Genesis",
      "Exodus",
      "Leviticus",
      "Numbers",
      "Deuteronomy",
      "Joshua",
      "Judges",
      "Ruth",
      "1 Samuel",
      "2 Samuel",
      "1 Kings",
      "2 Kings",
      "1 Chronicles",
      "2 Chronicles",
      "Ezra",
      "Nehemiah",
      "Esther",
      "Job",
      "Psalms?",
      "Proverbs?",
      "Ecclesiastes",
      "Song of Solomon",
      "Isaiah",
      "Jeremiah",
      "Lamentations",
      "Ezekiel",
      "Daniel",
      "Hosea",
      "Joel",
      "Amos",
      "Obadiah",
      "Jonah",
      "Micah",
      "Nahum",
      "Habakkuk",
      "Zephaniah",
      "Haggai",
      "Zechariah",
      "Malachi",
      "Matthew",
      "Mark",
      "Luke",
      "John",
      "Acts",
      "Romans",
      "1 Corinthians",
      "2 Corinthians",
      "Galatians",
      "Ephesians",
      "Philippians",
      "Colossians",
      "1 Thessalonians",
      "2 Thessalonians",
      "1 Timothy",
      "2 Timothy",
      "Titus",
      "Philemon",
      "Hebrews",
      "James",
      "1 Peter",
      "2 Peter",
      "1 John",
      "2 John",
      "3 John",
      "Jude",
      "Revelation",
    ];

    // Build regex pattern
    const bookPattern = books.join("|");
    const refPattern = new RegExp(
      `(${bookPattern})\\s+(\\d+):(\\d+)(?:-(\\d+))?`,
      "i",
    );

    const match = message.match(refPattern);
    if (match) {
      // Return the full matched reference
      return match[0];
    }

    return null;
  }

  /**
   * Format translation data for AI context
   */
  private formatTranslationData(data: any, reference: string): string {
    // Clean format matching UI behavior - system prompt already has all the rules
    let context = `Translation Helps Data for ${reference}:\n\n`;

    // Add scripture
    if (data.scripture?.text) {
      context += `Scripture (ULT):\n${data.scripture.text.trim()}\n\n`;
    }

    // Add translation notes
    if (data.notes?.items && data.notes.items.length > 0) {
      context += `Translation Notes (${data.notes.items.length} notes):\n`;
      for (const note of data.notes.items) {
        if (note.Note && note.Note.trim()) {
          context += `- Quote: "${note.Quote || ""}"\n`;
          context += `  Note: ${note.Note}\n`;
          context += `  Reference: ${note.Reference || reference}\n`;
          if (note.SupportReference) {
            context += `  SupportReference: ${note.SupportReference}\n`;
          }
          context += `\n`;
        }
      }
    }

    // Add translation words (with titles)
    if (data.words && data.words.length > 0) {
      context += `Translation Words (${data.words.length} terms):\n`;
      for (const word of data.words) {
        context += `- Title: ${word.title || word.term}\n`;
        if (word.content) {
          context += `  Content: ${word.content}\n`;
        }
        context += `\n`;
      }
    }

    // Add translation academy articles (with titles)
    if (data.academyArticles && data.academyArticles.length > 0) {
      context += `Translation Academy Articles (${data.academyArticles.length} articles):\n`;
      for (const article of data.academyArticles) {
        context += `- Title: ${article.title || article.moduleId}\n`;
        if (article.content) {
          context += `  Content: ${article.content}\n`;
        }
        context += `\n`;
      }
    }

    // Add translation questions
    if (data.questions?.items && data.questions.items.length > 0) {
      context += `Translation Questions (${data.questions.items.length} questions):\n`;
      for (const q of data.questions.items) {
        if (q.Question) {
          context += `- Question: ${q.Question}\n`;
          if (q.Response) {
            context += `  Response: ${q.Response}\n`;
          }
          context += `\n`;
        }
      }
    }

    return context;
  }

  /**
   * Show help message
   */
  private showHelp(): void {
    console.log(chalk.bold("\n📚 Available Commands:\n"));
    console.log(chalk.cyan("  /help") + " - Show this help message");
    console.log(chalk.cyan("  /exit") + " - Exit the chat");
    console.log(chalk.cyan("  /clear") + " - Clear conversation history");
    console.log(
      chalk.cyan("  /status") + " - Show connection and cache status",
    );
    console.log(chalk.cyan("  /config") + " - Show configuration");
    console.log(chalk.cyan("  /providers") + " - Show active cache providers");
    console.log(chalk.cyan("  /provider") + " - Show current AI provider");
    console.log(
      chalk.cyan("  /provider <ollama|openai>") + " - Switch AI provider",
    );
    console.log(chalk.cyan("  /model") + " - Show current AI model");
    console.log(
      chalk.cyan("  /model <name>") + " - Switch AI model (Ollama or OpenAI)",
    );
    console.log(
      chalk.cyan("  /models") + " - List available models (Ollama only)",
    );
    console.log(
      chalk.cyan("  /set-openai-key <key>") + " - Set OpenAI API key",
    );
    console.log(chalk.cyan("  /offline") + " - Toggle offline mode indicator");
    console.log();
    console.log(
      chalk.gray(
        "  💡 Tip: You can also set OPENAI_API_KEY environment variable",
      ),
    );
    console.log();
  }

  /**
   * Show status
   */
  private async showStatus(): Promise<void> {
    console.log(chalk.bold("\n📊 Status:\n"));
    console.log(`  AI Provider: ${chalk.cyan(this.aiProvider.name)}`);
    const currentModel = (this.aiProvider as any).getModel?.();
    if (currentModel) {
      console.log(`  Model: ${chalk.cyan(currentModel)}`);
    }
    console.log(
      `  MCP: ${this.mcpClient.isConnected() ? chalk.green("Connected") : chalk.red("Disconnected")}`,
    );
    console.log(
      `  Network: ${this.isOnline ? chalk.green("Online") : chalk.red("Offline")}`,
    );
    console.log(`  Messages: ${this.messages.length - 1}`); // Exclude system message
    console.log();
  }

  /**
   * Show current model
   */
  private showCurrentModel(): void {
    console.log(chalk.bold("\n🤖 Current AI Model:\n"));
    const currentModel = (this.aiProvider as any).getModel?.();
    if (currentModel) {
      console.log(`  Provider: ${chalk.cyan(this.aiProvider.name)}`);
      console.log(`  Model: ${chalk.cyan(currentModel)}`);
    } else {
      console.log(chalk.yellow("  Model information not available"));
    }
    console.log();
  }

  /**
   * List available models (Ollama only)
   */
  private async listAvailableModels(): Promise<void> {
    console.log(chalk.bold("\n📋 Available Models:\n"));

    if (this.aiProvider.name === "ollama") {
      try {
        const models = await (this.aiProvider as any).listModels();
        const currentModel = (this.aiProvider as any).getModel();

        if (models.length === 0) {
          console.log(
            chalk.yellow(
              "  No models found. Install models with: ollama pull <model-name>",
            ),
          );
        } else {
          models.forEach((model: string) => {
            const isCurrent = model === currentModel;
            const marker = isCurrent ? chalk.green("✓") : " ";
            const name = isCurrent ? chalk.cyan.bold(model) : chalk.gray(model);
            console.log(`  ${marker} ${name}`);
          });
          console.log(chalk.gray(`\n  Current: ${currentModel}`));
          console.log(chalk.gray(`  Switch with: /model <model-name>`));
        }
      } catch (error) {
        console.log(
          chalk.red(
            `  Failed to list models: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    } else if (this.aiProvider.name === "openai") {
      const currentModel = (this.aiProvider as any).getModel();
      console.log(chalk.yellow("  OpenAI models are configured via API key."));
      console.log(`  Current model: ${chalk.cyan(currentModel)}`);
      console.log(chalk.gray(`  Switch with: /model <model-name>`));
      console.log(
        chalk.gray(
          `  Common models: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo`,
        ),
      );
    } else {
      console.log(
        chalk.yellow("  Model listing not supported for this provider"),
      );
    }
    console.log();
  }

  /**
   * Show active cache providers
   */
  private async showProviders(): Promise<void> {
    console.log(chalk.bold("\n🔧 Cache Providers:\n"));
    try {
      const providers = await this.mcpClient.getActiveProviders();
      console.log(`  Active: ${providers.join(" → ")}`);
    } catch (_error) {
      console.log(chalk.red("  Failed to get providers from MCP server"));
    }
    console.log();
  }

  /**
   * Show current AI provider
   */
  private async showCurrentProvider(): Promise<void> {
    console.log(chalk.bold("\n🤖 Current AI Provider:\n"));
    console.log(`  Provider: ${chalk.cyan(this.aiProvider.name)}`);
    const currentModel = (this.aiProvider as any).getModel?.();
    if (currentModel) {
      console.log(`  Model: ${chalk.cyan(currentModel)}`);
    }
    if (this.aiProvider.name === "openai") {
      const hasKey = !!process.env.OPENAI_API_KEY;
      const envPath = this.configManager.getEnvPath();
      const fs = await import("fs");
      const fromEnvFile = hasKey && fs.existsSync(envPath);

      console.log(
        `  API Key: ${hasKey ? chalk.green("Set") : chalk.red("Not set")}`,
      );
      if (hasKey) {
        console.log(
          chalk.gray(
            `    Source: ${fromEnvFile ? ".env file" : "Environment variable"}`,
          ),
        );
      } else {
        console.log(chalk.yellow("  Use /set-openai-key to save to .env file"));
        console.log(
          chalk.gray(
            "  Or set environment variable: export OPENAI_API_KEY=your-key",
          ),
        );
      }
    }
    console.log();
  }

  /**
   * Set OpenAI API key securely (masked input, saves to .env file)
   */
  private async setOpenAIKeySecurely(): Promise<void> {
    try {
      console.log(chalk.cyan("\n📝 Setting OpenAI API Key\n"));
      console.log(
        chalk.gray(
          "The API key will be saved to a .env file in the current directory.\n",
        ),
      );

      const { default: inquirer } = await import("inquirer");
      const answer = await inquirer.prompt([
        {
          type: "password",
          name: "apiKey",
          message: "Enter OpenAI API key:",
          mask: "*",
        },
      ]);

      if (!answer.apiKey || answer.apiKey.trim().length === 0) {
        console.log(chalk.yellow("❌ No API key provided"));
        return;
      }

      this.configManager.setOpenAIApiKey(answer.apiKey.trim());
      const envPath = this.configManager.getEnvPath();

      console.log(chalk.green("\n✅ OpenAI API key saved to .env file"));
      console.log(chalk.gray(`   Location: ${envPath}\n`));
      console.log(
        chalk.yellow("⚠️  IMPORTANT: Add .env to your .gitignore file!"),
      );
      console.log(
        chalk.gray(
          "   The .env file contains sensitive credentials and should not be committed to version control.\n",
        ),
      );
      console.log(
        chalk.cyan(
          "💡 Alternative: You can also set it as an environment variable:",
        ),
      );
      console.log(chalk.gray("   Linux/macOS: export OPENAI_API_KEY=your-key"));
      console.log(chalk.gray("   Windows: set OPENAI_API_KEY=your-key\n"));
    } catch (error) {
      console.log(
        chalk.red(
          `\n❌ Failed to save API key: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      console.log(
        chalk.yellow("\n💡 Alternative: Set it as an environment variable:"),
      );
      console.log(chalk.gray("   Linux/macOS: export OPENAI_API_KEY=your-key"));
      console.log(chalk.gray("   Windows: set OPENAI_API_KEY=your-key\n"));
    }
  }

  /**
   * Switch AI provider
   */
  private async switchProvider(provider: "ollama" | "openai"): Promise<void> {
    const cfg = this.configManager.get();

    if (provider === "openai") {
      // Check if API key is set
      const hasKey = !!process.env.OPENAI_API_KEY;
      if (!hasKey) {
        console.log(
          chalk.red("\n❌ OpenAI API key not set. Please set it first:\n"),
        );
        console.log(chalk.cyan("  /set-openai-key"));
        console.log(
          chalk.gray("  This will save the key to a .env file (secure).\n"),
        );
        console.log(
          chalk.gray(
            "  Or set environment variable: export OPENAI_API_KEY=your-key\n",
          ),
        );
        return;
      }
    }

    try {
      // Update config
      this.configManager.setAIProvider(provider);

      // Recreate AI provider
      const { AIProviderFactory } = await import("./ai-provider.js");
      const newProvider = await AIProviderFactory.create(provider, {
        ollamaModel: cfg.ollamaModel,
        ollamaBaseUrl: cfg.ollamaBaseUrl,
        openaiApiKey: process.env.OPENAI_API_KEY, // Only from environment or .env file
        openaiModel: cfg.openaiModel,
      });

      // Update the provider
      (this as any).aiProvider = newProvider;

      console.log(chalk.green(`✅ Switched to provider: ${provider}`));
      const currentModel = (this.aiProvider as any).getModel?.();
      if (currentModel) {
        console.log(chalk.gray(`  Model: ${currentModel}`));
      }
    } catch (error) {
      console.log(
        chalk.red(
          `Failed to switch provider: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      console.log(
        chalk.yellow(
          "Provider may not be available. Check your configuration.",
        ),
      );
    }
  }
}
