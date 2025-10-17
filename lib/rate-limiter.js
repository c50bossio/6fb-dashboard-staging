/**
 * Rate Limiter Utility
 * Re-exports rate limiting functionality from middleware
 */

const {
  RateLimiter,
  rateLimiters,
  SpendingLimiter,
  spendingLimiter,
  checkSpendingLimit,
  isRateLimited,
  getRemainingLimit,
  resetRateLimit
} = require('../middleware/rate-limiter')

// Export default rate limiter for API usage
const rateLimit = rateLimiters.api

module.exports = rateLimit
module.exports.RateLimiter = RateLimiter
module.exports.rateLimiters = rateLimiters
module.exports.SpendingLimiter = SpendingLimiter
module.exports.spendingLimiter = spendingLimiter
module.exports.checkSpendingLimit = checkSpendingLimit
module.exports.isRateLimited = isRateLimited
module.exports.getRemainingLimit = getRemainingLimit
module.exports.resetRateLimit = resetRateLimit