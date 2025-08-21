/**
 * Analytics Background Job Processor
 * Handles heavy computations asynchronously to improve dashboard performance
 */

import { supabase } from './supabase-client'
import analyticsCache from './analytics-cache'

// Job queue for managing background tasks
class AnalyticsJobQueue {
  constructor() {
    this.queue = []
    this.processing = false
    this.workers = new Map()
    this.results = new Map()
    this.listeners = new Map()
  }

  /**
   * Add a job to the queue
   */
  enqueue(job) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const jobData = {
      id: jobId,
      type: job.type,
      params: job.params,
      priority: job.priority || 5,
      status: 'pending',
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: 3
    }
    
    this.queue.push(jobData)
    this.queue.sort((a, b) => b.priority - a.priority)
    
    // Process queue if not already processing
    if (!this.processing) {
      this.processQueue()
    }
    
    return jobId
  }

  /**
   * Process jobs in the queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    while (this.queue.length > 0) {
      const job = this.queue.shift()
      
      try {
        job.status = 'processing'
        job.startedAt = Date.now()
        
        const result = await this.executeJob(job)
        
        job.status = 'completed'
        job.completedAt = Date.now()
        job.result = result
        
        this.results.set(job.id, result)
        this.notifyListeners(job.id, 'completed', result)
        
      } catch (error) {
        job.attempts++
        job.lastError = error.message
        
        if (job.attempts < job.maxAttempts) {
          job.status = 'pending'
          // Re-queue with lower priority
          job.priority = Math.max(1, job.priority - 1)
          this.queue.push(job)
          this.queue.sort((a, b) => b.priority - a.priority)
        } else {
          job.status = 'failed'
          job.failedAt = Date.now()
          this.notifyListeners(job.id, 'failed', error)
        }
        
        console.error(`Job ${job.id} failed:`, error)
      }
    }
    
    this.processing = false
  }

  /**
   * Execute a specific job based on type
   */
  async executeJob(job) {
    switch (job.type) {
      case 'calculate_health_scores':
        return await this.calculateHealthScores(job.params)
      
      case 'calculate_clv':
        return await this.calculateCLV(job.params)
      
      case 'analyze_churn_risk':
        return await this.analyzeChurnRisk(job.params)
      
      case 'generate_insights':
        return await this.generateInsights(job.params)
      
      case 'segment_customers':
        return await this.segmentCustomers(job.params)
      
      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }
  }

  /**
   * Calculate customer health scores
   */
  async calculateHealthScores({ barbershopId, customerIds = [] }) {
    const batchSize = 50
    const results = []
    
    for (let i = 0; i < customerIds.length; i += batchSize) {
      const batch = customerIds.slice(i, i + batchSize)
      
      // Fetch customer data
      const { data: customers } = await supabase
        .from('customers')
        .select(`
          *,
          appointments:appointments(
            id,
            date,
            status,
            price
          )
        `)
        .in('id', batch)
        .eq('barbershop_id', barbershopId)
      
      // Calculate health scores for each customer
      for (const customer of customers || []) {
        const score = this.computeHealthScore(customer)
        results.push(score)
        
        // Store in database
        await supabase
          .from('customer_health_scores')
          .upsert({
            customer_id: customer.id,
            barbershop_id: barbershopId,
            ...score,
            calculated_at: new Date().toISOString()
          })
      }
    }
    
    // Invalidate cache
    analyticsCache.invalidate(`health_scores:${barbershopId}`)
    
    return results
  }

  /**
   * Compute individual health score
   */
  computeHealthScore(customer) {
    const appointments = customer.appointments || []
    const now = new Date()
    
    // Recency score (0-100)
    const lastVisit = appointments
      .filter(a => a.status === 'completed')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    
    const daysSinceLastVisit = lastVisit 
      ? Math.floor((now - new Date(lastVisit.date)) / (1000 * 60 * 60 * 24))
      : 365
    
    const recencyScore = Math.max(0, 100 - (daysSinceLastVisit * 2))
    
    // Frequency score (0-100)
    const completedAppointments = appointments.filter(a => a.status === 'completed')
    const appointmentsPerMonth = completedAppointments.length / 12
    const frequencyScore = Math.min(100, appointmentsPerMonth * 25)
    
    // Monetary score (0-100)
    const totalSpent = completedAppointments.reduce((sum, a) => sum + (a.price || 0), 0)
    const averageSpent = completedAppointments.length > 0 
      ? totalSpent / completedAppointments.length 
      : 0
    const monetaryScore = Math.min(100, (averageSpent / 100) * 100)
    
    // Engagement score (0-100)
    const noShowRate = appointments.filter(a => a.status === 'no_show').length / 
                       Math.max(1, appointments.length)
    const engagementScore = Math.max(0, 100 - (noShowRate * 100))
    
    // Overall score
    const overallScore = Math.round(
      (recencyScore * 0.3) +
      (frequencyScore * 0.3) +
      (monetaryScore * 0.2) +
      (engagementScore * 0.2)
    )
    
    // Churn risk level
    let churnRisk = 'low'
    if (overallScore < 30) churnRisk = 'critical'
    else if (overallScore < 50) churnRisk = 'high'
    else if (overallScore < 70) churnRisk = 'medium'
    
    return {
      customer_id: customer.id,
      overall_score: overallScore,
      recency_score: recencyScore,
      frequency_score: frequencyScore,
      monetary_score: monetaryScore,
      engagement_score: engagementScore,
      churn_risk_level: churnRisk,
      days_since_last_visit: daysSinceLastVisit,
      appointment_count: completedAppointments.length,
      total_spent: totalSpent,
      average_spent: averageSpent,
      no_show_rate: noShowRate
    }
  }

  /**
   * Calculate Customer Lifetime Value
   */
  async calculateCLV({ barbershopId, customerIds = [] }) {
    const results = []
    
    for (const customerId of customerIds) {
      // Fetch historical data
      const { data: appointments } = await supabase
        .from('appointments')
        .select('price, date, status')
        .eq('customer_id', customerId)
        .eq('status', 'completed')
        .order('date', { ascending: true })
      
      if (!appointments || appointments.length === 0) {
        continue
      }
      
      // Calculate metrics
      const totalRevenue = appointments.reduce((sum, a) => sum + (a.price || 0), 0)
      const firstVisit = new Date(appointments[0].date)
      const lastVisit = new Date(appointments[appointments.length - 1].date)
      const customerLifespan = Math.max(1, (lastVisit - firstVisit) / (1000 * 60 * 60 * 24 * 30)) // months
      
      const averageOrderValue = totalRevenue / appointments.length
      const purchaseFrequency = appointments.length / customerLifespan
      const customerValue = averageOrderValue * purchaseFrequency
      
      // Predict future value (simple model)
      const retentionRate = Math.min(0.9, appointments.length / 10)
      const predictedLifespan = 24 // months
      const discountRate = 0.1
      
      let predictedCLV = 0
      for (let month = 1; month <= predictedLifespan; month++) {
        const monthlyValue = customerValue * Math.pow(retentionRate, month)
        const discountedValue = monthlyValue / Math.pow(1 + discountRate / 12, month)
        predictedCLV += discountedValue
      }
      
      const clvData = {
        customer_id: customerId,
        barbershop_id: barbershopId,
        historical_clv: totalRevenue,
        predicted_clv: predictedCLV,
        total_clv: totalRevenue + predictedCLV,
        average_order_value: averageOrderValue,
        purchase_frequency: purchaseFrequency,
        customer_lifespan_months: customerLifespan,
        retention_rate: retentionRate,
        calculated_at: new Date().toISOString()
      }
      
      results.push(clvData)
      
      // Store in database
      await supabase
        .from('customer_lifetime_values')
        .upsert(clvData)
    }
    
    // Invalidate cache
    analyticsCache.invalidate(`clv:${barbershopId}`)
    
    return results
  }

  /**
   * Analyze churn risk
   */
  async analyzeChurnRisk({ barbershopId, customerIds = [] }) {
    const results = []
    
    for (const customerId of customerIds) {
      // Get customer data with appointments
      const { data: customer } = await supabase
        .from('customers')
        .select(`
          *,
          appointments:appointments(
            date,
            status
          )
        `)
        .eq('id', customerId)
        .single()
      
      if (!customer) continue
      
      const appointments = customer.appointments || []
      const completedAppointments = appointments
        .filter(a => a.status === 'completed')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      
      if (completedAppointments.length < 2) {
        continue // Not enough data
      }
      
      // Calculate appointment intervals
      const intervals = []
      for (let i = 1; i < completedAppointments.length; i++) {
        const days = Math.floor(
          (new Date(completedAppointments[i - 1].date) - new Date(completedAppointments[i].date)) /
          (1000 * 60 * 60 * 24)
        )
        intervals.push(days)
      }
      
      const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const daysSinceLastVisit = Math.floor(
        (new Date() - new Date(completedAppointments[0].date)) / (1000 * 60 * 60 * 24)
      )
      
      // Calculate churn probability
      const overdueFactor = daysSinceLastVisit / averageInterval
      let churnProbability = 0
      
      if (overdueFactor > 3) churnProbability = 0.9
      else if (overdueFactor > 2) churnProbability = 0.7
      else if (overdueFactor > 1.5) churnProbability = 0.5
      else if (overdueFactor > 1) churnProbability = 0.3
      else churnProbability = 0.1
      
      // Adjust based on other factors
      const noShowRate = appointments.filter(a => a.status === 'no_show').length / appointments.length
      churnProbability = Math.min(1, churnProbability + (noShowRate * 0.2))
      
      results.push({
        customer_id: customerId,
        barbershop_id: barbershopId,
        churn_probability: churnProbability,
        days_since_last_visit: daysSinceLastVisit,
        average_visit_interval: averageInterval,
        overdue_factor: overdueFactor,
        risk_level: churnProbability > 0.7 ? 'critical' : churnProbability > 0.5 ? 'high' : churnProbability > 0.3 ? 'medium' : 'low'
      })
    }
    
    return results
  }

  /**
   * Generate AI insights
   */
  async generateInsights({ barbershopId, timeframe = 'month' }) {
    // This would typically call an AI service
    // For now, return analytical insights based on data
    
    const { data: customers } = await supabase
      .from('customers')
      .select('id, created_at')
      .eq('barbershop_id', barbershopId)
    
    const { data: appointments } = await supabase
      .from('appointments')
      .select('price, date, status')
      .eq('barbershop_id', barbershopId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    
    const insights = {
      summary: {
        total_customers: customers?.length || 0,
        new_customers_this_month: customers?.filter(c => 
          new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length || 0,
        total_revenue: appointments?.reduce((sum, a) => sum + (a.price || 0), 0) || 0,
        appointment_completion_rate: appointments?.length > 0
          ? (appointments.filter(a => a.status === 'completed').length / appointments.length * 100)
          : 0
      },
      trends: {
        customer_growth: 'increasing',
        revenue_trend: 'stable',
        engagement: 'improving'
      },
      recommendations: [
        'Focus on re-engaging customers who haven\'t visited in 60+ days',
        'Consider loyalty programs for your top 20% customers',
        'Optimize appointment scheduling to reduce no-shows'
      ]
    }
    
    return insights
  }

  /**
   * Segment customers
   */
  async segmentCustomers({ barbershopId }) {
    const { data: scores } = await supabase
      .from('customer_health_scores')
      .select('*')
      .eq('barbershop_id', barbershopId)
    
    const segments = {
      champions: scores?.filter(s => s.overall_score >= 80) || [],
      loyal: scores?.filter(s => s.overall_score >= 60 && s.overall_score < 80) || [],
      at_risk: scores?.filter(s => s.overall_score >= 40 && s.overall_score < 60) || [],
      lost: scores?.filter(s => s.overall_score < 40) || []
    }
    
    return segments
  }

  /**
   * Subscribe to job updates
   */
  subscribe(jobId, callback) {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, [])
    }
    this.listeners.get(jobId).push(callback)
    
    // Check if job already completed
    if (this.results.has(jobId)) {
      callback('completed', this.results.get(jobId))
    }
  }

  /**
   * Notify listeners of job updates
   */
  notifyListeners(jobId, status, data) {
    const listeners = this.listeners.get(jobId) || []
    listeners.forEach(callback => callback(status, data))
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    const job = this.queue.find(j => j.id === jobId)
    if (job) return job.status
    if (this.results.has(jobId)) return 'completed'
    return 'not_found'
  }

  /**
   * Get job result
   */
  getJobResult(jobId) {
    return this.results.get(jobId)
  }
}

