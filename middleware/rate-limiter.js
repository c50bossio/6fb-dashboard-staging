// Rate Limiting Middleware for Campaign APIs
// Prevents abuse and ensures fair usage across all users

const { config } = require('../services/production-config');

// In-memory store for development (use Redis in production)
const rateLimitStore = new Map();

// Helper to get rate limit key
function getRateLimitKey(type, identifier) {
  return `ratelimit:${type}:${identifier}`;
}

// Helper to get current window
function getCurrentWindow() {
  const now = Date.now();
  const windowSize = 60 * 1000; // 1 minute window
  return Math.floor(now / windowSize);
}

// Check if rate limit is exceeded
function isRateLimited(type, identifier, limit) {
  const key = getRateLimitKey(type, identifier);
  const window = getCurrentWindow();
  const windowKey = `${key}:${window}`;
  
  const current = rateLimitStore.get(windowKey) || 0;
  
  if (current >= limit) {
    return true;
  }
  
  // Increment counter
  rateLimitStore.set(windowKey, current + 1);
  
  // Clean up old windows (older than 5 minutes)
  const fiveMinutesAgo = getCurrentWindow() - 5;
  for (const [key, _] of rateLimitStore) {
    const keyWindow = parseInt(key.split(':').pop());
    if (keyWindow < fiveMinutesAgo) {
      rateLimitStore.delete(key);
    }
  }
  
  return false;
}

// Get remaining limit
function getRemainingLimit(type, identifier, limit) {
  const key = getRateLimitKey(type, identifier);
  const window = getCurrentWindow();
  const windowKey = `${key}:${window}`;
  
  const current = rateLimitStore.get(windowKey) || 0;
  return Math.max(0, limit - current);
}

// Reset rate limit (for testing or admin override)
function resetRateLimit(type, identifier) {
  const key = getRateLimitKey(type, identifier);
  const window = getCurrentWindow();
  const windowKey = `${key}:${window}`;
  
  rateLimitStore.delete(windowKey);
}

// Main rate limiter middleware
class RateLimiter {
  constructor(options = {}) {
    this.type = options.type || 'api';
    this.getIdentifier = options.getIdentifier || ((req) => req.ip || 'anonymous');
    this.getLimit = options.getLimit || (() => 60);
    this.onLimitExceeded = options.onLimitExceeded || null;
    this.skipCondition = options.skipCondition || (() => false);
  }

