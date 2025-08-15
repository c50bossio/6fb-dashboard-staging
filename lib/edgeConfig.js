import { get, getAll, has } from '@vercel/edge-config'

export const edgeConfig = {
  getValue: async (key, fallback = null) => {
    try {
      const value = await get(key)
      return value !== undefined ? value : fallback
    } catch (error) {
      console.error(`Edge Config error for key ${key}:`, error)
      return fallback
    }
  },

  getAll: async () => {
    try {
      return await getAll() || {}
    } catch (error) {
      console.error('Edge Config error getting all:', error)
      return {}
    }
  },

  hasKey: async (key) => {
    try {
      return await has(key)
    } catch (error) {
      console.error(`Edge Config error checking key ${key}:`, error)
      return false
    }
  },

  config: {
    getMaintenanceMode: async () => {
      const config = await edgeConfig.getValue('maintenanceMode', {
        enabled: false,
        message: 'We are currently performing maintenance. Please check back soon.',
        allowedIPs: [],
      })
      return config
    },

    getRateLimits: async () => {
      return await edgeConfig.getValue('rateLimits', {
        api: { requests: 100, window: '1m' },
        ai: { requests: 10, window: '1m' },
        booking: { requests: 50, window: '1m' },
        auth: { requests: 5, window: '1m' },
      })
    },

    getFeatureFlags: async () => {
      return await edgeConfig.getValue('featureFlags', {
        aiInsightsV2: false,
        advancedCalendar: false,
        realTimeChat: false,
        premiumAnalytics: false,
        newOnboarding: false,
      })
    },

    isFeatureEnabled: async (featureName) => {
      const flags = await edgeConfig.config.getFeatureFlags()
      return flags[featureName] || false
    },

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

    getAPIEndpoints: async () => {
      return await edgeConfig.getValue('apiEndpoints', {
        ai: process.env.NEXT_PUBLIC_API_URL + '/api/ai',
        booking: process.env.NEXT_PUBLIC_API_URL + '/api/bookings',
        analytics: process.env.NEXT_PUBLIC_API_URL + '/api/analytics',
        webhooks: process.env.NEXT_PUBLIC_API_URL + '/api/webhooks',
      })
    },
  },

  utils: {
    getMultiple: async (keys) => {
      const results = {}
      for (const key of keys) {
        results[key] = await edgeConfig.getValue(key)
      }
      return results
    },

    isMaintenanceActive: async (clientIP) => {
      const maintenance = await edgeConfig.config.getMaintenanceMode()
      if (!maintenance.enabled) return false
      
      if (maintenance.allowedIPs && maintenance.allowedIPs.includes(clientIP)) {
        return false
      }
      
      return true
    },

    getExperimentVariant: async (experimentName, userId) => {
      const experiments = await edgeConfig.config.getExperiments()
      const experiment = experiments[experimentName]
      
      if (!experiment || !experiment.enabled) return 'control'
      
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