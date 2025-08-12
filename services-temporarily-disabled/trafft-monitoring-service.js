/**
 * Trafft Integration Monitoring and Error Handling Service
 * Provides comprehensive monitoring, alerting, and error recovery for Trafft integrations
 */

import { pool } from './trafft-database-service.js'
import EventEmitter from 'events'

// Monitoring configuration
const MONITORING_CONFIG = {
  // Health check intervals (in milliseconds)
  healthCheckInterval: 5 * 60 * 1000, // 5 minutes
  syncHealthInterval: 15 * 60 * 1000, // 15 minutes
  
  // Error thresholds
  maxFailureRate: 10, // Max failures per hour
  maxConsecutiveFailures: 3,
  syncTimeoutThreshold: 10 * 60 * 1000, // 10 minutes
  
  // Alert settings
  enableEmailAlerts: process.env.ENABLE_EMAIL_ALERTS === 'true',
  enableSlackAlerts: process.env.ENABLE_SLACK_ALERTS === 'true',
  alertCooldown: 30 * 60 * 1000 // 30 minutes between similar alerts
}

class TrafftMonitoringService extends EventEmitter {
  constructor() {
    super()
    this.isRunning = false
    this.healthCheckTimer = null
    this.syncHealthTimer = null
    this.alertCache = new Map() // Track recent alerts to prevent spam
    this.metrics = {
      totalIntegrations: 0,
      activeIntegrations: 0,
      totalSyncs24h: 0,
      successfulSyncs24h: 0,
      failedSyncs24h: 0,
      avgSyncDuration: 0,
      lastHealthCheck: null
    }
  }

  /**
   * Start monitoring service
   */
  start() {
    if (this.isRunning) {
      console.log('Trafft monitoring service is already running')
      return
    }

    console.log('Starting Trafft monitoring service...')

    // Start health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, MONITORING_CONFIG.healthCheckInterval)

    // Start sync health monitoring
    this.syncHealthTimer = setInterval(() => {
      this.checkSyncHealth()
    }, MONITORING_CONFIG.syncHealthInterval)

    // Initial health check
    this.performHealthCheck()

    this.isRunning = true
    console.log('✅ Trafft monitoring service started')

    // Emit service started event
    this.emit('service:started', { timestamp: new Date().toISOString() })
  }

