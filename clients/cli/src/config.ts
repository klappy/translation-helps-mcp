/**
 * Configuration Management
 *
 * Manages CLI configuration stored in ~/.translation-helps-cli/config.json
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface Config {
  aiProvider: "ollama" | "openai";
  ollamaModel: string;
  ollamaBaseUrl: string;
  openaiApiKey?: string;
  openaiModel: string;
  offlineMode: boolean;
  cachePath: string;
  exportPath: string;
  cacheProviders: string[];
  cacheProvidersOrder: string[];
  languages: string[];
}

const DEFAULT_CONFIG: Config = {
  aiProvider: "ollama",
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
  languages: [],
};

export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private config: Config;

  constructor() {
    this.configDir = path.join(os.homedir(), ".translation-helps-cli");
    this.configPath = path.join(this.configDir, "config.json");
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Load configuration from disk
   */
  load(): Config {
    try {
      // Ensure config directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // Load config file if it exists
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, "utf-8");
        const loadedConfig = JSON.parse(fileContent);

        // Merge with defaults (in case new fields were added)
        this.config = {
          ...DEFAULT_CONFIG,
          ...loadedConfig,
        };

        console.log("✅ Configuration loaded");
      } else {
        // Create default config file
        this.save();
        console.log("✅ Created default configuration");
      }
    } catch (error) {
      console.error("Failed to load configuration:", error);
      this.config = { ...DEFAULT_CONFIG };
    }

    return this.config;
  }

  /**
   * Save configuration to disk
   */
  save(): void {
    try {
      // Ensure directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // Write config file
      fs.writeFileSync(
        this.configPath,
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
   * Get configuration directory path
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
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
   * Set OpenAI API key
   */
  setOpenAIApiKey(apiKey: string): void {
    this.config.openaiApiKey = apiKey;
    this.save();
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
    console.log("\n📋 Current Configuration:\n");
    console.log(`  AI Provider: ${this.config.aiProvider}`);
    console.log(`  Ollama Model: ${this.config.ollamaModel}`);
    console.log(`  Ollama URL: ${this.config.ollamaBaseUrl}`);
    console.log(`  OpenAI Model: ${this.config.openaiModel}`);
    console.log(
      `  OpenAI API Key: ${this.config.openaiApiKey ? "Set" : "Not set"}`,
    );
    console.log(`  Offline Mode: ${this.config.offlineMode}`);
    console.log(`  Cache Path: ${this.config.cachePath}`);
    console.log(`  Export Path: ${this.config.exportPath}`);
    console.log(`  Cache Providers: ${this.config.cacheProviders.join(", ")}`);
    console.log(
      `  Cache Order: ${this.config.cacheProvidersOrder.join(" → ")}`,
    );
    console.log(`  Languages: ${this.config.languages.join(", ") || "None"}`);
    console.log(`\n  Config file: ${this.configPath}\n`);
  }
}

// Export singleton instance
export const config = new ConfigManager();
