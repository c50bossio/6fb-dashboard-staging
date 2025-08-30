/**
 * Circuit Breaker System for 6FB AI Agent Automation
 * 
 * Prevents cascading failures by automatically disabling problematic features
 * and providing gradual recovery mechanisms for automation systems.
 * 
 * Features:
 * - Auto-disable features when failure thresholds are met
 * - Gradual recovery with half-open testing
 * - Service health tracking and metrics
 * - Integration with alerting system
 */

import { EventEmitter } from 'events';
import { logger } from '../logger.js';
import { redisClient } from '../redis-client.js';
import { alertingSystem } from './alerting.js';

// Circuit breaker states
export const CIRCUIT_STATES = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Circuit open, requests blocked
  HALF_OPEN: 'half-open' // Testing recovery
};

// Feature types for automation
export const AUTOMATION_FEATURES = {
  FEE_COLLECTION: 'fee_collection',
  REMINDER_SYSTEM: 'reminder_system',
  PREDICTIVE_DETECTION: 'predictive_detection',
  SMS_NOTIFICATIONS: 'sms_notifications',
  EMAIL_CAMPAIGNS: 'email_campaigns',
  PAYMENT_PROCESSING: 'payment_processing',
  INVENTORY_SYNC: 'inventory_sync',
  REVIEW_REQUESTS: 'review_requests'
};

class CircuitBreaker extends EventEmitter {
  constructor(name, options = {}) {
    super();
    
    this.name = name;
    this.state = CIRCUIT_STATES.CLOSED;
    
    // Configuration with production-safe defaults
    this.config = {
      failureThreshold: options.failureThreshold || 5,    // Failures to trip circuit
      recoveryTimeout: options.recoveryTimeout || 60000,  // 1 minute
      monitorWindow: options.monitorWindow || 300000,     // 5 minutes
      halfOpenRetries: options.halfOpenRetries || 3,      // Test attempts
      criticalFailureTypes: options.criticalFailureTypes || [
        'PAYMENT_ERROR',
        'CUSTOMER_IMPACT',
        'DATA_CORRUPTION'
      ],
      ...options
    };
    
    // Metrics tracking
    this.metrics = {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      lastFailureTime: null,
      circuitOpenTime: null,
      recoveryAttempts: 0,
      consecutiveFailures: 0
    };
    
    // Recovery state
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.halfOpenTries = 0;
    
    this.initializeRedisKeys();
    this.setupCleanupJob();
  }
  
  /**
   * Initialize Redis keys for persistent state
   */
  async initializeRedisKeys() {
    this.redisKeys = {
      state: `circuit:${this.name}:state`,
      metrics: `circuit:${this.name}:metrics`,
      failures: `circuit:${this.name}:failures`,
      config: `circuit:${this.name}:config`
    };
    
    try {
      // Load persisted state
      const savedState = await redisClient.get(this.redisKeys.state);
      const savedMetrics = await redisClient.get(this.redisKeys.metrics);
      
      if (savedState) {
        this.state = savedState;
      }
      
      if (savedMetrics) {
        this.metrics = { ...this.metrics, ...JSON.parse(savedMetrics) };
      }
      
      logger.info(`Circuit breaker ${this.name} initialized`, {
        state: this.state,
        metrics: this.metrics
      });
      
    } catch (error) {
      logger.warn(`Failed to load circuit breaker state for ${this.name}`, { error: error.message });
    }
  }
  
  /**
   * Execute a protected operation through the circuit breaker
   */
  async execute(operation, context = {}) {
    const startTime = Date.now();
    
    try {
      // Check if circuit allows execution
      if (await this.shouldBlock()) {
        const error = new Error(`Circuit breaker is ${this.state} for ${this.name}`);
        error.code = 'CIRCUIT_OPEN';
        throw error;
      }
      
      // Execute the operation
      const result = await this.executeWithTimeout(operation, context);
      
      // Record success
      await this.recordSuccess(Date.now() - startTime);
      
      return result;
      
    } catch (error) {
      // Record failure
      await this.recordFailure(error, Date.now() - startTime, context);
      throw error;
    }
  }
  
