/**
 * Proactive AI Monitoring Service
 * Continuously monitors business metrics and generates intelligent alerts
 * Agents proactively identify opportunities and risks
 */

import { aiOrchestrator } from '../lib/ai-orchestrator-enhanced'

export class ProactiveMonitoringService {
  constructor() {
    this.monitoringInterval = null
    this.alertThresholds = this.initializeThresholds()
    this.activeAlerts = new Map()
    this.lastMetrics = null
    this.checkInterval = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Initialize monitoring thresholds for different metrics
   */
  initializeThresholds() {
    return {
      revenue: {
        critical_low: 200,    // Daily revenue below $200
        warning_low: 300,     // Daily revenue below $300
        target: 450,          // Daily target
        exceptional: 600      // Exceptional performance
      },
      bookings: {
        critical_low: 3,      // Less than 3 bookings
        warning_low: 5,       // Less than 5 bookings
        optimal: 8,           // Optimal bookings
        full_capacity: 12     // Maximum capacity
      },
      utilization: {
        critical_low: 30,     // Below 30% utilization
        warning_low: 50,      // Below 50% utilization
        optimal: 75,          // Optimal utilization
        overbooked: 95        // Risk of overbooking
      },
      customer_satisfaction: {
        critical: 3.5,        // Below 3.5 stars
        warning: 4.0,         // Below 4.0 stars
        good: 4.5,           // Good rating
        excellent: 4.8        // Excellent rating
      },
      response_time: {
        slow: 3600,          // Response time > 1 hour
        acceptable: 1800,     // Response time > 30 min
        fast: 900            // Response time < 15 min
      }
    }
  }

  /**
   * Start proactive monitoring
   */
  async startMonitoring(userId, barbershopId) {
    console.log('🤖 Starting Proactive AI Monitoring...')
    
    await this.checkMetrics(userId, barbershopId)
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkMetrics(userId, barbershopId)
    }, this.checkInterval)
    
    this.setupRealtimeMonitoring(userId, barbershopId)
    
    return {
      status: 'active',
      checkInterval: this.checkInterval,
      message: 'Proactive monitoring activated. AI agents are now watching your business 24/7.'
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    return {
      status: 'stopped',
      message: 'Proactive monitoring has been stopped.'
    }
  }

