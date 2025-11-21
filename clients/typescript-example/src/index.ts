/**
 * Translation Helps MCP Client Example
 *
 * This example demonstrates how to use the @translation-helps/mcp-client SDK
 * to build a client that integrates with AI providers (Anthropic, OpenAI, etc.)
 *
 * The flow is:
 * 1. Connect to MCP server and get available tools
 * 2. Send user query to AI WITH available tools
 * 3. AI decides which tools to call
 * 4. Execute tool calls via MCP SDK
 * 5. Feed results back to AI for final response
 */

import { TranslationHelpsClient } from "@translation-helps/mcp-client";
import * as dotenv from "dotenv";

dotenv.config();

// AI Provider Types
type AIProvider = "anthropic" | "openai";

interface AIMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | any;
  tool_calls?: any;
  tool_call_id?: string;
}

interface ToolCall {
  name: string;
  input: Record<string, any>;
}

/**
 * Example client that integrates MCP tools with AI providers
 */
class TranslationHelpsExampleClient {
  private mcpClient: TranslationHelpsClient;
  private aiProvider: AIProvider | null = null;
  private aiClient: any = null;

  constructor(serverUrl?: string) {
    this.mcpClient = new TranslationHelpsClient({
      serverUrl: serverUrl || process.env.MCP_SERVER_URL,
    });
  }

  /**
   * Initialize the MCP connection and AI provider
   */
  async initialize(provider: AIProvider = "anthropic"): Promise<void> {
    console.log("🔌 Connecting to Translation Helps MCP server...");

    // Connect to MCP server
    await this.mcpClient.connect();

    // Get available tools
    const tools = await this.mcpClient.listTools();
    console.log(
      `✅ Connected! Available tools: ${tools.map((t: any) => t.name).join(", ")}`,
    );

    // Get available prompts
    const prompts = await this.mcpClient.listPrompts();
    console.log(
      `✅ Available prompts: ${prompts.map((p: any) => p.name).join(", ")}`,
    );

    // Initialize AI provider
    this.aiProvider = provider;
    await this.initializeAIProvider(provider);

    console.log(`✅ AI provider initialized: ${provider}`);
  }

  /**
   * Initialize the AI provider client
   */
  private async initializeAIProvider(provider: AIProvider): Promise<void> {
    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY environment variable is required");
      }

