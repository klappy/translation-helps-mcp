// tests/helpers/http.ts

// Enforce Cloudflare Pages dev ports first
const DEFAULT_PORTS = [8788, 8787, 8789];
let resolvedBaseUrl: string | null = null;
let apiReady = false;

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 1500,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function isHealthy(
  baseUrl: string,
  verbose = false,
): Promise<{ healthy: boolean; reason?: string }> {
  const healthUrl = `${baseUrl.replace(/\/$/, "")}/api/health`;
  try {
    const res = await fetchWithTimeout(healthUrl, {}, 2000);
    if (!res.ok) {
      return { healthy: false, reason: `HTTP ${res.status}` };
    }
    const text = await res.text();
    const json = JSON.parse(text);
    const healthy = json?.status === "healthy";
    if (!healthy && verbose) {
      console.log(
        `  Health check returned status: ${json?.status || "undefined"}`,
      );
    }
    return { healthy, reason: healthy ? undefined : `status=${json?.status}` };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "timeout"
          : err.message
        : "unknown error";
    return { healthy: false, reason: msg };
  }
}

async function waitForReady(
  baseUrl: string,
  maxWaitMs = 15000,
  intervalMs = 500,
  verbose = true,
): Promise<void> {
  const start = Date.now();
  let lastReason = "";
  let attempts = 0;

  while (Date.now() - start < maxWaitMs) {
    attempts++;
    const result = await isHealthy(baseUrl, verbose);
    if (result.healthy) {
      if (verbose && attempts > 1) {
        console.log(`  Server ready after ${attempts} attempts`);
      }
      return;
    }
    lastReason = result.reason || "unknown";
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  // Final check to surface more helpful error
  const finalResult = await isHealthy(baseUrl, true);
  if (!finalResult.healthy) {
    const elapsed = Math.round((Date.now() - start) / 1000);
    throw new Error(
      `API readiness timed out after ${elapsed}s at ${baseUrl} (${attempts} attempts, last error: ${lastReason})`,
    );
  }
}

export async function getBaseUrl(): Promise<string> {
  if (resolvedBaseUrl) return resolvedBaseUrl;

  const envUrl =
    process.env.TEST_BASE_URL ||
    process.env.BASE_URL ||
    process.env.API_BASE_URL;
  if (envUrl && /^https?:\/\//.test(envUrl)) {
    console.log(`Using TEST_BASE_URL: ${envUrl}`);
    resolvedBaseUrl = envUrl;
    return resolvedBaseUrl;
  }
  // If envUrl exists but is not absolute, ignore it

  // Probe common local ports
  const triedPorts: { port: number; error: string }[] = [];
  console.log(`Probing local ports: ${DEFAULT_PORTS.join(", ")}...`);

  for (const port of DEFAULT_PORTS) {
    const candidate = `http://localhost:${port}`;
    try {
      await waitForReady(candidate, 5000, 300, false);
      console.log(`Found server on port ${port}`);
      resolvedBaseUrl = candidate;
      return resolvedBaseUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown error";
      triedPorts.push({ port, error: msg });
    }
  }

  // Log what we tried
  console.log("No server found on any port:");
  for (const { port, error } of triedPorts) {
    console.log(`  - Port ${port}: ${error}`);
  }

  // Fallback
  console.log("Falling back to port 8175");
  resolvedBaseUrl = "http://localhost:8175";
  return resolvedBaseUrl;
}

export async function apiGet(
  endpoint: string,
  params: Record<string, string | undefined> = {},
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
    throw new Error(
      `Non-JSON response from ${url.toString()}: ${text.slice(0, 200)}`,
    );
  }
}

// Build absolute URL from a path like "/api/endpoint?..." and ensure format=json
export async function buildUrl(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<string> {
  let base = await getBaseUrl();
  if (!base || !/^https?:\/\//.test(base)) base = "http://localhost:8175";
  // Allow callers to pass full path or endpoint-only
  const isFullPath = path.startsWith("http://") || path.startsWith("https://");
  const normalizedBase = base.replace(/\/$/, "");
  const url = new URL(
    isFullPath
      ? path
      : `${normalizedBase}${path.startsWith("/") ? "" : "/"}${path}`,
  );
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value);
    });
  }
  if (!url.searchParams.has("format")) url.searchParams.set("format", "json");
  return url.toString();
}
