/**
 * Advanced Rate Limiting System for 6FB AI Agent Automation
 * 
 * Prevents automation spam and resource exhaustion through sophisticated
 * rate limiting with multiple tiers, sliding windows, and adaptive throttling.
 * 
 * Features:
 * - Multi-level rate limiting (customer, barbershop, global)
 * - Sliding window counters
 * - Adaptive throttling based on system load
 * - Priority queuing for critical operations
 * - Burst allowances for legitimate spikes
 */

import { redisClient } from '../redis-client.js';
import { logger } from '../logger.js';
import { alertingSystem } from './alerting.js';
import { AUTOMATION_FEATURES } from './circuit-breaker.js';

// Rate limit types
export const RATE_LIMIT_TYPES = {
  PER_CUSTOMER: 'per_customer',
  PER_BARBERSHOP: 'per_barbershop',
  PER_FEATURE: 'per_feature',
  GLOBAL: 'global'
};

// Priority levels for operations
export const PRIORITY_LEVELS = {
  CRITICAL: 1,    // Payment processing, refunds
  HIGH: 2,        // Customer communications, urgent notifications
  MEDIUM: 3,      // Regular notifications, sync operations
  LOW: 4          // Analytics, non-urgent background tasks
};

// Rate limit configurations by feature
const FEATURE_RATE_LIMITS = {
  [AUTOMATION_FEATURES.FEE_COLLECTION]: {
    perCustomer: { limit: 5, window: 3600 },      // 5 fee collections per hour per customer
    perBarbershop: { limit: 200, window: 3600 },  // 200 per hour per shop
    global: { limit: 10000, window: 3600 },       // 10k globally per hour
    priority: PRIORITY_LEVELS.CRITICAL,
    burstAllowance: 2
  },
  
  [AUTOMATION_FEATURES.PAYMENT_PROCESSING]: {
    perCustomer: { limit: 10, window: 3600 },
    perBarbershop: { limit: 500, window: 3600 },
    global: { limit: 20000, window: 3600 },
    priority: PRIORITY_LEVELS.CRITICAL,
    burstAllowance: 3
  },
  
  [AUTOMATION_FEATURES.REMINDER_SYSTEM]: {
    perCustomer: { limit: 12, window: 86400 },    // 12 reminders per day per customer
    perBarbershop: { limit: 1000, window: 86400 }, // 1000 per day per shop
    global: { limit: 50000, window: 86400 },
    priority: PRIORITY_LEVELS.HIGH,
    burstAllowance: 5
  },
  
  [AUTOMATION_FEATURES.SMS_NOTIFICATIONS]: {
    perCustomer: { limit: 20, window: 86400 },    // 20 SMS per day per customer
    perBarbershop: { limit: 2000, window: 86400 }, // 2000 per day per shop
    global: { limit: 100000, window: 86400 },
    priority: PRIORITY_LEVELS.HIGH,
    burstAllowance: 3
  },
  
  [AUTOMATION_FEATURES.EMAIL_CAMPAIGNS]: {
    perCustomer: { limit: 5, window: 86400 },     // 5 emails per day per customer
    perBarbershop: { limit: 5000, window: 86400 }, // 5000 per day per shop
    global: { limit: 200000, window: 86400 },
    priority: PRIORITY_LEVELS.MEDIUM,
    burstAllowance: 2
  },
  
  [AUTOMATION_FEATURES.PREDICTIVE_DETECTION]: {
    perCustomer: { limit: 100, window: 3600 },    // 100 predictions per hour per customer
    perBarbershop: { limit: 10000, window: 3600 }, // 10k per hour per shop
    global: { limit: 500000, window: 3600 },
    priority: PRIORITY_LEVELS.MEDIUM,
    burstAllowance: 10
  },
  
  [AUTOMATION_FEATURES.INVENTORY_SYNC]: {
    perBarbershop: { limit: 100, window: 3600 },  // 100 sync operations per hour per shop
    global: { limit: 10000, window: 3600 },
    priority: PRIORITY_LEVELS.LOW,
    burstAllowance: 5
  },
  
  [AUTOMATION_FEATURES.REVIEW_REQUESTS]: {
    perCustomer: { limit: 2, window: 604800 },    // 2 review requests per week per customer
    perBarbershop: { limit: 500, window: 86400 }, // 500 per day per shop
    global: { limit: 50000, window: 86400 },
    priority: PRIORITY_LEVELS.LOW,
    burstAllowance: 1
  }
};

class SlidingWindowRateLimiter {
  constructor(feature, limitType, identifier, config) {
    this.feature = feature;
    this.limitType = limitType;
    this.identifier = identifier;
    this.config = config;
    this.redisKey = `rate_limit:${feature}:${limitType}:${identifier}`;
  }
  
