/**
 * Utility for adding timeout protection to promises
 */
export function withTimeout(promise, timeoutMs = 5000, fallback = null) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
  ]);
}

/**
 * Batch multiple operations with individual timeout protection
 */
export async function batchWithTimeout(operations, timeoutMs = 3000) {
  return Promise.all(
    operations.map(op => 
      withTimeout(op, timeoutMs).catch(() => null)
    )
  );
}