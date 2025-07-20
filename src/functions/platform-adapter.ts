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

// Cache interface for platform wrappers
export interface CacheAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
}

// Netlify adapter with caching
export function createNetlifyHandler(handler: PlatformHandler, cacheAdapter?: CacheAdapter) {
  return async (event: any, context: any) => {
    const request: PlatformRequest = {
      method: event.httpMethod,
      url: `${event.headers?.origin || "https://localhost"}${event.path}`,
      headers: event.headers || {},
      body: event.body,
      queryStringParameters: event.queryStringParameters || {},
    };

    // Add caching logic if cache adapter provided
    if (cacheAdapter) {
      const cacheKey = `${event.path}:${JSON.stringify(event.queryStringParameters || {})}`;

      // Try cache first
      try {
        const cached = await cacheAdapter.get(cacheKey);
        if (cached) {
          return {
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "Content-Type",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
              "X-Cache": "HIT",
            },
            body: JSON.stringify(cached),
          };
        }
      } catch (error) {
        console.warn("Cache read failed:", error);
      }
    }

    const response = await handler(request);

    // Cache successful responses
    if (cacheAdapter && response.statusCode === 200) {
      try {
        const responseData = JSON.parse(response.body);
        await cacheAdapter.set(
          `${event.path}:${JSON.stringify(event.queryStringParameters || {})}`,
          responseData,
          3600000
        ); // 1 hour
      } catch (error) {
        console.warn("Cache write failed:", error);
      }
    }

    return {
      statusCode: response.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "X-Cache": "MISS",
        ...response.headers,
      },
      body: response.body,
    };
  };
}

// SvelteKit adapter with caching
export function createSvelteKitHandler(handler: PlatformHandler, cacheAdapter?: CacheAdapter) {
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

    // Add caching logic if cache adapter provided
    if (cacheAdapter) {
      const cacheKey = `${url.pathname}:${JSON.stringify(queryStringParameters)}`;

      // Try cache first
      try {
        const cached = await cacheAdapter.get(cacheKey);
        if (cached) {
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "Content-Type",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
              "X-Cache": "HIT",
            },
          });
        }
      } catch (error) {
        console.warn("Cache read failed:", error);
      }
    }

    const response = await handler(platformRequest);

    // Cache successful responses
    if (cacheAdapter && response.statusCode === 200) {
      try {
        const responseData = JSON.parse(response.body);
        await cacheAdapter.set(
          `${url.pathname}:${JSON.stringify(queryStringParameters)}`,
          responseData,
          3600000
        ); // 1 hour
      } catch (error) {
        console.warn("Cache write failed:", error);
      }
    }

    return new Response(response.body, {
      status: response.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "X-Cache": "MISS",
        ...response.headers,
      },
    });
  };
}
