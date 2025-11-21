/**
 * AI Provider Abstraction
 *
 * Provides a unified interface for different AI providers (Ollama, OpenAI).
 * Ollama is prioritized as it works offline, with OpenAI as fallback.
 */

import { Ollama } from "ollama";
import OpenAI from "openai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  chat(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
  ): Promise<string>;
}

/**
 * Ollama Provider - Local AI (offline capable)
 */
export class OllamaProvider implements AIProvider {
  name = "ollama";
  private ollama: Ollama;
  private model: string;

  constructor(model: string = "mistral:7b", baseUrl?: string) {
    this.model = model;
    this.ollama = new Ollama({
      host: baseUrl || "http://localhost:11434",
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Try to list models to check if Ollama is running
      await this.ollama.list();
      return true;
    } catch (_error) {
      return false;
    }
  }

  async chat(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
  ): Promise<string> {
    try {
      let fullResponse = "";

      const response = await this.ollama.chat({
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
        options: {
          temperature: 0, // Deterministic responses - use provided data, not training data
        },
      });

      for await (const part of response) {
        const chunk = part.message.content;
        fullResponse += chunk;

        if (onChunk) {
          onChunk(chunk);
        }
      }

      return fullResponse;
    } catch (error) {
      throw new Error(
        `Ollama error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Set the model to use
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.ollama.list();
      return response.models.map((m) => m.name);
    } catch (error) {
      console.error("Failed to list Ollama models:", error);
      return [];
    }
  }
}

/**
 * OpenAI Provider - Cloud AI (requires internet)
 */
export class OpenAIProvider implements AIProvider {
  name = "openai";
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.model = model;
    this.openai = new OpenAI({
      apiKey,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Try to list models to check if API key is valid
      await this.openai.models.list();
      return true;
    } catch (_error) {
      return false;
    }
  }

  async chat(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
  ): Promise<string> {
    try {
      let fullResponse = "";

      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.3, // Lower temperature for more factual responses (matching UI)
        max_tokens: 2000, // Enough for overviews with titles and follow-up questions (matching UI)
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullResponse += content;

        if (onChunk && content) {
          onChunk(content);
        }
      }

      return fullResponse;
    } catch (error) {
      throw new Error(
        `OpenAI error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Set the model to use
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }
}

/**
 * AI Provider Factory
 * Tries OpenAI first (default), falls back to Ollama if OpenAI not available
 */
export class AIProviderFactory {
  static async create(
    preferredProvider?: "ollama" | "openai",
    config?: {
      ollamaModel?: string;
      ollamaBaseUrl?: string;
      openaiApiKey?: string;
      openaiModel?: string;
    },
  ): Promise<AIProvider> {
    const ollamaModel = config?.ollamaModel || "mistral:7b";
    const openaiModel = config?.openaiModel || "gpt-4o-mini";

    // Try preferred provider first if explicitly specified
    if (preferredProvider === "ollama") {
      const ollama = new OllamaProvider(ollamaModel, config?.ollamaBaseUrl);
      const ollamaAvailable = await ollama.isAvailable();
      if (ollamaAvailable) {
        console.log(`✅ Using Ollama provider (${ollamaModel})`);
        return ollama;
      }
      console.warn("⚠️ Ollama not available, trying OpenAI...");
    }

    // Try OpenAI first (default or if preferred)
    if (preferredProvider === "openai" || !preferredProvider) {
      if (config?.openaiApiKey) {
        const openai = new OpenAIProvider(config.openaiApiKey, openaiModel);
        const available = await openai.isAvailable();
        if (available) {
          console.log(`✅ Using OpenAI provider (${openaiModel})`);
          return openai;
        }
        console.warn(
          "⚠️ OpenAI API key is set but validation failed (invalid key or network issue).",
        );
        console.warn(
          "   Check your API key with /provider command, or use /set-openai-key to update it.",
        );
        console.warn("   Falling back to Ollama...");
      } else {
        // OpenAI is preferred/default but no API key
        console.warn(
          "⚠️ OpenAI is the default provider, but no API key is set.",
        );
        console.warn(
          "   Use /set-openai-key to set your API key, or /provider ollama to use Ollama.",
        );
        console.warn("   Falling back to Ollama...");
      }
    }

    // Fall back to Ollama if OpenAI not available or not configured
    const ollama = new OllamaProvider(ollamaModel, config?.ollamaBaseUrl);
    const ollamaAvailable = await ollama.isAvailable();
    if (ollamaAvailable) {
      console.log(`✅ Using Ollama provider as fallback (${ollamaModel})`);
      return ollama;
    }

    // No providers available
    throw new Error(
      "No AI providers available. Please provide an OpenAI API key (use /set-openai-key) or install Ollama (https://ollama.com).",
    );
  }
}
