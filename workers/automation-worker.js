/**
 * Automation Worker Process
 * 
 * Production-ready worker process that handles automation tasks from Bull queues.
 * This worker processes background jobs for all automation features:
 * - Fee collection
 * - Smart reminders
 * - Predictive detection
 * - Recovery flows
 * - Manager notifications
 * - Dynamic pricing
 * - Deposit requirements
 */

import Queue from 'bull'
import { createClient } from '@/lib/supabase/server'
import { getQueueManager } from '@/lib/automation/queue-manager.js'

// Service imports for different automation types
import { AutomationFeeCollectionService } from '@/lib/automation/services/fee-collection-service.js'
import { AutomationReminderService } from '@/lib/automation/services/reminder-service.js'
import { AutomationPredictionService } from '@/lib/automation/services/prediction-service.js'
import { AutomationRecoveryService } from '@/lib/automation/services/recovery-service.js'
import { AutomationNotificationService } from '@/lib/automation/services/notification-service.js'
import { AutomationPricingService } from '@/lib/automation/services/pricing-service.js'
import { AutomationDepositService } from '@/lib/automation/services/deposit-service.js'

class AutomationWorker {
  constructor() {
    this.queueManager = null
    this.services = new Map()
    this.isRunning = false
    this.processedJobs = 0
    this.startTime = new Date()
    this.workerMetrics = {
      processed: 0,
      failed: 0,
      avgProcessingTime: 0,
      lastProcessedAt: null
    }
  }

  /**
   * Initialize the worker
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Automation Worker...')
      
      // Get queue manager instance
      this.queueManager = await getQueueManager()
      
      // Initialize all automation services
      await this.initializeServices()
      
      // Setup queue processors
      await this.setupQueueProcessors()
      
      // Setup monitoring
      this.setupMonitoring()
      
      this.isRunning = true
      console.log('✅ Automation Worker initialized and ready')
      
      return { success: true, message: 'Worker initialized' }
      
    } catch (error) {
      console.error('❌ Failed to initialize worker:', error)
      throw new Error(`Worker initialization failed: ${error.message}`)
    }
  }

  /**
   * Initialize all automation services
   */
  async initializeServices() {
    console.log('🔧 Initializing automation services...')
    
    // Initialize each service
    this.services.set('fee-collection', new AutomationFeeCollectionService())
    this.services.set('reminders', new AutomationReminderService())
    this.services.set('predictions', new AutomationPredictionService())
    this.services.set('recovery', new AutomationRecoveryService())
    this.services.set('notifications', new AutomationNotificationService())
    this.services.set('pricing', new AutomationPricingService())
    this.services.set('deposits', new AutomationDepositService())
    
    // Initialize each service
    for (const [name, service] of this.services) {
      try {
        if (service.initialize) {
          await service.initialize()
        }
        console.log(`✅ Initialized ${name} service`)
      } catch (error) {
        console.error(`❌ Failed to initialize ${name} service:`, error)
        throw error
      }
    }
  }

  /**
   * Setup queue processors for each queue type
   */
  async setupQueueProcessors() {
    console.log('⚙️  Setting up queue processors...')
    
    const queueProcessors = [
      {
        queueType: 'automation-fee-collection',
        concurrency: 5,
        processor: this.processFeeCollectionJob.bind(this)
      },
      {
        queueType: 'automation-reminders',
        concurrency: 10,
        processor: this.processReminderJob.bind(this)
      },
      {
        queueType: 'automation-predictions',
        concurrency: 3,
        processor: this.processPredictionJob.bind(this)
      },
      {
        queueType: 'automation-recovery',
        concurrency: 5,
        processor: this.processRecoveryJob.bind(this)
      },
      {
        queueType: 'automation-notifications',
        concurrency: 15,
        processor: this.processNotificationJob.bind(this)
      },
      {
        queueType: 'automation-pricing',
        concurrency: 2,
        processor: this.processPricingJob.bind(this)
      },
      {
        queueType: 'automation-deposits',
        concurrency: 8,
        processor: this.processDepositJob.bind(this)
      }
    ]

    for (const { queueType, concurrency, processor } of queueProcessors) {
      const queue = this.queueManager.queues.get(queueType)
      if (queue) {
        queue.process(concurrency, processor)
        console.log(`✅ Setup processor for ${queueType} (concurrency: ${concurrency})`)
      }
    }
  }

