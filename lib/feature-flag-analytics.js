/**
 * Comprehensive Feature Flag Analytics and Logging System
 * 
 * Provides detailed analytics, monitoring, and logging for feature flags:
 * - Usage tracking and metrics
 * - Performance monitoring
 * - A/B test analytics
 * - Error tracking and alerting
 * - Business impact measurement
 * - Real-time dashboards
 * - Export capabilities
 */

import { createClient } from './supabase/client'

const supabase = createClient()

// Analytics Event Types
export const ANALYTICS_EVENTS = {
  FLAG_EVALUATED: 'flag_evaluated',
  FLAG_ERROR: 'flag_error',
  FLAG_CREATED: 'flag_created',
  FLAG_UPDATED: 'flag_updated',
  FLAG_DELETED: 'flag_deleted',
  RULE_APPLIED: 'rule_applied',
  AB_TEST_BUCKET: 'ab_test_bucket',
  PERFORMANCE_METRIC: 'performance_metric',
  BUSINESS_METRIC: 'business_metric'
}

// Analytics Collector Class
export class FeatureFlagAnalytics {
  constructor(options = {}) {
    this.options = {
      batchSize: 50,
      flushInterval: 5000, // 5 seconds
      enablePerformanceTracking: true,
      enableBusinessMetrics: true,
      enableErrorTracking: true,
      enableRealtime: true,
      ...options
    }

    this.eventQueue = []
    this.performanceMetrics = new Map()
    this.businessMetrics = new Map()
    this.flushTimer = null

    this.initializeAnalytics()
  }

  initializeAnalytics() {
    // Start batch flushing
    this.startBatchFlushing()

    // Set up performance observers if available
    if (this.options.enablePerformanceTracking && typeof window !== 'undefined') {
      this.setupPerformanceTracking()
    }

    // Set up error tracking
    if (this.options.enableErrorTracking) {
      this.setupErrorTracking()
    }

    console.log('[FeatureFlagAnalytics] Initialized with options:', this.options)
  }

  // Track feature flag evaluation
  trackFlagEvaluation(data) {
    const event = {
      type: ANALYTICS_EVENTS.FLAG_EVALUATED,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId(),
      ...data
    }

    this.queueEvent(event)

    // Track performance metrics
    if (data.evaluation_time && this.options.enablePerformanceTracking) {
      this.recordPerformanceMetric(data.flag_name, 'evaluation_time', data.evaluation_time)
    }
  }

  // Track A/B test bucket assignment
  trackABTestBucket(flagName, variant, userId, metadata = {}) {
    const event = {
      type: ANALYTICS_EVENTS.AB_TEST_BUCKET,
      flag_name: flagName,
      variant,
      user_id: userId,
      metadata,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId()
    }

    this.queueEvent(event)
  }

  // Track business metrics
  trackBusinessMetric(flagName, metricName, value, metadata = {}) {
    if (!this.options.enableBusinessMetrics) return

    const event = {
      type: ANALYTICS_EVENTS.BUSINESS_METRIC,
      flag_name: flagName,
      metric_name: metricName,
      value,
      metadata,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId()
    }

    this.queueEvent(event)

    // Store in local metrics cache for real-time tracking
    const key = `${flagName}-${metricName}`
    if (!this.businessMetrics.has(key)) {
      this.businessMetrics.set(key, [])
    }
    this.businessMetrics.get(key).push({ value, timestamp: Date.now() })

    // Keep only recent metrics (last hour)
    const hourAgo = Date.now() - 3600000
    const metrics = this.businessMetrics.get(key)
    this.businessMetrics.set(key, metrics.filter(m => m.timestamp > hourAgo))
  }

  // Track errors
  trackError(flagName, error, context = {}) {
    if (!this.options.enableErrorTracking) return

    const event = {
      type: ANALYTICS_EVENTS.FLAG_ERROR,
      flag_name: flagName,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId(),
      user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null
    }

    this.queueEvent(event)

    // Immediate flush for errors (don't wait for batch)
    this.flushEvents()
  }

