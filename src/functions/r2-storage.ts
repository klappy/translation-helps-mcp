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
            "Content-Type": "application/zip",
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
        contentType: "application/zip",
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
            "Content-Type": "application/zip",
            "Cache-Control": "public, max-age=604800",
          },
        }),
      );
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
}
