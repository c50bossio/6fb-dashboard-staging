/**
 * Rule Auditor Module
 * 
 * Tracks rule evaluations, violations, and effectiveness
 * for analytics and optimization
 */

import { createClient } from '@/lib/supabase/server-client'

export class RuleAuditor {
  constructor(barbershopId) {
    this.barbershopId = barbershopId
    this.buffer = []
    this.bufferSize = 50
    this.flushInterval = 30000 // 30 seconds
    this.lastFlush = Date.now()
    this.metrics = this.initializeMetrics()
    
    // Start periodic flush
    if (typeof window !== 'undefined') {
      this.flushTimer = setInterval(() => this.flush(), this.flushInterval)
    }
  }

  /**
   * Initialize metrics tracking
   */
  initializeMetrics() {
    return {
      totalEvaluations: 0,
      allowedBookings: 0,
      blockedBookings: 0,
      violationsByType: new Map(),
      warningsByType: new Map(),
      evaluationTimes: [],
      hourlyDistribution: new Array(24).fill(0),
      dayDistribution: new Array(7).fill(0)
    }
  }

  /**
   * Log a rule evaluation
   */
  async logEvaluation(context) {
    const evaluation = {
      barbershop_id: this.barbershopId,
      timestamp: context.timestamp || new Date(),
      request_id: this.generateRequestId(),
      
      // Request details
      request: {
        service_id: context.request.service_id,
        barber_id: context.request.barber_id,
        customer_id: context.request.customer_id,
        date: context.request.date,
        time: context.request.time,
        duration: context.request.duration,
        is_new_client: context.request.is_new_client,
        payment_method: context.request.payment_method
      },
      
      // Evaluation results
      result: {
        allowed: context.violations.length === 0,
        violations: context.violations,
        warnings: context.warnings,
        rules_version: context.rules?.metadata?.version
      },
      
      // Performance metrics
      performance: {
        evaluation_time_ms: context.evaluationTime || 0,
        rules_checked: this.countRulesChecked(context),
        cache_hit: context.cacheHit || false
      }
    }

    // Update metrics
    this.updateMetrics(evaluation)
    
    // Add to buffer
    this.buffer.push(evaluation)
    
    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush()
    }
  }

  /**
   * Update in-memory metrics
   */
  updateMetrics(evaluation) {
    this.metrics.totalEvaluations++
    
    if (evaluation.result.allowed) {
      this.metrics.allowedBookings++
    } else {
      this.metrics.blockedBookings++
    }
    
    // Track violations by type
    for (const violation of evaluation.result.violations) {
      const count = this.metrics.violationsByType.get(violation.code) || 0
      this.metrics.violationsByType.set(violation.code, count + 1)
    }
    
    // Track warnings by type
    for (const warning of evaluation.result.warnings) {
      const count = this.metrics.warningsByType.get(warning.code) || 0
      this.metrics.warningsByType.set(warning.code, count + 1)
    }
    
    // Track performance
    if (evaluation.performance.evaluation_time_ms) {
      this.metrics.evaluationTimes.push(evaluation.performance.evaluation_time_ms)
      
      // Keep only last 1000 times for average calculation
      if (this.metrics.evaluationTimes.length > 1000) {
        this.metrics.evaluationTimes.shift()
      }
    }
    
    // Track time distribution
    const hour = new Date(evaluation.timestamp).getHours()
    const day = new Date(evaluation.timestamp).getDay()
    
    this.metrics.hourlyDistribution[hour]++
    this.metrics.dayDistribution[day]++
  }

  /**
   * Flush buffer to database
   */
  async flush() {
    if (this.buffer.length === 0) return
    
    const supabase = await createClient()
    const toFlush = [...this.buffer]
    this.buffer = []
    
    try {
      // Batch insert evaluations
      const { error } = await supabase
        .from('booking_rule_evaluations')
        .insert(toFlush)
      
      if (error) {
        console.error('Failed to flush audit logs:', error)
        // Re-add to buffer if failed
        this.buffer.unshift(...toFlush)
      } else {
        this.lastFlush = Date.now()
      }
    } catch (error) {
      console.error('Failed to flush audit logs:', error)
      // Re-add to buffer if failed
      this.buffer.unshift(...toFlush)
    }
  }

  /**
   * Log a rule change
   */
  async logRuleChange(oldRules, newRules, changedBy) {
    const supabase = await createClient()
    
    const changeLog = {
      barbershop_id: this.barbershopId,
      changed_by: changedBy,
      changed_at: new Date(),
      old_rules: oldRules,
      new_rules: newRules,
      changes: this.calculateChanges(oldRules, newRules)
    }
    
    try {
      await supabase
        .from('booking_rule_changes')
        .insert(changeLog)
    } catch (error) {
      console.error('Failed to log rule change:', error)
    }
  }

  /**
   * Calculate changes between rule sets
   */
  calculateChanges(oldRules, newRules) {
    const changes = []
    
    // Deep comparison logic
    const compareObjects = (path, old, new_) => {
      if (typeof old !== typeof new_) {
        changes.push({
          path,
          type: 'type_change',
          old: old,
          new: new_
        })
        return
      }
      
      if (typeof old !== 'object' || old === null) {
        if (old !== new_) {
          changes.push({
            path,
            type: 'value_change',
            old: old,
            new: new_
          })
        }
        return
      }
      
      // Compare objects recursively
      const allKeys = new Set([...Object.keys(old), ...Object.keys(new_)])
      
      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key
        
        if (!(key in old)) {
          changes.push({
            path: newPath,
            type: 'added',
            new: new_[key]
          })
        } else if (!(key in new_)) {
          changes.push({
            path: newPath,
            type: 'removed',
            old: old[key]
          })
        } else {
          compareObjects(newPath, old[key], new_[key])
        }
      }
    }
    
    compareObjects('', oldRules, newRules)
    return changes
  }

  /**
   * Get analytics for a time period
   */
  async getAnalytics(startDate, endDate) {
    const supabase = await createClient()
    
    const { data: evaluations, error } = await supabase
      .from('booking_rule_evaluations')
      .select('*')
      .eq('barbershop_id', this.barbershopId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
    
    if (error) {
      console.error('Failed to fetch analytics:', error)
      return null
    }
    
    return this.processAnalytics(evaluations)
  }

  /**
   * Process raw evaluations into analytics
   */
  processAnalytics(evaluations) {
    const analytics = {
      summary: {
        total_evaluations: evaluations.length,
        allowed_bookings: 0,
        blocked_bookings: 0,
        approval_rate: 0,
        avg_evaluation_time: 0
      },
      violations: {},
      warnings: {},
      performance: {
        avg_evaluation_time_ms: 0,
        p50_evaluation_time_ms: 0,
        p95_evaluation_time_ms: 0,
        p99_evaluation_time_ms: 0,
        cache_hit_rate: 0
      },
      patterns: {
        hourly_distribution: new Array(24).fill(0),
        daily_distribution: new Array(7).fill(0),
        violation_trends: [],
        peak_times: []
      }
    }
    
    // Process each evaluation
    const evaluationTimes = []
    let cacheHits = 0
    
    for (const eval_ of evaluations) {
      // Summary stats
      if (eval_.result?.allowed) {
        analytics.summary.allowed_bookings++
      } else {
        analytics.summary.blocked_bookings++
      }
      
      // Violation counts
      for (const violation of eval_.result?.violations || []) {
        analytics.violations[violation.code] = (analytics.violations[violation.code] || 0) + 1
      }
      
      // Warning counts
      for (const warning of eval_.result?.warnings || []) {
        analytics.warnings[warning.code] = (analytics.warnings[warning.code] || 0) + 1
      }
      
      // Performance metrics
      if (eval_.performance?.evaluation_time_ms) {
        evaluationTimes.push(eval_.performance.evaluation_time_ms)
      }
      
      if (eval_.performance?.cache_hit) {
        cacheHits++
      }
      
      // Time distribution
      const hour = new Date(eval_.timestamp).getHours()
      const day = new Date(eval_.timestamp).getDay()
      
      analytics.patterns.hourly_distribution[hour]++
      analytics.patterns.daily_distribution[day]++
    }
    
    // Calculate derived metrics
    analytics.summary.approval_rate = analytics.summary.total_evaluations > 0
      ? (analytics.summary.allowed_bookings / analytics.summary.total_evaluations) * 100
      : 0
    
    // Calculate performance percentiles
    if (evaluationTimes.length > 0) {
      evaluationTimes.sort((a, b) => a - b)
      
      analytics.performance.avg_evaluation_time_ms = 
        evaluationTimes.reduce((a, b) => a + b, 0) / evaluationTimes.length
      
      analytics.performance.p50_evaluation_time_ms = 
        this.percentile(evaluationTimes, 50)
      
      analytics.performance.p95_evaluation_time_ms = 
        this.percentile(evaluationTimes, 95)
      
      analytics.performance.p99_evaluation_time_ms = 
        this.percentile(evaluationTimes, 99)
    }
    
    analytics.performance.cache_hit_rate = evaluations.length > 0
      ? (cacheHits / evaluations.length) * 100
      : 0
    
    // Identify peak times
    analytics.patterns.peak_times = this.identifyPeakTimes(analytics.patterns.hourly_distribution)
    
    return analytics
  }

  /**
   * Calculate percentile
   */
  percentile(sortedArray, p) {
    const index = Math.ceil((p / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, index)]
  }

  /**
   * Identify peak times from distribution
   */
  identifyPeakTimes(hourlyDistribution) {
    const peaks = []
    const avg = hourlyDistribution.reduce((a, b) => a + b, 0) / 24
    const threshold = avg * 1.5 // 50% above average
    
    for (let hour = 0; hour < 24; hour++) {
      if (hourlyDistribution[hour] > threshold) {
        peaks.push({
          hour,
          count: hourlyDistribution[hour],
          label: `${hour}:00 - ${hour + 1}:00`
        })
      }
    }
    
    return peaks.sort((a, b) => b.count - a.count)
  }

  /**
   * Get violation trends over time
   */
  async getViolationTrends(days = 30) {
    const supabase = await createClient()
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data: evaluations, error } = await supabase
      .from('booking_rule_evaluations')
      .select('timestamp, result')
      .eq('barbershop_id', this.barbershopId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true })
    
    if (error) {
      console.error('Failed to fetch trends:', error)
      return null
    }
    
    // Group by day and violation type
    const trends = new Map()
    
    for (const eval_ of evaluations) {
      const date = new Date(eval_.timestamp).toDateString()
      
      if (!trends.has(date)) {
        trends.set(date, {
          date,
          total: 0,
          violations: {}
        })
      }
      
      const dayData = trends.get(date)
      dayData.total++
      
      for (const violation of eval_.result?.violations || []) {
        dayData.violations[violation.code] = (dayData.violations[violation.code] || 0) + 1
      }
    }
    
    return Array.from(trends.values())
  }

  /**
   * Get rule effectiveness metrics
   */
  async getRuleEffectiveness() {
    const analytics = await this.getAnalytics(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      new Date()
    )
    
    if (!analytics) return null
    
    const effectiveness = {
      overall_effectiveness: analytics.summary.approval_rate,
      rules: {}
    }
    
    // Calculate effectiveness for each rule type
    const ruleTypes = Object.keys(analytics.violations)
    
    for (const ruleType of ruleTypes) {
      const violationCount = analytics.violations[ruleType]
      const totalEvaluations = analytics.summary.total_evaluations
      
      effectiveness.rules[ruleType] = {
        violation_count: violationCount,
        violation_rate: (violationCount / totalEvaluations) * 100,
        effectiveness: 100 - ((violationCount / totalEvaluations) * 100)
      }
    }
    
    return effectiveness
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format = 'json') {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)
    
    const analytics = await this.getAnalytics(startDate, endDate)
    
    if (!analytics) return null
    
    switch (format) {
      case 'json':
        return JSON.stringify(analytics, null, 2)
      
      case 'csv':
        return this.convertToCSV(analytics)
      
      default:
        return analytics
    }
  }

  /**
   * Convert analytics to CSV format
   */
  convertToCSV(analytics) {
    const rows = []
    
    // Summary section
    rows.push(['Summary'])
    rows.push(['Metric', 'Value'])
    rows.push(['Total Evaluations', analytics.summary.total_evaluations])
    rows.push(['Allowed Bookings', analytics.summary.allowed_bookings])
    rows.push(['Blocked Bookings', analytics.summary.blocked_bookings])
    rows.push(['Approval Rate', `${analytics.summary.approval_rate.toFixed(2)}%`])
    rows.push([])
    
    // Violations section
    rows.push(['Violations'])
    rows.push(['Code', 'Count'])
    for (const [code, count] of Object.entries(analytics.violations)) {
      rows.push([code, count])
    }
    rows.push([])
    
    // Performance section
    rows.push(['Performance'])
    rows.push(['Metric', 'Value (ms)'])
    rows.push(['Average', analytics.performance.avg_evaluation_time_ms.toFixed(2)])
    rows.push(['P50', analytics.performance.p50_evaluation_time_ms])
    rows.push(['P95', analytics.performance.p95_evaluation_time_ms])
    rows.push(['P99', analytics.performance.p99_evaluation_time_ms])
    rows.push(['Cache Hit Rate', `${analytics.performance.cache_hit_rate.toFixed(2)}%`])
    
    // Convert to CSV string
    return rows.map(row => row.join(',')).join('\n')
  }

  /**
   * Count rules checked in an evaluation
   */
  countRulesChecked(context) {
    let count = 0
    
    // Count based on what was evaluated
    if (context.rules?.scheduling) count++
    if (context.rules?.hours) count++
    if (context.rules?.payment) count++
    if (context.rules?.client) count++
    if (context.request.service_id && context.rules?.services?.[context.request.service_id]) count++
    if (context.request.barber_id && context.rules?.barbers?.[context.request.barber_id]) count++
    if (context.rules?.dynamic?.length > 0) count += context.rules.dynamic.length
    
    return count
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      violationsByType: Object.fromEntries(this.metrics.violationsByType),
      warningsByType: Object.fromEntries(this.metrics.warningsByType),
      avgEvaluationTime: this.metrics.evaluationTimes.length > 0
        ? this.metrics.evaluationTimes.reduce((a, b) => a + b, 0) / this.metrics.evaluationTimes.length
        : 0,
      bufferSize: this.buffer.length,
      lastFlush: new Date(this.lastFlush).toISOString()
    }
  }

  /**
   * Cleanup and flush on destroy
   */
  async destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    await this.flush()
  }
}

export default RuleAuditor