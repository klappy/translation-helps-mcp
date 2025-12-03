/**
 * Parallel Processing Utility
 *
 * Provides interleaved CPU/IO processing for optimal throughput.
 * Each item does CPU + IO together, and the event loop naturally
 * interleaves work across items during IO waits.
 */

const DEFAULT_CONCURRENCY = 10;

/**
 * Process items with true interleaved parallelism.
 *
 * Unlike Promise.all(items.map(fn)), this limits concurrent operations
 * to avoid overwhelming R2 or other resources while still achieving
 * maximum throughput through interleaving.
 *
 * @param items - Array of items to process
 * @param fn - Async function to run on each item (does both CPU and IO)
 * @param concurrency - Maximum concurrent operations (default: 10)
 * @returns Array of results in same order as input
 */
export async function processWithInterleaving<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<R[]> {
  const results: Promise<R>[] = [];
  const executing = new Set<Promise<R>>();

  for (const item of items) {
    // Create the promise and track it
    const promise = fn(item).then((result) => {
      executing.delete(promise);
      return result;
    });

    executing.add(promise);
    results.push(promise);

    // When we hit concurrency limit, wait for one to finish
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  // Wait for all remaining promises
  return Promise.all(results);
}

/**
 * Result type for write operations
 */
export interface WriteResult {
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Batch write results summary
 */
export interface BatchWriteResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

/**
 * Summarize batch write results
 */
export function summarizeWriteResults(
  results: WriteResult[],
): BatchWriteResult {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const errors = results
    .filter((r) => r.error)
    .map((r) => `${r.path}: ${r.error}`);

  return {
    total: results.length,
    successful,
    failed,
    errors,
  };
}