  /**
   * Process fee collection jobs
   */
  async processFeeCollectionJob(job) {
    const startTime = Date.now()
    
    try {
      console.log(`💰 Processing fee collection job: ${job.id}`)
      
      const { shopId, appointmentId, feeAmount, paymentMethodId } = job.data
      const service = this.services.get('fee-collection')
      
      // Validate job data
      this.validateJobData(job.data, ['shopId', 'appointmentId', 'feeAmount'])
      
      // Process the fee collection
      const result = await service.collectNoShowFee({
        shopId,
        appointmentId,
        feeAmount,
        paymentMethodId,
        jobId: job.id
      })
      
      // Update metrics
      this.updateJobMetrics(startTime, true)
      
      console.log(`✅ Fee collection completed: ${job.id}`)
      return result
      
    } catch (error) {
      this.updateJobMetrics(startTime, false)
      console.error(`❌ Fee collection failed: ${job.id}`, error)
      throw error
    }
  }

  /**
   * Process reminder escalation jobs
   */
  async processReminderJob(job) {
    const startTime = Date.now()
    
    try {
      console.log(`📢 Processing reminder job: ${job.id}`)
      
      const { shopId, appointmentId, customerId, riskScore } = job.data
      const service = this.services.get('reminders')
      
      // Validate job data
      this.validateJobData(job.data, ['shopId', 'appointmentId', 'customerId'])
      
      // Process the reminder escalation
      const result = await service.sendEscalatedReminder({
        shopId,
        appointmentId,
        customerId,
        riskScore,
        jobId: job.id
      })
      
      // Update metrics
      this.updateJobMetrics(startTime, true)
      
      console.log(`✅ Reminder sent: ${job.id}`)
      return result
      
    } catch (error) {
      this.updateJobMetrics(startTime, false)
      console.error(`❌ Reminder failed: ${job.id}`, error)
      throw error
    }
  }

  /**
   * Process predictive detection jobs
   */
  async processPredictionJob(job) {
    const startTime = Date.now()
    
    try {
      console.log(`🔮 Processing prediction job: ${job.id}`)
      
      const { shopId, appointmentId, dataPoints } = job.data
      const service = this.services.get('predictions')
      
      // Validate job data
      this.validateJobData(job.data, ['shopId', 'appointmentId'])
      
      // Process the prediction
      const result = await service.predictNoShowRisk({
        shopId,
        appointmentId,
        dataPoints,
        jobId: job.id
      })
      
      // Update metrics
      this.updateJobMetrics(startTime, true)
      
      console.log(`✅ Prediction completed: ${job.id}`)
      return result
      
    } catch (error) {
      this.updateJobMetrics(startTime, false)
      console.error(`❌ Prediction failed: ${job.id}`, error)
      throw error
    }
  }

  /**
   * Process recovery flow jobs
   */
  async processRecoveryJob(job) {
    const startTime = Date.now()
    
    try {
      console.log(`🔄 Processing recovery job: ${job.id}`)
      
      const { shopId, customerId, blockReason } = job.data
      const service = this.services.get('recovery')
      
      // Validate job data
      this.validateJobData(job.data, ['shopId', 'customerId'])
      
      // Process the recovery flow
      const result = await service.startRecoveryFlow({
        shopId,
        customerId,
        blockReason,
        jobId: job.id
      })
      
      // Update metrics
      this.updateJobMetrics(startTime, true)
      
      console.log(`✅ Recovery flow started: ${job.id}`)
      return result
      
    } catch (error) {
      this.updateJobMetrics(startTime, false)
      console.error(`❌ Recovery flow failed: ${job.id}`, error)
      throw error
    }
  }

  /**
   * Process manager notification jobs
   */
  async processNotificationJob(job) {
    const startTime = Date.now()
    
    try {
      console.log(`🔔 Processing notification job: ${job.id}`)
      
      const { shopId, userId, alertType, alertData } = job.data
      const service = this.services.get('notifications')
      
      // Validate job data
      this.validateJobData(job.data, ['shopId', 'userId', 'alertType'])
      
      // Process the notification
      const result = await service.sendManagerNotification({
        shopId,
        userId,
        alertType,
        alertData,
        jobId: job.id
      })
      
      // Update metrics
      this.updateJobMetrics(startTime, true)
      
      console.log(`✅ Notification sent: ${job.id}`)
      return result
      
    } catch (error) {
      this.updateJobMetrics(startTime, false)
      console.error(`❌ Notification failed: ${job.id}`, error)
      throw error
    }
  }

  /**
   * Process dynamic pricing jobs
   */
  async processPricingJob(job) {
    const startTime = Date.now()
    
    try {
      console.log(`💲 Processing pricing job: ${job.id}`)
      
      const { shopId, customerId, adjustmentType, adjustmentAmount } = job.data
      const service = this.services.get('pricing')
      
      // Validate job data
      this.validateJobData(job.data, ['shopId', 'customerId', 'adjustmentType'])
      
      // Process the pricing adjustment
      const result = await service.adjustCustomerPricing({
        shopId,
        customerId,
        adjustmentType,
        adjustmentAmount,
        jobId: job.id
      })
      
      // Update metrics
      this.updateJobMetrics(startTime, true)
      
      console.log(`✅ Pricing adjusted: ${job.id}`)
      return result
      
    } catch (error) {
      this.updateJobMetrics(startTime, false)
      console.error(`❌ Pricing adjustment failed: ${job.id}`, error)
      throw error
    }
  }

