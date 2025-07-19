export async function handler(event, context) {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
      openAIKeyPrefix: process.env.OPENAI_API_KEY
        ? process.env.OPENAI_API_KEY.substring(0, 10) + "..."
        : "none",
      allEnvVars: Object.keys(process.env).filter(
        (key) => key.includes("API") || key.includes("KEY")
      ),
    }),
  };
}
