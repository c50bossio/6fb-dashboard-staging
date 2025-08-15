import { useEffect, useState, useCallback } from 'react'
import { posthog } from '@/lib/posthog'
import { edgeConfig } from '@/lib/edgeConfig'

export function useFeatureFlag(flagName, options = {}) {
  const [isEnabled, setIsEnabled] = useState(options.defaultValue || false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const source = options.source || 'auto' // 'posthog', 'edge', or 'auto'

  const checkFlag = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      let enabled = false
      
      if (source === 'posthog' || source === 'auto') {
        if (posthog && typeof window !== 'undefined') {
          await posthog.ready()
          const posthogValue = posthog.isFeatureEnabled(flagName)
          if (posthogValue !== undefined) {
            enabled = posthogValue
          } else if (source === 'posthog') {
            enabled = options.defaultValue || false
          }
        }
      }
      
      if ((source === 'edge' || source === 'auto') && !enabled) {
        const edgeEnabled = await edgeConfig.config.isFeatureEnabled(flagName)
        if (edgeEnabled !== undefined) {
          enabled = edgeEnabled
        }
      }
      
      setIsEnabled(enabled)
      
      if (options.onChange && enabled !== isEnabled) {
        options.onChange(enabled)
      }
      
      if (enabled && options.trackExposure !== false) {
        if (window.analytics) {
          window.analytics.track('feature_flag_exposed', {
            flag_name: flagName,
            flag_value: enabled,
            source: source,
          })
        }
      }
    } catch (err) {
      console.error(`Error checking feature flag ${flagName}:`, err)
      setError(err)
      setIsEnabled(options.defaultValue || false)
    } finally {
      setLoading(false)
    }
  }, [flagName, source, options.defaultValue, options.onChange, options.trackExposure])

  useEffect(() => {
    checkFlag()
    
    let unsubscribePostHog
    
    if ((source === 'posthog' || source === 'auto') && posthog) {
      unsubscribePostHog = posthog.onFeatureFlags((flags) => {
        if (flagName in flags) {
          const newValue = flags[flagName]
          if (newValue !== isEnabled) {
            setIsEnabled(newValue)
            if (options.onChange) {
              options.onChange(newValue)
            }
          }
        }
      })
    }
    
    let pollInterval
    if ((source === 'edge' || source === 'auto') && options.pollInterval) {
      pollInterval = setInterval(checkFlag, options.pollInterval)
    }
    
    return () => {
      if (unsubscribePostHog) unsubscribePostHog()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [flagName, source, checkFlag])

  const refresh = useCallback(() => {
    return checkFlag()
  }, [checkFlag])

  return {
    isEnabled,
    loading,
    error,
    refresh,
    source: loading ? null : (source === 'auto' ? 'determined' : source),
  }
}

export function useFeatureFlags(flagNames, options = {}) {
  const [flags, setFlags] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkFlags = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const results = {}
        
        await Promise.all(
          flagNames.map(async (flagName) => {
            try {
              if (posthog && typeof window !== 'undefined') {
                await posthog.ready()
                const value = posthog.isFeatureEnabled(flagName)
                if (value !== undefined) {
                  results[flagName] = value
                  return
                }
              }
              
              const edgeValue = await edgeConfig.config.isFeatureEnabled(flagName)
              results[flagName] = edgeValue || false
            } catch (err) {
              console.error(`Error checking flag ${flagName}:`, err)
              results[flagName] = false
            }
          })
        )
        
        setFlags(results)
      } catch (err) {
        console.error('Error checking feature flags:', err)
        setError(err)
        
        const errorResults = {}
        flagNames.forEach(name => {
          errorResults[name] = false
        })
        setFlags(errorResults)
      } finally {
        setLoading(false)
      }
    }
    
    checkFlags()
  }, [flagNames.join(',')]) // Re-run if flag names change
  
  return { flags, loading, error }
}

export function useExperiment(experimentName, options = {}) {
  const [variant, setVariant] = useState(options.defaultVariant || 'control')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const checkExperiment = async () => {
      setLoading(true)
      setError(null)
      
      try {
        let experimentVariant = 'control'
        
        if (posthog && typeof window !== 'undefined') {
          await posthog.ready()
          const posthogVariant = posthog.getFeatureFlag(experimentName)
          if (posthogVariant) {
            experimentVariant = posthogVariant
          }
        } else {
          const userId = options.userId || 'anonymous'
          experimentVariant = await edgeConfig.utils.getExperimentVariant(experimentName, userId)
        }
        
        setVariant(experimentVariant)
        
        if (options.trackExposure !== false && window.analytics) {
          window.analytics.experiments.trackExperimentViewed(experimentName, experimentVariant)
        }
        
        if (options.onChange) {
          options.onChange(experimentVariant)
        }
      } catch (err) {
        console.error(`Error checking experiment ${experimentName}:`, err)
        setError(err)
        setVariant(options.defaultVariant || 'control')
      } finally {
        setLoading(false)
      }
    }
    
    checkExperiment()
  }, [experimentName, options.userId])
  
  const trackConversion = useCallback((value) => {
    if (window.analytics) {
      window.analytics.experiments.trackExperimentConversion(experimentName, variant, value)
    }
  }, [experimentName, variant])
  
  return {
    variant,
    loading,
    error,
    trackConversion,
    isControl: variant === 'control',
    isVariant: (variantName) => variant === variantName,
  }
}