  /**
   * Execute operation with timeout protection
   */
  async executeWithTimeout(operation, context) {
    const timeout = context.timeout || 30000; // 30 second default
    
    return Promise.race([
      operation(context),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }
  
  /**
   * Check if requests should be blocked
   */
  async shouldBlock() {
    const now = Date.now();
    
    switch (this.state) {
      case CIRCUIT_STATES.CLOSED:
        return false;
        
      case CIRCUIT_STATES.OPEN:
        // Check if recovery timeout has passed
        if (now >= this.nextAttemptTime) {
          await this.transitionToHalfOpen();
          return false;
        }
        return true;
        
      case CIRCUIT_STATES.HALF_OPEN:
        // Allow limited testing
        return this.halfOpenTries >= this.config.halfOpenRetries;
        
      default:
        return false;
    }
  }
  
  /**
   * Record successful operation
   */
  async recordSuccess(duration) {
    this.metrics.totalRequests++;
    this.metrics.successCount++;
    this.metrics.consecutiveFailures = 0;
    
    // Reset half-open tries on success
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.halfOpenTries = 0;
      await this.transitionToClosed();
    }
    
    await this.persistMetrics();
    
    this.emit('success', {
      name: this.name,
      duration,
      state: this.state,
      metrics: this.metrics
    });
  }
  
  /**
   * Record failed operation
   */
  async recordFailure(error, duration, context) {
    this.metrics.totalRequests++;
    this.metrics.failureCount++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastFailureTime = Date.now();
    
    const isCritical = this.isCriticalFailure(error);
    
    // Store failure details in Redis for analysis
    await this.storeFailureDetails(error, context, isCritical);
    
    // Check if we should trip the circuit
    if (this.shouldTripCircuit(error)) {
      await this.transitionToOpen(error);
    } else if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.halfOpenTries++;
      if (this.halfOpenTries >= this.config.halfOpenRetries) {
        await this.transitionToOpen(error);
      }
    }
    
    await this.persistMetrics();
    
    this.emit('failure', {
      name: this.name,
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      duration,
      context,
      isCritical,
      state: this.state,
      metrics: this.metrics
    });
  }
  
  /**
   * Check if failure should trip the circuit
   */
  shouldTripCircuit(error) {
    // Trip immediately for critical errors
    if (this.isCriticalFailure(error)) {
      return true;
    }
    
    // Trip if failure threshold is reached
    return this.metrics.consecutiveFailures >= this.config.failureThreshold;
  }
  
  /**
   * Check if error is critical
   */
  isCriticalFailure(error) {
    return this.config.criticalFailureTypes.some(type => 
      error.code === type || error.message.includes(type)
    );
  }
  
  /**
   * Transition to OPEN state
   */
  async transitionToOpen(error) {
    const previousState = this.state;
    this.state = CIRCUIT_STATES.OPEN;
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    this.metrics.circuitOpenTime = Date.now();
    
    await this.persistState();
    
    logger.error(`Circuit breaker ${this.name} opened`, {
      previousState,
      error: error.message,
      consecutiveFailures: this.metrics.consecutiveFailures,
      nextAttemptTime: new Date(this.nextAttemptTime)
    });
    
    // Send critical alert
    await alertingSystem.sendAlert('circuit_breaker_opened', {
      feature: this.name,
      error: error.message,
      consecutiveFailures: this.metrics.consecutiveFailures,
      severity: 'critical'
    });
    
    this.emit('state_change', {
      name: this.name,
      from: previousState,
      to: this.state,
      reason: 'failure_threshold_exceeded',
      error: error.message
    });
  }
  
  /**
   * Transition to HALF_OPEN state
   */
  async transitionToHalfOpen() {
    const previousState = this.state;
    this.state = CIRCUIT_STATES.HALF_OPEN;
    this.halfOpenTries = 0;
    this.metrics.recoveryAttempts++;
    
    await this.persistState();
    
    logger.info(`Circuit breaker ${this.name} entering half-open state`, {
      previousState,
      recoveryAttempts: this.metrics.recoveryAttempts
    });
    
    this.emit('state_change', {
      name: this.name,
      from: previousState,
      to: this.state,
      reason: 'recovery_timeout_elapsed'
    });
  }
  