  /**
   * Check if request is allowed and consume from quota
   */
  async checkAndConsume(tokens = 1, priority = PRIORITY_LEVELS.MEDIUM) {
    const now = Date.now();
    const windowStart = now - (this.config.window * 1000);
    
    // Use Redis pipeline for atomic operations
    const pipeline = redisClient.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(this.redisKey, 0, windowStart);
    
    // Count current entries
    pipeline.zcard(this.redisKey);
    
    // Add current request with priority weighting
    const score = now + (priority * 0.1); // Higher priority gets slight timestamp boost
    pipeline.zadd(this.redisKey, score, `${now}:${Math.random()}`);
    
    // Set expiration
    pipeline.expire(this.redisKey, this.config.window + 60);
    
    const results = await pipeline.exec();
    const currentCount = results[1][1];
    
    // Check burst allowance
    const burstLimit = this.config.limit + (this.config.burstAllowance || 0);
    const isAllowed = currentCount <= this.config.limit;
    const isBurstAllowed = currentCount <= burstLimit;
    
    // If over limit, remove the request we just added
    if (!isBurstAllowed) {
      await redisClient.zrem(this.redisKey, `${now}:${Math.random()}`);
    }
    
    const result = {
      allowed: isBurstAllowed,
      inBurst: !isAllowed && isBurstAllowed,
      remaining: Math.max(0, this.config.limit - currentCount),
      resetTime: new Date(now + (this.config.window * 1000)),
      totalHits: currentCount,
      limit: this.config.limit,
      burstLimit,
      priority
    };
    
    // Log rate limiting events
    if (!isBurstAllowed) {
      logger.warn('Rate limit exceeded', {
        feature: this.feature,
        limitType: this.limitType,
        identifier: this.identifier,
        currentCount,
        limit: this.config.limit,
        priority
      });
      
      // Send alert for excessive rate limiting
      if (currentCount > burstLimit * 1.5) {
        await alertingSystem.sendAlert('excessive_rate_limiting', {
          feature: this.feature,
          identifier: this.identifier,
          currentCount,
          limit: this.config.limit,
          severity: 'warning'
        });
      }
    }
    
    return result;
  }
  
  /**
   * Get current usage without consuming quota
   */
  async getCurrentUsage() {
    const now = Date.now();
    const windowStart = now - (this.config.window * 1000);
    
    // Clean up expired entries and count current
    await redisClient.zremrangebyscore(this.redisKey, 0, windowStart);
    const currentCount = await redisClient.zcard(this.redisKey);
    
    return {
      current: currentCount,
      limit: this.config.limit,
      remaining: Math.max(0, this.config.limit - currentCount),
      resetTime: new Date(now + (this.config.window * 1000)),
      windowSeconds: this.config.window
    };
  }
  
  /**
   * Reset rate limit (admin function)
   */
  async reset() {
    await redisClient.del(this.redisKey);
    logger.info('Rate limit reset', {
      feature: this.feature,
      limitType: this.limitType,
      identifier: this.identifier
    });
  }
}

class AdaptiveRateLimiter {
  constructor() {
    this.systemLoad = 0;
    this.adaptiveMultiplier = 1.0;
    this.loadCheckInterval = 30000; // 30 seconds
    this.priorityQueues = new Map();
    
    this.initializeLoadMonitoring();
    this.initializePriorityQueues();
  }
  
  /**
   * Initialize system load monitoring
   */
  initializeLoadMonitoring() {
    setInterval(async () => {
      try {
        await this.updateSystemLoad();
        await this.adjustRateLimits();
      } catch (error) {
        logger.error('Load monitoring failed', { error: error.message });
      }
    }, this.loadCheckInterval);
  }
  
  /**
   * Update system load metrics
   */
  async updateSystemLoad() {
    try {
      // Get Redis info
      const redisInfo = await redisClient.info('memory');
      const memoryUsed = this.parseRedisInfo(redisInfo, 'used_memory');
      const memoryMax = this.parseRedisInfo(redisInfo, 'maxmemory') || memoryUsed * 2;
      
      // Calculate load factors
      const memoryLoad = memoryUsed / memoryMax;
      const connectionLoad = await this.getConnectionLoad();
      
      // Composite load score (0-1)
      this.systemLoad = Math.max(memoryLoad, connectionLoad);
      
      // Adjust rate limit multiplier based on load
      if (this.systemLoad > 0.8) {
        this.adaptiveMultiplier = 0.5; // Reduce limits by 50%
      } else if (this.systemLoad > 0.6) {
        this.adaptiveMultiplier = 0.75; // Reduce limits by 25%
      } else {
        this.adaptiveMultiplier = 1.0; // Normal limits
      }
      
    } catch (error) {
      logger.error('System load update failed', { error: error.message });
      this.systemLoad = 0.5; // Conservative default
      this.adaptiveMultiplier = 0.8;
    }
  }
  
