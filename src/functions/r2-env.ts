let _bucket: any | undefined;
let _caches: CacheStorage | undefined;

export function initializeR2Env(
  bucket: any | undefined,
  caches: CacheStorage | undefined,
) {
  _bucket = bucket;
  _caches = caches;
}

export function getR2Env(): {
  bucket: any | undefined;
  caches: CacheStorage | undefined;
} {
  return { bucket: _bucket, caches: _caches };
}
