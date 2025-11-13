// Version is injected at build time or use a default
const VERSION = process.env.npm_package_version || "5.2.0";
// Core MCP server identity
const MCP_NAME = "Translation-Helps-MCP";
const MCP_ROLE = "Bible translation resource aggregator for LLM tools";
const CONTACT = "klappy@github.com";
const HOMEPAGE = "https://github.com/klappy/translation-helps-mcp";
// Construct a compliant, descriptive User-Agent
export const USER_AGENT = `${MCP_NAME}/${VERSION} (${MCP_ROLE}; +${HOMEPAGE}; contact=${CONTACT})`;
/**
 * Creates a fetch wrapper that adds our User-Agent header
 * @param fetchImpl - The fetch implementation to wrap (allows for testing)
 * @returns A wrapped fetch function
 */
export function createProxyFetch(fetchImpl = fetch) {
    return async (input, init) => {
        const headers = new Headers(init?.headers);
        // Only set User-Agent if not already present
        if (!headers.has("User-Agent")) {
            headers.set("User-Agent", USER_AGENT);
        }
        return fetchImpl(input, {
            ...init,
            headers,
        });
    };
}
// Default fetch instance with our User-Agent
export const proxyFetch = createProxyFetch();
/**
 * Adds User-Agent to existing headers
 * @param headers - Existing headers object or Headers instance
 * @returns Headers with User-Agent added
 */
export function addUserAgentHeader(headers) {
    const result = {};
    // Convert various header formats to plain object
    if (headers instanceof Headers) {
        headers.forEach((value, key) => {
            result[key] = value;
        });
    }
    else if (Array.isArray(headers)) {
        headers.forEach(([key, value]) => {
            result[key] = value;
        });
    }
    else if (headers) {
        Object.assign(result, headers);
    }
    // Add User-Agent if not present
    if (!result["User-Agent"]) {
        result["User-Agent"] = USER_AGENT;
    }
    return result;
}
//# sourceMappingURL=httpClient.js.map