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
export declare class EdgeXRayTracer {
    private trace;
    private startTime;
    private static lastTracer;
    constructor(traceId: string, endpoint: string);
    addApiCall(call: Omit<EdgeApiCall, "timestamp">): void;
    getTrace(): EdgeXRayTrace;
    static getLastTrace(): EdgeXRayTrace | null;
}
export declare function trackedFetch(tracer: EdgeXRayTracer, url: string, options?: RequestInit): Promise<Response>;
//# sourceMappingURL=edge-xray.d.ts.map