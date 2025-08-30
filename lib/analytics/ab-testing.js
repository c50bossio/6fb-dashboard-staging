'use client'

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { SUCCESS_METRICS, TEST_TYPES } from '@/lib/templates/template-engine'

// A/B Testing Framework for Customization Optimization
class ABTestingFramework {
  constructor() {
    this.supabase = createClient()
    this.activeExperiments = new Map()
    this.userVariants = new Map()
  }

  // Create new A/B test experiment
  async createExperiment(experimentData) {
    try {
      const {
        name,
        description,
        hypothesis,
        test_type,
        success_metrics,
        duration,
        variants,
        target_audience = {},
        confidence_level = 0.95,
        min_sample_size = 100,
        traffic_allocation = 1.0
      } = experimentData

      // Validate experiment data
      if (!name || !description || !hypothesis || !variants || variants.length < 2) {
        return { success: false, error: 'Missing required experiment data' }
      }

      // Calculate end date
      const startDate = new Date()
      const endDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000))

      const experiment = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        hypothesis,
        test_type,
        success_metrics,
        variants: variants.map((variant, index) => ({
          id: `var_${Date.now()}_${index}`,
          ...variant,
          traffic_split: variants.length > 0 ? 1 / variants.length : 0
        })),
        status: 'draft',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        target_audience,
        confidence_level,
        min_sample_size,
        traffic_allocation,
        statistical_power: 0.8,
        created_at: new Date().toISOString(),
        current_results: {}
      }

      // Save to database
      const { error } = await this.supabase
        .from('ab_test_experiments')
        .insert(experiment)

      if (error) {
        console.error('Error creating experiment:', error)
        return { success: false, error: 'Failed to save experiment' }
      }

      return { success: true, experiment }
    } catch (error) {
      console.error('Error creating experiment:', error)
      return { success: false, error: 'Failed to create experiment' }
    }
  }

  // Start A/B test experiment
  async startExperiment(experimentId) {
    try {
      const { data: experiment, error } = await this.supabase
        .from('ab_test_experiments')
        .select('*')
        .eq('id', experimentId)
        .single()

      if (error || !experiment) {
        return { success: false, error: 'Experiment not found' }
      }

      if (experiment.status !== 'draft') {
        return { success: false, error: 'Experiment is not in draft status' }
      }

      // Update experiment status
      const { error: updateError } = await this.supabase
        .from('ab_test_experiments')
        .update({
          status: 'running',
          actual_start_date: new Date().toISOString()
        })
        .eq('id', experimentId)

      if (updateError) {
        return { success: false, error: 'Failed to start experiment' }
      }

      // Add to active experiments cache
      this.activeExperiments.set(experimentId, {
        ...experiment,
        status: 'running',
        actual_start_date: new Date().toISOString()
      })

      return { success: true }
    } catch (error) {
      console.error('Error starting experiment:', error)
      return { success: false, error: 'Failed to start experiment' }
    }
  }

  // Stop A/B test experiment
  async stopExperiment(experimentId) {
    try {
      const { error } = await this.supabase
        .from('ab_test_experiments')
        .update({
          status: 'completed',
          actual_end_date: new Date().toISOString()
        })
        .eq('id', experimentId)

      if (error) {
        return { success: false, error: 'Failed to stop experiment' }
      }

      // Remove from active experiments cache
      this.activeExperiments.delete(experimentId)

      // Generate final results
      const results = await this.generateExperimentResults(experimentId)

      return { success: true, results }
    } catch (error) {
      console.error('Error stopping experiment:', error)
      return { success: false, error: 'Failed to stop experiment' }
    }
  }

  // Assign user to experiment variant
  async assignUserToVariant(userId, experimentId) {
    try {
      // Check if user is already assigned
      const existingAssignment = this.userVariants.get(`${userId}_${experimentId}`)
      if (existingAssignment) {
        return existingAssignment
      }

      // Get experiment details
      const { data: experiment, error } = await this.supabase
        .from('ab_test_experiments')
        .select('*')
        .eq('id', experimentId)
        .single()

      if (error || !experiment || experiment.status !== 'running') {
        return null
      }

      // Check if user meets target audience criteria
      if (!await this.userMatchesTargetAudience(userId, experiment.target_audience)) {
        return null
      }

      // Randomly assign variant based on traffic split
      const variants = experiment.variants
      const random = Math.random()
      let cumulativeWeight = 0

      for (const variant of variants) {
        cumulativeWeight += variant.traffic_split
        if (random <= cumulativeWeight) {
          const assignment = {
            user_id: userId,
            experiment_id: experimentId,
            variant_id: variant.id,
            variant: variant,
            assigned_at: new Date().toISOString()
          }

          // Save assignment to database
          await this.supabase
            .from('ab_test_assignments')
            .insert(assignment)

          // Cache assignment
          this.userVariants.set(`${userId}_${experimentId}`, assignment)

          return assignment
        }
      }

      return null
    } catch (error) {
      console.error('Error assigning user to variant:', error)
      return null
    }
  }

  // Check if user matches target audience criteria
  async userMatchesTargetAudience(userId, targetAudience) {
    if (!targetAudience || Object.keys(targetAudience).length === 0) {
      return true // No targeting criteria means all users match
    }

    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('role, business_type, target_clients, created_at, location')
        .eq('id', userId)
        .single()

      if (error || !profile) {
        return false
      }

      // Check role criteria
      if (targetAudience.roles && !targetAudience.roles.includes(profile.role)) {
        return false
      }

      // Check business type criteria
      if (targetAudience.business_types && !targetAudience.business_types.includes(profile.business_type)) {
        return false
      }

      // Check user age (account age)
      if (targetAudience.min_account_age_days) {
        const accountAge = (new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24)
        if (accountAge < targetAudience.min_account_age_days) {
          return false
        }
      }

      // Check location criteria
      if (targetAudience.locations && !targetAudience.locations.includes(profile.location)) {
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking target audience:', error)
      return false
    }
  }

  // Track conversion event
  async trackConversion(userId, experimentId, metric, value = 1, metadata = {}) {
    try {
      // Get user's variant assignment
      const assignment = await this.getUserVariantAssignment(userId, experimentId)
      if (!assignment) {
        return false
      }

      // Record conversion event
      const conversionEvent = {
        user_id: userId,
        experiment_id: experimentId,
        variant_id: assignment.variant_id,
        metric,
        value,
        metadata,
        timestamp: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('ab_test_conversions')
        .insert(conversionEvent)

      if (error) {
        console.error('Error tracking conversion:', error)
        return false
      }

      // Update real-time results cache
      await this.updateExperimentResults(experimentId)

      return true
    } catch (error) {
      console.error('Error tracking conversion:', error)
      return false
    }
  }

  // Get user's variant assignment
  async getUserVariantAssignment(userId, experimentId) {
    try {
      // Check cache first
      const cached = this.userVariants.get(`${userId}_${experimentId}`)
      if (cached) {
        return cached
      }

      // Query database
      const { data: assignment, error } = await this.supabase
        .from('ab_test_assignments')
        .select('*')
        .eq('user_id', userId)
        .eq('experiment_id', experimentId)
        .single()

      if (error || !assignment) {
        return null
      }

      // Cache assignment
      this.userVariants.set(`${userId}_${experimentId}`, assignment)

      return assignment
    } catch (error) {
      console.error('Error getting user variant assignment:', error)
      return null
    }
  }

  // Get experiment results with statistical analysis
  async getExperimentResults(experimentId) {
    try {
      // Get experiment details
      const { data: experiment, error } = await this.supabase
        .from('ab_test_experiments')
        .select('*')
        .eq('id', experimentId)
        .single()

      if (error || !experiment) {
        return { success: false, error: 'Experiment not found' }
      }

      // Get conversion data
      const results = await this.calculateExperimentResults(experiment)
      
      // Perform statistical analysis
      const significance = await this.calculateStatisticalSignificance(results)
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(experiment, results, significance)

      return {
        success: true,
        experiment,
        results,
        significance,
        recommendations,
        generated_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting experiment results:', error)
      return { success: false, error: 'Failed to get experiment results' }
    }
  }

  // Calculate experiment results
  async calculateExperimentResults(experiment) {
    const results = {}

    for (const variant of experiment.variants) {
      // Get total users assigned to this variant
      const { count: totalUsers } = await this.supabase
        .from('ab_test_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('experiment_id', experiment.id)
        .eq('variant_id', variant.id)

      // Get conversions for each success metric
      const variantResults = {
        variant,
        total_users: totalUsers || 0,
        metrics: {}
      }

      for (const metric of experiment.success_metrics) {
        // Get conversions for this metric
        const { data: conversions, error } = await this.supabase
          .from('ab_test_conversions')
          .select('value')
          .eq('experiment_id', experiment.id)
          .eq('variant_id', variant.id)
          .eq('metric', metric)

        if (!error && conversions) {
          const totalConversions = conversions.length
          const totalValue = conversions.reduce((sum, conv) => sum + (conv.value || 1), 0)
          const conversionRate = totalUsers > 0 ? totalConversions / totalUsers : 0

          variantResults.metrics[metric] = {
            total_conversions: totalConversions,
            total_value: totalValue,
            conversion_rate: conversionRate,
            average_value: totalConversions > 0 ? totalValue / totalConversions : 0
          }
        } else {
          variantResults.metrics[metric] = {
            total_conversions: 0,
            total_value: 0,
            conversion_rate: 0,
            average_value: 0
          }
        }
      }

      results[variant.id] = variantResults
    }

    return results
  }

  // Calculate statistical significance
  async calculateStatisticalSignificance(results) {
    const significance = {}
    const variants = Object.values(results)
    
    if (variants.length < 2) {
      return significance
    }

    // Find control variant (first one marked as control, or first variant)
    const controlVariant = variants.find(v => v.variant.is_control) || variants[0]
    
    for (const variant of variants) {
      if (variant.variant.id === controlVariant.variant.id) {
        continue // Skip control vs control comparison
      }

      significance[variant.variant.id] = {}

      for (const [metric, metricData] of Object.entries(variant.metrics)) {
        const controlData = controlVariant.metrics[metric]
        
        if (controlData && metricData) {
          const result = this.performZTest(
            controlData.total_conversions,
            controlVariant.total_users,
            metricData.total_conversions,
            variant.total_users
          )

          significance[variant.variant.id][metric] = {
            z_score: result.z_score,
            p_value: result.p_value,
            is_significant: result.p_value < 0.05,
            confidence_interval: result.confidence_interval,
            improvement: this.calculateImprovement(
              controlData.conversion_rate,
              metricData.conversion_rate
            )
          }
        }
      }
    }

    return significance
  }

  // Perform Z-test for conversion rate comparison
  performZTest(controlConversions, controlUsers, variantConversions, variantUsers) {
    const p1 = controlUsers > 0 ? controlConversions / controlUsers : 0
    const p2 = variantUsers > 0 ? variantConversions / variantUsers : 0
    
    const pooled_p = (controlConversions + variantConversions) / (controlUsers + variantUsers)
    const se = Math.sqrt(pooled_p * (1 - pooled_p) * (1/controlUsers + 1/variantUsers))
    
    const z_score = se > 0 ? (p2 - p1) / se : 0
    const p_value = this.calculatePValue(Math.abs(z_score))
    
    // Calculate 95% confidence interval for the difference
    const se_diff = Math.sqrt((p1 * (1 - p1)) / controlUsers + (p2 * (1 - p2)) / variantUsers)
    const margin_of_error = 1.96 * se_diff
    const diff = p2 - p1
    
    return {
      z_score,
      p_value,
      confidence_interval: [diff - margin_of_error, diff + margin_of_error]
    }
  }

  // Calculate p-value from z-score (simplified approximation)
  calculatePValue(z) {
    // Simplified p-value calculation using normal distribution approximation
    // In production, use a proper statistical library
    if (z < 1.96) return 0.1
    if (z < 2.58) return 0.05
    if (z < 3.29) return 0.01
    return 0.001
  }

  // Calculate percentage improvement
  calculateImprovement(controlRate, variantRate) {
    if (controlRate === 0) {
      return variantRate > 0 ? 1 : 0
    }
    return (variantRate - controlRate) / controlRate
  }

  // Generate recommendations based on results
  generateRecommendations(experiment, results, significance) {
    const recommendations = []
    const variants = Object.values(results)
    const primaryMetric = experiment.success_metrics[0]

    // Find the best performing variant for the primary metric
    const bestVariant = variants.reduce((best, current) => {
      const bestRate = best.metrics[primaryMetric]?.conversion_rate || 0
      const currentRate = current.metrics[primaryMetric]?.conversion_rate || 0
      return currentRate > bestRate ? current : best
    })

    const controlVariant = variants.find(v => v.variant.is_control) || variants[0]
    
    // Check if we have a significant winner
    const bestVariantSignificance = significance[bestVariant.variant.id]?.[primaryMetric]
    
    if (bestVariantSignificance?.is_significant && bestVariantSignificance.improvement > 0) {
      recommendations.push({
        type: 'winner',
        priority: 'high',
        title: `Implement ${bestVariant.variant.name}`,
        description: `This variant shows statistically significant improvement over the control`,
        action: `Implement the changes from ${bestVariant.variant.name} for all users`,
        expected_improvement: {
          [primaryMetric]: bestVariantSignificance.improvement
        },
        confidence: 'high'
      })
    } else if (experiment.status === 'running') {
      // Check if we need more data
      const totalSampleSize = variants.reduce((sum, v) => sum + v.total_users, 0)
      
      if (totalSampleSize < experiment.min_sample_size) {
        recommendations.push({
          type: 'continue',
          priority: 'medium',
          title: 'Continue Test - Need More Data',
          description: `Current sample size (${totalSampleSize}) is below minimum required (${experiment.min_sample_size})`,
          action: 'Continue running the experiment to reach statistical significance',
          expected_improvement: null,
          confidence: 'low'
        })
      } else {
        recommendations.push({
          type: 'inconclusive',
          priority: 'low',
          title: 'Results Inconclusive',
          description: 'No variant shows significant improvement over the control',
          action: 'Consider testing different variations or stopping the experiment',
          expected_improvement: null,
          confidence: 'low'
        })
      }
    }

    // Add Six Figure Barber methodology insights
    recommendations.push({
      type: 'methodology',
      priority: 'medium',
      title: 'Six Figure Barber Alignment',
      description: 'Ensure winning variant aligns with premium positioning principles',
      action: 'Review winning variant against Six Figure Barber methodology guidelines',
      expected_improvement: {
        revenue_per_client: 0.1, // 10% increase in revenue per client
        client_retention: 0.05 // 5% increase in retention
      },
      confidence: 'high'
    })

    return recommendations
  }

  // Update experiment results in real-time
  async updateExperimentResults(experimentId) {
    try {
      const { data: experiment, error } = await this.supabase
        .from('ab_test_experiments')
        .select('*')
        .eq('id', experimentId)
        .single()

      if (error || !experiment) {
        return
      }

      const results = await this.calculateExperimentResults(experiment)
      
      // Update experiment with current results
      await this.supabase
        .from('ab_test_experiments')
        .update({
          current_results: results,
          last_updated: new Date().toISOString()
        })
        .eq('id', experimentId)

    } catch (error) {
      console.error('Error updating experiment results:', error)
    }
  }

  // Get active experiments for a user
  async getActiveExperimentsForUser(userId) {
    try {
      const { data: experiments, error } = await this.supabase
        .from('ab_test_experiments')
        .select('*')
        .eq('status', 'running')

      if (error) {
        console.error('Error getting active experiments:', error)
        return []
      }

      const userExperiments = []

      for (const experiment of experiments || []) {
        const assignment = await this.assignUserToVariant(userId, experiment.id)
        if (assignment) {
          userExperiments.push({
            experiment,
            assignment
          })
        }
      }

      return userExperiments
    } catch (error) {
      console.error('Error getting active experiments for user:', error)
      return []
    }
  }

  // Get customization settings with A/B test overrides
  async getCustomizationWithABTests(userId, baseSettings) {
    try {
      const activeExperiments = await this.getActiveExperimentsForUser(userId)
      
      let finalSettings = { ...baseSettings }

      // Apply A/B test overrides
      for (const { experiment, assignment } of activeExperiments) {
        if (assignment.variant.settings) {
          finalSettings = {
            ...finalSettings,
            ...assignment.variant.settings
          }
        }

        // Track exposure
        await this.trackExposure(userId, experiment.id, assignment.variant_id)
      }

      return finalSettings
    } catch (error) {
      console.error('Error getting customization with A/B tests:', error)
      return baseSettings
    }
  }

  // Track user exposure to experiment
  async trackExposure(userId, experimentId, variantId) {
    try {
      // Check if exposure was already tracked today
      const today = new Date().toISOString().split('T')[0]
      const { data: existing, error } = await this.supabase
        .from('ab_test_exposures')
        .select('id')
        .eq('user_id', userId)
        .eq('experiment_id', experimentId)
        .gte('timestamp', today)
        .limit(1)

      if (!error && existing && existing.length > 0) {
        return // Already tracked today
      }

      // Track new exposure
      await this.supabase
        .from('ab_test_exposures')
        .insert({
          user_id: userId,
          experiment_id: experimentId,
          variant_id: variantId,
          timestamp: new Date().toISOString()
        })

    } catch (error) {
      console.error('Error tracking exposure:', error)
    }
  }
}

// Export singleton instance
export const abTestingFramework = new ABTestingFramework()

// Export constants for use in components
export { SUCCESS_METRICS, TEST_TYPES }

// Utility functions for A/B testing
export const ABTestUtils = {
  // Check if user is in experiment
  isUserInExperiment: async (userId, experimentId) => {
    const assignment = await abTestingFramework.getUserVariantAssignment(userId, experimentId)
    return !!assignment
  },

  // Get user's variant for experiment
  getUserVariant: async (userId, experimentId) => {
    const assignment = await abTestingFramework.getUserVariantAssignment(userId, experimentId)
    return assignment?.variant || null
  },

  // Track multiple conversion events at once
  trackMultipleConversions: async (userId, events) => {
    const promises = events.map(event => 
      abTestingFramework.trackConversion(
        userId, 
        event.experimentId, 
        event.metric, 
        event.value, 
        event.metadata
      )
    )
    return Promise.all(promises)
  },

  // Calculate conversion lift between variants
  calculateConversionLift: (controlRate, variantRate) => {
    if (controlRate === 0) {
      return variantRate > 0 ? Infinity : 0
    }
    return ((variantRate - controlRate) / controlRate) * 100
  },

  // Format statistical results for display
  formatStatisticalResults: (significance) => {
    if (!significance) return null

    return {
      isSignificant: significance.is_significant,
      pValue: significance.p_value.toFixed(4),
      zScore: significance.z_score.toFixed(2),
      improvement: `${(significance.improvement * 100).toFixed(1)}%`,
      confidenceInterval: `[${(significance.confidence_interval[0] * 100).toFixed(1)}%, ${(significance.confidence_interval[1] * 100).toFixed(1)}%]`
    }
  }
}