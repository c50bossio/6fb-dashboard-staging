'use client'

import { useState, useEffect, useContext, createContext } from 'react'

import { edgeConfig } from '../lib/edgeConfig'

// Create context for feature flags
const FeatureFlagContext = createContext({})

// Feature Flag Provider Component
export function EdgeConfigProvider({ children }) {
  const [featureFlags, setFeatureFlags] = useState({})
  const [aiConfig, setAiConfig] = useState({})
  const [rateLimits, setRateLimits] = useState({})
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        setLoading(true)
        
        // Load all configurations in parallel
        const [flags, ai, limits, maintenance] = await Promise.all([
          edgeConfig.config.getFeatureFlags(),
          edgeConfig.config.getAIConfig(),
          edgeConfig.config.getRateLimits(),
          edgeConfig.config.getMaintenanceMode()
        ])

        setFeatureFlags(flags)
        setAiConfig(ai)
        setRateLimits(limits)
        setIsMaintenanceMode(maintenance.enabled)
        setError(null)
        
        console.log('Edge Config loaded:', { flags, ai, limits, maintenance })
      } catch (err) {
        console.error('Edge Config loading error:', err)
        setError(err.message)
        
        // Set fallback values
        setFeatureFlags({
          aiInsightsV2: false,
          advancedCalendar: false,
          realTimeChat: true,
          premiumAnalytics: false,
          newOnboarding: false,
        })
        setAiConfig({
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000,
        })
        setRateLimits({
          api: { requests: 100, window: '1m' },
          ai: { requests: 10, window: '1m' },
        })
      } finally {
        setLoading(false)
      }
    }

    loadConfiguration()
  }, [])

  const value = {
    featureFlags,
    aiConfig,
    rateLimits,
    isMaintenanceMode,
    loading,
    error,
    
    // Helper functions
    isFeatureEnabled: (featureName) => {
      return featureFlags[featureName] || false
    },
    
    getFeatureFlag: (featureName, defaultValue = false) => {
      return featureFlags[featureName] ?? defaultValue
    },
    
    refreshConfig: async () => {
      // Refresh configuration from Edge Config
      try {
        const flags = await edgeConfig.config.getFeatureFlags()
        setFeatureFlags(flags)
        return flags
      } catch (err) {
        console.error('Failed to refresh config:', err)
        throw err
      }
    }
  }

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

// Hook to use feature flags
export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext)
  if (!context) {
    throw new Error('useFeatureFlags must be used within EdgeConfigProvider')
  }
  return context
}

// Individual Feature Flag Component
export function FeatureFlag({ 
  flag, 
  children, 
  fallback = null, 
  enabledComponent = null,
  disabledComponent = null 
}) {
  const { isFeatureEnabled, loading, error } = useFeatureFlags()

  // Show loading state
  if (loading) {
    return fallback || <div className="animate-pulse bg-gray-200 h-4 w-24 rounded" />
  }

  // Show error state
  if (error) {
    console.warn(`Feature flag "${flag}" error:`, error)
    return fallback || null
  }

  const isEnabled = isFeatureEnabled(flag)

  // Return enabled component if provided
  if (isEnabled && enabledComponent) {
    return enabledComponent
  }

  // Return disabled component if provided
  if (!isEnabled && disabledComponent) {
    return disabledComponent
  }

  // Default behavior - render children if enabled
  return isEnabled ? children : (fallback || null)
}

// Conditional Rendering Components
export function WhenFeatureEnabled({ flag, children, fallback = null }) {
  return (
    <FeatureFlag flag={flag} fallback={fallback}>
      {children}
    </FeatureFlag>
  )
}

export function WhenFeatureDisabled({ flag, children, fallback = null }) {
  const { isFeatureEnabled, loading } = useFeatureFlags()
  
  if (loading) {
    return fallback
  }
  
  return !isFeatureEnabled(flag) ? children : (fallback || null)
}

// AI Configuration Component
export function AIConfigProvider({ children }) {
  const { aiConfig, loading } = useFeatureFlags()
  
  if (loading) {
    return children // Don't block rendering while loading
  }
  
  // Make AI config available to child components
  return (
    <div data-ai-provider={aiConfig.provider} data-ai-model={aiConfig.model}>
      {children}
    </div>
  )
}

// Maintenance Mode Component
export function MaintenanceModeGuard({ children }) {
  const { isMaintenanceMode, loading } = useFeatureFlags()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <span className="text-2xl">🔧</span>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Maintenance Mode
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                We're currently performing maintenance to improve your experience.
              </p>
              <p className="mt-4 text-center text-sm text-gray-600">
                Please check back in a few minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return children
}

// Rate Limit Display Component
export function RateLimitInfo({ endpoint = 'api' }) {
  const { rateLimits, loading } = useFeatureFlags()
  
  if (loading || !rateLimits[endpoint]) {
    return null
  }
  
  const limit = rateLimits[endpoint]
  
  return (
    <div className="text-xs text-gray-500 mt-1">
      Rate limit: {limit.requests} requests per {limit.window}
    </div>
  )
}

// Feature Flag Debug Panel (only in development)
export function FeatureFlagDebugPanel() {
  const { featureFlags, aiConfig, rateLimits, error, loading } = useFeatureFlags()
  
  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }
  
  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-gray-900 text-white p-4 rounded-lg shadow-lg text-xs z-50">
      <div className="font-semibold mb-2">🚩 Feature Flags Debug</div>
      
      {loading && <div>Loading configuration...</div>}
      {error && <div className="text-red-400">Error: {error}</div>}
      
      <div className="space-y-1">
        <div className="font-medium">Feature Flags:</div>
        {Object.entries(featureFlags).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span>{key}:</span>
            <span className={value ? 'text-green-400' : 'text-red-400'}>
              {value ? 'ON' : 'OFF'}
            </span>
          </div>
        ))}
        
        <div className="font-medium mt-2">AI Config:</div>
        <div>Provider: {aiConfig.provider}</div>
        <div>Model: {aiConfig.model}</div>
      </div>
    </div>
  )
}

// Export default
export default {
  EdgeConfigProvider,
  useFeatureFlags,
  FeatureFlag,
  WhenFeatureEnabled,
  WhenFeatureDisabled,
  AIConfigProvider,
  MaintenanceModeGuard,
  RateLimitInfo,
  FeatureFlagDebugPanel
}