  /**
   * Process deposit requirement jobs
   */
  async processDepositJob(job) {
    const startTime = Date.now()
    
    try {
      console.log(`🏦 Processing deposit job: ${job.id}`)
      
      const { shopId, customerId, appointmentId, depositAmount } = job.data
      const service = this.services.get('deposits')
      
      // Validate job data
      this.validateJobData(job.data, ['shopId', 'customerId', 'depositAmount'])
      
      // Process the deposit requirement
      const result = await service.requireDeposit({
        shopId,
        customerId,
        appointmentId,
        depositAmount,
        jobId: job.id
      })
      
      // Update metrics
      this.updateJobMetrics(startTime, true)
      
      console.log(`✅ Deposit required: ${job.id}`)
      return result
      
    } catch (error) {
      this.updateJobMetrics(startTime, false)
      console.error(`❌ Deposit requirement failed: ${job.id}`, error)
      throw error
    }
  }

  /**
   * Validate job data has required fields
   */
  validateJobData(data, requiredFields) {
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }
  }

  /**
   * Update job processing metrics
   */
  updateJobMetrics(startTime, success) {
    const processingTime = Date.now() - startTime
    
    this.workerMetrics.processed++
    if (!success) {
      this.workerMetrics.failed++
    }
    
    // Update average processing time
    this.workerMetrics.avgProcessingTime = (
      (this.workerMetrics.avgProcessingTime * (this.workerMetrics.processed - 1) + processingTime) / 
      this.workerMetrics.processed
    )
    
    this.workerMetrics.lastProcessedAt = new Date().toISOString()
  }

  /**
   * Setup monitoring and health checks
   */
  setupMonitoring() {
    // Log worker status every 5 minutes
    setInterval(() => {
      console.log('📊 Worker Status:', {
        running: this.isRunning,
        processed: this.workerMetrics.processed,
        failed: this.workerMetrics.failed,
        avgProcessingTime: Math.round(this.workerMetrics.avgProcessingTime),
        uptime: Date.now() - this.startTime.getTime()
      })
    }, 5 * 60 * 1000)

    // Update database metrics every minute
    setInterval(async () => {
      await this.updateDatabaseMetrics()
    }, 60 * 1000)
  }

  /**
   * Update worker metrics in database
   */
  async updateDatabaseMetrics() {
    try {
      const supabase = await createClient()
      
      const workerData = {
        component: 'automation_worker',
        status: this.isRunning ? 'running' : 'stopped',
        metrics: this.workerMetrics,
        uptime: Date.now() - this.startTime.getTime(),
        updated_at: new Date().toISOString()
      }

      await supabase
        .from('system_health')
        .upsert(workerData, { onConflict: 'component' })

    } catch (error) {
      console.error('Failed to update worker metrics:', error)
    }
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      running: this.isRunning,
      startTime: this.startTime,
      uptime: Date.now() - this.startTime.getTime(),
      metrics: this.workerMetrics,
      services: Array.from(this.services.keys()),
      queues: Array.from(this.queueManager?.queues.keys() || [])
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down Automation Worker...')
    
    this.isRunning = false
    
    // Allow current jobs to complete (wait up to 30 seconds)
    let waitTime = 0
    const maxWaitTime = 30000
    
    while (waitTime < maxWaitTime) {
      // Check if all queues are idle
      let allIdle = true
      for (const [queueType, queue] of this.queueManager.queues) {
        const active = await queue.getActive()
        if (active.length > 0) {
          allIdle = false
          break
        }
      }
      
      if (allIdle) {
        console.log('✅ All jobs completed')
        break
      }
      
      console.log(`⏳ Waiting for jobs to complete... (${waitTime/1000}s)`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      waitTime += 1000
    }
    
    // Shutdown services
    for (const [name, service] of this.services) {
      try {
        if (service.shutdown) {
          await service.shutdown()
        }
        console.log(`✅ Shutdown ${name} service`)
      } catch (error) {
        console.error(`❌ Error shutting down ${name} service:`, error)
      }
    }
    
    console.log('✅ Worker shutdown complete')
  }
}

// Export for use in other modules
export default AutomationWorker

// If running directly, start the worker
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new AutomationWorker()
  
  // Handle process signals for graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...')
    await worker.shutdown()
    process.exit(0)
  })
  
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...')
    await worker.shutdown()
    process.exit(0)
  })
  
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error)
    worker.shutdown().then(() => process.exit(1))
  })
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason)
    worker.shutdown().then(() => process.exit(1))
  })
  
  // Start the worker
  worker.initialize().catch((error) => {
    console.error('Failed to start worker:', error)
    process.exit(1)
  })
}