  /**
   * Check current metrics and generate alerts
   */
  async checkMetrics(userId, barbershopId) {
    try {
      const metrics = await this.fetchBusinessMetrics(barbershopId)
      
      const analysis = await this.analyzeMetricsWithAI(metrics, userId)
      
      const alerts = this.generateAlerts(metrics, analysis)
      
      await this.processAlerts(alerts, userId, barbershopId)
      
      this.lastMetrics = metrics
      
      return {
        metrics,
        analysis,
        alerts: alerts.length,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('Monitoring check failed:', error)
      return null
    }
  }

  /**
   * Fetch current business metrics
   */
  async fetchBusinessMetrics(barbershopId) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:9999'
    
    try {
      const analyticsRes = await fetch(`${baseUrl}/api/analytics/live-data?barbershop_id=${barbershopId}`)
      const analyticsData = await analyticsRes.json()
      
      const appointmentsRes = await fetch(`${baseUrl}/api/appointments?barbershop_id=${barbershopId}`)
      const appointmentsData = await appointmentsRes.json()
      
      return {
        revenue: {
          daily: analyticsData.data?.daily_revenue || 0,
          monthly: analyticsData.data?.monthly_revenue || 0,
          growth: analyticsData.data?.revenue_growth || 0
        },
        bookings: {
          today: analyticsData.data?.daily_bookings || 0,
          pending: analyticsData.data?.pending_appointments || 0,
          completed: analyticsData.data?.completed_appointments || 0
        },
        utilization: {
          current: analyticsData.data?.utilization_rate || 0,
          peak_hours: analyticsData.data?.peak_booking_hours || []
        },
        customers: {
          total: analyticsData.data?.total_customers || 0,
          new_this_month: analyticsData.data?.new_customers_this_month || 0,
          retention_rate: analyticsData.data?.customer_retention_rate || 0
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
      return null
    }
  }

  /**
   * Analyze metrics with AI for deeper insights
   */
  async analyzeMetricsWithAI(metrics, userId) {
    if (!metrics) return null
    
    const prompt = `
      Analyze these business metrics and identify opportunities or concerns:
      
      Revenue: $${metrics.revenue.daily} today (${metrics.revenue.growth}% growth)
      Bookings: ${metrics.bookings.today} today, ${metrics.bookings.pending} pending
      Utilization: ${metrics.utilization.current}%
      Customer Retention: ${metrics.customers.retention_rate}%
      
      Provide specific, actionable insights focusing on:
      1. Immediate opportunities to capture
      2. Risks that need attention
      3. Optimization suggestions
    `
    
    try {
      const response = await aiOrchestrator.processMessage(prompt, {
        userId,
        context: 'proactive_monitoring'
      })
      
      return {
        insights: response.response,
        agent: response.agent,
        confidence: response.confidence || 0.8,
        suggestions: this.extractActionableInsights(response.response)
      }
    } catch (error) {
      console.error('AI analysis failed:', error)
      return null
    }
  }

  /**
   * Generate alerts based on metrics and AI analysis
   */
  generateAlerts(metrics, analysis) {
    const alerts = []
    const now = new Date()
    const hour = now.getHours()
    
    if (metrics.revenue.daily < this.alertThresholds.revenue.critical_low) {
      alerts.push({
        type: 'critical',
        category: 'revenue',
        title: '🚨 Critical: Very Low Revenue',
        message: `Today's revenue is only $${metrics.revenue.daily}. Immediate action needed!`,
        agent: 'marcus',
        priority: 1,
        actions: ['Launch flash promotion', 'Contact regular customers', 'Extend operating hours']
      })
    } else if (metrics.revenue.daily < this.alertThresholds.revenue.warning_low) {
      alerts.push({
        type: 'warning',
        category: 'revenue',
        title: '⚠️ Revenue Below Target',
        message: `Revenue at $${metrics.revenue.daily}, below $${this.alertThresholds.revenue.target} target.`,
        agent: 'marcus',
        priority: 2,
        actions: ['Promote premium services', 'Upsell opportunities']
      })
    } else if (metrics.revenue.daily > this.alertThresholds.revenue.exceptional) {
      alerts.push({
        type: 'success',
        category: 'revenue',
        title: '🎉 Exceptional Revenue Day!',
        message: `Outstanding! Revenue at $${metrics.revenue.daily} - well above target!`,
        agent: 'marcus',
        priority: 3,
        actions: ['Capture customer feedback', 'Document what worked']
      })
    }
    
    if (metrics.bookings.today < this.alertThresholds.bookings.critical_low && hour < 14) {
      alerts.push({
        type: 'critical',
        category: 'bookings',
        title: '📅 Critical: Very Few Bookings',
        message: `Only ${metrics.bookings.today} bookings today. Open slots available!`,
        agent: 'david',
        priority: 1,
        actions: ['Send booking reminders', 'Offer same-day discounts', 'Post on social media']
      })
    }
    
    if (metrics.utilization.current < this.alertThresholds.utilization.critical_low && hour >= 10 && hour <= 18) {
      alerts.push({
        type: 'warning',
        category: 'utilization',
        title: '💺 Low Chair Utilization',
        message: `Utilization at ${metrics.utilization.current}% during peak hours.`,
        agent: 'david',
        priority: 2,
        actions: ['Optimize scheduling', 'Fill gaps with walk-ins']
      })
    }
    
    if (metrics.customers.retention_rate < 60) {
      alerts.push({
        type: 'warning',
        category: 'customers',
        title: '👥 Customer Retention Issue',
        message: `Retention rate at ${metrics.customers.retention_rate}%. Risk of losing customers!`,
        agent: 'sophia',
        priority: 2,
        actions: ['Launch retention campaign', 'Follow up with inactive customers', 'Improve service quality']
      })
    }
    
    if (hour === 9 && metrics.bookings.today < this.alertThresholds.bookings.optimal) {
      alerts.push({
        type: 'opportunity',
        category: 'marketing',
        title: '📱 Morning Marketing Opportunity',
        message: 'Perfect time to promote today\'s availability on social media!',
        agent: 'sophia',
        priority: 3,
        actions: ['Post available slots', 'Share daily special', 'Send SMS reminders']
      })
    }
    
    if (hour === 15 && metrics.bookings.pending < 3) {
      alerts.push({
        type: 'opportunity',
        category: 'bookings',
        title: '⏰ Afternoon Booking Push',
        message: 'Evening slots available - promote last-minute bookings!',
        agent: 'sophia',
        priority: 3,
        actions: ['Offer express services', 'Target nearby customers']
      })
    }
    
    if (analysis && analysis.suggestions.length > 0) {
      analysis.suggestions.forEach(suggestion => {
        alerts.push({
          type: 'ai_insight',
          category: 'optimization',
          title: '🤖 AI Recommendation',
          message: suggestion,
          agent: 'master_coach',
          priority: 3,
          actions: []
        })
      })
    }
    
    return alerts
  }

  /**
   * Process and dispatch alerts
   */
  async processAlerts(alerts, userId, barbershopId) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:9999'
    
    for (const alert of alerts) {
      const alertKey = `${alert.category}_${alert.type}`
      
      if (this.activeAlerts.has(alertKey)) {
        const lastAlert = this.activeAlerts.get(alertKey)
        const timeSinceLastAlert = Date.now() - lastAlert.timestamp
        
        if (timeSinceLastAlert < 2 * 60 * 60 * 1000) {
          continue
        }
      }
      
      this.activeAlerts.set(alertKey, {
        ...alert,
        timestamp: Date.now()
      })
      
      try {
        await fetch(`${baseUrl}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            barbershop_id: barbershopId,
            type: alert.type,
            title: alert.title,
            message: alert.message,
            agent: alert.agent,
            actions: alert.actions,
            priority: alert.priority
          })
        })
        
        console.log(`📢 Alert sent: ${alert.title}`)
      } catch (error) {
        console.error('Failed to send alert:', error)
      }
    }
  }

  /**
   * Extract actionable insights from AI response
   */
  extractActionableInsights(aiResponse) {
    const insights = []
    const lines = aiResponse.split('\n').filter(line => line.trim())
    
    lines.forEach(line => {
      if (line.includes('recommend') || 
          line.includes('suggest') || 
          line.includes('should') ||
          line.includes('opportunity') ||
          line.includes('consider')) {
        insights.push(line.trim())
      }
    })
    
    return insights.slice(0, 3) // Return top 3 insights
  }

  /**
   * Setup real-time monitoring for critical events
   */
  setupRealtimeMonitoring(userId, barbershopId) {
    
    console.log('🔴 Real-time monitoring activated for critical events')
    
    setInterval(async () => {
      const metrics = await this.fetchBusinessMetrics(barbershopId)
      
      if (metrics) {
        if (this.lastMetrics) {
          const revenueDrop = this.lastMetrics.revenue.daily - metrics.revenue.daily
          
          if (revenueDrop > 50) {
            const alert = {
              type: 'critical',
              category: 'anomaly',
              title: '⚡ Anomaly Detected',
              message: `Sudden revenue drop of $${revenueDrop} detected!`,
              agent: 'marcus',
              priority: 1,
              actions: ['Investigate cause', 'Check system status']
            }
            
            await this.processAlerts([alert], userId, barbershopId)
          }
        }
      }
    }, 60000) // Every minute for critical checks
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      active: this.monitoringInterval !== null,
      activeAlerts: Array.from(this.activeAlerts.values()),
      lastCheck: this.lastMetrics?.timestamp || null,
      checkInterval: this.checkInterval,
      thresholds: this.alertThresholds
    }
  }
}

export const proactiveMonitor = new ProactiveMonitoringService()
export default proactiveMonitor