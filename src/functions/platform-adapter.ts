// Platform-agnostic adapter for function handling
export interface PlatformRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  queryStringParameters: Record<string, string>;
}

export interface PlatformResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export type PlatformHandler = (request: PlatformRequest) => Promise<PlatformResponse>;

// Netlify adapter
export function createNetlifyHandler(handler: PlatformHandler) {
  return async (event: any, context: any) => {
    const request: PlatformRequest = {
      method: event.httpMethod,
      url: `${event.headers?.origin || "https://localhost"}${event.path}`,
      headers: event.headers || {},
      body: event.body,
      queryStringParameters: event.queryStringParameters || {},
    };

    const response = await handler(request);

    return {
      statusCode: response.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        ...response.headers,
      },
      body: response.body,
    };
  };
}

// SvelteKit adapter
export function createSvelteKitHandler(handler: PlatformHandler) {
  return async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const queryStringParameters: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryStringParameters[key] = value;
    });

    const platformRequest: PlatformRequest = {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== "GET" ? await request.text() : null,
      queryStringParameters,
    };

    const response = await handler(platformRequest);

    return new Response(response.body, {
      status: response.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        ...response.headers,
      },
    });
  };
}
