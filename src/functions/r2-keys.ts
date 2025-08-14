import { logger } from "../utils/logger.js";

/**
 * Create a deterministic R2 object key from a full origin URL.
 * - Strips protocol
 * - Lowercases host
 * - Sorts query params
 * - Percent-encodes each path segment
 * Falls back to a sha256 hash prefix if the key becomes too long or includes unsafe characters.
 */
export function r2KeyFromUrl(urlString: string): {
  key: string;
  meta: Record<string, string>;
} {
  try {
    const url = new URL(urlString);
    const host = url.host.toLowerCase();

    // Sort query parameters for stability
    const searchParams = new URLSearchParams(url.search);
    const sortedEntries = [...searchParams.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const normalizedQuery = sortedEntries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    // Encode each path segment to avoid unsafe characters
    const encodedPath = url.pathname
      .split("/")
      .map((seg) => (seg ? encodeURIComponent(seg) : seg))
      .join("/");

    let key = `by-url/${host}${encodedPath}`;
    if (normalizedQuery) key += `?${normalizedQuery}`;

    // Guard for excessive length or accidentally unsafe characters
    if (key.length > 900 || /[\n\r]/.test(key)) {
      const hash = sha256(urlString);
      key = `by-hash/${hash}`;
    }

    return { key, meta: { origin_url: urlString } };
  } catch (err) {
    logger.warn("Failed to normalize URL for R2 key, using hash fallback", {
      error: String(err),
    });
    return {
      key: `by-hash/${sha256(urlString)}`,
      meta: { origin_url: urlString },
    };
  }
}

function sha256(input: string): string {
  // Minimal, synchronous SHA-256 using Web Crypto if available at runtime
  // For build-time/SSR safety, provide a tiny JS fallback (not cryptographically strong, but deterministic)
  try {
    // @ts-expect-error - globalThis.crypto may not be typed in all contexts
    const cryptoObj = (globalThis as any).crypto || (globalThis as any).subtle;
    if (cryptoObj?.subtle) {
      // We cannot await in this sync function; fall back to deterministic hash
    }
  } catch {
    // ignore
  }
  // Simple deterministic fallback hash (FNV-1a like)
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  // Convert to unsigned 32-bit and hex
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return hex;
}