  /**
   * Stop monitoring service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Trafft monitoring service is not running')
      return
    }

    console.log('Stopping Trafft monitoring service...')

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }

    if (this.syncHealthTimer) {
      clearInterval(this.syncHealthTimer)
      this.syncHealthTimer = null
    }

    this.isRunning = false
    console.log('❌ Trafft monitoring service stopped')

    // Emit service stopped event
    this.emit('service:stopped', { timestamp: new Date().toISOString() })
  }

  /**
   * Get monitoring status and metrics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: MONITORING_CONFIG,
      metrics: {
        ...this.metrics,
        lastHealthCheck: this.metrics.lastHealthCheck,
        healthStatus: this.getOverallHealthStatus()
      },
      activeAlerts: this.getActiveAlerts()
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now()
    const healthData = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {}
    }

    try {
      console.log('🔍 Performing Trafft integration health check...')

      // Check database connectivity
      healthData.checks.database = await this.checkDatabaseHealth()

      // Check integration status
      healthData.checks.integrations = await this.checkIntegrationsHealth()

      // Check sync operations
      healthData.checks.syncOperations = await this.checkSyncOperationsHealth()

      // Check webhook events
      healthData.checks.webhookEvents = await this.checkWebhookHealth()

      // Check API connectivity (sample test)
      healthData.checks.apiConnectivity = await this.checkAPIConnectivity()

      // Determine overall health status
      const failedChecks = Object.values(healthData.checks).filter(check => check.status !== 'healthy')
      
      if (failedChecks.length === 0) {
        healthData.status = 'healthy'
      } else if (failedChecks.length <= 2) {
        healthData.status = 'degraded'
      } else {
        healthData.status = 'unhealthy'
      }

      // Update metrics
      await this.updateMetrics()

      console.log(`✅ Health check completed in ${Date.now() - startTime}ms - Status: ${healthData.status}`)

      // Emit health check event
      this.emit('health:check', healthData)

      // Send alerts if unhealthy
      if (healthData.status !== 'healthy') {
        await this.sendHealthAlert(healthData)
      }

      this.metrics.lastHealthCheck = healthData.timestamp

    } catch (error) {
      console.error('❌ Health check failed:', error)
      
      healthData.status = 'error'
      healthData.error = error.message

      // Emit health check error event
      this.emit('health:error', { error: error.message, timestamp: new Date().toISOString() })
      
      // Send critical alert
      await this.sendAlert('critical', 'Health Check Failed', `Health check failed: ${error.message}`)
    }

    return healthData
  }

  /**
   * Check database connectivity and basic queries
   */
  async checkDatabaseHealth() {
    const client = await pool.connect()
    
    try {
      const startTime = Date.now()
      
      // Test basic query
      await client.query('SELECT 1')
      
      // Test integration table access
      const integrationCount = await client.query('SELECT COUNT(*) FROM integrations WHERE provider = $1', ['trafft'])
      
      const responseTime = Date.now() - startTime
      
      return {
        status: 'healthy',
        responseTime,
        integrationCount: parseInt(integrationCount.rows[0].count)
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    } finally {
      client.release()
    }
  }

  /**
   * Check integration status and configuration
   */
  async checkIntegrationsHealth() {
    const client = await pool.connect()
    
    try {
      const result = await client.query(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (NOW() - last_sync_at))/3600) as avg_hours_since_sync
        FROM integrations 
        WHERE provider = 'trafft'
        GROUP BY status
      `)
      
      const statusCounts = {}
      let totalIntegrations = 0
      let avgHoursSinceSync = 0
      
      result.rows.forEach(row => {
        statusCounts[row.status] = {
          count: parseInt(row.count),
          avgHoursSinceSync: parseFloat(row.avg_hours_since_sync) || 0
        }
        totalIntegrations += parseInt(row.count)
        
        if (row.status === 'active') {
          avgHoursSinceSync = parseFloat(row.avg_hours_since_sync) || 0
        }
      })
      
      // Determine health status
      const activeCount = statusCounts.active?.count || 0
      const errorCount = statusCounts.error?.count || 0
      
      let status = 'healthy'
      if (errorCount > 0) {
        status = errorCount > activeCount ? 'unhealthy' : 'degraded'
      }
      
      // Alert if active integrations haven't synced in too long
      if (avgHoursSinceSync > 2) { // More than 2 hours
        status = status === 'healthy' ? 'degraded' : status
      }
      
      return {
        status,
        totalIntegrations,
        statusBreakdown: statusCounts,
        avgHoursSinceSync
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    } finally {
      client.release()
    }
  }

  /**
   * Check sync operations health
   */
  async checkSyncOperationsHealth() {
    const client = await pool.connect()
    
    try {
      // Check last 24 hours of sync operations
      const result = await client.query(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(duration_seconds) as avg_duration,
          MAX(started_at) as last_sync
        FROM sync_operations so
        JOIN integrations i ON so.integration_id = i.id
        WHERE i.provider = 'trafft' 
          AND so.started_at > NOW() - INTERVAL '24 hours'
        GROUP BY status
      `)
      
      const syncStats = {}
      let totalSyncs = 0
      let successfulSyncs = 0
      let failedSyncs = 0
      let avgDuration = 0
      
      result.rows.forEach(row => {
        const count = parseInt(row.count)
        syncStats[row.status] = {
          count,
          avgDuration: parseFloat(row.avg_duration) || 0,
          lastSync: row.last_sync
        }
        
        totalSyncs += count
        if (row.status === 'success') {
          successfulSyncs += count
          avgDuration = parseFloat(row.avg_duration) || 0
        } else if (row.status === 'failed') {
          failedSyncs += count
        }
      })
      
      // Calculate success rate
      const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100
      
      // Determine health status
      let status = 'healthy'
      if (successRate < 80) {
        status = 'unhealthy'
      } else if (successRate < 95) {
        status = 'degraded'
      }
      
      // Check if average duration is too high (> 5 minutes)
      if (avgDuration > 300) {
        status = status === 'healthy' ? 'degraded' : status
      }
      
      return {
        status,
        totalSyncs24h: totalSyncs,
        successfulSyncs24h: successfulSyncs,
        failedSyncs24h: failedSyncs,
        successRate,
        avgDuration,
        syncStats
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    } finally {
      client.release()
    }
  }

