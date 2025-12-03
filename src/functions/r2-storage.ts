import { getVersion } from "../version.js";

export interface R2LikeBucket {
  get(key: string): Promise<{
    body: ReadableStream | null;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
    writeHttpMetadata?: (headers: Headers) => void;
  } | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<void>;
  head?(key: string): Promise<unknown | null>;
  delete?(key: string): Promise<void>;
}

function contentTypeForKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes(".tar.gz") || lower.endsWith(".tgz"))
    return "application/gzip";
  return "application/zip";
}

/**
 * R2 Storage with versioned Cache API layer
 *
 * Cache API keys are versioned by app version, so new deploys get fresh caches.
 * This eliminates the need for complex sync logic between Cache API and R2.
 *
 * Flow:
 * 1. New deploy = new version = cache miss
 * 2. Cache miss = read from R2
 * 3. R2 miss = download from origin = write to R2 = R2 event fires
 * 4. Indexer receives R2 event and processes the ZIP
 */
export class R2Storage {
  private appVersion: string;

  constructor(
    private bucket: R2LikeBucket | undefined,
    private cacheStorage: CacheStorage | undefined,
  ) {
    this.appVersion = getVersion();
  }

  private get defaultCache(): Cache | null {
    try {
      // @ts-expect-error - caches may exist in edge/runtime
      return (
        this.cacheStorage?.default ??
        (globalThis as any).caches?.default ??
        null
      );
    } catch {
      return null;
    }
  }

  /**
   * Create a versioned cache request URL
   * New version = new URL = cache miss = fresh data from R2
   */
  private cacheRequest(key: string): Request {
    return new Request(`https://r2.local/v${this.appVersion}/${key}`);
  }

  async getZipWithInfo(key: string): Promise<{
    data: Uint8Array | null;
    source: "cache" | "r2" | "miss";
    durationMs: number;
    size: number;
  }> {
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const req = this.cacheRequest(key);
    const c = this.defaultCache;

    // Try versioned cache first
    if (c) {
      const hit = await c.match(req);
      if (hit) {
        const buf = await hit.arrayBuffer();
        const end =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        return {
          data: new Uint8Array(buf),
          source: "cache",
          durationMs: Math.max(
            1,
            Math.round((end as number) - (start as number)),
          ),
          size: buf.byteLength,
        };
      }
    }

    // Cache miss - read from R2
    if (!this.bucket)
      return { data: null, source: "miss", durationMs: 1, size: 0 };

    const obj = await this.bucket.get(key);
    if (!obj) return { data: null, source: "miss", durationMs: 1, size: 0 };

    const buf = await obj.arrayBuffer();

    // Populate versioned cache for next request
    if (c) {
      await c.put(
        req,
        new Response(buf, {
          headers: {
            "Content-Type": contentTypeForKey(key),
            "Cache-Control": "public, max-age=604800",
          },
        }),
      );
    }

    const end =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      data: new Uint8Array(buf),
      source: "r2",
      durationMs: Math.max(1, Math.round((end as number) - (start as number))),
      size: buf.byteLength,
    };
  }

  async getZip(key: string): Promise<Uint8Array | null> {
    const req = this.cacheRequest(key);
    const c = this.defaultCache;

    if (c) {
      const hit = await c.match(req);
      if (hit) {
        const buf = await hit.arrayBuffer();
        return new Uint8Array(buf);
      }
    }

    if (!this.bucket) return null;
    const obj = await this.bucket.get(key);
    if (!obj) return null;

    const buf = await obj.arrayBuffer();
    if (c) {
      await c.put(
        req,
        new Response(buf, {
          headers: {
            "Content-Type": contentTypeForKey(key),
            "Cache-Control": "public, max-age=604800",
          },
        }),
      );
    }
    return new Uint8Array(buf);
  }

  async putZip(key: string, buf: ArrayBuffer, meta?: Record<string, string>) {
    if (!this.bucket) return;

    // Write to R2 first (triggers event notifications)
    await this.bucket.put(key, buf, {
      httpMetadata: {
        contentType: contentTypeForKey(key),
        cacheControl: "public, max-age=604800",
      },
      customMetadata: meta,
    });

    // Then populate versioned cache
    const c = this.defaultCache;
    if (c) {
      await c.put(
        this.cacheRequest(key),
        new Response(buf, {
          headers: {
            "Content-Type": contentTypeForKey(key),
            "Cache-Control": "public, max-age=604800",
          },
        }),
      );
    }
  }

  async deleteZip(key: string) {
    // Delete from versioned cache
    const c = this.defaultCache;
    if (c) {
      try {
        await c.delete(this.cacheRequest(key));
      } catch {
        // ignore cache delete errors
      }
    }
    // Delete from R2
    if (this.bucket?.delete) {
      try {
        await this.bucket.delete(key);
      } catch {
        // ignore R2 delete errors
      }
    }
  }

  async deleteZipWithCache(key: string): Promise<void> {
    await this.deleteZip(key);
  }

  async getFile(
    key: string,
    contentType = "text/plain",
  ): Promise<string | null> {
    const req = this.cacheRequest(key);
    const c = this.defaultCache;

    if (c) {
      const hit = await c.match(req);
      if (hit) return await hit.text();
    }

    if (!this.bucket) return null;
    const obj = await this.bucket.get(key);
    if (!obj) return null;

    const text = await obj.text();
    if (c) {
      await c.put(
        req,
        new Response(text, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=604800",
          },
        }),
      );
    }
    return text;
  }

  async getFileWithInfo(
    key: string,
    contentType = "text/plain",
  ): Promise<{
    data: string | null;
    source: "cache" | "r2" | "miss";
    durationMs: number;
    size: number;
  }> {
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const req = this.cacheRequest(key);
    const c = this.defaultCache;

    // Try versioned cache first
    if (c) {
      const hit = await c.match(req);
      if (hit) {
        const text = await hit.text();
        const end =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        return {
          data: text,
          source: "cache",
          durationMs: Math.max(
            1,
            Math.round((end as number) - (start as number)),
          ),
          size: text.length,
        };
      }
    }

    // Cache miss - read from R2
    if (!this.bucket)
      return { data: null, source: "miss", durationMs: 1, size: 0 };

    const obj = await this.bucket.get(key);
    if (!obj) return { data: null, source: "miss", durationMs: 1, size: 0 };

    const text = await obj.text();

    // Populate versioned cache
    if (c) {
      await c.put(
        req,
        new Response(text, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=604800",
          },
        }),
      );
    }

    const end =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      data: text,
      source: "r2",
      durationMs: Math.max(1, Math.round((end as number) - (start as number))),
      size: text.length,
    };
  }

  async putFile(
    key: string,
    text: string,
    contentType = "text/plain",
    meta?: Record<string, string>,
  ) {
    if (!this.bucket) return;

    // Write to R2 first
    await this.bucket.put(key, text, {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=604800",
      },
      customMetadata: meta,
    });

    // Then populate versioned cache
    const c = this.defaultCache;
    if (c) {
      await c.put(
        this.cacheRequest(key),
        new Response(text, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=604800",
          },
        }),
      );
    }
  }
}