      // Dynamic import for optional dependency
      try {
        // @ts-ignore - Optional dependency, may not be installed
        const { Anthropic } = await import("@anthropic-ai/sdk");
        this.aiClient = new Anthropic({ apiKey });
      } catch (error) {
        throw new Error(
          "@anthropic-ai/sdk is not installed. Run: npm install @anthropic-ai/sdk",
        );
      }
    } else if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is required");
      }

      try {
        // @ts-ignore - Optional dependency, may not be installed
        const { default: OpenAI } = await import("openai");
        this.aiClient = new OpenAI({ apiKey });
      } catch (error) {
        throw new Error(
          "openai package is not installed. Run: npm install openai",
        );
      }
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Convert MCP tools to AI provider's format
   */
  private async convertToolsToAIFormat(): Promise<any[]> {
    const tools = await this.mcpClient.listTools();

    if (this.aiProvider === "anthropic") {
      // Anthropic format
      return tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || "",
        input_schema: tool.inputSchema,
      }));
    } else if (this.aiProvider === "openai") {
      // OpenAI format
      return tools.map((tool: any) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description || "",
          parameters: tool.inputSchema,
        },
      }));
    }

    return [];
  }

  /**
   * Process a query using AI and MCP tools
   */
  async processQuery(query: string): Promise<string> {
    if (!this.aiClient || !this.aiProvider) {
      throw new Error("Client not initialized. Call initialize() first.");
    }

    console.log(`\n💬 Processing query: "${query}"`);

    // Get available tools
    const availableTools = await this.convertToolsToAIFormat();

    // Initial messages
    const messages: AIMessage[] = [{ role: "user", content: query }];

    // Maximum iterations to prevent infinite loops
    const maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      // Call AI with current messages and tools
      let response: any;

      if (this.aiProvider === "anthropic") {
        response = await this.aiClient.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: messages as any,
          tools: availableTools,
        });
      } else if (this.aiProvider === "openai") {
        response = await this.aiClient.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: messages as any,
          tools: availableTools,
        });
      }

      // Extract tool calls from response
      const toolCalls = this.extractToolCalls(response);

      if (toolCalls.length === 0) {
        // No more tool calls, return final response
        return this.extractFinalText(response);
      }

      // Execute tool calls
      for (const toolCall of toolCalls) {
        console.log(`\n🔧 Calling tool: ${toolCall.name}`);

        try {
          // Execute via MCP SDK
          const result = await this.mcpClient.callTool(
            toolCall.name,
            toolCall.input,
          );

          // Extract text from result
          let toolResultText = "";
          if (result.content) {
            for (const item of result.content) {
              if (item.type === "text") {
                toolResultText += item.text || "";
              }
            }
          }

          console.log(
            `✅ Tool result received (${toolResultText.length} chars)`,
          );

          // Add tool result back to conversation
          if (this.aiProvider === "anthropic") {
            // Anthropic format
            messages.push({
              role: "assistant",
              content: response.content,
            });
            messages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: toolCall.id || "",
                  content: toolResultText,
                },
              ],
            });
          } else if (this.aiProvider === "openai") {
            // OpenAI format
            messages.push({
              role: "assistant",
              content: response.choices[0].message.content,
              tool_calls: response.choices[0].message.tool_calls,
            });
            messages.push({
              role: "tool",
              content: toolResultText,
              tool_call_id: toolCall.id || "",
            });
          }
        } catch (error) {
          console.error(`❌ Tool execution error:`, error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Add error to conversation
          if (this.aiProvider === "anthropic") {
            messages.push({
              role: "assistant",
              content: response.content,
            });
            messages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: toolCall.id || "",
                  content: `Error: ${errorMessage}`,
                  is_error: true,
                },
              ],
            });
          } else if (this.aiProvider === "openai") {
            messages.push({
              role: "assistant",
              content: response.choices[0].message.content,
              tool_calls: response.choices[0].message.tool_calls,
            });
            messages.push({
              role: "tool",
              content: `Error: ${errorMessage}`,
              tool_call_id: toolCall.id || "",
            });
          }
        }
      }
    }

    throw new Error(
      "Maximum iterations reached. The AI may be stuck in a loop.",
    );
  }

  /**
   * Extract tool calls from AI response
   */
  private extractToolCalls(response: any): Array<ToolCall & { id?: string }> {
    const toolCalls: Array<ToolCall & { id?: string }> = [];

    if (this.aiProvider === "anthropic") {
      // Anthropic format: response.content contains tool_use items
      if (response.content) {
        for (const item of response.content) {
          if (item.type === "tool_use") {
            toolCalls.push({
              id: item.id,
              name: item.name,
              input: item.input || {},
            });
          }
        }
      }
    } else if (this.aiProvider === "openai") {
      // OpenAI format: response.choices[0].message.tool_calls
      if (response.choices?.[0]?.message?.tool_calls) {
        for (const toolCall of response.choices[0].message.tool_calls) {
          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments || "{}"),
          });
        }
      }
    }

    return toolCalls;
  }

  /**
   * Extract final text from AI response
   */
  private extractFinalText(response: any): string {
    if (this.aiProvider === "anthropic") {
      // Anthropic format: response.content is an array
      if (response.content) {
        const textParts: string[] = [];
        for (const item of response.content) {
          if (item.type === "text") {
            textParts.push(item.text);
          }
        }
        return textParts.join("\n");
      }
    } else if (this.aiProvider === "openai") {
      // OpenAI format: response.choices[0].message.content
      return response.choices?.[0]?.message?.content || "";
    }

    return "";
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // MCP client doesn't need explicit cleanup for HTTP connections
    // But we can add it if needed in the future
  }
}

/**
 * Main function - example usage
 */
async function main() {
  const client = new TranslationHelpsExampleClient();

  try {
    // Initialize with OpenAI (or 'anthropic' for Anthropic)
    const provider = (process.env.AI_PROVIDER as AIProvider) || "openai";
    await client.initialize(provider);

    // Example query
    const query =
      process.argv[2] ||
      "What does John 3:16 say and what are the key translation considerations?";

    console.log("\n" + "=".repeat(60));
    console.log("🤖 AI Response:");
    console.log("=".repeat(60));

    const response = await client.processQuery(query);
    console.log(response);

    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.cleanup();
  }
}

// Run if executed directly
// Check if this file is being run directly (not imported)
const isMainModule =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
  process.argv[1]?.includes("index") ||
  process.argv[1]?.includes("typescript-example");

if (isMainModule) {
  main().catch(console.error);
}

export { TranslationHelpsExampleClient };
