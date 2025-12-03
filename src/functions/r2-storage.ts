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
}

function contentTypeForKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes(".tar.gz") || lower.endsWith(".tgz"))
    return "application/gzip";
  return "application/zip";
}

export class R2Storage {
  constructor(
    private bucket: R2LikeBucket | undefined,
    private cacheStorage: CacheStorage | undefined,
  ) {}

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

  async getZipWithInfo(key: string): Promise<{
    data: Uint8Array | null;
    source: "cache" | "r2" | "miss";
    durationMs: number;
    size: number;
  }> {
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const req = new Request(`https://r2.local/${key}`);
    const c = this.defaultCache;
    if (c) {
      const hit = await c.match(req);
      if (hit) {
        const buf = await hit.arrayBuffer();
        const end =
          typeof performance !== "undefined" ? performance.now() : Date.now();

        // CRITICAL: If we got a Cache API hit but R2 doesn't have it,
        // write to R2 to trigger event notifications for indexing.
        // Only sync .zip files (not .tar.gz) since event notification is .zip-only
        if (this.bucket && key.endsWith(".zip")) {
          try {
            const r2Exists = await this.bucket.get(key);
            if (!r2Exists) {
              console.log(
                `[R2Storage] Cache hit but R2 miss - writing to R2 for event trigger: ${key}`,
              );
              await this.bucket.put(key, buf, {
                httpMetadata: {
                  contentType: contentTypeForKey(key),
                  cacheControl: "public, max-age=604800",
                },
              });
            }
          } catch {
            // Best-effort R2 sync, don't fail the request
          }
        }

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
    if (!this.bucket)
      return { data: null, source: "miss", durationMs: 1, size: 0 };
    const obj = await this.bucket.get(key);
    if (!obj) return { data: null, source: "miss", durationMs: 1, size: 0 };
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
    const req = new Request(`https://r2.local/${key}`);
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
    await this.bucket.put(key, buf, {
      httpMetadata: {
        contentType: contentTypeForKey(key),
        cacheControl: "public, max-age=604800",
      },
      customMetadata: meta,
    });
    const c = this.defaultCache;
    if (c) {
      await c.put(
        new Request(`https://r2.local/${key}`),
        new Response(buf, {
          headers: {
            "Content-Type": contentTypeForKey(key),
            "Cache-Control": "public, max-age=604800",
          },
        }),
      );
    }
  }

  /**
   * Delete a ZIP from both R2 bucket AND Cache API
   * This is necessary to fully invalidate cached ZIPs
   */
  async deleteZipWithCache(key: string): Promise<void> {
    // Delete from R2
    if (this.bucket && "delete" in this.bucket) {
      try {
        await (this.bucket as any).delete(key);
      } catch {
        // ignore delete errors
      }
    }
    // Delete from Cache API
    const c = this.defaultCache;
    if (c) {
      try {
        await c.delete(new Request(`https://r2.local/${key}`));
      } catch {
        // ignore cache delete errors
      }
    }
  }

  async getFile(
    key: string,
    contentType = "text/plain",
  ): Promise<string | null> {
    const req = new Request(`https://r2.local/${key}`);
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
    const req = new Request(`https://r2.local/${key}`);
    const c = this.defaultCache;
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
    if (!this.bucket)
      return { data: null, source: "miss", durationMs: 1, size: 0 };
    const obj = await this.bucket.get(key);
    if (!obj) return { data: null, source: "miss", durationMs: 1, size: 0 };
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
    await this.bucket.put(key, text, {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=604800",
      },
      customMetadata: meta,
    });
    const c = this.defaultCache;
    if (c) {
      await c.put(
        new Request(`https://r2.local/${key}`),
        new Response(text, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=604800",
          },
        }),
      );
    }
  }

  async deleteZip(key: string) {
    // Delete from cache
    const c = this.defaultCache;
    if (c) {
      try {
        await c.delete(new Request(`https://r2.local/${key}`));
      } catch {
        // ignore cache delete errors
      }
    }
    // Delete from R2
    if (this.bucket) {
      try {
        await this.bucket.delete(key);
      } catch {
        // ignore R2 delete errors
      }
    }
  }
}
