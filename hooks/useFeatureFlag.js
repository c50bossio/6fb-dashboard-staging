'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Initialize Supabase client
const supabase = createClient()

// Cache and error boundary state
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const flagCache = new Map()
const subscriptionCache = new Map()

/**
 * Feature Flag Hook with comprehensive capabilities:
 * - Real-time updates via Supabase realtime
 * - User segmentation and targeting
 * - A/B testing with consistent bucketing
 * - Fallback mechanisms for production safety
 * - Analytics integration
 * - Admin override capabilities
 */
export function useFeatureFlag(flagName, options = {}) {
  const {
    defaultValue = false,
    userId = null,
    userAttributes = {},
    enableRealtime = true,
    enableAnalytics = true,
    fallbackBehavior = 'default' // 'default', 'disable', 'enable'
  } = options

  const { user } = useAuth()
  const [state, setState] = useState({
    isEnabled: defaultValue,
    loading: true,
    error: null,
    variant: 'control',
    metadata: {}
  })

  const currentUserId = userId || user?.id
  const mountedRef = useRef(true)
  const analyticsReported = useRef(false)

  // Error boundary wrapper
  const safeSetState = useCallback((newState) => {
    if (mountedRef.current) {
      setState(newState)
    }
  }, [])

  // Enhanced error logging
  const logError = useCallback((error, context = 'unknown') => {
    console.error(`[FeatureFlag:${flagName}] Error in ${context}:`, {
      error: error.message,
      stack: error.stack,
      flagName,
      userId: currentUserId,
      timestamp: new Date().toISOString()
    })

    // Send to monitoring service if available
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          feature_flag: flagName,
          context,
          user_id: currentUserId
        }
      })
    }
  }, [flagName, currentUserId])

  // Analytics tracking
  const trackFlagUsage = useCallback(async (enabled, metadata = {}) => {
    if (!enableAnalytics || analyticsReported.current) return

    try {
      analyticsReported.current = true
      
      // Track in Supabase analytics table
      await supabase.from('feature_flag_analytics').insert({
        flag_name: flagName,
        user_id: currentUserId,
        is_enabled: enabled,
        user_attributes: userAttributes,
        metadata,
        timestamp: new Date().toISOString(),
        session_id: getSessionId()
      })

      // Track with PostHog if available
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.capture('feature_flag_evaluated', {
          flag_name: flagName,
          enabled,
          metadata,
          user_id: currentUserId
        })
      }
    } catch (error) {
      // Silent fail for analytics to not break main functionality
      console.warn(`[FeatureFlag:${flagName}] Analytics tracking failed:`, error)
    }
  }, [flagName, currentUserId, userAttributes, enableAnalytics])

  // User bucketing for A/B tests (consistent across sessions)
  const getUserBucket = useCallback((userId, flagName, variants = ['control', 'variant']) => {
    if (!userId) return 'control'

    const hash = `${userId}-${flagName}`.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)

    const index = Math.abs(hash) % variants.length
    return variants[index]
  }, [])

  // Evaluate targeting rules
  const evaluateTargeting = useCallback((rule, userProps) => {
    if (!rule?.conditions || !Array.isArray(rule.conditions)) return false

    return rule.conditions.every(condition => {
      const userValue = userProps[condition.property]

      switch (condition.operator) {
        case 'equals':
          return userValue === condition.value
        case 'not_equals':
          return userValue !== condition.value
        case 'contains':
          return userValue?.includes?.(condition.value)
        case 'not_contains':
          return !userValue?.includes?.(condition.value)
        case 'greater_than':
          return Number(userValue) > Number(condition.value)
        case 'less_than':
          return Number(userValue) < Number(condition.value)
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(userValue)
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(userValue)
        case 'regex':
          try {
            const regex = new RegExp(condition.value)
            return regex.test(String(userValue))
          } catch {
            return false
          }
        case 'percentage':
          const bucket = getUserBucket(userProps.user_id || currentUserId, flagName, 
            Array.from({ length: 100 }, (_, i) => i))
          return Number(bucket) < Number(condition.value)
        default:
          return false
      }
    })
  }, [getUserBucket, flagName, currentUserId])

  // Fetch flag configuration with caching
  const fetchFlagConfig = useCallback(async () => {
    const cacheKey = `${flagName}-${currentUserId || 'anonymous'}`
    const cached = flagCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    try {
      // Fetch base flag configuration
      const { data: flagData, error: flagError } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('name', flagName)
        .single()

      if (flagError && flagError.code !== 'PGRST116') { // Not found is OK
        throw flagError
      }

      const result = {
        enabled: flagData?.enabled ?? defaultValue,
        metadata: flagData?.metadata || {},
        variants: flagData?.variants || ['control', 'variant'],
        targeting_rules: []
      }

      // Fetch targeting rules for this flag
      if (flagData?.id) {
        const { data: rulesData, error: rulesError } = await supabase
          .from('feature_flag_targeting_rules')
          .select('*')
          .eq('flag_id', flagData.id)
          .eq('active', true)
          .order('priority', { ascending: false })

        if (rulesError) {
          logError(rulesError, 'fetch_targeting_rules')
        } else {
          result.targeting_rules = rulesData || []
        }
      }

      // Cache the result
      flagCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })

      return result
    } catch (error) {
      logError(error, 'fetch_flag_config')
      throw error
    }
  }, [flagName, currentUserId, defaultValue, logError])

  // Apply fallback behavior on error
  const applyFallback = useCallback((error) => {
    let fallbackEnabled = defaultValue

    switch (fallbackBehavior) {
      case 'disable':
        fallbackEnabled = false
        break
      case 'enable':
        fallbackEnabled = true
        break
      default:
        fallbackEnabled = defaultValue
    }

    safeSetState({
      isEnabled: fallbackEnabled,
      loading: false,
      error: error.message,
      variant: 'control',
      metadata: { fallback: true, fallbackBehavior }
    })

    trackFlagUsage(fallbackEnabled, { fallback: true, error: error.message })
  }, [defaultValue, fallbackBehavior, safeSetState, trackFlagUsage])

  // Main evaluation function
  const evaluateFlag = useCallback(async () => {
    try {
      safeSetState(prev => ({ ...prev, loading: true, error: null }))

      const flagConfig = await fetchFlagConfig()
      
      const userProps = {
        user_id: currentUserId,
        email: user?.email,
        created_at: user?.created_at,
        ...userAttributes
      }

      // Start with base flag state
      let enabled = flagConfig.enabled
      let variant = 'control'
      let metadata = { ...flagConfig.metadata }

      // Apply targeting rules in priority order
      for (const rule of flagConfig.targeting_rules) {
        if (evaluateTargeting(rule, userProps)) {
          enabled = rule.enabled
          metadata = { ...metadata, ...rule.metadata, applied_rule: rule.id }
          
          // Handle A/B test variants
          if (rule.ab_test_config && currentUserId) {
            const variants = rule.ab_test_config.variants || flagConfig.variants
            variant = getUserBucket(currentUserId, `${flagName}-${rule.id}`, variants)
            
            // Override enabled state based on variant config
            if (rule.ab_test_config.variant_overrides?.[variant] !== undefined) {
              enabled = rule.ab_test_config.variant_overrides[variant]
            }
          }
          
          break // Use first matching rule
        }
      }

      // For non-targeted users, still apply A/B testing if configured
      if (!metadata.applied_rule && flagConfig.metadata?.ab_test_enabled && currentUserId) {
        variant = getUserBucket(currentUserId, flagName, flagConfig.variants)
      }

      const finalState = {
        isEnabled: enabled,
        loading: false,
        error: null,
        variant,
        metadata
      }

      safeSetState(finalState)
      trackFlagUsage(enabled, metadata)

    } catch (error) {
      applyFallback(error)
    }
  }, [
    fetchFlagConfig, 
    currentUserId, 
    user, 
    userAttributes, 
    evaluateTargeting, 
    getUserBucket, 
    flagName,
    safeSetState, 
    trackFlagUsage, 
    applyFallback
  ])

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealtime) return

    const subscriptionKey = `${flagName}-realtime`
    
    if (subscriptionCache.has(subscriptionKey)) {
      return () => subscriptionCache.get(subscriptionKey)?.unsubscribe()
    }

    const channel = supabase
      .channel(`feature-flags-${flagName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags',
          filter: `name=eq.${flagName}`
        },
        () => {
          // Clear cache and re-evaluate
          const cacheKey = `${flagName}-${currentUserId || 'anonymous'}`
          flagCache.delete(cacheKey)
          evaluateFlag()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flag_targeting_rules'
        },
        () => {
          // Clear cache and re-evaluate for targeting rule changes
          const cacheKey = `${flagName}-${currentUserId || 'anonymous'}`
          flagCache.delete(cacheKey)
          evaluateFlag()
        }
      )
      .subscribe()

    subscriptionCache.set(subscriptionKey, channel)

    return () => {
      channel.unsubscribe()
      subscriptionCache.delete(subscriptionKey)
    }
  }, [flagName, currentUserId, enableRealtime, evaluateFlag])

  // Initial evaluation
  useEffect(() => {
    evaluateFlag()
    
    return () => {
      mountedRef.current = false
      analyticsReported.current = false
    }
  }, [evaluateFlag])

  // Public API
  const refresh = useCallback(() => {
    const cacheKey = `${flagName}-${currentUserId || 'anonymous'}`
    flagCache.delete(cacheKey)
    evaluateFlag()
  }, [flagName, currentUserId, evaluateFlag])

  return {
    isEnabled: state.isEnabled,
    loading: state.loading,
    error: state.error,
    variant: state.variant,
    metadata: state.metadata,
    refresh
  }
}

/**
 * Hook for managing multiple feature flags efficiently
 */
export function useFeatureFlags(flagNames = [], options = {}) {
  const [flags, setFlags] = useState({})
  const [loading, setLoading] = useState(true)

  // Create individual flag hooks
  const flagResults = {}
  flagNames.forEach(flagName => {
    flagResults[flagName] = useFeatureFlag(flagName, options)
  })

  useEffect(() => {
    const allFlags = {}
    let anyLoading = false

    flagNames.forEach(flagName => {
      const result = flagResults[flagName]
      allFlags[flagName] = result.isEnabled
      if (result.loading) anyLoading = true
    })

    setFlags(allFlags)
    setLoading(anyLoading)
  }, [flagNames, flagResults])

  return { flags, loading }
}

/**
 * Simple A/B testing hook for controlled experiments
 */
export function useABTest(experimentName, variants = ['control', 'variant'], options = {}) {
  const { user } = useAuth()
  const { isEnabled, variant, loading, metadata } = useFeatureFlag(`ab-test-${experimentName}`, {
    defaultValue: true,
    ...options
  })

  const finalVariant = isEnabled ? variant : 'control'

  return {
    variant: finalVariant,
    isEnabled,
    loading,
    metadata
  }
}

/**
 * Utility function to get session ID for analytics
 */
function getSessionId() {
  if (typeof window === 'undefined') return null
  
  let sessionId = window.sessionStorage?.getItem('feature-flag-session-id')
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    window.sessionStorage?.setItem('feature-flag-session-id', sessionId)
  }
  
  return sessionId
}

/**
 * Admin utilities for feature flag management
 */
export const FeatureFlagAdmin = {
  async createFlag(flagData) {
    const { data, error } = await supabase
      .from('feature_flags')
      .insert(flagData)
      .select()
      .single()

    if (error) throw error
    
    // Clear all caches
    flagCache.clear()
    
    return data
  },

  async updateFlag(flagName, updates) {
    const { data, error } = await supabase
      .from('feature_flags')
      .update(updates)
      .eq('name', flagName)
      .select()
      .single()

    if (error) throw error
    
    // Clear all caches
    flagCache.clear()
    
    return data
  },

  async deleteFlag(flagName) {
    const { error } = await supabase
      .from('feature_flags')
      .delete()
      .eq('name', flagName)

    if (error) throw error
    
    // Clear all caches
    flagCache.clear()
  },

  async addTargetingRule(flagName, ruleData) {
    // First get the flag ID
    const { data: flag, error: flagError } = await supabase
      .from('feature_flags')
      .select('id')
      .eq('name', flagName)
      .single()

    if (flagError) throw flagError

    const { data, error } = await supabase
      .from('feature_flag_targeting_rules')
      .insert({
        ...ruleData,
        flag_id: flag.id
      })
      .select()
      .single()

    if (error) throw error
    
    // Clear all caches
    flagCache.clear()
    
    return data
  },

  async getAnalytics(flagName, startDate, endDate) {
    const { data, error } = await supabase
      .from('feature_flag_analytics')
      .select('*')
      .eq('flag_name', flagName)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false })

    if (error) throw error
    
    return data
  },

  clearCache() {
    flagCache.clear()
    subscriptionCache.forEach(channel => channel.unsubscribe())
    subscriptionCache.clear()
  }
}

// Pre-defined flags for the 6FB system
export const FEATURE_FLAGS = {
  ENHANCED_BOOKING_FLOW: 'enhanced-booking-flow',
  MOBILE_BOOKING_OPTIMIZATION: 'mobile-booking-optimization', 
  REALTIME_AVAILABILITY: 'realtime-availability',
  BOOKING_ADDONS: 'booking-addons',
  AI_SMART_SCHEDULING: 'ai-smart-scheduling',
  ADVANCED_ANALYTICS: 'advanced-analytics',
  VOICE_BOOKING: 'voice-booking',
  VIDEO_CONSULTATIONS: 'video-consultations',
  LOYALTY_PROGRAM: 'loyalty-program',
  MULTI_LOCATION_BOOKING: 'multi-location-booking'
}