/**
 * Intelligent Alert System for monitoring and notifications
 */

class AlertSystem {
  constructor() {
    this.rules = new Map()
    this.alerts = []
    this.channels = new Map()
    this.throttle = new Map()
    this.escalation = new Map()
    this.initialized = false
  }

  init() {
    if (this.initialized) return

    this.setupDefaultRules()
    
    this.setupChannels()
    
    this.startMonitoring()

    this.initialized = true
    console.log('Alert system initialized')
  }

  setupDefaultRules() {
    this.addRule({
      id: 'high_response_time',
      name: 'High Response Time',
      condition: (metrics) => metrics.responseTime > 2000,
      severity: 'warning',
      threshold: 3, // Trigger after 3 consecutive violations
      message: 'API response time exceeds 2 seconds',
      channels: ['email', 'slack']
    })

    this.addRule({
      id: 'critical_response_time',
      name: 'Critical Response Time',
      condition: (metrics) => metrics.responseTime > 5000,
      severity: 'critical',
      threshold: 1,
      message: 'API response time critically high (>5s)',
      channels: ['email', 'slack', 'sms'],
      escalate: true
    })

    this.addRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: (metrics) => metrics.errorRate > 5,
      severity: 'warning',
      threshold: 2,
      message: 'Error rate exceeds 5%',
      channels: ['slack']
    })

    this.addRule({
      id: 'critical_error_rate',
      name: 'Critical Error Rate',
      condition: (metrics) => metrics.errorRate > 10,
      severity: 'critical',
      threshold: 1,
      message: 'Critical error rate detected (>10%)',
      channels: ['email', 'slack', 'sms'],
      escalate: true
    })

    this.addRule({
      id: 'high_memory',
      name: 'High Memory Usage',
      condition: (metrics) => metrics.memory > 85,
      severity: 'warning',
      threshold: 5,
      message: 'Memory usage exceeds 85%',
      channels: ['slack']
    })

    this.addRule({
      id: 'critical_memory',
      name: 'Critical Memory Usage',
      condition: (metrics) => metrics.memory > 95,
      severity: 'critical',
      threshold: 1,
      message: 'Critical memory usage (>95%)',
      channels: ['email', 'slack', 'sms'],
      escalate: true
    })

    this.addRule({
      id: 'high_cpu',
      name: 'High CPU Usage',
      condition: (metrics) => metrics.cpu > 80,
      severity: 'warning',
      threshold: 5,
      message: 'CPU usage exceeds 80%',
      channels: ['slack']
    })

    this.addRule({
      id: 'service_down',
      name: 'Service Down',
      condition: (metrics) => metrics.serviceStatus === 'down',
      severity: 'critical',
      threshold: 1,
      message: 'Service is down',
      channels: ['email', 'slack', 'sms'],
      escalate: true,
      autoResolve: true
    })

    this.addRule({
      id: 'database_connection',
      name: 'Database Connection Issue',
      condition: (metrics) => metrics.dbConnections < 1,
      severity: 'critical',
      threshold: 1,
      message: 'Database connection lost',
      channels: ['email', 'slack', 'sms'],
      escalate: true
    })

    this.addRule({
      id: 'low_bookings',
      name: 'Low Booking Rate',
      condition: (metrics) => metrics.bookingRate < 0.5,
      severity: 'info',
      threshold: 10,
      message: 'Booking rate below expected threshold',
      channels: ['email'],
      businessHours: true
    })

    this.addRule({
      id: 'payment_failures',
      name: 'Payment Processing Failures',
      condition: (metrics) => metrics.paymentFailures > 3,
      severity: 'critical',
      threshold: 1,
      message: 'Multiple payment processing failures detected',
      channels: ['email', 'slack'],
      escalate: true
    })
  }

  addRule(rule) {
    const ruleConfig = {
      ...rule,
      violations: 0,
      lastTriggered: null,
      status: 'active',
      autoResolve: rule.autoResolve || false,
      businessHours: rule.businessHours || false
    }
    
    this.rules.set(rule.id, ruleConfig)
  }

  setupChannels() {
    this.channels.set('email', {
      send: async (alert) => {
        try {
          await fetch('/api/alerts/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert)
          })
        } catch (error) {
          console.error('Failed to send email alert:', error)
        }
      }
    })

    this.channels.set('slack', {
      send: async (alert) => {
        if (!process.env.NEXT_PUBLIC_SLACK_WEBHOOK) return
        
        try {
          await fetch(process.env.NEXT_PUBLIC_SLACK_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 ${alert.severity.toUpperCase()}: ${alert.message}`,
              attachments: [{
                color: this.getSeverityColor(alert.severity),
                fields: [
                  { title: 'Rule', value: alert.ruleName, short: true },
                  { title: 'Time', value: new Date(alert.timestamp).toLocaleString(), short: true },
                  { title: 'Details', value: JSON.stringify(alert.metrics, null, 2) }
                ]
              }]
            })
          })
        } catch (error) {
          console.error('Failed to send Slack alert:', error)
        }
      }
    })

    this.channels.set('sms', {
      send: async (alert) => {
        try {
          await fetch('/api/alerts/sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `${alert.severity.toUpperCase()}: ${alert.message}`,
              to: process.env.NEXT_PUBLIC_ALERT_PHONE
            })
          })
        } catch (error) {
          console.error('Failed to send SMS alert:', error)
        }
      }
    })

    this.channels.set('app', {
      send: async (alert) => {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast({
            title: `${alert.severity.toUpperCase()} Alert`,
            description: alert.message,
            variant: alert.severity === 'critical' ? 'destructive' : 'default'
          })
        }
      }
    })
  }

  startMonitoring() {
    setInterval(() => {
      this.checkAlerts()
    }, 30000)
  }

  async checkAlerts() {
    try {
      const metrics = await this.fetchMetrics()
      
      for (const [ruleId, rule] of this.rules) {
        if (rule.status !== 'active') continue
        
        if (rule.businessHours && !this.isBusinessHours()) continue
        
        const violated = rule.condition(metrics)
        
        if (violated) {
          rule.violations++
          
          if (rule.violations >= rule.threshold) {
            if (!this.isThrottled(ruleId)) {
              await this.triggerAlert(rule, metrics)
            }
          }
        } else {
          if (rule.violations > 0) {
            rule.violations = 0
            
            if (rule.autoResolve && rule.lastTriggered) {
              await this.resolveAlert(rule)
            }
          }
        }
      }
    } catch (error) {
      console.error('Alert check failed:', error)
    }
  }

  async fetchMetrics() {
    try {
      const response = await fetch('/api/monitoring/metrics')
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
    
    return {
      responseTime: 0,
      errorRate: 0,
      memory: 0,
      cpu: 0,
      serviceStatus: 'unknown',
      dbConnections: 1,
      bookingRate: 1,
      paymentFailures: 0
    }
  }

  async triggerAlert(rule, metrics) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: rule.message,
      metrics,
      timestamp: new Date().toISOString(),
      status: 'triggered'
    }
    
    this.alerts.push(alert)
    rule.lastTriggered = alert.timestamp
    
    for (const channelName of rule.channels) {
      const channel = this.channels.get(channelName)
      if (channel) {
        await channel.send(alert)
      }
    }
    
    if (rule.escalate) {
      this.scheduleEscalation(alert)
    }
    
    this.setThrottle(rule.id)
    
    console.warn(`Alert triggered: ${rule.name}`, alert)
    
    await this.storeAlert(alert)
  }

  async resolveAlert(rule) {
    const alert = {
      ruleId: rule.id,
      ruleName: rule.name,
      message: `${rule.name} has been resolved`,
      timestamp: new Date().toISOString(),
      status: 'resolved'
    }
    
    for (const channelName of rule.channels) {
      const channel = this.channels.get(channelName)
      if (channel) {
        await channel.send({
          ...alert,
          severity: 'info'
        })
      }
    }
    
    console.log(`Alert resolved: ${rule.name}`)
  }

  scheduleEscalation(alert) {
    const escalationLevels = [
      { delay: 5 * 60 * 1000, channels: ['sms'] }, // 5 minutes
      { delay: 15 * 60 * 1000, channels: ['phone'] }, // 15 minutes
      { delay: 30 * 60 * 1000, channels: ['manager'] } // 30 minutes
    ]
    
    escalationLevels.forEach((level, index) => {
      setTimeout(() => {
        if (!this.isResolved(alert.id)) {
          this.escalateAlert(alert, index + 1, level.channels)
        }
      }, level.delay)
    })
  }

  async escalateAlert(alert, level, channels) {
    console.warn(`Escalating alert to level ${level}:`, alert.ruleName)
    
    const escalatedAlert = {
      ...alert,
      escalationLevel: level,
      message: `[ESCALATED L${level}] ${alert.message}`
    }
    
    for (const channelName of channels) {
      const channel = this.channels.get(channelName)
      if (channel) {
        await channel.send(escalatedAlert)
      }
    }
  }

  isResolved(alertId) {
    const alert = this.alerts.find(a => a.id === alertId)
    return alert && alert.status === 'resolved'
  }

  isThrottled(ruleId) {
    const throttleTime = this.throttle.get(ruleId)
    if (!throttleTime) return false
    
    const throttleDuration = 5 * 60 * 1000 // 5 minutes
    return Date.now() - throttleTime < throttleDuration
  }

  setThrottle(ruleId) {
    this.throttle.set(ruleId, Date.now())
  }

  isBusinessHours() {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18
  }

  getSeverityColor(severity) {
    switch (severity) {
      case 'critical': return '#dc2626'
      case 'warning': return '#f59e0b'
      case 'info': return '#546355'
      default: return '#6b7280'
    }
  }

  async storeAlert(alert) {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      })
    } catch (error) {
      console.error('Failed to store alert:', error)
    }
  }

  getStatistics() {
    const stats = {
      total: this.alerts.length,
      byServerity: {},
      byRule: {},
      recent: this.alerts.slice(-10)
    }
    
    this.alerts.forEach(alert => {
      stats.byServerity[alert.severity] = (stats.byServerity[alert.severity] || 0) + 1
      
      stats.byRule[alert.ruleName] = (stats.byRule[alert.ruleName] || 0) + 1
    })
    
    return stats
  }
}

const alertSystem = new AlertSystem()

export default alertSystem