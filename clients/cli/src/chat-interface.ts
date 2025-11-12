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

    // Add system message
    this.messages.push({
      role: "system",
      content: `You are a helpful assistant for Bible translation. You have access to translation helps including:
- Scripture texts (ULT, UST)
- Translation Notes
- Translation Questions  
- Translation Words
- Translation Academy

Help users understand passages and translation concepts. Be concise but thorough.`,
    });
  }

  /**
   * Start the interactive chat
   */
  async start(): Promise<void> {
    console.log(chalk.bold.blue("\n📖 Translation Helps CLI\n"));
    console.log(
      chalk.gray(
        `AI: ${this.aiProvider.name} | MCP: ${this.mcpClient.isConnected() ? "Connected" : "Disconnected"}`,
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
        if (args.length > 0 && this.aiProvider.name === "ollama") {
          const model = args[0];
          (this.aiProvider as any).setModel(model);
          console.log(chalk.green(`✅ Switched to model: ${model}`));
        } else {
          console.log(chalk.yellow("Usage: /model <model-name>"));
        }
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

    // Show AI is thinking
    process.stdout.write(chalk.green("AI: "));

    try {
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
    } catch (error) {
      console.log(
        chalk.red(
          `\n\nError: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
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
    console.log(
      chalk.cyan("  /model <name>") +
        " - Switch Ollama model (if using Ollama)",
    );
    console.log(chalk.cyan("  /offline") + " - Toggle offline mode indicator");
    console.log();
  }

  /**
   * Show status
   */
  private async showStatus(): Promise<void> {
    console.log(chalk.bold("\n📊 Status:\n"));
    console.log(`  AI Provider: ${this.aiProvider.name}`);
    if (this.aiProvider.name === "ollama") {
      console.log(`  Model: ${(this.aiProvider as any).getModel()}`);
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
