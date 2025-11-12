/**
 * MCP Client
 *
 * Connects to the Translation Helps MCP server via stdio transport.
 * Provides methods to list and call tools/prompts.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Zod schemas for MCP responses
const ListToolsResponseSchema = z.object({
  tools: z.array(z.any()),
});

const ListPromptsResponseSchema = z.object({
  prompts: z.array(z.any()),
});

const GenericResponseSchema = z.any();

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: any;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: any[];
}

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected = false;

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      console.log("Already connected to MCP server");
      return;
    }

    try {
      // Path to the MCP server (../../src/index.ts from cli/src/)
      const serverPath = path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "src",
        "index.ts",
      );

      console.log(`🔌 Connecting to MCP server at: ${serverPath}`);

      // Create transport - it will spawn the server process internally
      this.transport = new StdioClientTransport({
        command: "npx",
        args: ["tsx", serverPath],
        env: {
          ...process.env,
          USE_FS_CACHE: "true", // Enable file system cache
          NODE_ENV: "development",
        },
      });

      // Create client
      this.client = new Client(
        {
          name: "translation-helps-cli",
          version: "1.0.0",
        },
        {
          capabilities: {},
        },
      );

      // Connect to server
      await this.client.connect(this.transport);

      this.connected = true;
      console.log("✅ Connected to MCP server");
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }

    this.connected = false;
    console.log("🔌 Disconnected from MCP server");
  }

  /**
   * List available tools
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.client || !this.connected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.request(
        {
          method: "tools/list",
        },
        ListToolsResponseSchema,
      );

      return response.tools || [];
    } catch (error) {
      console.error("Failed to list tools:", error);
      return [];
    }
  }

  /**
   * List available prompts
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    if (!this.client || !this.connected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.request(
        {
          method: "prompts/list",
        },
        ListPromptsResponseSchema,
      );

      return response.prompts || [];
    } catch (error) {
      console.error("Failed to list prompts:", error);
      return [];
    }
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: any): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.request(
        {
          method: "tools/call",
          params: {
            name,
            arguments: args,
          },
        },
        GenericResponseSchema,
      );

      return response;
    } catch (error) {
      console.error(`Failed to call tool ${name}:`, error);
      throw error;
    }
  }

  /**
   * Execute a prompt by calling the actual tools
   */
  async executePrompt(name: string, args: any = {}): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error("Not connected to MCP server");
    }

    // Special handling for comprehensive prompts that need multiple tool calls
    if (name === "translation-helps-for-passage") {
      return await this.fetchComprehensiveHelps(args.reference, args.language);
    }

    throw new Error(`Prompt ${name} not implemented`);
  }

  /**
   * Fetch comprehensive translation helps by calling multiple tools
   */
  private async fetchComprehensiveHelps(
    reference: string,
    language: string = "en",
  ): Promise<any> {
    const result: any = {};

    try {
      // Fetch scripture
      const scripture = await this.callTool("fetch_scripture", {
        reference,
        language,
      });
      result.scripture = scripture.content?.[0]?.text
        ? { text: scripture.content[0].text }
        : null;
    } catch (error) {
      console.error("Failed to fetch scripture:", error);
    }

    try {
      // Fetch translation notes
      const notes = await this.callTool("fetch_translation_notes", {
        reference,
        language,
      });
      result.notes = notes.content?.[0]?.text
        ? JSON.parse(notes.content[0].text)
        : null;
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    }

    try {
      // Fetch translation questions
      const questions = await this.callTool("fetch_translation_questions", {
        reference,
        language,
      });
      result.questions = questions.content?.[0]?.text
        ? JSON.parse(questions.content[0].text)
        : null;
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    }

    try {
      // Fetch translation word links to get the terms used
      const wordLinks = await this.callTool("fetch_translation_word_links", {
        reference,
        language,
      });

      if (wordLinks.content?.[0]?.text) {
        const twlData = JSON.parse(wordLinks.content[0].text);
        const words = [];

        // For each word link, fetch the actual word article
        if (twlData.links && Array.isArray(twlData.links)) {
          for (const _link of twlData.links.slice(0, 10)) {
            // Limit to 10 words for performance
            try {
              const wordArticle = await this.callTool(
                "fetch_translation_word",
                {
                  reference,
                  language,
                },
              );
              if (wordArticle.content?.[0]?.text) {
                words.push(JSON.parse(wordArticle.content[0].text));
              }
            } catch (_error) {
              // Skip individual word failures
            }
          }
        }

        result.words = words;
      }
    } catch (error) {
      console.error("Failed to fetch words:", error);
    }

    try {
      // Fetch translation academy articles
      const academy = await this.callTool("fetch_translation_academy", {
        reference,
        language,
      });
      result.academyArticles = academy.content?.[0]?.text
        ? JSON.parse(academy.content[0].text)
        : null;
    } catch (error) {
      console.error("Failed to fetch academy:", error);
    }

    return result;
  }

  /**
   * Configure cache providers on the server
   */
  async configureCacheProviders(config: any): Promise<void> {
    // This would need to be implemented as a custom MCP method
    // For now, we configure via environment variables at startup
    console.log("Cache provider configuration:", config);
  }

  /**
   * Get active cache providers from server
   */
  async getActiveProviders(): Promise<string[]> {
    // This would need to be implemented as a custom MCP method
    // For now, return default providers
    return ["memory", "fs"];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}