  // Queue event for batch processing
  queueEvent(event) {
    this.eventQueue.push(event)

    // Immediate flush if queue is full
    if (this.eventQueue.length >= this.options.batchSize) {
      this.flushEvents()
    }
  }

  // Flush events to storage
  async flushEvents() {
    if (this.eventQueue.length === 0) return

    const events = this.eventQueue.splice(0, this.options.batchSize)
    
    try {
      // Store in Supabase
      const { error } = await supabase
        .from('feature_flag_analytics_events')
        .insert(events)

      if (error) {
        console.error('[FeatureFlagAnalytics] Failed to store events:', error)
        
        // Re-queue events on failure (with limit to prevent infinite growth)
        if (this.eventQueue.length < 1000) {
          this.eventQueue.unshift(...events)
        }
      } else {
        console.log(`[FeatureFlagAnalytics] Flushed ${events.length} events`)
      }

    } catch (error) {
      console.error('[FeatureFlagAnalytics] Error flushing events:', error)
      
      // Re-queue events on failure
      if (this.eventQueue.length < 1000) {
        this.eventQueue.unshift(...events)
      }
    }
  }

  // Start batch flushing timer
  startBatchFlushing() {
    this.flushTimer = setInterval(() => {
      this.flushEvents()
    }, this.options.flushInterval)
  }

  // Stop analytics collection
  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    
    // Flush remaining events
    this.flushEvents()
  }

  // Performance tracking setup
  setupPerformanceTracking() {
    if (typeof PerformanceObserver === 'undefined') return

    // Track navigation timing
    try {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordPerformanceMetric('page_load', entry.name, entry.duration)
        }
      })
      navObserver.observe({ entryTypes: ['navigation'] })
    } catch (error) {
      console.warn('[FeatureFlagAnalytics] Performance tracking setup failed:', error)
    }
  }

  // Error tracking setup
  setupErrorTracking() {
    if (typeof window === 'undefined') return

    // Track unhandled errors
    window.addEventListener('error', (event) => {
      if (this.isFeatureFlagRelatedError(event.error)) {
        this.trackError('global', event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        })
      }
    })

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isFeatureFlagRelatedError(event.reason)) {
        this.trackError('global', event.reason, {
          type: 'unhandled_rejection'
        })
      }
    })
  }

  // Check if error is feature flag related
  isFeatureFlagRelatedError(error) {
    if (!error) return false
    
    const message = error.message || ''
    const stack = error.stack || ''
    
    return (
      message.includes('feature-flag') ||
      message.includes('FeatureFlag') ||
      stack.includes('useFeatureFlag') ||
      stack.includes('FeatureFlag')
    )
  }

  // Record performance metric
  recordPerformanceMetric(flagName, metricName, value) {
    const key = `${flagName}-${metricName}`
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, [])
    }

    this.performanceMetrics.get(key).push({
      value,
      timestamp: Date.now()
    })

    // Keep only recent metrics (last 10 minutes)
    const tenMinutesAgo = Date.now() - 600000
    const metrics = this.performanceMetrics.get(key)
    this.performanceMetrics.set(key, metrics.filter(m => m.timestamp > tenMinutesAgo))

    // Track in analytics
    const event = {
      type: ANALYTICS_EVENTS.PERFORMANCE_METRIC,
      flag_name: flagName,
      metric_name: metricName,
      value,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId()
    }

    this.queueEvent(event)
  }

  // Get performance metrics
  getPerformanceMetrics(flagName, metricName) {
    const key = `${flagName}-${metricName}`
    const metrics = this.performanceMetrics.get(key) || []
    
    if (metrics.length === 0) return null

    const values = metrics.map(m => m.value)
    return {
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1]
    }
  }

  // Get session ID
  getSessionId() {
    if (typeof window === 'undefined') return null
    
    let sessionId = window.sessionStorage?.getItem('feature-flag-analytics-session')
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      window.sessionStorage?.setItem('feature-flag-analytics-session', sessionId)
    }
    
    return sessionId
  }
}

// Global analytics instance
let globalAnalytics = null

