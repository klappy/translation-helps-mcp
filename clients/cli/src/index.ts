#!/usr/bin/env node

/**
 * Translation Helps CLI
 *
 * Main entry point for the command-line interface.
 * Provides interactive chat with offline Ollama AI and MCP integration.
 */

import { Command } from "commander";
import chalk from "chalk";
import { MCPClient } from "./mcp-client.js";
import { AIProviderFactory } from "./ai-provider.js";
import { ChatInterface } from "./chat-interface.js";
import { config } from "./config.js";

const program = new Command();

program
  .name("th-cli")
  .description("Translation Helps CLI with offline AI")
  .version("1.0.0");

// Default command: start interactive chat
program.action(async (options) => {
  await startChat(options);
});

// Config command
program
  .command("config")
  .description("Show or update configuration")
  .option("--reset", "Reset to default configuration")
  .action(async (options) => {
    if (options.reset) {
      config.reset();
      console.log(chalk.green("✅ Configuration reset to defaults"));
    } else {
      config.display();
    }
  });

// Add global options
program
  .option("-m, --model <name>", "Ollama model to use")
  .option("-p, --provider <ollama|openai>", "AI provider (ollama or openai)")
  .option("--offline", "Force offline mode")
  .option("--list-models", "List available Ollama models");

// Parse arguments
program.parse();

/**
 * Start the interactive chat
 */
async function startChat(options: any): Promise<void> {
  try {
    // Load configuration
    const cfg = config.load();

    // Handle list-models option
    if (options.listModels) {
      console.log(chalk.bold("\n📋 Ollama Models:\n"));
      const { Ollama } = await import("ollama");
      const ollama = new Ollama();
      try {
        const response = await ollama.list();
        for (const model of response.models) {
          console.log(chalk.cyan(`  • ${model.name}`));
        }
      } catch (_error) {
        console.error(chalk.red("Failed to list models. Is Ollama running?"));
      }
      console.log();
      return;
    }

    // Update config based on options
    if (options.model) {
      config.setOllamaModel(options.model);
    }
    if (options.provider) {
      config.setAIProvider(options.provider);
    }
    if (options.offline) {
      config.setOfflineMode(true);
    }

    console.log(chalk.bold.blue("\n🚀 Starting Translation Helps CLI...\n"));

    // Connect to MCP server
    console.log(chalk.gray("Connecting to MCP server..."));
    const mcpClient = new MCPClient();
    await mcpClient.connect();

    // Initialize AI provider
    console.log(chalk.gray("Initializing AI provider..."));
    const aiProvider = await AIProviderFactory.create(
      options.provider || cfg.aiProvider,
      {
        ollamaModel: options.model || cfg.ollamaModel,
        ollamaBaseUrl: cfg.ollamaBaseUrl,
        openaiApiKey: process.env.OPENAI_API_KEY, // Only from environment or .env file
        openaiModel: cfg.openaiModel,
      },
    );

    // Start chat interface
    const chatInterface = new ChatInterface(aiProvider, mcpClient, config);

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log(chalk.gray("\n\nShutting down..."));
      await mcpClient.disconnect();
      process.exit(0);
    });

    // Start the chat
    await chatInterface.start();

    // Cleanup
    await mcpClient.disconnect();
  } catch (error) {
    console.error(
      chalk.red("\n❌ Error:"),
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
