/**
 * Timeout Helpers for Supabase Operations
 * Prevents hanging API calls from blocking the application
 */

/**
 * Wraps a promise with a timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operation - Name of the operation (for error messages)
 * @returns {Promise} - Resolves with promise result or rejects on timeout
 */
export function withTimeout(promise, timeoutMs, operation = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ])
}
