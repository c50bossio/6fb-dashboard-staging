/**
 * Queue Manager for Automation Tasks
 * 
 * Production-ready task queue system using Bull + Redis for handling
 * automation tasks like fee collection, reminders, predictive detection, etc.
 * 
 * Features:
 * - Multiple queue types for different automation tasks
 * - Retry logic with exponential backoff
 * - Job deduplication and idempotency
 * - Comprehensive monitoring and health checks
 * - Scalable worker management
 */

import Queue from 'bull'
import Redis from 'ioredis'
import { createClient } from '@/lib/supabase/server'
import cron from 'node-cron'

// Queue configurations
const QUEUE_CONFIGS = {
  'automation-fee-collection': {
    name: 'Automation Fee Collection',
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  },
  'automation-reminders': {
    name: 'Smart Reminder Escalation',
    concurrency: 10,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1500 },
      removeOnComplete: 100,
      removeOnFail: 50
    }
  },
  'automation-predictions': {
    name: 'Predictive No-Show Detection',
    concurrency: 3,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 25,
      removeOnFail: 25
    }
  },
  'automation-recovery': {
    name: 'Recovery Flow Automation',
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 50,
      removeOnFail: 50
    }
  },
  'automation-notifications': {
    name: 'Manager Notifications',
    concurrency: 15,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 25
    }
  },
  'automation-pricing': {
    name: 'Dynamic Pricing Adjustments',
    concurrency: 2,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 10,
      removeOnFail: 10
    }
  },
  'automation-deposits': {
    name: 'Automated Deposit Requirements',
    concurrency: 8,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2500 },
      removeOnComplete: 50,
      removeOnFail: 50
    }
  }
}

