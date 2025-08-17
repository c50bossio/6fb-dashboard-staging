import { createClient } from '@/lib/supabase/client'

// Generate or retrieve session ID
const getSessionId = () => {
  if (typeof window === 'undefined') return null
  
  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

// Queue for failed events (stored in localStorage for persistence)
const getFailedEventsQueue = () => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('analytics_failed_events') || '[]')
  } catch {
    return []
  }
}

const saveFailedEventsQueue = (queue) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('analytics_failed_events', JSON.stringify(queue))
}

// Main Analytics class
class InternalAnalytics {
  constructor() {
    this.supabase = null
    this.userId = null
    this.sessionId = null
    this.startTimes = new Map() // Track start times for duration calculations
    
    // Initialize on client side
    if (typeof window !== 'undefined') {
      this.init()
    }
  }

  async init() {
    this.supabase = createClient()
    this.sessionId = getSessionId()
    
    // Get current user
    const { data: { user } } = await this.supabase.auth.getUser()
    if (user) {
      this.userId = user.id
    }
    
    // Retry failed events
    this.retryFailedEvents()
    
    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this.userId = session.user.id
      } else {
        this.userId = null
      }
    })
  }

  // Core tracking function
  async track(eventName, eventData = {}) {
    if (!this.supabase || typeof window === 'undefined') return

    const event = {
      user_id: this.userId,
      session_id: this.sessionId,
      event_name: eventName,
      event_properties: {
        ...eventData,
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        page_url: window.location.href
      },
      user_properties: {
        user_id: this.userId,
        session_id: this.sessionId
      },
      ip_address: null, // Will be set server-side if needed
      user_agent: navigator.userAgent
    }

    try {
      const { error } = await this.supabase
        .from('analytics_events')
        .insert(event)

      if (error) {
        console.error('Analytics error:', error)
        this.queueFailedEvent(event)
      }
    } catch (err) {
      console.error('Analytics exception:', err)
      this.queueFailedEvent(event)
    }
  }

  // Queue failed events for retry
  queueFailedEvent(event) {
    const queue = getFailedEventsQueue()
    queue.push({
      ...event,
      retry_count: 0,
      queued_at: new Date().toISOString()
    })
    saveFailedEventsQueue(queue)
  }

  // Retry failed events
  async retryFailedEvents() {
    const queue = getFailedEventsQueue()
    if (queue.length === 0) return

    const remainingQueue = []
    
    for (const event of queue) {
      if (event.retry_count >= 3) {
        // Give up after 3 retries
        continue
      }

      try {
        const { error } = await this.supabase
          .from('analytics_events')
          .insert({
            user_id: event.user_id,
            session_id: event.session_id,
            event_name: event.event_name,
            event_properties: event.event_properties,
            user_properties: event.user_properties,
            user_agent: event.user_agent
          })

        if (error) {
          event.retry_count++
          remainingQueue.push(event)
        }
      } catch {
        event.retry_count++
        remainingQueue.push(event)
      }
    }

    saveFailedEventsQueue(remainingQueue)
  }

  // Start timing for duration tracking
  startTimer(key) {
    this.startTimes.set(key, Date.now())
  }

  // Get elapsed time in seconds
  getElapsedTime(key) {
    const startTime = this.startTimes.get(key)
    if (!startTime) return 0
    return Math.floor((Date.now() - startTime) / 1000)
  }

  // Clear timer
  clearTimer(key) {
    this.startTimes.delete(key)
  }

  // Onboarding-specific tracking methods
  onboarding = {
    started: (role, businessType) => {
      this.startTimer('onboarding_total')
      this.startTimer('current_step')
      return this.track('onboarding_started', { 
        role, 
        business_type: businessType,
        referrer: document.referrer,
        utm_source: new URLSearchParams(window.location.search).get('utm_source'),
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign')
      })
    },

    stepViewed: (stepName, stepNumber, totalSteps) => {
      // Track time on previous step
      const previousStepTime = this.getElapsedTime('current_step')
      this.startTimer('current_step')
      
      return this.track('onboarding_step_viewed', {
        step_name: stepName,
        step_number: stepNumber,
        total_steps: totalSteps,
        previous_step_time: previousStepTime,
        progress_percentage: Math.round((stepNumber / totalSteps) * 100)
      })
    },

    stepCompleted: (stepName, stepData, stepNumber, totalSteps) => {
      const stepTime = this.getElapsedTime('current_step')
      
      return this.track(`onboarding_step_${stepName}`, {
        step_name: stepName,
        step_number: stepNumber,
        total_steps: totalSteps,
        time_spent_seconds: stepTime,
        fields_completed: Object.keys(stepData || {}).length,
        data_summary: this.summarizeData(stepData),
        progress_percentage: Math.round(((stepNumber + 1) / totalSteps) * 100)
      })
    },

    stepSkipped: (stepName, stepNumber, reason) => {
      const stepTime = this.getElapsedTime('current_step')
      
      return this.track('onboarding_step_skipped', {
        step_name: stepName,
        step_number: stepNumber,
        time_on_step: stepTime,
        skip_reason: reason || 'user_choice'
      })
    },

    fieldInteraction: (stepName, fieldName, fieldValue, interactionType) => {
      return this.track('onboarding_field_interaction', {
        step_name: stepName,
        field_name: fieldName,
        interaction_type: interactionType, // 'focus', 'blur', 'change', 'error'
        has_value: !!fieldValue,
        value_length: typeof fieldValue === 'string' ? fieldValue.length : null
      })
    },

    validationError: (stepName, fieldName, errorMessage) => {
      return this.track('onboarding_validation_error', {
        step_name: stepName,
        field_name: fieldName,
        error_message: errorMessage
      })
    },

    completed: (totalSteps, completedSteps, skippedSteps) => {
      const totalTime = this.getElapsedTime('onboarding_total')
      this.clearTimer('onboarding_total')
      this.clearTimer('current_step')
      
      return this.track('onboarding_completed', {
        total_time_seconds: totalTime,
        total_time_formatted: this.formatDuration(totalTime),
        total_steps: totalSteps,
        completed_steps: completedSteps,
        skipped_steps: skippedSteps,
        completion_rate: Math.round((completedSteps / totalSteps) * 100)
      })
    },

    abandoned: (lastStep, stepNumber, totalSteps, reason) => {
      const totalTime = this.getElapsedTime('onboarding_total')
      this.clearTimer('onboarding_total')
      this.clearTimer('current_step')
      
      return this.track('onboarding_abandoned', {
        last_step: lastStep,
        step_number: stepNumber,
        total_steps: totalSteps,
        total_time_seconds: totalTime,
        progress_percentage: Math.round((stepNumber / totalSteps) * 100),
        abandon_reason: reason || 'unknown'
      })
    },

    minimized: (currentStep, stepNumber) => {
      return this.track('onboarding_minimized', {
        current_step: currentStep,
        step_number: stepNumber,
        time_until_minimize: this.getElapsedTime('current_step')
      })
    },

    restored: (currentStep, stepNumber) => {
      this.startTimer('current_step') // Restart step timer
      return this.track('onboarding_restored', {
        current_step: currentStep,
        step_number: stepNumber
      })
    },

    dataSaved: (stepName, success, error) => {
      return this.track('onboarding_data_saved', {
        step_name: stepName,
        success: success,
        error_message: error || null,
        save_method: 'auto' // or 'manual' if user clicked save
      })
    }
  }

  // Helper to summarize data without exposing sensitive info
  summarizeData(data) {
    if (!data) return {}
    
    const summary = {}
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        summary[key + '_count'] = value.length
      } else if (typeof value === 'object' && value !== null) {
        summary[key + '_keys'] = Object.keys(value).length
      } else if (typeof value === 'string') {
        summary[key + '_length'] = value.length
        summary[key + '_filled'] = value.length > 0
      } else {
        summary[key + '_value'] = value
      }
    }
    return summary
  }

  // Format duration in seconds to human-readable
  formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  // Generic feature tracking
  feature = {
    used: (featureName, context = {}) => {
      return this.track('feature_used', {
        feature_name: featureName,
        ...context
      })
    },

    error: (featureName, error, context = {}) => {
      return this.track('feature_error', {
        feature_name: featureName,
        error_message: error?.message || error,
        error_stack: error?.stack,
        ...context
      })
    }
  }

  // Page tracking
  page = {
    viewed: (pageName, context = {}) => {
      return this.track('page_viewed', {
        page_name: pageName,
        referrer: document.referrer,
        ...context
      })
    },

    exited: (pageName, timeOnPage) => {
      return this.track('page_exited', {
        page_name: pageName,
        time_on_page_seconds: timeOnPage
      })
    }
  }
}

// Create singleton instance
const internalAnalytics = new InternalAnalytics()

// Export for use in components
export default internalAnalytics

// Also export as named exports for convenience
export const trackEvent = (...args) => internalAnalytics.track(...args)
export const onboardingAnalytics = internalAnalytics.onboarding
export const featureAnalytics = internalAnalytics.feature
export const pageAnalytics = internalAnalytics.page