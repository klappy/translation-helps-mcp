export declare const USER_AGENT: string;
type FetchFunction = typeof fetch;
/**
 * Creates a fetch wrapper that adds our User-Agent header
 * @param fetchImpl - The fetch implementation to wrap (allows for testing)
 * @returns A wrapped fetch function
 */
export declare function createProxyFetch(
  fetchImpl?: FetchFunction,
): FetchFunction;
export declare const proxyFetch: typeof fetch;
/**
 * Adds User-Agent to existing headers
 * @param headers - Existing headers object or Headers instance
 * @returns Headers with User-Agent added
 */
export declare function addUserAgentHeader(
  headers?: HeadersInit | Record<string, string>,
): Record<string, string>;
export {};
//# sourceMappingURL=httpClient.d.ts.map