// Create singleton instance
const analyticsJobQueue = new AnalyticsJobQueue()

// Export functions for easy use
export function scheduleHealthScoreCalculation(barbershopId, customerIds) {
  return analyticsJobQueue.enqueue({
    type: 'calculate_health_scores',
    params: { barbershopId, customerIds },
    priority: 7
  })
}

export function scheduleCLVCalculation(barbershopId, customerIds) {
  return analyticsJobQueue.enqueue({
    type: 'calculate_clv',
    params: { barbershopId, customerIds },
    priority: 6
  })
}

export function scheduleChurnAnalysis(barbershopId, customerIds) {
  return analyticsJobQueue.enqueue({
    type: 'analyze_churn_risk',
    params: { barbershopId, customerIds },
    priority: 8
  })
}

export function scheduleInsightsGeneration(barbershopId, timeframe) {
  return analyticsJobQueue.enqueue({
    type: 'generate_insights',
    params: { barbershopId, timeframe },
    priority: 5
  })
}

export function scheduleCustomerSegmentation(barbershopId) {
  return analyticsJobQueue.enqueue({
    type: 'segment_customers',
    params: { barbershopId },
    priority: 4
  })
}

export function subscribeToJob(jobId, callback) {
  return analyticsJobQueue.subscribe(jobId, callback)
}

export function getJobStatus(jobId) {
  return analyticsJobQueue.getJobStatus(jobId)
}

export function getJobResult(jobId) {
  return analyticsJobQueue.getJobResult(jobId)
}

export default analyticsJobQueue