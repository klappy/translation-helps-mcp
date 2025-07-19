/**
 * SIMPLIFIED Streaming chat function using Server-Sent Events
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * SIMPLIFIED: Returns the static system prompt
 */
function formatSystemPrompt() {
  return `You are a Bible study assistant. 

SYSTEM INSTRUCTIONS:
1. Answer questions ONLY using the provided Bible resources that will be included with each user message
2. Quote scripture EXACTLY as it appears in the provided resources
3. At the end of your response, provide a brief citation listing which specific resources you used
4. Each user message will contain MCP response data in markdown format after a "---" separator
5. Parse the JSON data in the markdown code blocks to extract scripture, notes, words, and other resources

RESOURCE CITATION FORMAT:
- For scripture: Look in the JSON data for citation.resource and use that EXACT name (e.g., "unfoldingWord® Literal Text", "unfoldingWord® Dynamic Bible")
- For translation notes: Use "Translation Notes" 
- For translation words: Use "Translation Words"
- For translation questions: Use "Translation Questions"

IMPORTANT: Parse the JSON data in the markdown code blocks to find the exact resource names. Do not make up or guess resource names.

Example citation format:
"Resources used: unfoldingWord® Literal Text, Translation Notes"

The user's question will be followed by the relevant Bible resources fetched from the MCP server.`;
}

/**
 * Streaming handler with SSE
 */
export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const { message, chatHistory = [] } = JSON.parse(event.body);

    // Get the OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          success: false,
          error: "OpenAI API key not configured",
        }),
      };
    }

    // Build messages array with system prompt
    const messages = [
      {
        role: "system",
        content: formatSystemPrompt(),
      },
      ...chatHistory,
      {
        role: "user",
        content: message, // This already contains the MCP context appended
      },
    ];

    console.log(`🚀 Sending streaming request to OpenAI with ${messages.length} messages`);

    // For now, just do a regular request and simulate streaming
    // (Real SSE streaming with Netlify functions is complex)
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false, // Netlify doesn't support true streaming yet
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    // Return as regular JSON (streaming simulation happens on client)
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        response: aiResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          model: "gpt-4o-mini",
          totalTokens: openaiData.usage?.total_tokens || 0,
          actualInputTokens: openaiData.usage?.prompt_tokens || 0,
          actualOutputTokens: openaiData.usage?.completion_tokens || 0,
        },
      }),
    };
  } catch (error) {
    console.error("Streaming chat function error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
    };
  }
}