  /**
   * Check webhook event processing health
   */
  async checkWebhookHealth() {
    const client = await pool.connect()
    
    try {
      const result = await client.query(`
        SELECT 
          processed,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) as avg_processing_time
        FROM webhook_events we
        JOIN integrations i ON we.integration_id = i.id
        WHERE i.provider = 'trafft' 
          AND we.received_at > NOW() - INTERVAL '24 hours'
        GROUP BY processed
      `)
      
      let totalWebhooks = 0
      let processedWebhooks = 0
      let unprocessedWebhooks = 0
      let avgProcessingTime = 0
      
      result.rows.forEach(row => {
        const count = parseInt(row.count)
        totalWebhooks += count
        
        if (row.processed) {
          processedWebhooks += count
          avgProcessingTime = parseFloat(row.avg_processing_time) || 0
        } else {
          unprocessedWebhooks += count
        }
      })
      
      // Check for unprocessed webhooks older than 5 minutes
      const oldUnprocessedResult = await client.query(`
        SELECT COUNT(*) as count
        FROM webhook_events we
        JOIN integrations i ON we.integration_id = i.id
        WHERE i.provider = 'trafft' 
          AND we.processed = false
          AND we.received_at < NOW() - INTERVAL '5 minutes'
      `)
      
      const oldUnprocessed = parseInt(oldUnprocessedResult.rows[0].count)
      
      // Determine health status
      let status = 'healthy'
      if (oldUnprocessed > 0) {
        status = oldUnprocessed > 10 ? 'unhealthy' : 'degraded'
      }
      
      // Check processing time (should be < 30 seconds)
      if (avgProcessingTime > 30) {
        status = status === 'healthy' ? 'degraded' : status
      }
      
      return {
        status,
        totalWebhooks24h: totalWebhooks,
        processedWebhooks24h: processedWebhooks,
        unprocessedWebhooks: unprocessedWebhooks,
        oldUnprocessedWebhooks: oldUnprocessed,
        avgProcessingTime
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    } finally {
      client.release()
    }
  }

  /**
   * Check API connectivity (basic test)
   */
  async checkAPIConnectivity() {
    try {
      // This is a basic connectivity test
      // In production, you might want to test with actual credentials
      const response = await fetch('https://api.trafft.com/health', {
        method: 'HEAD',
        timeout: 5000
      })
      
      return {
        status: response.ok ? 'healthy' : 'degraded',
        responseCode: response.status,
        responseTime: response.headers.get('x-response-time') || 'unknown'
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    }
  }

  /**
   * Check sync operation health patterns
   */
  async checkSyncHealth() {
    try {
      console.log('🔍 Checking sync operation health patterns...')
      
      const client = await pool.connect()
      
      try {
        // Check for integrations with consecutive failures
        const consecutiveFailuresResult = await client.query(`
          WITH recent_syncs AS (
            SELECT 
              i.barbershop_id,
              i.id as integration_id,
              so.status,
              so.started_at,
              ROW_NUMBER() OVER (PARTITION BY i.id ORDER BY so.started_at DESC) as rn
            FROM integrations i
            JOIN sync_operations so ON i.id = so.integration_id
            WHERE i.provider = 'trafft' 
              AND i.status = 'active'
              AND so.started_at > NOW() - INTERVAL '24 hours'
          ),
          consecutive_failures AS (
            SELECT 
              barbershop_id,
              integration_id,
              COUNT(*) as consecutive_fails
            FROM recent_syncs
            WHERE rn <= 3 AND status = 'failed'
            GROUP BY barbershop_id, integration_id
            HAVING COUNT(*) >= 3
          )
          SELECT * FROM consecutive_failures
        `)
        
        // Alert for consecutive failures
        for (const row of consecutiveFailuresResult.rows) {
          await this.sendAlert(
            'warning',
            'Consecutive Sync Failures',
            `Integration ${row.barbershop_id} has ${row.consecutive_fails} consecutive sync failures`
          )
        }
        
        // Check for long-running sync operations
        const longRunningSyncsResult = await client.query(`
          SELECT 
            i.barbershop_id,
            so.id,
            so.sync_type,
            so.started_at,
            EXTRACT(EPOCH FROM (NOW() - so.started_at))/60 as minutes_running
          FROM integrations i
          JOIN sync_operations so ON i.id = so.integration_id
          WHERE i.provider = 'trafft'
            AND so.status = 'in_progress'
            AND so.started_at < NOW() - INTERVAL '${MONITORING_CONFIG.syncTimeoutThreshold / 1000} seconds'
        `)
        
        // Alert for long-running syncs
        for (const row of longRunningSyncsResult.rows) {
          await this.sendAlert(
            'warning',
            'Long-Running Sync Operation',
            `Sync operation ${row.id} for ${row.barbershop_id} has been running for ${Math.round(row.minutes_running)} minutes`
          )
        }
        
        console.log(`✅ Sync health check completed - Found ${consecutiveFailuresResult.rows.length} consecutive failures, ${longRunningSyncsResult.rows.length} long-running syncs`)
        
      } finally {
        client.release()
      }
      
    } catch (error) {
      console.error('❌ Sync health check failed:', error)
      await this.sendAlert('error', 'Sync Health Check Failed', error.message)
    }
  }

  /**
   * Update service metrics
   */
  async updateMetrics() {
    const client = await pool.connect()
    
    try {
      // Get integration counts
      const integrationResult = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active
        FROM integrations 
        WHERE provider = 'trafft'
      `)
      
      // Get 24h sync metrics
      const syncResult = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          AVG(duration_seconds) as avg_duration
        FROM sync_operations so
        JOIN integrations i ON so.integration_id = i.id
        WHERE i.provider = 'trafft' 
          AND so.started_at > NOW() - INTERVAL '24 hours'
      `)
      
      // Update metrics
      this.metrics.totalIntegrations = parseInt(integrationResult.rows[0].total)
      this.metrics.activeIntegrations = parseInt(integrationResult.rows[0].active)
      this.metrics.totalSyncs24h = parseInt(syncResult.rows[0].total || 0)
      this.metrics.successfulSyncs24h = parseInt(syncResult.rows[0].successful || 0)
      this.metrics.failedSyncs24h = parseInt(syncResult.rows[0].failed || 0)
      this.metrics.avgSyncDuration = parseFloat(syncResult.rows[0].avg_duration || 0)
      
    } catch (error) {
      console.error('Error updating metrics:', error)
    } finally {
      client.release()
    }
  }

  /**
   * Get overall health status
   */
  getOverallHealthStatus() {
    const successRate = this.metrics.totalSyncs24h > 0 
      ? (this.metrics.successfulSyncs24h / this.metrics.totalSyncs24h) * 100 
      : 100

    if (this.metrics.activeIntegrations === 0) return 'inactive'
    if (successRate < 80) return 'unhealthy'
    if (successRate < 95) return 'degraded'
    return 'healthy'
  }

  /**
   * Get active alerts (recent alerts that might still be relevant)
   */
  getActiveAlerts() {
    const now = Date.now()
    const activeAlerts = []
    
    for (const [alertKey, alertData] of this.alertCache.entries()) {
      if (now - alertData.timestamp < MONITORING_CONFIG.alertCooldown) {
        activeAlerts.push({
          type: alertData.type,
          title: alertData.title,
          message: alertData.message,
          timestamp: new Date(alertData.timestamp).toISOString(),
          age: Math.round((now - alertData.timestamp) / 1000 / 60) // minutes
        })
      }
    }
    
    return activeAlerts
  }

  /**
   * Send health alert
   */
  async sendHealthAlert(healthData) {
    const failedChecks = Object.entries(healthData.checks)
      .filter(([, check]) => check.status !== 'healthy')
      .map(([name, check]) => `${name}: ${check.status}`)
      .join(', ')

    await this.sendAlert(
      healthData.status === 'unhealthy' ? 'error' : 'warning',
      'Trafft Integration Health Alert',
      `Integration health status: ${healthData.status}\nFailed checks: ${failedChecks}`
    )
  }

  /**
   * Send alert with deduplication
   */
  async sendAlert(type, title, message) {
    const alertKey = `${type}:${title}`
    const now = Date.now()
    
    // Check if we recently sent this alert
    if (this.alertCache.has(alertKey)) {
      const lastAlert = this.alertCache.get(alertKey)
      if (now - lastAlert.timestamp < MONITORING_CONFIG.alertCooldown) {
        return // Skip duplicate alert
      }
    }
    
    // Store alert in cache
    this.alertCache.set(alertKey, {
      type,
      title,
      message,
      timestamp: now
    })
    
    console.log(`🚨 ALERT [${type.toUpperCase()}]: ${title} - ${message}`)
    
    // Emit alert event
    this.emit('alert', { type, title, message, timestamp: new Date().toISOString() })
    
    // Send to external services if configured
    if (MONITORING_CONFIG.enableEmailAlerts) {
      await this.sendEmailAlert(type, title, message)
    }
    
    if (MONITORING_CONFIG.enableSlackAlerts) {
      await this.sendSlackAlert(type, title, message)
    }
  }

  /**
   * Send email alert (placeholder - implement with your email service)
   */
  async sendEmailAlert(type, title, message) {
    // TODO: Implement email alerting with your preferred service
    console.log(`📧 Email alert: [${type}] ${title} - ${message}`)
  }

  /**
   * Send Slack alert (placeholder - implement with your Slack webhook)
   */
  async sendSlackAlert(type, title, message) {
    // TODO: Implement Slack alerting with webhook
    console.log(`💬 Slack alert: [${type}] ${title} - ${message}`)
  }

  /**
   * Record integration error for monitoring
   */
  async recordError(integrationId, barbershopId, error, context = {}) {
    try {
      console.error(`❌ Integration error for ${barbershopId}:`, error.message)
      
      // Emit error event
      this.emit('integration:error', {
        integrationId,
        barbershopId,
        error: error.message,
        context,
        timestamp: new Date().toISOString()
      })
      
      // Check if this warrants an alert
      await this.checkErrorThreshold(barbershopId, error)
      
    } catch (monitoringError) {
      console.error('Error recording integration error:', monitoringError)
    }
  }

  /**
   * Check if error threshold is exceeded and send alert
   */
  async checkErrorThreshold(barbershopId, error) {
    // This is a simplified threshold check
    // In production, you might want more sophisticated error tracking
    
    const errorKey = `error:${barbershopId}`
    const now = Date.now()
    
    if (!this.alertCache.has(errorKey)) {
      this.alertCache.set(errorKey, { count: 1, firstError: now })
    } else {
      const errorData = this.alertCache.get(errorKey)
      errorData.count++
      
      // If more than 5 errors in the last hour, send alert
      if (errorData.count > 5 && (now - errorData.firstError) < 60 * 60 * 1000) {
        await this.sendAlert(
          'error',
          'High Error Rate',
          `Integration ${barbershopId} has ${errorData.count} errors in the last hour. Latest: ${error.message}`
        )
        
        // Reset counter
        this.alertCache.delete(errorKey)
      }
    }
  }
}

// Create singleton instance
const trafftMonitoring = new TrafftMonitoringService()

// Export functions for use in other services
export async function startMonitoring() {
  return trafftMonitoring.start()
}

export async function stopMonitoring() {
  return trafftMonitoring.stop()
}

export async function getMonitoringStatus() {
  return trafftMonitoring.getStatus()
}

export async function recordIntegrationError(integrationId, barbershopId, error, context) {
  return trafftMonitoring.recordError(integrationId, barbershopId, error, context)
}

export async function performHealthCheck() {
  return trafftMonitoring.performHealthCheck()
}

// Start monitoring service automatically if in production
if (process.env.NODE_ENV === 'production') {
  setTimeout(() => {
    console.log('Auto-starting Trafft monitoring service in production mode...')
    startMonitoring()
  }, 3000) // Wait 3 seconds after server start
}

export default trafftMonitoring