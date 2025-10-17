// Use Web Crypto API (available in both Node.js and Edge Runtime)
// instead of Node.js 'crypto' module for Edge Runtime compatibility

// In-memory store for CSRF tokens (use Redis/database in production for multi-server)
const tokenStore = new Map()
const TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour

/**
 * Generate a random token using Web Crypto API (Edge Runtime compatible)
 */
function generateRandomToken() {
  // Web Crypto API available in both Node.js 16+ and Edge Runtime
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)

  // Convert to base64url format
  const base64 = Buffer.from(array).toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Generate a CSRF token for a user session
 */
export function generateCsrfToken(userId) {
  const token = generateRandomToken()
  const expiresAt = Date.now() + TOKEN_EXPIRY

  tokenStore.set(token, {
    userId,
    expiresAt,
    createdAt: Date.now()
  })

  // Clean up expired tokens
  cleanupExpiredTokens()

  return token
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token, userId) {
  if (!token || !userId) {
    return false
  }
  
  const tokenData = tokenStore.get(token)
  
  if (!tokenData) {
    return false
  }
  
  // Check if token expired
  if (Date.now() > tokenData.expiresAt) {
    tokenStore.delete(token)
    return false
  }
  
  // Check if token belongs to this user
  if (tokenData.userId !== userId) {
    return false
  }
  
  return true
}

/**
 * Revoke a CSRF token (for logout)
 */
export function revokeCsrfToken(token) {
  tokenStore.delete(token)
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now()
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(token)
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredTokens, 10 * 60 * 1000)