  // Express/Next.js middleware
  middleware() {
    return async (req, res, next) => {
      // Skip rate limiting if condition is met
      if (this.skipCondition(req)) {
        return next ? next() : undefined;
      }

      const identifier = this.getIdentifier(req);
      const limit = this.getLimit(req);
      
      // Check rate limit
      if (isRateLimited(this.type, identifier, limit)) {
        // Get remaining info
        const remaining = getRemainingLimit(this.type, identifier, limit);
        const resetTime = (getCurrentWindow() + 1) * 60 * 1000;
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
        
        // Call custom handler if provided
        if (this.onLimitExceeded) {
          return this.onLimitExceeded(req, res, { identifier, limit, remaining });
        }
        
        // Default response
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please retry after ${new Date(resetTime).toISOString()}`,
          limit,
          remaining: 0,
          resetAt: new Date(resetTime).toISOString()
        });
      }
      
      // Add rate limit headers
      const remaining = getRemainingLimit(this.type, identifier, limit);
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      
      // Continue to next middleware
      if (next) next();
    };
  }

  // For Next.js API routes
  async check(req, res) {
    const middleware = this.middleware();
    return new Promise((resolve) => {
      middleware(req, res, () => resolve(true));
      // If middleware responds with 429, it won't call next()
      // So we'll resolve false after a timeout
      setTimeout(() => resolve(false), 0);
    });
  }
}

// Pre-configured rate limiters
const rateLimiters = {
  // API rate limiter (per user)
  api: new RateLimiter({
    type: 'api',
    getIdentifier: (req) => req.headers['x-user-id'] || req.ip || 'anonymous',
    getLimit: () => config.rateLimits.api.perUser,
    skipCondition: (req) => process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true'
  }),

  // Email campaign rate limiter (per shop)
  emailCampaign: new RateLimiter({
    type: 'email',
    getIdentifier: (req) => req.body?.shop_id || req.query?.shop_id || 'unknown',
    getLimit: () => Math.floor(config.rateLimits.email.perShop / 60), // Convert hourly to per-minute
    onLimitExceeded: (req, res, info) => {
      return res.status(429).json({
        error: 'Email campaign rate limit exceeded',
        message: 'You have reached the maximum number of email campaigns for this period',
        limit: info.limit,
        remaining: 0,
        suggestion: 'Consider scheduling your campaign for later or upgrading your plan'
      });
    }
  }),

  // SMS campaign rate limiter (per shop)
  smsCampaign: new RateLimiter({
    type: 'sms',
    getIdentifier: (req) => req.body?.shop_id || req.query?.shop_id || 'unknown',
    getLimit: () => Math.floor(config.rateLimits.sms.perShop / 60), // Convert hourly to per-minute
    onLimitExceeded: (req, res, info) => {
      return res.status(429).json({
        error: 'SMS campaign rate limit exceeded',
        message: 'You have reached the maximum number of SMS campaigns for this period',
        limit: info.limit,
        remaining: 0,
        suggestion: 'SMS campaigns have stricter limits due to carrier regulations'
      });
    }
  }),

  // Burst protection for campaigns
  campaignBurst: new RateLimiter({
    type: 'burst',
    getIdentifier: (req) => req.body?.shop_id || req.query?.shop_id || 'unknown',
    getLimit: () => 5, // Max 5 campaigns per minute regardless of type
    onLimitExceeded: (req, res) => {
      return res.status(429).json({
        error: 'Too many campaigns',
        message: 'Please wait a moment before creating another campaign',
        suggestion: 'Campaigns are being created too quickly. Please space them out.'
      });
    }
  })
};

// Spending limit checker
class SpendingLimiter {
  constructor() {
    this.spendingStore = new Map();
  }

  // Get current month key
  getMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  // Get spending for a shop
  getSpending(shopId) {
    const monthKey = this.getMonthKey();
    const key = `spending:${shopId}:${monthKey}`;
    return this.spendingStore.get(key) || 0;
  }

  // Add spending
  addSpending(shopId, amount) {
    const monthKey = this.getMonthKey();
    const key = `spending:${shopId}:${monthKey}`;
    const current = this.spendingStore.get(key) || 0;
    const newTotal = current + amount;
    this.spendingStore.set(key, newTotal);
    return newTotal;
  }

  // Check if spending limit exceeded
  async checkLimit(shopId, accountType, additionalCost) {
    const currentSpending = this.getSpending(shopId);
    const limit = config.spendingLimits.defaultLimits[accountType] || config.spendingLimits.defaultLimits.shop;
    const projectedSpending = currentSpending + additionalCost;
    
    // Check if would exceed limit
    if (projectedSpending > limit) {
      return {
        allowed: false,
        currentSpending,
        limit,
        projectedSpending,
        message: 'Monthly spending limit would be exceeded'
      };
    }
    
    // Check warning threshold
    const warningThreshold = limit * config.spendingLimits.alertThresholds.warning;
    const criticalThreshold = limit * config.spendingLimits.alertThresholds.critical;
    
    let warning = null;
    if (projectedSpending > criticalThreshold) {
      warning = 'Critical: Approaching spending limit';
    } else if (projectedSpending > warningThreshold) {
      warning = 'Warning: Nearing spending limit';
    }
    
    return {
      allowed: true,
      currentSpending,
      limit,
      projectedSpending,
      remaining: limit - projectedSpending,
      percentageUsed: (projectedSpending / limit) * 100,
      warning
    };
  }

  // Process spending (after successful campaign)
  async processSpending(shopId, amount) {
    const newTotal = this.addSpending(shopId, amount);
    return {
      success: true,
      monthlyTotal: newTotal,
      amount
    };
  }

  // Reset spending (for testing or new month)
  resetSpending(shopId) {
    const monthKey = this.getMonthKey();
    const key = `spending:${shopId}:${monthKey}`;
    this.spendingStore.delete(key);
  }
}

// Create spending limiter instance
const spendingLimiter = new SpendingLimiter();

// Middleware to check spending limits
const checkSpendingLimit = async (req, res, next) => {
  // Skip in development if flag is set
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_SPENDING_LIMIT === 'true') {
    return next ? next() : undefined;
  }

  const shopId = req.body?.shop_id || req.query?.shop_id;
  const accountType = req.body?.account_type || 'shop';
  const estimatedCost = req.body?.estimated_cost || 0;

  if (!shopId || estimatedCost <= 0) {
    return next ? next() : undefined;
  }

  const limitCheck = await spendingLimiter.checkLimit(shopId, accountType, estimatedCost);

  if (!limitCheck.allowed) {
    return res.status(402).json({
      error: 'Spending limit exceeded',
      message: limitCheck.message,
      currentSpending: limitCheck.currentSpending,
      limit: limitCheck.limit,
      projectedSpending: limitCheck.projectedSpending
    });
  }

  // Add warning to response if applicable
  if (limitCheck.warning) {
    res.setHeader('X-Spending-Warning', limitCheck.warning);
    res.setHeader('X-Spending-Remaining', limitCheck.remaining);
    res.setHeader('X-Spending-Percentage', limitCheck.percentageUsed);
  }

  // Store limit check in request for later use
  req.spendingLimitCheck = limitCheck;

  if (next) next();
};

module.exports = {
  RateLimiter,
  rateLimiters,
  SpendingLimiter,
  spendingLimiter,
  checkSpendingLimit,
  isRateLimited,
  getRemainingLimit,
  resetRateLimit
};