  /**
   * Parse Redis INFO command output
   */
  parseRedisInfo(info, key) {
    const lines = info.split('\n');
    const line = lines.find(l => l.startsWith(key + ':'));
    return line ? parseInt(line.split(':')[1]) : null;
  }
  
  /**
   * Get connection load
   */
  async getConnectionLoad() {
    try {
      const info = await redisClient.info('clients');
      const connectedClients = this.parseRedisInfo(info, 'connected_clients');
      const maxClients = this.parseRedisInfo(info, 'maxclients') || 10000;
      return connectedClients / maxClients;
    } catch (error) {
      return 0.1; // Low load default
    }
  }
  
  /**
   * Adjust rate limits based on system load
   */
  async adjustRateLimits() {
    if (this.adaptiveMultiplier < 1.0) {
      logger.info('Adaptive rate limiting active', {
        systemLoad: this.systemLoad,
        multiplier: this.adaptiveMultiplier
      });
      
      await alertingSystem.sendAlert('adaptive_rate_limiting', {
        systemLoad: this.systemLoad,
        multiplier: this.adaptiveMultiplier,
        severity: 'info'
      });
    }
  }
  
  /**
   * Initialize priority queues
   */
  initializePriorityQueues() {
    Object.values(PRIORITY_LEVELS).forEach(priority => {
      this.priorityQueues.set(priority, []);
    });
  }
  
  /**
   * Check rate limits across all levels
   */
  async checkRateLimit(feature, context = {}) {
    const config = FEATURE_RATE_LIMITS[feature];
    if (!config) {
      throw new Error(`No rate limit configuration for feature: ${feature}`);
    }
    
    const results = {};
    const checks = [];
    
    // Apply adaptive multiplier
    const adaptedConfig = this.applyAdaptiveConfig(config);
    
    // Per-customer rate limiting
    if (adaptedConfig.perCustomer && context.customer_id) {
      const limiter = new SlidingWindowRateLimiter(
        feature, 
        RATE_LIMIT_TYPES.PER_CUSTOMER, 
        context.customer_id, 
        adaptedConfig.perCustomer
      );
      checks.push(['customer', limiter.checkAndConsume(1, config.priority)]);
    }
    
    // Per-barbershop rate limiting
    if (adaptedConfig.perBarbershop && context.barbershop_id) {
      const limiter = new SlidingWindowRateLimiter(
        feature, 
        RATE_LIMIT_TYPES.PER_BARBERSHOP, 
        context.barbershop_id, 
        adaptedConfig.perBarbershop
      );
      checks.push(['barbershop', limiter.checkAndConsume(1, config.priority)]);
    }
    
    // Global rate limiting
    if (adaptedConfig.global) {
      const limiter = new SlidingWindowRateLimiter(
        feature, 
        RATE_LIMIT_TYPES.GLOBAL, 
        'global', 
        adaptedConfig.global
      );
      checks.push(['global', limiter.checkAndConsume(1, config.priority)]);
    }
    
    // Execute all checks
    for (const [type, checkPromise] of checks) {
      results[type] = await checkPromise;
    }
    
    // Determine overall result
    const isAllowed = Object.values(results).every(r => r.allowed);
    const blockedBy = Object.entries(results)
      .filter(([_, result]) => !result.allowed)
      .map(([type, _]) => type);
    
    return {
      allowed: isAllowed,
      blockedBy,
      results,
      feature,
      priority: config.priority,
      adaptiveMultiplier: this.adaptiveMultiplier,
      systemLoad: this.systemLoad
    };
  }
  
  /**
   * Apply adaptive configuration based on system load
   */
  applyAdaptiveConfig(config) {
    const adaptedConfig = {};
    
    Object.keys(config).forEach(key => {
      if (typeof config[key] === 'object' && config[key].limit) {
        adaptedConfig[key] = {
          ...config[key],
          limit: Math.floor(config[key].limit * this.adaptiveMultiplier)
        };
      } else {
        adaptedConfig[key] = config[key];
      }
    });
    
    return adaptedConfig;
  }
  
