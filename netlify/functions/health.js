/**
 * Health Check Endpoint
 * GET /api/health
 */

exports.handler = async (event, context) => {
  console.log("Health check requested");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method not allowed",
        message: "This endpoint only accepts GET requests",
      }),
    };
  }

  try {
    const response = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production",
      endpoints: [
        "/api/health",
        "/api/fetch-resources",
        "/api/get-languages",
        "/api/extract-references",
      ],
      message: "🙏 Translation Helps API is running!",
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response, null, 2),
    };
  } catch (error) {
    console.error("Health check error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: "unhealthy",
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
