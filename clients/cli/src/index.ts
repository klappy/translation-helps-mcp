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

// Export command
program
  .command("export")
  .description("Export cached ZIP files for sharing")
  .option("-l, --language <lang>", "Export resources for a specific language")
  .option("-r, --resource <type>", "Export a specific resource type")
  .option("-o, --output <path>", "Output directory path")
  .action(async (options) => {
    // Import from the main package (relative to CLI location)
    const { ResourceTransfer } = await import(
      "../../../src/services/ResourceTransfer.js"
    );
    const cfg = config.load();
    const transfer = new ResourceTransfer(cfg.cachePath);

    if (options.language && options.resource) {
      const outputPath = await transfer.exportResource(
        options.language,
        options.resource,
        { outputPath: options.output },
      );
      if (outputPath) {
        console.log(chalk.green(`✅ Exported to: ${outputPath}`));
      } else {
        console.log(chalk.red("❌ Export failed"));
      }
    } else if (options.language) {
      const outputPath = await transfer.exportLanguage(options.language, {
        outputPath: options.output,
      });
      if (outputPath) {
        console.log(chalk.green(`✅ Exported to: ${outputPath}`));
      } else {
        console.log(chalk.red("❌ Export failed"));
      }
    } else {
      const outputPath = await transfer.exportAll({ outputPath: options.output });
      if (outputPath) {
        console.log(chalk.green(`✅ Exported all to: ${outputPath}`));
      } else {
        console.log(chalk.red("❌ Export failed"));
      }
    }
  });

// Import command
program
  .command("import")
  .description("Import ZIP files into local cache")
  .argument("<path>", "Path to ZIP file or directory containing ZIP files")
  .action(async (filePath) => {
    const { ResourceTransfer } = await import(
      "../../../src/services/ResourceTransfer.js"
    );
    const cfg = config.load();
    const transfer = new ResourceTransfer(cfg.cachePath);

    const fs = await import("fs");
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const result = await transfer.importBulk(filePath);
      console.log(
        chalk.green(
          `✅ Imported ${result.imported.length} files, ${result.failed.length} failed`,
        ),
      );
      if (result.errors.length > 0) {
        console.log(chalk.yellow("Errors:"));
        result.errors.forEach((e: { file: string; error: string }) => {
          console.log(chalk.red(`  - ${e.file}: ${e.error}`));
        });
      }
    } else {
      const result = await transfer.importZip(filePath);
      if (result.success) {
        console.log(chalk.green(`✅ Imported: ${result.imported.join(", ")}`));
      } else {
        console.log(chalk.red("❌ Import failed"));
        result.errors.forEach((e: { file: string; error: string }) => {
          console.log(chalk.red(`  - ${e.file}: ${e.error}`));
        });
      }
    }
  });

// Sync command
program
  .command("sync")
  .description("Download/sync resources from Door43")
  .option("-l, --language <lang>", "Sync resources for a specific language")
  .option("-r, --resource <type>", "Sync a specific resource type")
  .action(async (options) => {
    const { ResourceSync } = await import(
      "../../../src/services/ResourceSync.js"
    );
    const cfg = config.load();
    const sync = new ResourceSync(cfg.cachePath);

    if (options.language && options.resource) {
      const success = await sync.downloadResource(
        "unfoldingWord",
        options.language,
        options.resource,
      );
      if (success) {
        console.log(chalk.green("✅ Sync completed"));
      } else {
        console.log(chalk.red("❌ Sync failed"));
      }
    } else if (options.language) {
      await sync.downloadAll(
        "unfoldingWord",
        options.language,
        (status: {
          resources: Array<{ status: string }>;
        }) => {
          const completed = status.resources.filter(
            (r: { status: string }) => r.status === "completed",
          ).length;
        const total = status.resources.length;
        console.log(
          chalk.gray(
            `Progress: ${completed}/${total} resources downloaded...`,
          ),
        );
      });
      console.log(chalk.green("✅ Sync completed"));
    } else {
      console.log(chalk.yellow("⚠️  Please specify a language with -l, --language"));
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