  /**
   * Transition to CLOSED state
   */
  async transitionToClosed() {
    const previousState = this.state;
    this.state = CIRCUIT_STATES.CLOSED;
    this.metrics.circuitOpenTime = null;
    
    await this.persistState();
    
    logger.info(`Circuit breaker ${this.name} closed - service recovered`, {
      previousState,
      totalFailures: this.metrics.failureCount,
      totalRequests: this.metrics.totalRequests
    });
    
    // Send recovery notification
    await alertingSystem.sendAlert('circuit_breaker_recovered', {
      feature: this.name,
      recoveryAttempts: this.metrics.recoveryAttempts,
      severity: 'info'
    });
    
    this.emit('state_change', {
      name: this.name,
      from: previousState,
      to: this.state,
      reason: 'service_recovered'
    });
  }
  
  /**
   * Store failure details for debugging
   */
  async storeFailureDetails(error, context, isCritical) {
    try {
      const failureData = {
        timestamp: Date.now(),
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        },
        context: {
          ...context,
          // Remove sensitive data
          user_id: context.user_id,
          barberbarbershop_id: context.barberbarbershop_id
        },
        isCritical,
        state: this.state,
        consecutiveFailures: this.metrics.consecutiveFailures
      };
      
      // Store in Redis list with expiration
      await redisClient.lpush(this.redisKeys.failures, JSON.stringify(failureData));
      await redisClient.ltrim(this.redisKeys.failures, 0, 99); // Keep last 100 failures
      await redisClient.expire(this.redisKeys.failures, 86400); // 24 hours
      
    } catch (storeError) {
      logger.error(`Failed to store failure details for ${this.name}`, {
        error: storeError.message
      });
    }
  }
  
  /**
   * Get circuit breaker status
   */
  async getStatus() {
    return {
      name: this.name,
      state: this.state,
      config: this.config,
      metrics: {
        ...this.metrics,
        uptime: this.metrics.circuitOpenTime ? 
          ((Date.now() - this.metrics.circuitOpenTime) / 1000) : null,
        successRate: this.metrics.totalRequests > 0 ? 
          (this.metrics.successCount / this.metrics.totalRequests) * 100 : 0
      },
      nextAttemptTime: this.nextAttemptTime > 0 ? 
        new Date(this.nextAttemptTime) : null,
      healthCheck: await this.performHealthCheck()
    };
  }
  
  /**
   * Perform health check on the protected service
   */
  async performHealthCheck() {
    try {
      // Basic connectivity test - implement per service
      const healthResult = {
        status: 'healthy',
        timestamp: new Date(),
        checks: {}
      };
      
      // Redis connectivity
      healthResult.checks.redis = await this.checkRedisHealth();
      
      return healthResult;
      
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message
      };
    }
  }
  
  /**
   * Check Redis connectivity
   */
  async checkRedisHealth() {
    try {
      await redisClient.ping();
      return { status: 'healthy', latency: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
  
  /**
   * Force reset circuit breaker (admin function)
   */
  async forceReset(reason = 'manual_reset') {
    const previousState = this.state;
    
    this.state = CIRCUIT_STATES.CLOSED;
    this.metrics.consecutiveFailures = 0;
    this.metrics.circuitOpenTime = null;
    this.halfOpenTries = 0;
    this.nextAttemptTime = 0;
    
    await this.persistState();
    await this.persistMetrics();
    
    logger.warn(`Circuit breaker ${this.name} force reset`, {
      previousState,
      reason,
      resetTime: new Date()
    });
    
    await alertingSystem.sendAlert('circuit_breaker_force_reset', {
      feature: this.name,
      previousState,
      reason,
      severity: 'warning'
    });
    
    this.emit('force_reset', {
      name: this.name,
      previousState,
      reason
    });
  }
  
  /**
   * Persist state to Redis
   */
  async persistState() {
    try {
      await redisClient.setex(this.redisKeys.state, 3600, this.state);
    } catch (error) {
      logger.error(`Failed to persist state for ${this.name}`, { error: error.message });
    }
  }
  
  /**
   * Persist metrics to Redis
   */
  async persistMetrics() {
    try {
      await redisClient.setex(this.redisKeys.metrics, 3600, JSON.stringify(this.metrics));
    } catch (error) {
      logger.error(`Failed to persist metrics for ${this.name}`, { error: error.message });
    }
  }
  
  /**
   * Setup cleanup job for old data
   */
  setupCleanupJob() {
    // Clean up old failure records every hour
    setInterval(async () => {
      try {
        const failures = await redisClient.lrange(this.redisKeys.failures, 0, -1);
        const now = Date.now();
        const validFailures = failures.filter(failureStr => {
          try {
            const failure = JSON.parse(failureStr);
            return (now - failure.timestamp) < 86400000; // 24 hours
          } catch {
            return false;
          }
        });
        
        if (validFailures.length !== failures.length) {
          await redisClient.del(this.redisKeys.failures);
          for (const failure of validFailures) {
            await redisClient.lpush(this.redisKeys.failures, failure);
          }
        }
      } catch (error) {
        logger.error(`Cleanup job failed for ${this.name}`, { error: error.message });
      }
    }, 3600000); // 1 hour
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different automation features
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.globalMetrics = {
      totalBreakers: 0,
      openCircuits: 0,
      halfOpenCircuits: 0,
      totalFailures: 0,
      totalSuccesses: 0
    };
    
    this.initializeDefaultBreakers();
  }
  
  /**
   * Initialize circuit breakers for all automation features
   */
  initializeDefaultBreakers() {
    // Critical financial operations - strict thresholds
    this.createBreaker(AUTOMATION_FEATURES.FEE_COLLECTION, {
      failureThreshold: 3,
      recoveryTimeout: 300000, // 5 minutes
      criticalFailureTypes: ['PAYMENT_ERROR', 'DOUBLE_CHARGE', 'REFUND_ERROR']
    });
    
    this.createBreaker(AUTOMATION_FEATURES.PAYMENT_PROCESSING, {
      failureThreshold: 3,
      recoveryTimeout: 300000,
      criticalFailureTypes: ['STRIPE_ERROR', 'PAYMENT_FAILED', 'CHARGE_DISPUTE']
    });
    
    // Customer communication - moderate thresholds
    this.createBreaker(AUTOMATION_FEATURES.REMINDER_SYSTEM, {
      failureThreshold: 5,
      recoveryTimeout: 180000, // 3 minutes
      criticalFailureTypes: ['CUSTOMER_COMPLAINT', 'SPAM_DETECTED']
    });
    
    this.createBreaker(AUTOMATION_FEATURES.SMS_NOTIFICATIONS, {
      failureThreshold: 5,
      recoveryTimeout: 180000,
      criticalFailureTypes: ['SMS_DELIVERY_FAILED', 'CARRIER_BLOCKED']
    });
    
    this.createBreaker(AUTOMATION_FEATURES.EMAIL_CAMPAIGNS, {
      failureThreshold: 10,
      recoveryTimeout: 300000,
      criticalFailureTypes: ['SPAM_COMPLAINT', 'DOMAIN_BLOCKED']
    });
    
    // Business intelligence - relaxed thresholds
    this.createBreaker(AUTOMATION_FEATURES.PREDICTIVE_DETECTION, {
      failureThreshold: 10,
      recoveryTimeout: 120000, // 2 minutes
      criticalFailureTypes: ['DATA_CORRUPTION', 'ANALYSIS_ERROR']
    });
    
    this.createBreaker(AUTOMATION_FEATURES.INVENTORY_SYNC, {
      failureThreshold: 8,
      recoveryTimeout: 240000, // 4 minutes
      criticalFailureTypes: ['SYNC_CONFLICT', 'DATA_LOSS']
    });
    
    this.createBreaker(AUTOMATION_FEATURES.REVIEW_REQUESTS, {
      failureThreshold: 15,
      recoveryTimeout: 600000, // 10 minutes
      criticalFailureTypes: ['CUSTOMER_NEGATIVE_RESPONSE']
    });
    
    logger.info('Circuit breaker manager initialized', {
      totalBreakers: this.breakers.size,
      features: Array.from(this.breakers.keys())
    });
  }
  
  /**
   * Create a new circuit breaker
   */
  createBreaker(name, options = {}) {
    const breaker = new CircuitBreaker(name, options);
    
    // Setup event listeners
    breaker.on('state_change', this.handleStateChange.bind(this));
    breaker.on('failure', this.handleFailure.bind(this));
    breaker.on('success', this.handleSuccess.bind(this));
    
    this.breakers.set(name, breaker);
    this.globalMetrics.totalBreakers++;
    
    return breaker;
  }
  
  /**
   * Get circuit breaker for a feature
   */
  getBreaker(featureName) {
    return this.breakers.get(featureName);
  }
  
  /**
   * Execute operation through appropriate circuit breaker
   */
  async execute(featureName, operation, context = {}) {
    const breaker = this.getBreaker(featureName);
    
    if (!breaker) {
      throw new Error(`No circuit breaker found for feature: ${featureName}`);
    }
    
    return breaker.execute(operation, { 
      ...context, 
      feature: featureName,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle circuit breaker state changes
   */
  handleStateChange(event) {
    if (event.to === CIRCUIT_STATES.OPEN) {
      this.globalMetrics.openCircuits++;
    } else if (event.from === CIRCUIT_STATES.OPEN) {
      this.globalMetrics.openCircuits--;
    }
    
    if (event.to === CIRCUIT_STATES.HALF_OPEN) {
      this.globalMetrics.halfOpenCircuits++;
    } else if (event.from === CIRCUIT_STATES.HALF_OPEN) {
      this.globalMetrics.halfOpenCircuits--;
    }
    
    logger.info('Circuit breaker state change', event);
  }
  
  /**
   * Handle circuit breaker failures
   */
  handleFailure(event) {
    this.globalMetrics.totalFailures++;
    
    // Critical failure handling
    if (event.isCritical) {
      logger.error('Critical circuit breaker failure', event);
    }
  }
  
  /**
   * Handle circuit breaker successes
   */
  handleSuccess(event) {
    this.globalMetrics.totalSuccesses++;
  }
  
  /**
   * Get global status of all circuit breakers
   */
  async getGlobalStatus() {
    const breakerStatuses = {};
    
    for (const [name, breaker] of this.breakers) {
      breakerStatuses[name] = await breaker.getStatus();
    }
    
    return {
      globalMetrics: this.globalMetrics,
      breakers: breakerStatuses,
      summary: {
        totalBreakers: this.breakers.size,
        healthyBreakers: Object.values(breakerStatuses).filter(b => b.state === CIRCUIT_STATES.CLOSED).length,
        openBreakers: Object.values(breakerStatuses).filter(b => b.state === CIRCUIT_STATES.OPEN).length,
        halfOpenBreakers: Object.values(breakerStatuses).filter(b => b.state === CIRCUIT_STATES.HALF_OPEN).length
      }
    };
  }
  
  /**
   * Emergency shutdown - open all circuit breakers
   */
  async emergencyShutdown(reason = 'manual_shutdown') {
    logger.error('Emergency circuit breaker shutdown initiated', { reason });
    
    const results = [];
    for (const [name, breaker] of this.breakers) {
      try {
        await breaker.transitionToOpen(new Error(`Emergency shutdown: ${reason}`));
        results.push({ name, success: true });
      } catch (error) {
        results.push({ name, success: false, error: error.message });
      }
    }
    
    await alertingSystem.sendAlert('emergency_circuit_shutdown', {
      reason,
      results,
      severity: 'critical'
    });
    
    return results;
  }
}

// Singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();

// Export classes for advanced usage
export { CircuitBreaker, CircuitBreakerManager };

// Convenience functions
export const executeWithCircuitBreaker = (featureName, operation, context) => {
  return circuitBreakerManager.execute(featureName, operation, context);
};

export const getCircuitBreakerStatus = (featureName) => {
  const breaker = circuitBreakerManager.getBreaker(featureName);
  return breaker ? breaker.getStatus() : null;
};

export const getAllCircuitBreakerStatus = () => {
  return circuitBreakerManager.getGlobalStatus();
};