// Initialize global analytics
export function initializeFeatureFlagAnalytics(options = {}) {
  if (globalAnalytics) {
    console.warn('[FeatureFlagAnalytics] Already initialized')
    return globalAnalytics
  }

  globalAnalytics = new FeatureFlagAnalytics(options)
  return globalAnalytics
}

// Get global analytics instance
export function getFeatureFlagAnalytics() {
  if (!globalAnalytics) {
    globalAnalytics = initializeFeatureFlagAnalytics()
  }
  return globalAnalytics
}

// Analytics Query Functions
export class FeatureFlagAnalyticsQuery {
  constructor(supabaseClient = supabase) {
    this.supabase = supabaseClient
  }

  // Get flag usage stats
  async getFlagUsageStats(flagName, startDate, endDate) {
    try {
      const { data, error } = await this.supabase
        .from('feature_flag_analytics')
        .select('is_enabled, variant, timestamp, user_id')
        .eq('flag_name', flagName)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true })

      if (error) throw error

      // Process data for statistics
      const totalEvaluations = data.length
      const uniqueUsers = new Set(data.filter(d => d.user_id).map(d => d.user_id)).size
      const enabledCount = data.filter(d => d.is_enabled).length
      const variantStats = {}

      data.forEach(row => {
        if (!variantStats[row.variant]) {
          variantStats[row.variant] = 0
        }
        variantStats[row.variant]++
      })

