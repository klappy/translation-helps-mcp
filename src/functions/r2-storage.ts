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

        // CRITICAL: Always write to R2 on Cache hit to trigger event notifications.
        // R2 put is idempotent - safe to overwrite. No need to check if exists.
        if (this.bucket && key.endsWith(".zip")) {
          console.log(`[R2Storage] Cache hit - syncing to R2: ${key}`);
          this.bucket
            .put(key, buf, {
              httpMetadata: {
                contentType: contentTypeForKey(key),
                cacheControl: "public, max-age=604800",
              },
            })
            .catch((e) => console.error(`[R2Storage] R2 sync failed: ${e}`));
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

        // CRITICAL: When extracted file hits cache, ensure the ZIP is in R2
        // File key: by-url/.../archive/v87.zip/files/43-JHN.usfm
        // ZIP key:  by-url/.../archive/v87.zip
        const zipMatch = key.match(/^(by-url\/.*\.zip)\/files\//);
        if (zipMatch && this.bucket) {
          const zipKey = zipMatch[1];
          // Fire-and-forget: check R2, download from DCS if missing
          (async () => {
            try {
              const exists = await this.bucket!.head(zipKey);
              if (!exists) {
                // Reconstruct URL: by-url/git.door43.org/org/repo/archive/v.zip -> https://git.door43.org/org/repo/archive/v.zip
                const url = "https://" + zipKey.replace(/^by-url\//, "");
                console.log(
                  `[R2Storage] File cache hit but ZIP missing - fetching: ${url}`,
                );
                const resp = await fetch(url);
                if (resp.ok) {
                  const buf = await resp.arrayBuffer();
                  // Validate ZIP magic bytes
                  const arr = new Uint8Array(buf);
                  if (arr[0] === 0x50 && arr[1] === 0x4b) {
                    await this.bucket!.put(zipKey, buf);
                    console.log(`[R2Storage] Stored ZIP in R2: ${zipKey}`);
                  }
                }
              }
            } catch (e) {
              console.error(`[R2Storage] ZIP sync failed: ${e}`);
            }
          })();
        }

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
