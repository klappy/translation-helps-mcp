/**
 * Edge-compatible X-Ray tracing for performance monitoring
 *
 * This is a lightweight version that works in edge runtimes
 * (Cloudflare Workers, Deno Deploy, etc.) where Node.js APIs aren't available
 */

export interface EdgeApiCall {
  url: string;
  duration: number;
  status: number;
  size: number;
  cached: boolean;
  timestamp: number;
}

export interface EdgeXRayTrace {
  traceId: string;
  mainEndpoint: string;
  startTime: number;
  totalDuration: number;
  apiCalls: EdgeApiCall[];
  cacheStats: {
    hits: number;
    misses: number;
    total: number;
  };
}

export class EdgeXRayTracer {
  private trace: EdgeXRayTrace;
  private startTime: number;
  private static lastTracer: EdgeXRayTracer | null = null;

  constructor(traceId: string, endpoint: string) {
    this.startTime =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    this.trace = {
      traceId,
      mainEndpoint: endpoint,
      startTime: this.startTime,
      totalDuration: 0,
      apiCalls: [],
      cacheStats: {
        hits: 0,
        misses: 0,
        total: 0,
      },
    };
    // Register as the most recent tracer
    EdgeXRayTracer.lastTracer = this;
  }

  addApiCall(call: Omit<EdgeApiCall, "timestamp">): void {
    const apiCall: EdgeApiCall = {
      ...call,
      timestamp:
        typeof performance !== "undefined" && performance.now
          ? Math.round(performance.now())
          : Date.now(),
    };

    this.trace.apiCalls.push(apiCall);
    this.trace.cacheStats.total++;

    if (call.cached) {
      this.trace.cacheStats.hits++;
    } else {
      this.trace.cacheStats.misses++;
    }
    // Update last tracer reference on activity
    EdgeXRayTracer.lastTracer = this;
  }

  getTrace(): EdgeXRayTrace {
    const now =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    this.trace.totalDuration = Math.max(1, Math.round(now - this.startTime));
    return { ...this.trace };
  }

  static getLastTrace(): EdgeXRayTrace | null {
    const t = EdgeXRayTracer.lastTracer;
    return t ? t.getTrace() : null;
  }
}

// Helper to track fetch calls
export async function trackedFetch(
  tracer: EdgeXRayTracer,
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const startTime =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();

  // Prefer our whitelisted UA with contact info for DCS access; allow caller headers to override
  // Import lazily to avoid any potential top-level circular deps in edge runtimes
  const { USER_AGENT } = await import("../utils/httpClient.js");
  const defaultHeaders = {
    "User-Agent": USER_AGENT,
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  } as Record<string, string>;

  const mergedOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);
    const now =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    const duration = Math.max(1, Math.round(now - startTime));

    tracer.addApiCall({
      url,
      duration,
      status: response.status,
      size: parseInt(response.headers.get("content-length") || "0"),
      cached:
        response.headers.get("x-cache-status") === "HIT" ||
        response.headers.get("cf-cache-status") === "HIT",
    });

    return response;
  } catch (error) {
    const now =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    const duration = Math.max(1, Math.round(now - startTime));

    tracer.addApiCall({
      url,
      duration,
      status: 0, // Network error
      size: 0,
      cached: false,
    });

    throw error;
  }
}
