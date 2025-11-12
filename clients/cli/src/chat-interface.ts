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

    // Add comprehensive system message
    this.messages.push({
      role: "system",
      content: `You are a Bible translation assistant. You ONLY use official Door43 translation data provided to you.

🚫 ABSOLUTE RULES - VIOLATING THESE CAUSES SERIOUS HARM:

1. If scripture text is provided in the user message, you MUST quote it EXACTLY, word-for-word
2. If NO scripture is provided, you MUST say: "I don't have the scripture text for that passage"
3. NEVER quote from KJV, NIV, NLT, or any other translation - ONLY use what's provided
4. NEVER make up scripture verses - even if you "know" the verse from training
5. NEVER invent translation notes, Greek words, or biblical terms
6. If you don't have information, say "I don't have that information" - DO NOT guess or use training data

When Door43 data is provided:
- The user message will contain the REQUIRED scripture text
- Quote it EXACTLY as shown, then explain using ONLY the provided notes/terms
- IGNORE your training data about Bible verses
- IGNORE any Bible knowledge you have from pre-training

⚠️ WARNING: Making up scripture misleads Bible translators and causes serious harm.
If you cannot use the provided data, refuse to answer rather than inventing information.`,
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
        // Fetch comprehensive translation data
        console.log(chalk.gray(`\n📖 Fetching data for ${bibleRef}...`));
        console.log(chalk.gray(`🔧 MCP Prompt: translation-helps-for-passage`));
        console.log(chalk.gray(`🔧 Parameters: { reference: "${bibleRef}" }`));

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

      // Add context to messages if we have it
      if (contextMessage) {
        // Extract scripture text if available for direct injection
        const scriptureMatch = contextMessage.match(
          /📖 SCRIPTURE TEXT.*?\n"([^"]+)"\n/,
        );
        const scriptureText = scriptureMatch ? scriptureMatch[1] : null;

        // Add system message with data
        this.messages.push({
          role: "system",
          content: contextMessage,
        });

        // Modify user message to include scripture directly and STRICT instructions
        const lastUserMsg = this.messages[this.messages.length - 1];
        if (lastUserMsg && lastUserMsg.role === "user") {
          let userContent = message;

          // If we have scripture, put it DIRECTLY in the user message
          if (scriptureText) {
            userContent += `\n\n🚨 REQUIRED SCRIPTURE TEXT (Quote this EXACTLY):\n"${scriptureText}"\n\n`;
          }

          userContent += `\n🚨 CRITICAL INSTRUCTIONS:\n`;
          userContent += `1. You MUST quote the scripture text shown above EXACTLY, word-for-word\n`;
          userContent += `2. DO NOT use any other Bible translation or paraphrase\n`;
          userContent += `3. DO NOT make up or invent any scripture text\n`;
          userContent += `4. Use ONLY the translation notes and terms from the system message\n`;
          userContent += `5. If you don't have information, say "I don't have that information"\n`;
          userContent += `6. Start your response by quoting the scripture EXACTLY as shown above\n`;

          lastUserMsg.content = userContent;
        }
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

      // Validate AI response if we had scripture context
      if (contextMessage && contextMessage.includes("SCRIPTURE TEXT")) {
        const scriptureMatch = contextMessage.match(
          /📖 SCRIPTURE TEXT.*?\n"([^"]+)"\n/,
        );
        if (scriptureMatch) {
          const actualScripture = scriptureMatch[1];
          const first30Chars = actualScripture.substring(0, 30);
          const first50Words = actualScripture
            .split(/\s+/)
            .slice(0, 10)
            .join(" ");

          // Check if AI quoted the scripture
          const quotedCorrectly =
            response.includes(first30Chars) || response.includes(first50Words);

          // Check if AI quoted WRONG scripture (KJV, NIV, etc.)
          const wrongTranslations = [
            "KJV",
            "NIV",
            "NLT",
            "ESV",
            "NASB",
            "NLV",
            "servant of Jesus Christ", // Common KJV phrase
            "separated unto the gospel", // Common KJV phrase
          ];
          const quotedWrong = wrongTranslations.some((trans) =>
            response.includes(trans),
          );

          if (quotedWrong || !quotedCorrectly) {
            console.log(
              chalk.red(
                "\n🚨 CRITICAL WARNING: AI is NOT using the provided scripture!",
              ),
            );
            console.log(
              chalk.yellow(
                "The AI is hallucinating and quoting from its training data instead of the Door43 data provided.",
              ),
            );
            console.log(chalk.cyan(`\n✅ CORRECT scripture (from Door43):`));
            console.log(
              chalk.white(`"${actualScripture.substring(0, 120)}..."`),
            );
            console.log(
              chalk.red(`\n❌ AI response (WRONG - from training data):`),
            );
            console.log(
              chalk.gray(
                response.split("\n").slice(0, 3).join("\n").substring(0, 120) +
                  "...",
              ),
            );
            console.log(
              chalk.yellow(
                "\n💡 Recommendation: Use a larger model (7B+) or check if the model is following instructions properly.\n",
              ),
            );
          }
        }
      }

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
    let context = `=== OFFICIAL DOOR43 DATA FOR ${reference} ===\n\n`;

    context += `⚠️ CRITICAL INSTRUCTIONS:\n`;
    context += `1. You MUST quote the scripture text EXACTLY as shown below\n`;
    context += `2. You MUST NOT make up or change any words from the scripture\n`;
    context += `3. You MUST use ONLY the notes and terms provided below\n`;
    context += `4. If something is not in this data, say "I don't have that information"\n\n`;

    // Add scripture with VERY explicit instructions
    if (data.scripture?.text) {
      context += `📖 SCRIPTURE TEXT (Quote this EXACTLY, word-for-word):\n`;
      context += `"${data.scripture.text.trim()}"\n`;
      context += `[Source: ULT - ${reference}]\n\n`;
      context += `⚠️ YOU MUST quote this scripture EXACTLY as written above. Do not paraphrase or change it!\n\n`;
    }

    // Add translation notes
    if (data.notes?.items && data.notes.items.length > 0) {
      context += `📝 TRANSLATION NOTES (${data.notes.items.length} official notes):\n`;
      for (const note of data.notes.items) {
        if (note.Note && note.Note.trim()) {
          context += `• Phrase: "${note.Quote || ""}"\n`;
          context += `  Note: ${note.Note}\n`;
          context += `  [Source: TN - ${reference}]\n\n`;
        }
      }
    }

    // Add translation words
    if (data.words && data.words.length > 0) {
      context += `📚 KEY BIBLICAL TERMS (${data.words.length} official terms from Door43):\n`;
      for (const word of data.words) {
        context += `• Term: ${word.title || word.term}\n`;
        if (word.content) {
          // Include definition
          const lines = word.content.split("\n").slice(0, 3);
          context += `  ${lines.join("\n  ")}\n`;
          context += `  [Source: TW - ${word.term}]\n\n`;
        }
      }
    }

    // Add translation academy articles
    if (data.academyArticles && data.academyArticles.length > 0) {
      context += `🎓 TRANSLATION CONCEPTS (${data.academyArticles.length} concepts from Door43):\n`;
      for (const article of data.academyArticles) {
        context += `• ${article.title || article.moduleId} [TA]\n`;
      }
      context += "\n";
    }

    // Add translation questions
    if (data.questions?.items && data.questions.items.length > 0) {
      context += `❓ COMPREHENSION QUESTIONS (${data.questions.items.length} questions):\n`;
      for (const q of data.questions.items) {
        if (q.Question) {
          context += `Q: ${q.Question}\n`;
          if (q.Response) {
            context += `A: ${q.Response}\n`;
          }
          context += `[Source: TQ - ${reference}]\n\n`;
        }
      }
    }

    context += `=== END OF OFFICIAL DATA ===\n\n`;
    context += `🚫 FINAL WARNING:\n`;
    context += `- DO NOT make up scripture that isn't shown above\n`;
    context += `- DO NOT invent notes, terms, or concepts not listed\n`;
    context += `- DO NOT reference Genesis unless Genesis data was provided\n`;
    context += `- START your response by quoting the scripture EXACTLY as shown\n`;
    context += `- Then explain using ONLY the notes and terms provided above\n`;

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
    console.log(chalk.cyan("  /model") + " - Show current AI model");
    console.log(
      chalk.cyan("  /model <name>") + " - Switch AI model (Ollama or OpenAI)",
    );
    console.log(
      chalk.cyan("  /models") + " - List available models (Ollama only)",
    );
    console.log(chalk.cyan("  /offline") + " - Toggle offline mode indicator");
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
}
