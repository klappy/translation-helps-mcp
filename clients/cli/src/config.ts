/**
 * Configuration Management
 *
 * Manages CLI configuration stored in ~/.translation-helps-cli/config.json
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Config {
  aiProvider: "ollama" | "openai";
  ollamaModel: string;
  ollamaBaseUrl: string;
  // openaiApiKey removed - now stored in .env file only
  openaiModel: string;
  offlineMode: boolean;
  cachePath: string;
  exportPath: string;
  cacheProviders: string[];
  cacheProvidersOrder: string[];
  zipFetcherProvider: "r2" | "fs" | "auto";
  languages: string[];
}

const DEFAULT_CONFIG: Config = {
  aiProvider: "openai",
  ollamaModel: "mistral:7b",
  ollamaBaseUrl: "http://localhost:11434",
  openaiModel: "gpt-4o-mini",
  offlineMode: false, // Auto-detect
  cachePath: path.join(os.homedir(), ".translation-helps-mcp", "cache"),
  exportPath: path.join(
    os.homedir(),
    ".translation-helps-mcp",
    "cache",
    "exports",
  ),
  cacheProviders: ["memory", "fs"],
  cacheProvidersOrder: ["memory", "fs", "door43"],
  zipFetcherProvider: "fs", // CLI uses file system for ZIP storage
  languages: [],
};

export class ConfigManager {
  private projectConfigPath: string; // Project-local config (preferred)
  private globalConfigDir: string; // Global config (fallback)
  private globalConfigPath: string;
  private envPath: string;
  private config: Config;

  constructor() {
    // Project-local config (standard location for project-specific tools)
    // Located in project root: .translation-helps-cli.json
    // Find project root by walking up from __dirname (which is clients/cli/dist or clients/cli/src)
    const findProjectRoot = (): string => {
      // __dirname will be clients/cli/dist (when built) or clients/cli/src (when running with tsx)
      const currentDir = __dirname;

      // Walk up until we find the root package.json (which has "translation-helps-mcp" as name)
      let dir = currentDir;
      while (dir !== path.dirname(dir)) {
        const packageJsonPath = path.join(dir, "package.json");
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(
              fs.readFileSync(packageJsonPath, "utf-8"),
            );
            // Check if this is the root package.json (has "translation-helps-mcp" name and has clients/cli subdirectory)
            if (
              packageJson.name === "translation-helps-mcp" &&
              fs.existsSync(path.join(dir, "clients", "cli", "package.json"))
            ) {
              return dir;
            }
          } catch {
            // Continue searching if package.json is invalid
          }
        }
        dir = path.dirname(dir);
      }
      // Fallback: assume we're 2-3 levels deep from project root
      // From clients/cli/dist -> go up 3 levels
      // From clients/cli/src -> go up 2 levels
      if (currentDir.includes("dist")) {
        return path.resolve(currentDir, "..", "..", "..");
      } else if (currentDir.includes("clients")) {
        return path.resolve(currentDir, "..", "..");
      }
      // Last resort: use current working directory
      return process.cwd();
    };

    const projectRoot = findProjectRoot();
    this.projectConfigPath = path.join(
      projectRoot,
      ".translation-helps-cli.json",
    );

    // Global config (fallback for backward compatibility)
    // Located in home directory: ~/.translation-helps-cli/config.json
    this.globalConfigDir = path.join(os.homedir(), ".translation-helps-cli");
    this.globalConfigPath = path.join(this.globalConfigDir, "config.json");

    // .env file in project root
    this.envPath = path.join(projectRoot, ".env");
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Load .env file and set environment variables
   */
  private loadEnvFile(): void {
    try {
      if (fs.existsSync(this.envPath)) {
        const envContent = fs.readFileSync(this.envPath, "utf-8");
        const lines = envContent.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          // Skip comments and empty lines
          if (!trimmed || trimmed.startsWith("#")) continue;

          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.slice(1, -1);
            }
            // Only set if not already in environment
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    } catch (_error) {
      // Silently fail - .env file is optional
    }
  }

  /**
   * Load configuration from disk
   * Priority: Project-local config > Global config > Defaults
   */
  load(): Config {
    // Load .env file first (before loading config)
    this.loadEnvFile();

    try {
      let loadedConfig: Partial<Config> | null = null;
      let configSource = "";

      // 1. Try project-local config first (standard location)
      if (fs.existsSync(this.projectConfigPath)) {
        const fileContent = fs.readFileSync(this.projectConfigPath, "utf-8");
        console.log(`🔍 DEBUG: Reading config from: ${this.projectConfigPath}`);
        console.log(
          `🔍 DEBUG: Raw file content (first 200 chars):`,
          fileContent.substring(0, 200),
        );
        loadedConfig = JSON.parse(fileContent);
        configSource = "project-local";

        // Debug: Log what was loaded from file
        if (loadedConfig) {
          console.log(`🔍 DEBUG: Parsed config from file:`, {
            cachePath: loadedConfig.cachePath,
            exportPath: loadedConfig.exportPath,
            aiProvider: loadedConfig.aiProvider,
          });
        }
      }
      // 2. Fall back to global config (backward compatibility)
      else if (fs.existsSync(this.globalConfigPath)) {
        const fileContent = fs.readFileSync(this.globalConfigPath, "utf-8");
        loadedConfig = JSON.parse(fileContent);
        configSource = "global";

        // Migrate global config to project-local if it exists
        console.log("📦 Migrating global config to project-local...");
        this.config = {
          ...DEFAULT_CONFIG,
          ...loadedConfig,
        };
        this.save(); // This will save to project-local
        console.log("✅ Migrated config to project-local");
        return this.config;
      }

      if (loadedConfig) {
        // Migration: Update old default "ollama" to new default "openai"
        const configWithMigration = loadedConfig as Partial<Config> & {
          _migratedToOpenAI?: boolean;
        };
        if (
          configWithMigration.aiProvider === "ollama" &&
          !configWithMigration._migratedToOpenAI
        ) {
          configWithMigration.aiProvider = "openai";
          configWithMigration._migratedToOpenAI = true; // Mark as migrated
          console.log("🔄 Migrated default AI provider from Ollama to OpenAI");
        }

        // Merge with defaults (in case new fields were added)
        // IMPORTANT: loadedConfig values should override defaults
        // Explicitly preserve all loaded values, especially cachePath
        this.config = {
          ...DEFAULT_CONFIG,
          ...configWithMigration,
          // Explicitly preserve cachePath and exportPath from loaded config if present
          // Use loadedConfig directly (not configWithMigration) to ensure we get the actual values
          cachePath:
            (loadedConfig.cachePath as string | undefined) ||
            DEFAULT_CONFIG.cachePath,
          exportPath:
            (loadedConfig.exportPath as string | undefined) ||
            DEFAULT_CONFIG.exportPath,
        };

        // Debug: Log what we're using after merge
        console.log(`🔍 DEBUG: After merge:`, {
          cachePath: this.config.cachePath,
          exportPath: this.config.exportPath,
          loadedCachePath: loadedConfig.cachePath,
          defaultCachePath: DEFAULT_CONFIG.cachePath,
        });

        // Save migrated config (only if AI provider was migrated)
        if (configWithMigration._migratedToOpenAI) {
          this.save();
        }

        console.log(`✅ Configuration loaded from ${configSource} config`);
      } else {
        // Create default config file in project root (standard location)
        this.save();
        console.log("✅ Created default configuration in project root");
      }
    } catch (error) {
      console.error("Failed to load configuration:", error);
      this.config = { ...DEFAULT_CONFIG };
    }

    return this.config;
  }

  /**
   * Save configuration to disk
   * Always saves to project-local config (standard location)
   */
  save(): void {
    try {
      // Save to project-local config (standard location for project-specific tools)
      fs.writeFileSync(
        this.projectConfigPath,
        JSON.stringify(this.config, null, 2),
        "utf-8",
      );

      console.log("✅ Configuration saved");
    } catch (error) {
      console.error("Failed to save configuration:", error);
    }
  }

  /**
   * Update configuration
   */
  update(updates: Partial<Config>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
    this.save();
  }

  /**
   * Get current configuration
   */
  get(): Config {
    return { ...this.config };
  }

  /**
   * Get config directory path (for backward compatibility)
   * @deprecated Use getConfigPath() instead
   */
  getConfigDir(): string {
    return path.dirname(this.projectConfigPath);
  }

  /**
   * Get config file path (project-local)
   */
  getConfigPath(): string {
    return this.projectConfigPath;
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
    console.log("✅ Configuration reset to defaults");
  }

  /**
   * Add a language to the list
   */
  addLanguage(language: string): void {
    if (!this.config.languages.includes(language)) {
      this.config.languages.push(language);
      this.save();
    }
  }

  /**
   * Remove a language from the list
   */
  removeLanguage(language: string): void {
    const index = this.config.languages.indexOf(language);
    if (index >= 0) {
      this.config.languages.splice(index, 1);
      this.save();
    }
  }

  /**
   * Enable a cache provider
   */
  enableCacheProvider(provider: string): void {
    if (!this.config.cacheProviders.includes(provider)) {
      this.config.cacheProviders.push(provider);
      this.save();
    }
  }

  /**
   * Disable a cache provider
   */
  disableCacheProvider(provider: string): void {
    const index = this.config.cacheProviders.indexOf(provider);
    if (index >= 0) {
      this.config.cacheProviders.splice(index, 1);
      this.save();
    }
  }

  /**
   * Reorder cache providers
   */
  reorderCacheProviders(order: string[]): void {
    this.config.cacheProvidersOrder = order;
    this.save();
  }

  /**
   * Set AI provider
   */
  setAIProvider(provider: "ollama" | "openai"): void {
    this.config.aiProvider = provider;
    this.save();
  }

  /**
   * Set Ollama model
   */
  setOllamaModel(model: string): void {
    this.config.ollamaModel = model;
    this.save();
  }

  /**
   * Set OpenAI API key in .env file (secure storage)
   */
  setOpenAIApiKey(apiKey: string): void {
    try {
      let envContent = "";

      // Read existing .env file if it exists
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, "utf-8");
      }

      // Parse existing content
      const lines = envContent.split("\n");
      let found = false;
      const newLines: string[] = [];

      // Update or add OPENAI_API_KEY
      for (const line of lines) {
        if (line.trim().startsWith("OPENAI_API_KEY=")) {
          newLines.push(`OPENAI_API_KEY=${apiKey}`);
          found = true;
        } else {
          newLines.push(line);
        }
      }

      if (!found) {
        // Add new line if key didn't exist
        if (
          newLines.length > 0 &&
          !newLines[newLines.length - 1].endsWith("\n")
        ) {
          newLines.push("");
        }
        newLines.push(`OPENAI_API_KEY=${apiKey}`);
      }

      // Write back to .env file
      fs.writeFileSync(this.envPath, newLines.join("\n"), "utf-8");

      // Set in current process environment
      process.env.OPENAI_API_KEY = apiKey;

      console.log(`✅ OpenAI API key saved to .env file: ${this.envPath}`);
    } catch (error) {
      console.error("Failed to save API key to .env file:", error);
      throw error;
    }
  }

  /**
   * Get .env file path
   */
  getEnvPath(): string {
    return this.envPath;
  }

  /**
   * Set offline mode
   */
  setOfflineMode(offline: boolean): void {
    this.config.offlineMode = offline;
    this.save();
  }

  /**
   * Display configuration
   */
  display(): void {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    console.log("\n📋 Current Configuration:\n");
    console.log(`  AI Provider: ${this.config.aiProvider}`);
    console.log(`  Ollama Model: ${this.config.ollamaModel}`);
    console.log(`  Ollama URL: ${this.config.ollamaBaseUrl}`);
    console.log(`  OpenAI Model: ${this.config.openaiModel}`);
    console.log(
      `  OpenAI API Key: ${hasApiKey ? "Set (from .env or environment)" : "Not set"}`,
    );
    if (hasApiKey) {
      console.log(
        `    Source: ${fs.existsSync(this.envPath) ? ".env file" : "Environment variable"}`,
      );
    }
    console.log(`  Offline Mode: ${this.config.offlineMode}`);
    console.log(`  Cache Path: ${this.config.cachePath}`);
    console.log(`  Export Path: ${this.config.exportPath}`);
    console.log(`  Cache Providers: ${this.config.cacheProviders.join(", ")}`);
    console.log(
      `  Cache Order: ${this.config.cacheProvidersOrder.join(" → ")}`,
    );
    console.log(`  Languages: ${this.config.languages.join(", ") || "None"}`);
    console.log(`\n  Config file: ${this.projectConfigPath}`);
    console.log(`  .env file: ${this.envPath}\n`);
  }
}

// Export singleton instance
export const config = new ConfigManager();
