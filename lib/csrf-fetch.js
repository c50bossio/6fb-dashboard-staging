/**
 * CSRF-Aware Fetch Utility
 *
 * Automatically handles CSRF token management for all API requests.
 * Compatible with the middleware.js CSRF protection system.
 *
 * Usage:
 *   import { csrfFetch } from '@/lib/csrf-fetch'
 *
 *   const response = await csrfFetch('/api/customers/search', {
 *     method: 'POST',
 *     body: JSON.stringify({ ... })
 *   })
 */

class CSRFTokenManager {
  constructor() {
    this.token = null
    this.tokenExpiry = null
    this.TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000 // 50 minutes (token expires in 1 hour)
  }

  /**
   * Get current CSRF token or fetch a new one
   */
  async getToken() {
    // Return cached token if still valid
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token
    }

    // Fetch new token by making a GET request to any API endpoint
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        credentials: 'include'
      })

      // Extract CSRF token from response headers
      const csrfToken = response.headers.get('X-CSRF-Token')

      if (csrfToken) {
        this.token = csrfToken
        this.tokenExpiry = Date.now() + this.TOKEN_REFRESH_INTERVAL
        return csrfToken
      }

      // No token in response (user might not be authenticated)
      return null
    } catch (error) {
      console.warn('Failed to fetch CSRF token:', error)
      return null
    }
  }

  /**
   * Clear stored token (useful for logout)
   */
  clearToken() {
    this.token = null
    this.tokenExpiry = null
  }
}

// Singleton instance
const csrfManager = new CSRFTokenManager()

/**
 * CSRF-aware fetch wrapper
 *
 * Automatically includes CSRF token for POST/PUT/DELETE/PATCH requests.
 * Falls back to standard fetch if token is unavailable (unauthenticated requests).
 *
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Standard fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export async function csrfFetch(url, options = {}) {
  const method = options.method?.toUpperCase() || 'GET'
  const needsCSRFToken = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)

  // Clone options to avoid mutating original
  const fetchOptions = { ...options }

  // Add CSRF token for state-changing requests
  if (needsCSRFToken) {
    const csrfToken = await csrfManager.getToken()

    if (csrfToken) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'X-CSRF-Token': csrfToken
      }
    }
  }

  // Ensure credentials are included for cookie-based auth
  fetchOptions.credentials = fetchOptions.credentials || 'include'

  // Make the request
  return fetch(url, fetchOptions)
}

/**
 * Clear the stored CSRF token
 * Call this on logout to ensure fresh token on next login
 */
export function clearCSRFToken() {
  csrfManager.clearToken()
}

/**
 * Convenience wrapper that automatically parses JSON responses
 * and handles common error cases
 *
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Standard fetch options
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function csrfFetchJSON(url, options = {}) {
  // Ensure Content-Type is set for requests with body
  if (options.body && typeof options.body === 'string') {
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }

  const response = await csrfFetch(url, options)

  // Check for error responses
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`

    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // Response wasn't JSON, use status text
    }

    throw new Error(errorMessage)
  }

  // Parse JSON response
  return response.json()
}

// Export singleton manager for advanced use cases
export { csrfManager }
