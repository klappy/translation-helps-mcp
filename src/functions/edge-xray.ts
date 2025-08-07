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

  constructor(traceId: string, endpoint: string) {
    this.startTime = Date.now();
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
  }

  addApiCall(call: Omit<EdgeApiCall, 'timestamp'>): void {
    const apiCall: EdgeApiCall = {
      ...call,
      timestamp: Date.now(),
    };
    
    this.trace.apiCalls.push(apiCall);
    this.trace.cacheStats.total++;
    
    if (call.cached) {
      this.trace.cacheStats.hits++;
    } else {
      this.trace.cacheStats.misses++;
    }
  }

  getTrace(): EdgeXRayTrace {
    this.trace.totalDuration = Date.now() - this.startTime;
    return { ...this.trace };
  }
}

// Helper to track fetch calls
export async function trackedFetch(
  tracer: EdgeXRayTracer,
  url: string,
  options?: RequestInit
): Promise<Response> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    tracer.addApiCall({
      url,
      duration,
      status: response.status,
      size: parseInt(response.headers.get('content-length') || '0'),
      cached: response.headers.get('x-cache-status') === 'HIT' ||
              response.headers.get('cf-cache-status') === 'HIT',
    });
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
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
