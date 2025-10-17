#!/usr/bin/env node

/**
 * Automation System Startup Script
 * 
 * Initializes and starts the complete automation queue system including:
 * - Queue manager
 * - Worker processes
 * - Health monitoring
 * - Database setup
 */

import { initializeQueueManager } from '../lib/automation/queue-manager.js'
import AutomationWorker from '../workers/automation-worker.js'
import { createClient } from '../lib/supabase/server.js'

console.log('🚀 Starting 6FB Automation System...')

class AutomationSystem {
  constructor() {
    this.queueManager = null
    this.worker = null
    this.healthCheckInterval = null
    this.isShuttingDown = false
  }

  /**
   * Initialize the complete automation system
   */
  async initialize() {
    try {
      console.log('📋 Initializing automation system components...')
      
      // Setup database tables if needed
      await this.setupDatabaseTables()
      
      // Initialize queue manager
      console.log('⚡ Initializing queue manager...')
      const queueResult = await initializeQueueManager()
      if (!queueResult.success) {
        throw new Error(`Queue manager initialization failed: ${queueResult.error}`)
      }
      this.queueManager = queueResult.manager

      // Initialize worker
      console.log('👷 Starting automation worker...')
      this.worker = new AutomationWorker()
      await this.worker.initialize()

      // Setup health monitoring
      this.setupHealthMonitoring()

      // Setup graceful shutdown handlers
      this.setupShutdownHandlers()

      console.log('✅ Automation system started successfully!')
      console.log('📊 System Status:')
      console.log('   - Queue Manager: Running')
      console.log('   - Worker Process: Running') 
      console.log('   - Health Monitoring: Active')
      console.log('   - Graceful Shutdown: Enabled')
      console.log('')
      console.log('🔗 API Endpoints:')
      console.log('   - Health Check: /api/automation/health')
      console.log('   - Queue Stats: /api/automation/queue')
      console.log('   - Settings: /api/booking-rules/automation-settings')
      
      return { success: true }
      
    } catch (error) {
      console.error('❌ Failed to initialize automation system:', error)
      await this.shutdown()
      throw error
    }
  }

  /**
   * Setup database tables for automation system
   */
  async setupDatabaseTables() {
    try {
      const supabase = await createClient()
      
      // Check if automation tables exist, create if needed
      const tables = [
        'system_health',
        'automation_job_failures', 
        'automation_predictions',
        'automation_reminder_attempts',
        'no_show_fee_collections',
        'customer_recovery_flows',
        'recovery_flow_steps',
        'customer_pricing_adjustments',
        'customer_deposit_requirements'
      ]

      console.log('🗄️  Checking automation database tables...')
      
      // This is a simplified check - in production you'd have proper migrations
      for (const tableName of tables) {
        try {
          await supabase.from(tableName).select('count(*)').limit(1)
        } catch (error) {
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log(`⚠️  Table ${tableName} does not exist - you may need to run migrations`)
            // In production, you'd create the table here or run migrations
          }
        }
      }
      
      console.log('✅ Database tables verified')
      
    } catch (error) {
      console.warn('⚠️  Database setup warning:', error.message)
      // Don't fail startup for database issues in development
    }
  }

  /**
   * Setup health monitoring
   */
  setupHealthMonitoring() {
    // Monitor system health every 2 minutes
    this.healthCheckInterval = setInterval(async () => {
      if (this.isShuttingDown) return
      
      try {
        const status = await this.getSystemStatus()
        
        if (status.critical) {
          console.error('🚨 Critical automation system issues detected:', status.issues)
        } else if (status.warnings.length > 0) {
          console.warn('⚠️  Automation system warnings:', status.warnings)
        }
        
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, 2 * 60 * 1000)

    console.log('❤️  Health monitoring started')
  }

  /**
   * Get current system status
   */
  async getSystemStatus() {
    const status = {
      critical: false,
      warnings: [],
      issues: []
    }

    try {
      // Check queue manager
      if (!this.queueManager || !this.queueManager.isInitialized) {
        status.critical = true
        status.issues.push('Queue manager not running')
      }

      // Check worker
      if (!this.worker || !this.worker.isRunning) {
        status.critical = true
        status.issues.push('Worker process not running')
      }

      // Check Redis connectivity
      if (this.queueManager && this.queueManager.redis) {
        try {
          await this.queueManager.redis.ping()
        } catch (error) {
          status.critical = true
          status.issues.push('Redis connection failed')
        }
      }

      // Check queue health
      if (this.queueManager) {
        const queueStats = await this.queueManager.getQueueStats()
        if (!queueStats.success) {
          status.warnings.push('Queue stats unavailable')
        } else {
          // Check for stuck jobs
          for (const [queueName, stats] of Object.entries(queueStats.stats)) {
            if (stats.active > stats.concurrency * 2) {
              status.warnings.push(`High active job count in ${queueName}: ${stats.active}`)
            }
            if (stats.failed > 50) {
              status.warnings.push(`High failure count in ${queueName}: ${stats.failed}`)
            }
          }
        }
      }

    } catch (error) {
      status.warnings.push(`Status check error: ${error.message}`)
    }

    return status
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      console.log(`\n📤 Received ${signal}, starting graceful shutdown...`)
      await this.shutdown()
      process.exit(0)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGUSR2', () => shutdown('SIGUSR2')) // For nodemon

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught exception:', error)
      await this.shutdown()
      process.exit(1)
    })

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
      await this.shutdown()
      process.exit(1)
    })
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress...')
      return
    }

    this.isShuttingDown = true
    console.log('🛑 Shutting down automation system...')

    // Clear health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // Shutdown worker
    if (this.worker) {
      try {
        await this.worker.shutdown()
        console.log('✅ Worker shutdown complete')
      } catch (error) {
        console.error('❌ Worker shutdown error:', error)
      }
    }

    // Shutdown queue manager
    if (this.queueManager) {
      try {
        await this.queueManager.shutdown()
        console.log('✅ Queue manager shutdown complete')
      } catch (error) {
        console.error('❌ Queue manager shutdown error:', error)
      }
    }

    console.log('✅ Automation system shutdown complete')
  }

  /**
   * Show system information
   */
  showSystemInfo() {
    console.log('📋 System Information:')
    console.log(`   Node.js: ${process.version}`)
    console.log(`   Platform: ${process.platform}`)
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`   Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`)
    console.log('')
  }
}

// Main execution
async function main() {
  const system = new AutomationSystem()
  
  try {
    system.showSystemInfo()
    await system.initialize()
    
    // Keep process alive
    console.log('🔄 Automation system running... (Press Ctrl+C to stop)')
    
    // Optional: Log periodic stats
    setInterval(async () => {
      if (system.queueManager) {
        const stats = await system.queueManager.getQueueStats()
        if (stats.success) {
          const totalJobs = Object.values(stats.stats).reduce((sum, queue) => 
            sum + queue.waiting + queue.active + queue.completed + queue.failed, 0
          )
          console.log(`📊 Total jobs processed: ${totalJobs} | Active: ${Object.values(stats.stats).reduce((sum, queue) => sum + queue.active, 0)}`)
        }
      }
    }, 5 * 60 * 1000) // Every 5 minutes
    
  } catch (error) {
    console.error('❌ Failed to start automation system:', error)
    process.exit(1)
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default AutomationSystem