class AutomationQueueManager {
  constructor() {
    this.redis = null
    this.queues = new Map()
    this.isInitialized = false
    this.healthCheckInterval = null
    this.metrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      activeJobs: 0,
      queueSizes: {}
    }
  }

  /**
   * Initialize the queue manager
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Automation Queue Manager...')
      
      // Initialize Redis connection
      await this.initializeRedis()
      
      // Initialize all queues
      await this.initializeQueues()
      
      // Setup health monitoring
      this.setupHealthMonitoring()
      
      // Setup cleanup jobs
      this.setupCleanupJobs()
      
      this.isInitialized = true
      console.log('✅ Automation Queue Manager initialized successfully')
      
      return { success: true, message: 'Queue manager initialized' }
      
    } catch (error) {
      console.error('❌ Failed to initialize queue manager:', error)
      throw new Error(`Queue manager initialization failed: ${error.message}`)
    }
  }

  /**
   * Initialize Redis connection with retry logic
   */
  async initializeRedis() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000
    }

    // Add TLS for production
    if (process.env.REDIS_TLS === 'true') {
      redisConfig.tls = {}
    }

    this.redis = new Redis(redisConfig)

    // Setup Redis event handlers
    this.redis.on('connect', () => {
      console.log('📡 Connected to Redis for queue management')
    })

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error)
    })

    this.redis.on('reconnecting', () => {
      console.log('🔄 Reconnecting to Redis...')
    })

    // Test connection
    await this.redis.ping()
    console.log('✅ Redis connection established')
  }

  /**
   * Initialize all automation queues
   */
  async initializeQueues() {
    console.log('🔧 Initializing automation queues...')
    
    for (const [queueType, config] of Object.entries(QUEUE_CONFIGS)) {
      try {
        const queue = new Queue(queueType, {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB || '0')
          },
          defaultJobOptions: config.defaultJobOptions,
          settings: {
            stalledInterval: 30 * 1000, // 30 seconds
            maxStalledCount: 1
          }
        })

        // Setup queue event handlers
        this.setupQueueEventHandlers(queue, queueType)
        
        this.queues.set(queueType, queue)
        console.log(`✅ Initialized queue: ${config.name}`)
        
      } catch (error) {
        console.error(`❌ Failed to initialize queue ${queueType}:`, error)
        throw error
      }
    }
  }

  /**
   * Setup event handlers for queue monitoring
   */
  setupQueueEventHandlers(queue, queueType) {
    queue.on('completed', (job) => {
      this.metrics.completedJobs++
      console.log(`✅ Job completed in ${queueType}: ${job.id}`)
    })

    queue.on('failed', (job, err) => {
      this.metrics.failedJobs++
      console.error(`❌ Job failed in ${queueType}: ${job.id}`, err.message)
      this.logJobFailure(queueType, job, err)
    })

    queue.on('active', (job) => {
      this.metrics.activeJobs++
      console.log(`🔄 Job started in ${queueType}: ${job.id}`)
    })

    queue.on('stalled', (job) => {
      console.warn(`⚠️  Job stalled in ${queueType}: ${job.id}`)
    })

    queue.on('error', (error) => {
      console.error(`❌ Queue error in ${queueType}:`, error)
    })
  }

  /**
   * Add a new automation job to the appropriate queue
   */
  async addJob(queueType, jobType, jobData, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Queue manager not initialized')
      }

      const queue = this.queues.get(queueType)
      if (!queue) {
        throw new Error(`Queue type ${queueType} not found`)
      }

      // Generate job ID for idempotency
      const jobId = this.generateJobId(queueType, jobType, jobData)
      
      // Check for existing job (deduplication)
      if (await this.isDuplicateJob(queueType, jobId)) {
        console.log(`⚠️  Skipping duplicate job: ${jobId}`)
        return { success: true, message: 'Job already exists', jobId, duplicate: true }
      }

      // Merge job options with defaults
      const jobOptions = {
        jobId,
        ...options,
        // Add job metadata
        attempts: options.attempts || QUEUE_CONFIGS[queueType].defaultJobOptions.attempts,
        backoff: options.backoff || QUEUE_CONFIGS[queueType].defaultJobOptions.backoff,
      }

      // Add job to queue
      const job = await queue.add(jobType, {
        ...jobData,
        queueType,
        jobType,
        createdAt: new Date().toISOString(),
        shopId: jobData.shopId,
        userId: jobData.userId
      }, jobOptions)

      this.metrics.totalJobs++
      
      console.log(`📋 Added job to ${queueType}: ${job.id} (${jobType})`)
      
      return {
        success: true,
        jobId: job.id,
        queueType,
        jobType,
        estimatedDelay: await this.estimateJobDelay(queueType)
      }
      
    } catch (error) {
      console.error(`❌ Failed to add job to ${queueType}:`, error)
      throw new Error(`Failed to add automation job: ${error.message}`)
    }
  }

  /**
   * Generate a unique but deterministic job ID for deduplication
   */
  generateJobId(queueType, jobType, jobData) {
    const keyData = {
      queueType,
      jobType,
      shopId: jobData.shopId,
      userId: jobData.userId,
      appointmentId: jobData.appointmentId,
      customerId: jobData.customerId
    }
    
    // Create a hash of the key data for uniqueness
    const keyString = JSON.stringify(keyData)
    const hash = Buffer.from(keyString).toString('base64').slice(0, 16)
    
    return `${queueType}-${jobType}-${hash}`
  }

  /**
   * Check if job already exists (deduplication)
   */
  async isDuplicateJob(queueType, jobId) {
    try {
      const queue = this.queues.get(queueType)
      if (!queue) return false

      // Check waiting, active, and delayed jobs
      const [waiting, active, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getDelayed()
      ])

      const allJobs = [...waiting, ...active, ...delayed]
      return allJobs.some(job => job.id === jobId)
      
    } catch (error) {
      console.error('Error checking for duplicate job:', error)
      return false // Fail open to avoid blocking jobs
    }
  }

  /**
   * Estimate delay for new job based on queue size
   */
  async estimateJobDelay(queueType) {
    try {
      const queue = this.queues.get(queueType)
      if (!queue) return 0

      const waiting = await queue.getWaiting()
      const active = await queue.getActive()
      
      const config = QUEUE_CONFIGS[queueType]
      const avgJobTime = 30000 // Estimate 30 seconds per job
      const concurrency = config.concurrency
      
      const queuedJobs = waiting.length
      const activeJobs = active.length
      const availableWorkers = Math.max(0, concurrency - activeJobs)
      
      if (availableWorkers > 0) {
        return 0 // Job will start immediately
      }
      
      const estimatedDelay = Math.ceil(queuedJobs / concurrency) * avgJobTime
      return estimatedDelay
      
    } catch (error) {
      console.error('Error estimating job delay:', error)
      return 0
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  async getQueueStats() {
    try {
      const stats = {}
      
      for (const [queueType, queue] of this.queues) {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed()
        ])

        stats[queueType] = {
          name: QUEUE_CONFIGS[queueType].name,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          concurrency: QUEUE_CONFIGS[queueType].concurrency
        }
      }
      
      return {
        success: true,
        stats,
        globalMetrics: this.metrics,
        redis: {
          connected: this.redis.status === 'ready',
          memory: await this.getRedisMemoryUsage()
        }
      }
      
    } catch (error) {
      console.error('Error getting queue stats:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get Redis memory usage
   */
  async getRedisMemoryUsage() {
    try {
      const info = await this.redis.info('memory')
      const lines = info.split('\r\n')
      const memoryUsed = lines.find(line => line.startsWith('used_memory_human:'))
      return memoryUsed ? memoryUsed.split(':')[1] : 'unknown'
    } catch (error) {
      return 'error'
    }
  }

  /**
   * Setup health monitoring
   */
  setupHealthMonitoring() {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, 30000)

    console.log('❤️  Health monitoring started')
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const checks = {
      redis: false,
      queues: false,
      workers: false,
      memory: false
    }

    try {
      // Check Redis connectivity
      await this.redis.ping()
      checks.redis = true

      // Check queue health
      let healthyQueues = 0
      for (const [queueType, queue] of this.queues) {
        try {
          await queue.getWaiting()
          healthyQueues++
        } catch (error) {
          console.error(`Queue ${queueType} health check failed:`, error)
        }
      }
      checks.queues = healthyQueues === this.queues.size

      // Check worker responsiveness (basic check)
      checks.workers = true // Will be enhanced when workers are running

      // Check memory usage
      const memInfo = await this.getRedisMemoryUsage()
      checks.memory = memInfo !== 'error'

      // Update metrics
      await this.updateHealthMetrics(checks)

    } catch (error) {
      console.error('Health check error:', error)
    }

    return checks
  }

  /**
   * Update health metrics in database
   */
  async updateHealthMetrics(checks) {
    try {
      const supabase = await createClient()
      
      const healthData = {
        component: 'automation_queue_manager',
        status: Object.values(checks).every(check => check) ? 'healthy' : 'unhealthy',
        checks,
        metrics: this.metrics,
        updated_at: new Date().toISOString()
      }

      await supabase
        .from('system_health')
        .upsert(healthData, { onConflict: 'component' })

    } catch (error) {
      console.error('Failed to update health metrics:', error)
    }
  }

  /**
   * Setup cleanup jobs for completed/failed jobs
   */
  setupCleanupJobs() {
    // Clean up old jobs every hour
    cron.schedule('0 * * * *', async () => {
      console.log('🧹 Running queue cleanup...')
      
      for (const [queueType, queue] of this.queues) {
        try {
          await queue.clean(24 * 60 * 60 * 1000, 'completed') // Remove completed jobs older than 24h
          await queue.clean(7 * 24 * 60 * 60 * 1000, 'failed') // Remove failed jobs older than 7 days
          console.log(`✅ Cleaned queue: ${queueType}`)
        } catch (error) {
          console.error(`❌ Failed to clean queue ${queueType}:`, error)
        }
      }
    })

    console.log('🧹 Cleanup scheduler started')
  }

  /**
   * Log job failure for analysis
   */
  async logJobFailure(queueType, job, error) {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('automation_job_failures')
        .insert({
          queue_type: queueType,
          job_id: job.id,
          job_type: job.data.jobType,
          job_data: job.data,
          error_message: error.message,
          error_stack: error.stack,
          attempts: job.attemptsMade,
          failed_at: new Date().toISOString()
        })

    } catch (logError) {
      console.error('Failed to log job failure:', logError)
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down Automation Queue Manager...')
    
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // Close all queues
    for (const [queueType, queue] of this.queues) {
      try {
        await queue.close()
        console.log(`✅ Closed queue: ${queueType}`)
      } catch (error) {
        console.error(`❌ Error closing queue ${queueType}:`, error)
      }
    }

    // Close Redis connection
    if (this.redis) {
      await this.redis.quit()
      console.log('✅ Redis connection closed')
    }

    this.isInitialized = false
    console.log('✅ Queue manager shutdown complete')
  }

  /**
   * Helper methods for specific automation types
   */

  // Fee Collection Jobs
  async addFeeCollectionJob(shopId, appointmentId, feeAmount, paymentMethodId, options = {}) {
    return this.addJob('automation-fee-collection', 'collect-no-show-fee', {
      shopId,
      appointmentId,
      feeAmount,
      paymentMethodId
    }, options)
  }

  // Smart Reminder Jobs
  async addReminderJob(shopId, appointmentId, customerId, riskScore, options = {}) {
    return this.addJob('automation-reminders', 'escalated-reminder', {
      shopId,
      appointmentId,
      customerId,
      riskScore
    }, options)
  }

  // Predictive Detection Jobs
  async addPredictionJob(shopId, appointmentId, dataPoints, options = {}) {
    return this.addJob('automation-predictions', 'predict-no-show', {
      shopId,
      appointmentId,
      dataPoints
    }, options)
  }

  // Recovery Flow Jobs
  async addRecoveryJob(shopId, customerId, blockReason, options = {}) {
    return this.addJob('automation-recovery', 'start-recovery-flow', {
      shopId,
      customerId,
      blockReason
    }, options)
  }

  // Manager Notification Jobs
  async addNotificationJob(shopId, userId, alertType, alertData, options = {}) {
    return this.addJob('automation-notifications', 'manager-alert', {
      shopId,
      userId,
      alertType,
      alertData
    }, options)
  }

  // Dynamic Pricing Jobs
  async addPricingJob(shopId, customerId, adjustmentType, adjustmentAmount, options = {}) {
    return this.addJob('automation-pricing', 'adjust-pricing', {
      shopId,
      customerId,
      adjustmentType,
      adjustmentAmount
    }, options)
  }

  // Deposit Requirement Jobs
  async addDepositJob(shopId, customerId, appointmentId, depositAmount, options = {}) {
    return this.addJob('automation-deposits', 'require-deposit', {
      shopId,
      customerId,
      appointmentId,
      depositAmount
    }, options)
  }
}

// Singleton instance
let queueManager = null

/**
 * Get or create queue manager instance
 */
export async function getQueueManager() {
  if (!queueManager) {
    queueManager = new AutomationQueueManager()
    await queueManager.initialize()
  }
  return queueManager
}

/**
 * Initialize queue manager (for startup)
 */
export async function initializeQueueManager() {
  try {
    const manager = await getQueueManager()
    return { success: true, manager }
  } catch (error) {
    console.error('Failed to initialize queue manager:', error)
    return { success: false, error: error.message }
  }
}

export default AutomationQueueManager