/**
 * Comprehensive Backend API for Advanced Customization Features
 * 6FB AI Agent System - Production-Grade API with Authentication
 * 
 * This API handles:
 * - Template management with Six Figure Barber methodology alignment
 * - A/B testing experiment management and analytics
 * - Advanced analytics and insights tracking
 * - Enterprise bulk operations for multi-location management
 * - External integrations (Canva, Google My Business)
 * - Workflow collaboration and approval management
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/**
 * Authentication Service
 * Handles JWT validation and role-based access control
 */
export class AuthenticationService {
  static async validateToken(token) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error) throw error
      return { success: true, user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  static async getUserRole(userId) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()
      
      if (error) throw error
      return data?.role || 'viewer'
    } catch (error) {
      console.error('Error fetching user role:', error)
      return 'viewer'
    }
  }

  static hasPermission(userRole, requiredRole) {
    const hierarchy = {
      'owner': 4,
      'editor': 3,
      'reviewer': 2,
      'viewer': 1
    }
    return hierarchy[userRole] >= hierarchy[requiredRole]
  }
}

/**
 * Template Management API
 * Handles template CRUD operations with Six Figure Barber methodology alignment
 */
export class TemplateAPI {
  /**
   * Get all available templates with filtering
   */
  static async getTemplates(filters = {}) {
    try {
      let query = supabase
        .from('templates')
        .select(`
          *,
          template_categories(name),
          template_metrics(
            conversion_rate,
            engagement_score,
            revenue_impact
          )
        `)

      if (filters.category) {
        query = query.eq('category_id', filters.category)
      }
      
      if (filters.sixFigureAlignment) {
        query = query.eq('six_figure_alignment', filters.sixFigureAlignment)
      }

      if (filters.pricing_tier) {
        query = query.eq('pricing_tier', filters.pricing_tier)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching templates:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Create new template with Six Figure Barber validation
   */
  static async createTemplate(templateData, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const userRole = await AuthenticationService.getUserRole(authResult.user.id)
      if (!AuthenticationService.hasPermission(userRole, 'editor')) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Validate Six Figure Barber methodology alignment
      const validation = this.validateSixFigureAlignment(templateData)
      if (!validation.isValid) {
        return { success: false, error: validation.errors }
      }

      const { data, error } = await supabase
        .from('templates')
        .insert({
          ...templateData,
          created_by: authResult.user.id,
          created_at: new Date().toISOString(),
          status: 'pending_approval'
        })
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await this.createAuditLog({
        action: 'template_created',
        template_id: data.id,
        user_id: authResult.user.id,
        details: { template_name: templateData.name }
      })

      return { success: true, data }
    } catch (error) {
      console.error('Error creating template:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update template with approval workflow
   */
  static async updateTemplate(templateId, updateData, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const userRole = await AuthenticationService.getUserRole(authResult.user.id)
      if (!AuthenticationService.hasPermission(userRole, 'editor')) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Create version snapshot before update
      await this.createVersionSnapshot(templateId, authResult.user.id)

      const { data, error } = await supabase
        .from('templates')
        .update({
          ...updateData,
          updated_by: authResult.user.id,
          updated_at: new Date().toISOString(),
          status: userRole === 'owner' ? 'approved' : 'pending_approval'
        })
        .eq('id', templateId)
        .select()
        .single()

      if (error) throw error

      await this.createAuditLog({
        action: 'template_updated',
        template_id: templateId,
        user_id: authResult.user.id,
        details: { changes: Object.keys(updateData) }
      })

      return { success: true, data }
    } catch (error) {
      console.error('Error updating template:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Validate Six Figure Barber methodology alignment
   */
  static validateSixFigureAlignment(templateData) {
    const errors = []
    
    if (!templateData.six_figure_alignment) {
      errors.push('Six Figure Barber methodology alignment is required')
    }

    if (!templateData.value_proposition || templateData.value_proposition.length < 20) {
      errors.push('Value proposition must be at least 20 characters and focus on premium positioning')
    }

    if (!templateData.pricing_strategy || !templateData.pricing_strategy.includes('premium')) {
      errors.push('Pricing strategy must align with premium positioning principles')
    }

    if (templateData.target_revenue_impact && templateData.target_revenue_impact < 1.15) {
      errors.push('Template should target at least 15% revenue impact to align with Six Figure goals')
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors.join(', ') : null
    }
  }

  /**
   * Create version snapshot for rollback capability
   */
  static async createVersionSnapshot(templateId, userId) {
    try {
      const { data: template } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (template) {
        await supabase
          .from('template_versions')
          .insert({
            template_id: templateId,
            version_data: template,
            created_by: userId,
            created_at: new Date().toISOString()
          })
      }
    } catch (error) {
      console.error('Error creating version snapshot:', error)
    }
  }

  /**
   * Create audit log entry
   */
  static async createAuditLog(logData) {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          ...logData,
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error creating audit log:', error)
    }
  }
}

/**
 * A/B Testing API
 * Manages experiment lifecycle and statistical analysis
 */
export class ABTestingAPI {
  /**
   * Create new A/B test experiment
   */
  static async createExperiment(experimentData, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const userRole = await AuthenticationService.getUserRole(authResult.user.id)
      if (!AuthenticationService.hasPermission(userRole, 'editor')) {
        return { success: false, error: 'Insufficient permissions' }
      }

      const { data, error } = await supabase
        .from('ab_experiments')
        .insert({
          ...experimentData,
          created_by: authResult.user.id,
          created_at: new Date().toISOString(),
          status: 'draft',
          participants: 0,
          conversions_a: 0,
          conversions_b: 0
        })
        .select()
        .single()

      if (error) throw error

      // Create variant records
      if (experimentData.variants) {
        const variantInserts = experimentData.variants.map((variant, index) => ({
          experiment_id: data.id,
          variant_name: variant.name,
          variant_data: variant.data,
          traffic_allocation: variant.traffic || 50,
          is_control: index === 0
        }))

        await supabase
          .from('experiment_variants')
          .insert(variantInserts)
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error creating experiment:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get experiment results with statistical analysis
   */
  static async getExperimentResults(experimentId, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const { data: experiment, error } = await supabase
        .from('ab_experiments')
        .select(`
          *,
          experiment_variants(*),
          experiment_events(
            variant_id,
            event_type,
            created_at
          )
        `)
        .eq('id', experimentId)
        .single()

      if (error) throw error

      // Calculate statistical significance
      const results = await this.calculateStatisticalResults(experiment)

      return { success: true, data: { ...experiment, statistical_results: results } }
    } catch (error) {
      console.error('Error fetching experiment results:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Track experiment event (view, conversion, etc.)
   */
  static async trackEvent(experimentId, variantId, eventType, userId = null) {
    try {
      await supabase
        .from('experiment_events')
        .insert({
          experiment_id: experimentId,
          variant_id: variantId,
          event_type: eventType,
          user_id: userId,
          created_at: new Date().toISOString()
        })

      // Update experiment counters
      if (eventType === 'conversion') {
        await this.incrementConversionCount(experimentId, variantId)
      } else if (eventType === 'view') {
        await this.incrementParticipantCount(experimentId)
      }

      return { success: true }
    } catch (error) {
      console.error('Error tracking event:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Calculate statistical significance using Z-test
   */
  static async calculateStatisticalResults(experiment) {
    try {
      const variants = experiment.experiment_variants
      if (variants.length !== 2) {
        throw new Error('Statistical analysis currently supports only 2-variant tests')
      }

      const [controlVariant, testVariant] = variants

      // Get event counts for each variant
      const controlEvents = experiment.experiment_events.filter(e => e.variant_id === controlVariant.id)
      const testEvents = experiment.experiment_events.filter(e => e.variant_id === testVariant.id)

      const controlViews = controlEvents.filter(e => e.event_type === 'view').length
      const controlConversions = controlEvents.filter(e => e.event_type === 'conversion').length
      const testViews = testEvents.filter(e => e.event_type === 'view').length
      const testConversions = testEvents.filter(e => e.event_type === 'conversion').length

      // Calculate conversion rates
      const controlRate = controlViews > 0 ? controlConversions / controlViews : 0
      const testRate = testViews > 0 ? testConversions / testViews : 0

      // Calculate statistical significance using Z-test
      const pooledRate = (controlConversions + testConversions) / (controlViews + testViews)
      const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlViews + 1/testViews))
      const zScore = standardError > 0 ? (testRate - controlRate) / standardError : 0
      const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)))

      const isSignificant = pValue < 0.05
      const confidenceLevel = Math.max(0, (1 - pValue) * 100)

      return {
        control_rate: controlRate,
        test_rate: testRate,
        lift: controlRate > 0 ? ((testRate - controlRate) / controlRate) * 100 : 0,
        z_score: zScore,
        p_value: pValue,
        is_significant: isSignificant,
        confidence_level: confidenceLevel,
        sample_size: {
          control: controlViews,
          test: testViews,
          total: controlViews + testViews
        },
        recommendation: this.generateRecommendation(testRate, controlRate, isSignificant, confidenceLevel)
      }
    } catch (error) {
      console.error('Error calculating statistical results:', error)
      return {
        error: error.message,
        control_rate: 0,
        test_rate: 0,
        lift: 0,
        is_significant: false,
        confidence_level: 0
      }
    }
  }

  /**
   * Normal cumulative distribution function approximation
   */
  static normalCDF(x) {
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x))
    const d = 0.3989423 * Math.exp(-x * x / 2.0)
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    if (x > 0.0) prob = 1.0 - prob
    return prob
  }

  /**
   * Generate recommendation based on test results
   */
  static generateRecommendation(testRate, controlRate, isSignificant, confidenceLevel) {
    if (!isSignificant) {
      return {
        action: 'continue_testing',
        message: 'Results are not yet statistically significant. Continue testing to gather more data.',
        priority: 'medium'
      }
    }

    if (testRate > controlRate) {
      return {
        action: 'implement_winner',
        message: `Test variant shows ${((testRate - controlRate) / controlRate * 100).toFixed(1)}% improvement. Implement the winning variant.`,
        priority: 'high'
      }
    } else {
      return {
        action: 'keep_control',
        message: 'Control variant is performing better. Keep the original version.',
        priority: 'high'
      }
    }
  }

  /**
   * Increment conversion count for variant
   */
  static async incrementConversionCount(experimentId, variantId) {
    try {
      const { data: variant } = await supabase
        .from('experiment_variants')
        .select('conversions')
        .eq('id', variantId)
        .single()

      if (variant) {
        await supabase
          .from('experiment_variants')
          .update({ conversions: (variant.conversions || 0) + 1 })
          .eq('id', variantId)
      }
    } catch (error) {
      console.error('Error incrementing conversion count:', error)
    }
  }

  /**
   * Increment participant count for experiment
   */
  static async incrementParticipantCount(experimentId) {
    try {
      const { data: experiment } = await supabase
        .from('ab_experiments')
        .select('participants')
        .eq('id', experimentId)
        .single()

      if (experiment) {
        await supabase
          .from('ab_experiments')
          .update({ participants: (experiment.participants || 0) + 1 })
          .eq('id', experimentId)
      }
    } catch (error) {
      console.error('Error incrementing participant count:', error)
    }
  }
}

/**
 * Analytics API
 * Handles advanced analytics and Six Figure Barber methodology metrics
 */
export class AnalyticsAPI {
  /**
   * Get comprehensive analytics dashboard data
   */
  static async getDashboardAnalytics(dateRange = '30d', authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const startDate = this.getStartDate(dateRange)
      
      // Fetch multiple analytics data in parallel
      const [
        customizationMetrics,
        conversionFunnelData,
        revenueMetrics,
        userEngagementData,
        templatePerformance,
        sixFigureMetrics
      ] = await Promise.all([
        this.getCustomizationMetrics(startDate),
        this.getConversionFunnelData(startDate),
        this.getRevenueMetrics(startDate),
        this.getUserEngagementData(startDate),
        this.getTemplatePerformance(startDate),
        this.getSixFigureMetrics(startDate)
      ])

      return {
        success: true,
        data: {
          customization_metrics: customizationMetrics,
          conversion_funnel: conversionFunnelData,
          revenue_metrics: revenueMetrics,
          user_engagement: userEngagementData,
          template_performance: templatePerformance,
          six_figure_metrics: sixFigureMetrics,
          generated_at: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Track customization event with detailed context
   */
  static async trackCustomizationEvent(eventData) {
    try {
      await supabase
        .from('analytics_events')
        .insert({
          event_type: eventData.type,
          user_id: eventData.userId,
          session_id: eventData.sessionId,
          template_id: eventData.templateId,
          element_type: eventData.elementType,
          element_id: eventData.elementId,
          action: eventData.action,
          value: eventData.value,
          metadata: eventData.metadata || {},
          timestamp: new Date().toISOString(),
          user_agent: eventData.userAgent,
          ip_address: eventData.ipAddress,
          referrer: eventData.referrer
        })

      return { success: true }
    } catch (error) {
      console.error('Error tracking customization event:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get Six Figure Barber methodology specific metrics
   */
  static async getSixFigureMetrics(startDate) {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('timestamp', startDate)
        .in('event_type', ['premium_feature_used', 'revenue_tool_engaged', 'client_retention_action'])

      if (error) throw error

      // Calculate Six Figure methodology alignment scores
      const premiumFeatureUsage = data.filter(e => e.event_type === 'premium_feature_used').length
      const revenueToolEngagement = data.filter(e => e.event_type === 'revenue_tool_engaged').length
      const clientRetentionActions = data.filter(e => e.event_type === 'client_retention_action').length

      return {
        premium_positioning_score: Math.min(100, (premiumFeatureUsage / 100) * 100),
        revenue_optimization_score: Math.min(100, (revenueToolEngagement / 50) * 100),
        client_relationship_score: Math.min(100, (clientRetentionActions / 75) * 100),
        overall_six_figure_alignment: this.calculateOverallAlignment(premiumFeatureUsage, revenueToolEngagement, clientRetentionActions),
        methodology_insights: this.generateMethodologyInsights(premiumFeatureUsage, revenueToolEngagement, clientRetentionActions)
      }
    } catch (error) {
      console.error('Error fetching Six Figure metrics:', error)
      return {}
    }
  }

  /**
   * Calculate overall Six Figure methodology alignment
   */
  static calculateOverallAlignment(premiumUsage, revenueEngagement, clientActions) {
    const weights = { premium: 0.4, revenue: 0.35, client: 0.25 }
    const maxValues = { premium: 100, revenue: 50, client: 75 }
    
    const premiumScore = Math.min(100, (premiumUsage / maxValues.premium) * 100)
    const revenueScore = Math.min(100, (revenueEngagement / maxValues.revenue) * 100)
    const clientScore = Math.min(100, (clientActions / maxValues.client) * 100)
    
    return Math.round(
      premiumScore * weights.premium +
      revenueScore * weights.revenue +
      clientScore * weights.client
    )
  }

  /**
   * Generate methodology-specific insights
   */
  static generateMethodologyInsights(premiumUsage, revenueEngagement, clientActions) {
    const insights = []
    
    if (premiumUsage < 25) {
      insights.push({
        type: 'opportunity',
        category: 'Premium Positioning',
        message: 'Increase focus on premium features to align with Six Figure methodology',
        impact: 'high'
      })
    }
    
    if (revenueEngagement < 15) {
      insights.push({
        type: 'alert',
        category: 'Revenue Optimization',
        message: 'Revenue tools are underutilized. Consider promoting pricing optimization features',
        impact: 'critical'
      })
    }
    
    if (clientActions < 20) {
      insights.push({
        type: 'opportunity',
        category: 'Client Relationships',
        message: 'Client retention features need more engagement to maximize relationship building',
        impact: 'medium'
      })
    }
    
    return insights
  }

  /**
   * Get customization metrics
   */
  static async getCustomizationMetrics(startDate) {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('timestamp', startDate)
        .eq('event_type', 'customization')

      if (error) throw error

      const totalCustomizations = data.length
      const uniqueUsers = new Set(data.map(e => e.user_id)).size
      const popularElements = this.getPopularElements(data)

      return {
        total_customizations: totalCustomizations,
        unique_users: uniqueUsers,
        average_per_user: uniqueUsers > 0 ? Math.round(totalCustomizations / uniqueUsers) : 0,
        popular_elements: popularElements,
        completion_rate: this.calculateCompletionRate(data)
      }
    } catch (error) {
      console.error('Error fetching customization metrics:', error)
      return {}
    }
  }

  /**
   * Get start date based on range string
   */
  static getStartDate(range) {
    const now = new Date()
    const days = parseInt(range.replace('d', ''))
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    return startDate.toISOString()
  }

  /**
   * Get popular customization elements
   */
  static getPopularElements(data) {
    const elementCounts = {}
    data.forEach(event => {
      const element = event.element_type || 'unknown'
      elementCounts[element] = (elementCounts[element] || 0) + 1
    })

    return Object.entries(elementCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([element, count]) => ({ element, count }))
  }

  /**
   * Calculate customization completion rate
   */
  static calculateCompletionRate(data) {
    const sessions = {}
    
    data.forEach(event => {
      const sessionId = event.session_id
      if (!sessions[sessionId]) {
        sessions[sessionId] = { started: false, completed: false }
      }
      
      if (event.action === 'start_customization') {
        sessions[sessionId].started = true
      }
      if (event.action === 'save_customization' || event.action === 'publish_customization') {
        sessions[sessionId].completed = true
      }
    })

    const totalSessions = Object.keys(sessions).length
    const completedSessions = Object.values(sessions).filter(s => s.started && s.completed).length

    return totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
  }
}

/**
 * Enterprise Bulk Operations API
 * Handles multi-location management and bulk operations
 */
export class BulkOperationsAPI {
  /**
   * Get all locations for enterprise account
   */
  static async getLocations(authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          location_templates(
            template_id,
            templates(name, status)
          ),
          location_settings(*)
        `)
        .eq('organization_id', authResult.user.organization_id)
        .order('name')

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching locations:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Apply template to multiple locations
   */
  static async applyTemplateToLocations(templateId, locationIds, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const userRole = await AuthenticationService.getUserRole(authResult.user.id)
      if (!AuthenticationService.hasPermission(userRole, 'editor')) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Create bulk operation record
      const { data: operation, error: opError } = await supabase
        .from('bulk_operations')
        .insert({
          type: 'template_application',
          initiated_by: authResult.user.id,
          target_locations: locationIds,
          parameters: { template_id: templateId },
          status: 'in_progress',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (opError) throw opError

      // Apply template to each location
      const results = []
      for (const locationId of locationIds) {
        try {
          const result = await this.applyTemplateToLocation(templateId, locationId, authResult.user.id)
          results.push({
            location_id: locationId,
            success: result.success,
            error: result.error
          })
        } catch (error) {
          results.push({
            location_id: locationId,
            success: false,
            error: error.message
          })
        }
      }

      // Update operation status
      const successCount = results.filter(r => r.success).length
      const failureCount = results.length - successCount

      await supabase
        .from('bulk_operations')
        .update({
          status: failureCount === 0 ? 'completed' : 'partial_success',
          completed_at: new Date().toISOString(),
          results: {
            successful: successCount,
            failed: failureCount,
            details: results
          }
        })
        .eq('id', operation.id)

      return {
        success: true,
        data: {
          operation_id: operation.id,
          successful: successCount,
          failed: failureCount,
          results
        }
      }
    } catch (error) {
      console.error('Error applying template to locations:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Apply template to single location
   */
  static async applyTemplateToLocation(templateId, locationId, userId) {
    try {
      // Get template data
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError) throw templateError

      // Create location-template association
      const { error: associationError } = await supabase
        .from('location_templates')
        .upsert({
          location_id: locationId,
          template_id: templateId,
          applied_by: userId,
          applied_at: new Date().toISOString(),
          status: 'active'
        })

      if (associationError) throw associationError

      // Update location settings based on template
      if (template.default_settings) {
        await supabase
          .from('location_settings')
          .upsert({
            location_id: locationId,
            ...template.default_settings,
            updated_by: userId,
            updated_at: new Date().toISOString()
          })
      }

      return { success: true }
    } catch (error) {
      console.error('Error applying template to location:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get bulk operation status
   */
  static async getBulkOperationStatus(operationId, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const { data, error } = await supabase
        .from('bulk_operations')
        .select('*')
        .eq('id', operationId)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching bulk operation status:', error)
      return { success: false, error: error.message }
    }
  }
}

/**
 * External Integrations API
 * Handles Canva and Google My Business integrations
 */
export class IntegrationsAPI {
  /**
   * Initialize OAuth flow for external service
   */
  static async initiateOAuth(service, redirectUri, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const config = this.getOAuthConfig(service)
      if (!config) {
        return { success: false, error: 'Unsupported integration service' }
      }

      // Generate state parameter for security
      const state = this.generateSecureState()
      
      // Store state in database
      await supabase
        .from('oauth_states')
        .insert({
          state,
          service,
          user_id: authResult.user.id,
          redirect_uri: redirectUri,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })

      const authUrl = this.buildAuthUrl(config, redirectUri, state)

      return {
        success: true,
        data: {
          auth_url: authUrl,
          state
        }
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Handle OAuth callback and exchange code for token
   */
  static async handleOAuthCallback(service, code, state, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      // Verify state parameter
      const { data: stateRecord, error: stateError } = await supabase
        .from('oauth_states')
        .select('*')
        .eq('state', state)
        .eq('service', service)
        .eq('user_id', authResult.user.id)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (stateError || !stateRecord) {
        return { success: false, error: 'Invalid or expired OAuth state' }
      }

      // Exchange code for access token
      const tokenResult = await this.exchangeCodeForToken(service, code)
      if (!tokenResult.success) {
        return tokenResult
      }

      // Store integration credentials
      await supabase
        .from('user_integrations')
        .upsert({
          user_id: authResult.user.id,
          service,
          access_token: tokenResult.data.access_token,
          refresh_token: tokenResult.data.refresh_token,
          token_type: tokenResult.data.token_type || 'Bearer',
          expires_at: new Date(Date.now() + (tokenResult.data.expires_in * 1000)).toISOString(),
          scopes: tokenResult.data.scope?.split(' ') || [],
          connected_at: new Date().toISOString(),
          status: 'active'
        })

      // Clean up OAuth state
      await supabase
        .from('oauth_states')
        .delete()
        .eq('id', stateRecord.id)

      return {
        success: true,
        data: {
          service,
          connected_at: new Date().toISOString(),
          scopes: tokenResult.data.scope?.split(' ') || []
        }
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user's connected integrations
   */
  static async getUserIntegrations(authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const { data, error } = await supabase
        .from('user_integrations')
        .select(`
          id,
          service,
          connected_at,
          status,
          scopes,
          last_sync_at
        `)
        .eq('user_id', authResult.user.id)
        .eq('status', 'active')

      if (error) throw error

      // Add service-specific information
      const enrichedIntegrations = data.map(integration => ({
        ...integration,
        service_info: this.getServiceInfo(integration.service),
        health_status: this.checkIntegrationHealth(integration)
      }))

      return { success: true, data: enrichedIntegrations }
    } catch (error) {
      console.error('Error fetching user integrations:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Sync data from external service
   */
  static async syncIntegrationData(service, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const { data: integration, error: integrationError } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', authResult.user.id)
        .eq('service', service)
        .eq('status', 'active')
        .single()

      if (integrationError) {
        return { success: false, error: 'Integration not found or inactive' }
      }

      // Check if token needs refresh
      if (new Date() >= new Date(integration.expires_at)) {
        const refreshResult = await this.refreshAccessToken(integration)
        if (!refreshResult.success) {
          return refreshResult
        }
        integration.access_token = refreshResult.data.access_token
      }

      let syncResult
      switch (service) {
        case 'canva':
          syncResult = await this.syncCanvaData(integration)
          break
        case 'google_my_business':
          syncResult = await this.syncGoogleMyBusinessData(integration)
          break
        default:
          return { success: false, error: 'Unsupported service for sync' }
      }

      // Update last sync time
      await supabase
        .from('user_integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', integration.id)

      return syncResult
    } catch (error) {
      console.error('Error syncing integration data:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get OAuth configuration for service
   */
  static getOAuthConfig(service) {
    const configs = {
      canva: {
        client_id: process.env.CANVA_CLIENT_ID,
        auth_url: 'https://www.canva.com/api/oauth/authorize',
        token_url: 'https://api.canva.com/rest/v1/oauth/token',
        scopes: ['design:read', 'design:write', 'folder:read']
      },
      google_my_business: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_url: 'https://accounts.google.com/oauth2/v2/auth',
        token_url: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/business.manage']
      }
    }
    return configs[service]
  }

  /**
   * Generate secure state parameter
   */
  static generateSecureState() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Build OAuth authorization URL
   */
  static buildAuthUrl(config, redirectUri, state) {
    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: redirectUri,
      state,
      scope: config.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      approval_prompt: 'force'
    })

    return `${config.auth_url}?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(service, code) {
    try {
      const config = this.getOAuthConfig(service)
      const response = await fetch(config.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: config.client_id,
          client_secret: process.env[`${service.toUpperCase()}_CLIENT_SECRET`],
          code,
          grant_type: 'authorization_code'
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error_description || data.error || 'Token exchange failed')
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error exchanging code for token:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get service information
   */
  static getServiceInfo(service) {
    const serviceInfo = {
      canva: {
        name: 'Canva',
        description: 'Design platform for creating marketing materials',
        capabilities: ['Template Creation', 'Brand Kit Management', 'Design Export']
      },
      google_my_business: {
        name: 'Google My Business',
        description: 'Manage your business presence on Google',
        capabilities: ['Review Management', 'Post Publishing', 'Analytics Access']
      }
    }
    return serviceInfo[service] || {}
  }
}

/**
 * Workflow and Collaboration API
 * Handles approval workflows, version control, and team collaboration
 */
export class WorkflowAPI {
  /**
   * Create approval workflow request
   */
  static async createApprovalRequest(requestData, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          ...requestData,
          requested_by: authResult.user.id,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          users!requested_by(name, email)
        `)
        .single()

      if (error) throw error

      // Notify reviewers
      await this.notifyReviewers(data)

      return { success: true, data }
    } catch (error) {
      console.error('Error creating approval request:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Review approval request
   */
  static async reviewApprovalRequest(requestId, action, feedback, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const userRole = await AuthenticationService.getUserRole(authResult.user.id)
      if (!AuthenticationService.hasPermission(userRole, 'reviewer')) {
        return { success: false, error: 'Insufficient permissions to review' }
      }

      // Update approval request
      const { data: request, error } = await supabase
        .from('approval_requests')
        .update({
          status: action,
          reviewed_by: authResult.user.id,
          reviewed_at: new Date().toISOString(),
          feedback
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw error

      // If approved, apply the changes
      if (action === 'approved') {
        await this.applyApprovedChanges(request)
      }

      // Notify requester of decision
      await this.notifyRequestDecision(request, action, feedback)

      return { success: true, data: request }
    } catch (error) {
      console.error('Error reviewing approval request:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get team members and their roles
   */
  static async getTeamMembers(authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          users(name, email, avatar_url),
          user_roles(role)
        `)
        .eq('organization_id', authResult.user.organization_id)
        .eq('status', 'active')
        .order('created_at')

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error fetching team members:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Invite team member
   */
  static async inviteTeamMember(inviteData, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const userRole = await AuthenticationService.getUserRole(authResult.user.id)
      if (!AuthenticationService.hasPermission(userRole, 'editor')) {
        return { success: false, error: 'Insufficient permissions to invite team members' }
      }

      // Create invitation
      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          ...inviteData,
          invited_by: authResult.user.id,
          organization_id: authResult.user.organization_id,
          status: 'pending',
          token: this.generateInviteToken(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Send invitation email
      await this.sendInvitationEmail(data)

      return { success: true, data }
    } catch (error) {
      console.error('Error inviting team member:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get activity feed
   */
  static async getActivityFeed(limit = 50, authToken) {
    try {
      const authResult = await AuthenticationService.validateToken(authToken)
      if (!authResult.success) {
        return { success: false, error: 'Authentication failed' }
      }

      const { data, error } = await supabase
        .from('activity_feed')
        .select(`
          *,
          users(name, avatar_url)
        `)
        .eq('organization_id', authResult.user.organization_id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error fetching activity feed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Log activity
   */
  static async logActivity(activityData) {
    try {
      await supabase
        .from('activity_feed')
        .insert({
          ...activityData,
          created_at: new Date().toISOString()
        })

      return { success: true }
    } catch (error) {
      console.error('Error logging activity:', error)
      return { success: false }
    }
  }

  // Helper methods
  static generateInviteToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  static async notifyReviewers(request) {
    // Implementation would send emails/notifications to reviewers
    console.log('Notifying reviewers for request:', request.id)
  }

  static async notifyRequestDecision(request, action, feedback) {
    // Implementation would notify requester of decision
    console.log('Notifying requester of decision:', action)
  }

  static async applyApprovedChanges(request) {
    // Implementation would apply the approved changes
    console.log('Applying approved changes for request:', request.id)
  }

  static async sendInvitationEmail(invitation) {
    // Implementation would send invitation email
    console.log('Sending invitation email to:', invitation.email)
  }
}

// Classes are already exported above with 'export class'

// Default export for convenience
export default {
  Auth: AuthenticationService,
  Templates: TemplateAPI,
  ABTesting: ABTestingAPI,
  Analytics: AnalyticsAPI,
  BulkOperations: BulkOperationsAPI,
  Integrations: IntegrationsAPI,
  Workflow: WorkflowAPI
}