/**
 * Production Monitoring and Error Tracking System
 * Comprehensive monitoring for AI Agent System in production
 */

import { createClient } from '@/lib/supabase/client'

// Production metrics collection
class ProductionMonitor {
  constructor() {
    this.metricsQueue = []
    this.errorQueue = []
    this.isOnline = true
    this.lastHeartbeat = Date.now()
    this.thresholds = {
      responseTime: 3000, // 3 seconds
      errorRate: 0.05, // 5%
      aiCostPerHour: 1.00, // $1/hour
      memoryUsage: 0.85, // 85%
      cpuUsage: 0.80 // 80%
    }
    
    this.startHeartbeat()
    this.setupErrorHandlers()
  }

  // System health monitoring
  startHeartbeat() {
    setInterval(() => {
      this.collectSystemMetrics()
      this.flushMetrics()
      this.checkThresholds()
      this.lastHeartbeat = Date.now()
    }, 30000) // Every 30 seconds
  }

  // Collect performance metrics
  async collectSystemMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      type: 'system_health',
      data: {
        // Performance metrics
        memory: this.getMemoryUsage(),
        responseTime: this.getAverageResponseTime(),
        activeUsers: this.getActiveUserCount(),
        
        // AI system metrics
        aiRequestsCount: this.getAIRequestsCount(),
        aiAverageCost: this.getAverageAICost(),
        aiModelUsage: this.getModelUsageStats(),
        
        // Database metrics
        dbResponseTime: await this.getDatabaseResponseTime(),
        dbConnectionCount: await this.getDatabaseConnections(),
        
        // Error metrics
        errorRate: this.getErrorRate(),
        criticalErrors: this.getCriticalErrorCount(),
        
        // Feature usage
        featureUsage: this.getFeatureUsageStats(),
        
        // Network status
        isOnline: navigator.onLine,
        connectivity: this.testConnectivity()
      }
    }

    this.metricsQueue.push(metrics)
    return metrics
  }

  // Memory usage monitoring
  getMemoryUsage() {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = performance.memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      }
    }
    return null
  }

  // Response time tracking
  getAverageResponseTime() {
    const responses = this.getRecentResponses()
    if (responses.length === 0) return 0
    
    const totalTime = responses.reduce((sum, response) => sum + response.duration, 0)
    return Math.round(totalTime / responses.length)
  }

  // AI cost monitoring
  getAverageAICost() {
    const aiRequests = this.getRecentAIRequests()
    if (aiRequests.length === 0) return 0
    
    const totalCost = aiRequests.reduce((sum, request) => sum + (request.cost || 0), 0)
    return totalCost / aiRequests.length
  }

  // Error rate calculation
  getErrorRate() {
    const recent = this.getRecentActivity()
    if (recent.total === 0) return 0
    
    return recent.errors / recent.total
  }

  // Database performance monitoring
  async getDatabaseResponseTime() {
    const startTime = Date.now()
    try {
      const supabase = createClient()
      await supabase.from('profiles').select('id').limit(1)
      return Date.now() - startTime
    } catch (error) {
      this.trackError(error, 'database_health_check')
      return -1
    }
  }

  // Error tracking and alerting
  trackError(error, context = {}) {
    const errorData = {
      timestamp: new Date().toISOString(),
      type: 'error',
      level: this.categorizeError(error),
      message: error.message,
      stack: error.stack,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        ...context
      },
      fingerprint: this.generateErrorFingerprint(error),
      occurrences: 1
    }

    this.errorQueue.push(errorData)
    
    // Immediate alerting for critical errors
    if (errorData.level === 'critical') {
      this.sendImmediateAlert(errorData)
    }

    return errorData
  }

  // Categorize error severity
  categorizeError(error) {
    const message = error.message?.toLowerCase() || ''
    const stack = error.stack?.toLowerCase() || ''
    
    // Critical errors
    if (
      message.includes('network error') ||
      message.includes('database') ||
      message.includes('payment') ||
      message.includes('authentication failed') ||
      stack.includes('stripe') ||
      stack.includes('supabase auth')
    ) {
      return 'critical'
    }
    
    // Warning errors
    if (
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('validation') ||
      stack.includes('ai-sdk')
    ) {
      return 'warning'
    }
    
    return 'info'
  }

  // Generate unique error fingerprint
  generateErrorFingerprint(error) {
    const key = `${error.name}-${error.message}-${error.stack?.split('\n')[1] || ''}`
    // Use a safer encoding method that handles Unicode
    try {
      // Encode to handle Unicode characters
      const encoded = btoa(unescape(encodeURIComponent(key)))
      return encoded.substring(0, 8)
    } catch (e) {
      // Fallback to simple hash if encoding fails
      let hash = 0
      for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i)
        hash = hash & hash // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36).substring(0, 8)
    }
  }

  // Performance threshold monitoring
  checkThresholds() {
    const metrics = this.getLatestMetrics()
    if (!metrics) return

    const alerts = []

    // Response time threshold
    if (metrics.data.responseTime > this.thresholds.responseTime) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `Response time ${metrics.data.responseTime}ms exceeds threshold ${this.thresholds.responseTime}ms`,
        metric: 'response_time',
        value: metrics.data.responseTime,
        threshold: this.thresholds.responseTime
      })
    }

    // Error rate threshold
    if (metrics.data.errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'reliability',
        severity: 'critical',
        message: `Error rate ${(metrics.data.errorRate * 100).toFixed(2)}% exceeds threshold ${(this.thresholds.errorRate * 100)}%`,
        metric: 'error_rate',
        value: metrics.data.errorRate,
        threshold: this.thresholds.errorRate
      })
    }

    // AI cost threshold
    if (metrics.data.aiAverageCost > this.thresholds.aiCostPerHour) {
      alerts.push({
        type: 'cost',
        severity: 'warning',
        message: `AI cost $${metrics.data.aiAverageCost.toFixed(4)}/hour exceeds threshold $${this.thresholds.aiCostPerHour}`,
        metric: 'ai_cost',
        value: metrics.data.aiAverageCost,
        threshold: this.thresholds.aiCostPerHour
      })
    }

    // Memory usage threshold
    if (metrics.data.memory?.percentage > this.thresholds.memoryUsage * 100) {
      alerts.push({
        type: 'resource',
        severity: 'warning',
        message: `Memory usage ${metrics.data.memory.percentage.toFixed(1)}% exceeds threshold ${(this.thresholds.memoryUsage * 100)}%`,
        metric: 'memory_usage',
        value: metrics.data.memory.percentage,
        threshold: this.thresholds.memoryUsage * 100
      })
    }

    // Send alerts if any thresholds exceeded
    if (alerts.length > 0) {
      this.sendThresholdAlerts(alerts)
    }
  }

  // Alert system
  async sendImmediateAlert(errorData) {
    try {
      await this.sendToAlertingSystem({
        type: 'immediate',
        severity: errorData.level,
        title: `Critical Error in Production`,
        message: errorData.message,
        context: errorData.context,
        timestamp: errorData.timestamp
      })
    } catch (alertError) {
      console.error('Failed to send immediate alert:', alertError)
    }
  }

  async sendThresholdAlerts(alerts) {
    try {
      await this.sendToAlertingSystem({
        type: 'threshold',
        alerts: alerts,
        timestamp: new Date().toISOString()
      })
    } catch (alertError) {
      console.error('Failed to send threshold alerts:', alertError)
    }
  }

  // Alerting system integration (Slack, Discord, Email)
  async sendToAlertingSystem(alertData) {
    const alertChannels = [
      { type: 'webhook', url: process.env.SLACK_WEBHOOK_URL },
      { type: 'email', endpoint: '/api/alerts/email' },
      { type: 'discord', url: process.env.DISCORD_WEBHOOK_URL }
    ]

    const promises = alertChannels
      .filter(channel => this.isChannelEnabled(channel))
      .map(channel => this.sendAlert(channel, alertData))

    await Promise.allSettled(promises)
  }

  isChannelEnabled(channel) {
    if (channel.type === 'webhook' || channel.type === 'discord') {
      return Boolean(channel.url)
    }
    return true // Email is always available
  }

  async sendAlert(channel, alertData) {
    try {
      if (channel.type === 'webhook' || channel.type === 'discord') {
        await fetch(channel.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: this.formatAlertMessage(alertData),
            username: '6FB Production Monitor',
            icon_emoji: alertData.severity === 'critical' ? '🚨' : '⚠️'
          })
        })
      } else if (channel.type === 'email') {
        await fetch(channel.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: `Production Alert: ${alertData.title || 'System Alert'}`,
            body: this.formatAlertMessage(alertData, 'html')
          })
        })
      }
    } catch (error) {
      console.error(`Failed to send alert via ${channel.type}:`, error)
    }
  }

  formatAlertMessage(alertData, format = 'text') {
    if (format === 'html') {
      return `
        <h2>🚨 Production Alert</h2>
        <p><strong>Time:</strong> ${alertData.timestamp}</p>
        <p><strong>Type:</strong> ${alertData.type}</p>
        <p><strong>Severity:</strong> ${alertData.severity}</p>
        <p><strong>Message:</strong> ${alertData.message || alertData.title}</p>
        ${alertData.context ? `<p><strong>Context:</strong> ${JSON.stringify(alertData.context, null, 2)}</p>` : ''}
      `
    }
    
    return [
      `🚨 *Production Alert*`,
      `*Time:* ${alertData.timestamp}`,
      `*Type:* ${alertData.type}`,
      `*Severity:* ${alertData.severity}`,
      `*Message:* ${alertData.message || alertData.title}`,
      alertData.context ? `*Context:* \`\`\`${JSON.stringify(alertData.context, null, 2)}\`\`\`` : ''
    ].filter(Boolean).join('\n')
  }

  // Metrics persistence
  async flushMetrics() {
    if (this.metricsQueue.length === 0 && this.errorQueue.length === 0) return

    try {
      // Store metrics via API
      if (this.metricsQueue.length > 0) {
        const metricsPromises = this.metricsQueue.map(metric =>
          fetch('/api/monitoring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'metrics',
              data: {
                type: metric.type,
                ...metric.data,
                timestamp: metric.timestamp
              }
            })
          }).catch(err => console.error('Failed to store metric:', err))
        )
        
        await Promise.allSettled(metricsPromises)
        this.metricsQueue = []
      }

      // Store errors via API
      if (this.errorQueue.length > 0) {
        const errorPromises = this.errorQueue.map(error =>
          fetch('/api/monitoring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'error',
              data: {
                level: error.level,
                message: error.message,
                stack: error.stack,
                context: error.context,
                fingerprint: error.fingerprint,
                occurrences: error.occurrences,
                timestamp: error.timestamp
              }
            })
          }).catch(err => console.error('Failed to store error:', err))
        )
        
        await Promise.allSettled(errorPromises)
        this.errorQueue = []
      }
      
      // Store health snapshot
      const latestMetrics = this.getLatestMetrics()
      if (latestMetrics && latestMetrics.type === 'system_health') {
        await fetch('/api/monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'health-snapshot',
            data: {
              cpu_usage: latestMetrics.data.memory?.percentage || 0,
              memory_usage: latestMetrics.data.memory?.percentage || 0,
              memory_total: latestMetrics.data.memory?.total || 0,
              response_time_avg: latestMetrics.data.responseTime || 0,
              error_rate: latestMetrics.data.errorRate || 0,
              ai_requests_count: latestMetrics.data.aiRequestsCount || 0,
              ai_cost_total: latestMetrics.data.aiAverageCost || 0,
              active_users: latestMetrics.data.activeUsers || 0,
              db_connections: latestMetrics.data.dbConnectionCount || 0,
              status: latestMetrics.data.errorRate > this.thresholds.errorRate ? 'critical' : 
                     latestMetrics.data.responseTime > this.thresholds.responseTime ? 'degraded' : 
                     'healthy'
            }
          })
        }).catch(err => console.error('Failed to store health snapshot:', err))
      }
      
    } catch (error) {
      console.error('Failed to flush monitoring data:', error)
      // Keep metrics in queue for retry
    }
  }

  // Analytics and reporting
  async generateDailyReport() {
    try {
      const supabase = createClient()
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const [metrics, errors] = await Promise.all([
        supabase
          .from('production_metrics')
          .select('*')
          .gte('timestamp', yesterday),
        supabase
          .from('production_errors')
          .select('*')
          .gte('timestamp', yesterday)
      ])

      const report = {
        date: new Date().toISOString().split('T')[0],
        summary: {
          totalRequests: metrics.data?.length || 0,
          totalErrors: errors.data?.length || 0,
          errorRate: errors.data?.length / Math.max(metrics.data?.length, 1) * 100,
          avgResponseTime: this.calculateAverage(metrics.data, 'data.responseTime'),
          totalAICost: this.calculateSum(metrics.data, 'data.aiAverageCost')
        },
        topErrors: this.getTopErrors(errors.data || []),
        performanceTrends: this.analyzePerformanceTrends(metrics.data || []),
        recommendations: this.generateRecommendations(metrics.data || [], errors.data || [])
      }

      return report
    } catch (error) {
      console.error('Failed to generate daily report:', error)
      return null
    }
  }

  // Helper methods for data collection
  getRecentResponses() {
    // Implementation would track recent HTTP responses
    return []
  }

  getRecentAIRequests() {
    // Implementation would track recent AI API calls
    return []
  }

  getRecentActivity() {
    // Implementation would track recent user activity
    return { total: 0, errors: 0 }
  }

  getActiveUserCount() {
    // Implementation would count active sessions
    return 0
  }

  getAIRequestsCount() {
    // Implementation would count AI requests in last period
    return 0
  }

  getModelUsageStats() {
    // Implementation would return model usage statistics
    return {}
  }

  getDatabaseConnections() {
    // Implementation would return DB connection count
    return Promise.resolve(0)
  }

  getCriticalErrorCount() {
    // Implementation would count critical errors
    return 0
  }

  getFeatureUsageStats() {
    // Implementation would return feature usage stats
    return {}
  }

  testConnectivity() {
    // Implementation would test network connectivity
    return 'good'
  }

  getLatestMetrics() {
    return this.metricsQueue[this.metricsQueue.length - 1] || null
  }

  calculateAverage(data, path) {
    if (!data || data.length === 0) return 0
    // Implementation would calculate average for nested path
    return 0
  }

  calculateSum(data, path) {
    if (!data || data.length === 0) return 0
    // Implementation would calculate sum for nested path
    return 0
  }

  getTopErrors(errors) {
    // Implementation would return most frequent errors
    return []
  }

  analyzePerformanceTrends(metrics) {
    // Implementation would analyze performance trends
    return {}
  }

  generateRecommendations(metrics, errors) {
    // Implementation would generate optimization recommendations
    return []
  }

  // Global error handlers setup
  setupErrorHandlers() {
    if (typeof window !== 'undefined') {
      // Catch unhandled errors
      window.addEventListener('error', (event) => {
        this.trackError(new Error(event.message), {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'unhandled_error'
        })
      })

      // Catch unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.trackError(new Error(event.reason), {
          type: 'unhandled_rejection',
          reason: event.reason
        })
      })
    }
  }
}

// Singleton instance
let productionMonitor = null

export function getProductionMonitor() {
  if (!productionMonitor) {
    productionMonitor = new ProductionMonitor()
  }
  return productionMonitor
}

// Convenience methods for immediate use
export function trackError(error, context = {}) {
  return getProductionMonitor().trackError(error, context)
}

export function collectMetrics() {
  return getProductionMonitor().collectSystemMetrics()
}

export async function trackAIUsage(usageData) {
  try {
    await fetch('/api/monitoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ai-usage',
        data: {
          model_name: usageData.model,
          provider: usageData.provider,
          input_tokens: usageData.inputTokens,
          output_tokens: usageData.outputTokens,
          total_tokens: usageData.totalTokens,
          cost: usageData.cost,
          response_time: usageData.responseTime,
          success: usageData.success !== false,
          error_message: usageData.error,
          agent_type: usageData.agentType,
          user_id: usageData.userId,
          session_id: usageData.sessionId,
          timestamp: new Date().toISOString()
        }
      })
    })
  } catch (error) {
    console.error('Failed to track AI usage:', error)
  }
}

export default ProductionMonitor