  /**
   * Get rate limit status for monitoring
   */
  async getRateLimitStatus(feature, context = {}) {
    const config = FEATURE_RATE_LIMITS[feature];
    if (!config) {
      return null;
    }
    
    const status = {
      feature,
      systemLoad: this.systemLoad,
      adaptiveMultiplier: this.adaptiveMultiplier,
      limits: {}
    };
    
    // Get current usage for each limit type
    if (config.perCustomer && context.customer_id) {
      const limiter = new SlidingWindowRateLimiter(
        feature, 
        RATE_LIMIT_TYPES.PER_CUSTOMER, 
        context.customer_id, 
        config.perCustomer
      );
      status.limits.customer = await limiter.getCurrentUsage();
    }
    
    if (config.perBarbershop && context.barbershop_id) {
      const limiter = new SlidingWindowRateLimiter(
        feature, 
        RATE_LIMIT_TYPES.PER_BARBERSHOP, 
        context.barbershop_id, 
        config.perBarbershop
      );
      status.limits.barbershop = await limiter.getCurrentUsage();
    }
    
    if (config.global) {
      const limiter = new SlidingWindowRateLimiter(
        feature, 
        RATE_LIMIT_TYPES.GLOBAL, 
        'global', 
        config.global
      );
      status.limits.global = await limiter.getCurrentUsage();
    }
    
    return status;
  }
  
  /**
   * Get comprehensive rate limiting statistics
   */
  async getGlobalRateLimitStats() {
    const stats = {
      systemMetrics: {
        systemLoad: this.systemLoad,
        adaptiveMultiplier: this.adaptiveMultiplier,
        timestamp: new Date()
      },
      featureStats: {},
      topLimitedFeatures: [],
      alerts: []
    };
    
    // Collect stats for each feature
    for (const [feature, config] of Object.entries(FEATURE_RATE_LIMITS)) {
      const featureStats = {
        feature,
        priority: config.priority,
        limits: {},
        totalUsage: 0
      };
      
      // Global usage for this feature
      if (config.global) {
        const limiter = new SlidingWindowRateLimiter(
          feature, 
          RATE_LIMIT_TYPES.GLOBAL, 
          'global', 
          config.global
        );
        const usage = await limiter.getCurrentUsage();
        featureStats.limits.global = usage;
        featureStats.totalUsage = usage.current;
      }
      
      stats.featureStats[feature] = featureStats;
    }
    
    // Find top limited features
    stats.topLimitedFeatures = Object.values(stats.featureStats)
      .sort((a, b) => b.totalUsage - a.totalUsage)
      .slice(0, 5)
      .map(f => ({
        feature: f.feature,
        usage: f.totalUsage,
        utilization: f.limits.global ? 
          (f.limits.global.current / f.limits.global.limit * 100).toFixed(1) + '%' : 'N/A'
      }));
    
    return stats;
  }
  
  /**
   * Emergency rate limit override (admin function)
   */
  async emergencyOverride(feature, identifier, type, durationSeconds = 300) {
    const overrideKey = `rate_limit_override:${feature}:${type}:${identifier}`;
    
    await redisClient.setex(overrideKey, durationSeconds, 'emergency_override');
    
    logger.warn('Emergency rate limit override activated', {
      feature,
      identifier,
      type,
      duration: durationSeconds
    });
    
    await alertingSystem.sendAlert('rate_limit_override', {
      feature,
      identifier,
      type,
      duration: durationSeconds,
      severity: 'warning'
    });
    
    return {
      feature,
      identifier,
      type,
      overrideExpires: new Date(Date.now() + (durationSeconds * 1000))
    };
  }
  
  /**
   * Check for emergency override
   */
  async hasOverride(feature, identifier, type) {
    const overrideKey = `rate_limit_override:${feature}:${type}:${identifier}`;
    return await redisClient.exists(overrideKey) === 1;
  }
}

// Singleton instance
export const rateLimiter = new AdaptiveRateLimiter();

// Convenience functions
export const checkAutomationRateLimit = async (feature, context) => {
  // Check for emergency override first
  const overrides = [];
  
  if (context.customer_id) {
    overrides.push(rateLimiter.hasOverride(feature, context.customer_id, RATE_LIMIT_TYPES.PER_CUSTOMER));
  }
  
  if (context.barbershop_id) {
    overrides.push(rateLimiter.hasOverride(feature, context.barbershop_id, RATE_LIMIT_TYPES.PER_BARBERSHOP));
  }
  
  overrides.push(rateLimiter.hasOverride(feature, 'global', RATE_LIMIT_TYPES.GLOBAL));
  
  const hasAnyOverride = (await Promise.all(overrides)).some(Boolean);
  
  if (hasAnyOverride) {
    return {
      allowed: true,
      overridden: true,
      reason: 'emergency_override'
    };
  }
  
  return rateLimiter.checkRateLimit(feature, context);
};

export const getRateLimitStatus = (feature, context) => {
  return rateLimiter.getRateLimitStatus(feature, context);
};

export const getGlobalRateLimitStats = () => {
  return rateLimiter.getGlobalRateLimitStats();
};

export const emergencyRateLimitOverride = (feature, identifier, type, duration) => {
  return rateLimiter.emergencyOverride(feature, identifier, type, duration);
};

// Export classes and constants
export { SlidingWindowRateLimiter, AdaptiveRateLimiter, FEATURE_RATE_LIMITS };