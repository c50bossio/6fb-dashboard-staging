import { get, getAll, has } from '@vercel/edge-config'

// Edge Config client for dynamic configuration
export const edgeConfig = {
  // Get single value with fallback
  getValue: async (key, fallback = null) => {
    try {
      const value = await get(key)
      return value !== undefined ? value : fallback
    } catch (error) {
      console.error(`Edge Config error for key ${key}:`, error)
      return fallback
    }
  },

  // Get all configuration
  getAll: async () => {
    try {
      return await getAll() || {}
    } catch (error) {
      console.error('Edge Config error getting all:', error)
      return {}
    }
  },

  // Check if key exists
  hasKey: async (key) => {
    try {
      return await has(key)
    } catch (error) {
      console.error(`Edge Config error checking key ${key}:`, error)
      return false
    }
  },

  // Business-specific configuration getters
  config: {
    // Maintenance mode
    getMaintenanceMode: async () => {
      const config = await edgeConfig.getValue('maintenanceMode', {
        enabled: false,
        message: 'We are currently performing maintenance. Please check back soon.',
        allowedIPs: [],
      })
      return config
    },

    // Rate limiting configuration
    getRateLimits: async () => {
      return await edgeConfig.getValue('rateLimits', {
        api: { requests: 100, window: '1m' },
        ai: { requests: 10, window: '1m' },
        booking: { requests: 50, window: '1m' },
        auth: { requests: 5, window: '1m' },
      })
    },

    // Feature flags
    getFeatureFlags: async () => {
      return await edgeConfig.getValue('featureFlags', {
        aiInsightsV2: false,
        advancedCalendar: false,
        realTimeChat: false,
        premiumAnalytics: false,
        newOnboarding: false,
      })
    },

    // Check specific feature flag
    isFeatureEnabled: async (featureName) => {
      const flags = await edgeConfig.config.getFeatureFlags()
      return flags[featureName] || false
    },

    // AI configuration
    getAIConfig: async () => {
      return await edgeConfig.getValue('aiConfig', {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        timeout: 30000,
        retries: 3,
        systemPrompt: 'You are an expert AI business coach for barbershops.',
      })
    },

    // Pricing tiers
    getPricingTiers: async () => {
      return await edgeConfig.getValue('pricingTiers', {
        starter: {
          name: 'Starter',
          price: 99,
          interval: 'month',
          features: ['basic_booking', 'calendar', 'payments'],
        },
        professional: {
          name: 'Professional',
          price: 299,
          interval: 'month',
          features: ['basic_booking', 'calendar', 'payments', 'ai_insights', 'analytics'],
        },
        enterprise: {
          name: 'Enterprise',
          price: null,
          interval: 'month',
          features: ['all'],
        },
      })
    },

    // Notification settings
    getNotificationConfig: async () => {
      return await edgeConfig.getValue('notifications', {
        channels: {
          email: { enabled: true, provider: 'sendgrid' },
          sms: { enabled: true, provider: 'twilio' },
          push: { enabled: true, provider: 'novu' },
          inApp: { enabled: true, provider: 'novu' },
        },
        templates: {
          bookingConfirmation: { email: true, sms: true, push: false },
          bookingReminder: { email: true, sms: true, push: true },
          aiInsight: { email: false, sms: false, push: true, inApp: true },
        },
      })
    },

    // Security settings
    getSecurityConfig: async () => {
      return await edgeConfig.getValue('security', {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
        },
        mfa: {
          enabled: true,
          methods: ['totp', 'sms'],
        },
        sessionTimeout: 86400, // 24 hours
        maxLoginAttempts: 5,
        lockoutDuration: 900, // 15 minutes
      })
    },

    // A/B test configurations
    getExperiments: async () => {
      return await edgeConfig.getValue('experiments', {
        newDashboardDesign: {
          enabled: true,
          variants: ['control', 'redesign'],
          traffic: { control: 50, redesign: 50 },
        },
        pricingPageOptimization: {
          enabled: true,
          variants: ['original', 'simplified', 'detailed'],
          traffic: { original: 33, simplified: 33, detailed: 34 },
        },
      })
    },

    // API endpoints (for easy switching between environments)
    getAPIEndpoints: async () => {
      return await edgeConfig.getValue('apiEndpoints', {
        ai: process.env.NEXT_PUBLIC_API_URL + '/api/ai',
        booking: process.env.NEXT_PUBLIC_API_URL + '/api/bookings',
        analytics: process.env.NEXT_PUBLIC_API_URL + '/api/analytics',
        webhooks: process.env.NEXT_PUBLIC_API_URL + '/api/webhooks',
      })
    },
  },

  // Utility functions
  utils: {
    // Get multiple values at once
    getMultiple: async (keys) => {
      const results = {}
      for (const key of keys) {
        results[key] = await edgeConfig.getValue(key)
      }
      return results
    },

    // Check if in maintenance mode for specific IP
    isMaintenanceActive: async (clientIP) => {
      const maintenance = await edgeConfig.config.getMaintenanceMode()
      if (!maintenance.enabled) return false
      
      // Check if IP is in allowed list
      if (maintenance.allowedIPs && maintenance.allowedIPs.includes(clientIP)) {
        return false
      }
      
      return true
    },

    // Get variant for A/B test
    getExperimentVariant: async (experimentName, userId) => {
      const experiments = await edgeConfig.config.getExperiments()
      const experiment = experiments[experimentName]
      
      if (!experiment || !experiment.enabled) return 'control'
      
      // Simple hash-based assignment (in production, use a proper A/B testing service)
      const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const bucket = hash % 100
      
      let accumulated = 0
      for (const [variant, percentage] of Object.entries(experiment.traffic)) {
        accumulated += percentage
        if (bucket < accumulated) return variant
      }
      
      return 'control'
    },
  },
}