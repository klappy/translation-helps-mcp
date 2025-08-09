// tests/helpers/http.ts

const DEFAULT_PORTS = [8175, 8174, 8176, 5175, 5173, 8787, 8788, 8789];
let resolvedBaseUrl: string | null = null;
let apiReady = false;

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 1500
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function isHealthy(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/api/health`, {}, 2000);
    if (!res.ok) return false;
    const text = await res.text();
    const json = JSON.parse(text);
    // Require status and non-empty endpoints to consider ready
    return Boolean(json?.status) && Array.isArray(json?.endpoints) && json.endpoints.length > 0;
  } catch {
    return false;
  }
}

async function waitForReady(baseUrl: string, maxWaitMs = 45000, intervalMs = 500): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isHealthy(baseUrl)) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  // Final check to surface more helpful error
  const finalOk = await isHealthy(baseUrl);
  if (!finalOk) {
    throw new Error(`API readiness timed out after ${Math.round(maxWaitMs / 1000)}s at ${baseUrl}`);
  }
}

export async function getBaseUrl(): Promise<string> {
  if (resolvedBaseUrl) return resolvedBaseUrl;

  const envUrl = process.env.TEST_BASE_URL || process.env.BASE_URL || process.env.API_BASE_URL;
  if (envUrl && /^https?:\/\//.test(envUrl)) {
    resolvedBaseUrl = envUrl;
    return resolvedBaseUrl;
  }
  // If envUrl exists but is not absolute, ignore it

  // Probe common local ports
  for (const port of DEFAULT_PORTS) {
    const candidate = `http://localhost:${port}`;
    try {
      await waitForReady(candidate, 10000, 300);
      resolvedBaseUrl = candidate;
      return resolvedBaseUrl;
    } catch {
      // try next
    }
  }

  // Fallback
  resolvedBaseUrl = "http://localhost:8175";
  return resolvedBaseUrl;
}

export async function apiGet(
  endpoint: string,
  params: Record<string, string | undefined> = {}
): Promise<any> {
  let base = await getBaseUrl();
  if (!apiReady) {
    await waitForReady(base);
    apiReady = true;
  }
  if (!base || !/^https?:\/\//.test(base)) base = "http://localhost:8175";
  const url = new URL(`${base.replace(/\/$/, "")}/api/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, value);
  });
  // Force JSON unless explicitly set
  if (!url.searchParams.has("format")) url.searchParams.set("format", "json");

  const res = await fetch(url.toString());
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // surface body for easier debugging
    throw new Error(`Non-JSON response from ${url.toString()}: ${text.slice(0, 200)}`);
  }
}

// Build absolute URL from a path like "/api/endpoint?..." and ensure format=json
export async function buildUrl(
  path: string,
  params?: Record<string, string | undefined>
): Promise<string> {
  let base = await getBaseUrl();
  if (!base || !/^https?:\/\//.test(base)) base = "http://localhost:8175";
  // Allow callers to pass full path or endpoint-only
  const isFullPath = path.startsWith("http://") || path.startsWith("https://");
  const normalizedBase = base.replace(/\/$/, "");
  const url = new URL(
    isFullPath ? path : `${normalizedBase}${path.startsWith("/") ? "" : "/"}${path}`
  );
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value);
    });
  }
  if (!url.searchParams.has("format")) url.searchParams.set("format", "json");
  return url.toString();
}