      return {
        total_evaluations: totalEvaluations,
        unique_users: uniqueUsers,
        enabled_percentage: totalEvaluations > 0 ? (enabledCount / totalEvaluations) * 100 : 0,
        variant_distribution: variantStats,
        time_series: this.groupByTimeInterval(data, 'hour')
      }

    } catch (error) {
      console.error('Failed to get flag usage stats:', error)
      throw error
    }
  }

  // Get A/B test results
  async getABTestResults(flagName, startDate, endDate) {
    try {
      const { data, error } = await this.supabase
        .from('feature_flag_analytics')
        .select('variant, user_id, is_enabled, metadata, timestamp')
        .eq('flag_name', flagName)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())

      if (error) throw error

      // Group by variant
      const variantResults = {}
      data.forEach(row => {
        if (!variantResults[row.variant]) {
          variantResults[row.variant] = {
            users: new Set(),
            conversions: 0,
            total_events: 0
          }
        }

        variantResults[row.variant].users.add(row.user_id)
        variantResults[row.variant].total_events++

        // Check for conversion events in metadata
        if (row.metadata?.conversion) {
          variantResults[row.variant].conversions++
        }
      })

      // Calculate conversion rates
      Object.keys(variantResults).forEach(variant => {
        const result = variantResults[variant]
        result.unique_users = result.users.size
        result.conversion_rate = result.total_events > 0 
          ? (result.conversions / result.total_events) * 100 
          : 0
        delete result.users // Remove Set object for JSON serialization
      })

      return variantResults

    } catch (error) {
      console.error('Failed to get A/B test results:', error)
      throw error
    }
  }

  // Get error analytics
  async getErrorAnalytics(flagName = null, startDate, endDate) {
    try {
      let query = this.supabase
        .from('feature_flag_analytics_events')
        .select('*')
        .eq('type', ANALYTICS_EVENTS.FLAG_ERROR)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())

      if (flagName) {
        query = query.eq('flag_name', flagName)
      }

      const { data, error } = await query.order('timestamp', { ascending: false })

      if (error) throw error

      // Group errors by type and flag
      const errorStats = {}
      data.forEach(event => {
        const key = `${event.flag_name}-${event.error?.name || 'Unknown'}`
        if (!errorStats[key]) {
          errorStats[key] = {
            flag_name: event.flag_name,
            error_type: event.error?.name || 'Unknown',
            count: 0,
            first_occurrence: event.timestamp,
            last_occurrence: event.timestamp,
            sample_messages: []
          }
        }

        errorStats[key].count++
        errorStats[key].last_occurrence = event.timestamp

        // Keep sample error messages
        if (errorStats[key].sample_messages.length < 3) {
          errorStats[key].sample_messages.push(event.error?.message)
        }
      })

      return Object.values(errorStats)

    } catch (error) {
      console.error('Failed to get error analytics:', error)
      throw error
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(flagName, metricName, startDate, endDate) {
    try {
      const { data, error } = await this.supabase
        .from('feature_flag_analytics_events')
        .select('value, timestamp, metadata')
        .eq('type', ANALYTICS_EVENTS.PERFORMANCE_METRIC)
        .eq('flag_name', flagName)
        .eq('metric_name', metricName)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true })

      if (error) throw error

      if (data.length === 0) {
        return {
          count: 0,
          average: 0,
          min: 0,
          max: 0,
          percentiles: {},
          time_series: []
        }
      }

      const values = data.map(d => d.value)
      values.sort((a, b) => a - b)

      return {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: values[0],
        max: values[values.length - 1],
        percentiles: {
          p50: this.percentile(values, 50),
          p75: this.percentile(values, 75),
          p90: this.percentile(values, 90),
          p95: this.percentile(values, 95),
          p99: this.percentile(values, 99)
        },
        time_series: this.groupByTimeInterval(data.map(d => ({
          timestamp: d.timestamp,
          value: d.value
        })), 'hour')
      }

    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      throw error
    }
  }

  // Helper: Calculate percentile
  percentile(values, p) {
    const index = (p / 100) * (values.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index - lower

    return values[lower] * (1 - weight) + values[upper] * weight
  }

  // Helper: Group data by time interval
  groupByTimeInterval(data, interval = 'hour') {
    const grouped = {}
    
    data.forEach(item => {
      const date = new Date(item.timestamp)
      let key
      
      switch (interval) {
        case 'minute':
          key = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                        date.getHours(), date.getMinutes()).toISOString()
          break
        case 'hour':
          key = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                        date.getHours()).toISOString()
          break
        case 'day':
          key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
          break
        default:
          key = date.toISOString()
      }
      
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(item)
    })
    
    return Object.entries(grouped)
      .map(([timestamp, items]) => ({
        timestamp,
        count: items.length,
        items
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  }
}

// Export utilities
export async function exportAnalyticsData(flagName, format = 'json', startDate, endDate) {
  const query = new FeatureFlagAnalyticsQuery()
  
  try {
    const [usage, errors, abTest] = await Promise.all([
      query.getFlagUsageStats(flagName, startDate, endDate),
      query.getErrorAnalytics(flagName, startDate, endDate),
      query.getABTestResults(flagName, startDate, endDate)
    ])

    const exportData = {
      flag_name: flagName,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      usage_stats: usage,
      error_analytics: errors,
      ab_test_results: abTest,
      exported_at: new Date().toISOString()
    }

    if (format === 'csv') {
      return convertToCSV(exportData)
    }

    return JSON.stringify(exportData, null, 2)

  } catch (error) {
    console.error('Failed to export analytics data:', error)
    throw error
  }
}

function convertToCSV(data) {
  // Simplified CSV conversion - you might want to use a proper CSV library
  const headers = ['Metric', 'Value']
  const rows = [
    ['Flag Name', data.flag_name],
    ['Export Date', data.exported_at],
    ['Total Evaluations', data.usage_stats.total_evaluations],
    ['Unique Users', data.usage_stats.unique_users],
    ['Enabled Percentage', data.usage_stats.enabled_percentage],
    ['Error Count', data.error_analytics.length]
  ]

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
}

// Initialize analytics on module load in browser environment
if (typeof window !== 'undefined') {
  // Auto-initialize analytics in production
  if (process.env.NODE_ENV === 'production') {
    initializeFeatureFlagAnalytics({
      enablePerformanceTracking: true,
      enableBusinessMetrics: true,
      enableErrorTracking: true,
      batchSize: 25,
      flushInterval: 10000 // 10 seconds in production
    })
  } else {
    // More aggressive tracking in development
    initializeFeatureFlagAnalytics({
      enablePerformanceTracking: true,
      enableBusinessMetrics: true,
      enableErrorTracking: true,
      batchSize: 10,
      flushInterval: 3000 // 3 seconds in development
    })
  }
}