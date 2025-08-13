/**
 * Production Metrics Tracker - GDPR Compliant
 * Tracks conversion rates, user behavior, and performance metrics
 * for bookedbarber.com production environment
 */

import { analytics } from './analytics'
import { posthog } from './posthog'

class MetricsTracker {
  constructor() {
    this.sessionId = this.generateSessionId()
    this.pageStartTime = Date.now()
    this.interactions = []
    this.consent = this.getConsent()
    this.isProduction = process.env.NODE_ENV === 'production'
    
    // Initialize performance tracking
    if (typeof window !== 'undefined') {
      this.initializePerformanceTracking()
      this.initializeElementTracking()
      this.trackPageLoad()
    }
  }

  // GDPR Consent Management
  getConsent() {
    if (typeof window === 'undefined') return {}
    
    try {
      const stored = localStorage.getItem('gdpr_consent')
      return stored ? JSON.parse(stored) : {
        analytics: false,
        performance: false,
        marketing: false
      }
    } catch {
      return { analytics: false, performance: false, marketing: false }
    }
  }

  setConsent(consent) {
    if (typeof window === 'undefined') return
    
    this.consent = { ...this.consent, ...consent }
    localStorage.setItem('gdpr_consent', JSON.stringify(this.consent))
    
    // Track consent change
    this.track('consent_updated', {
      analytics: consent.analytics,
      performance: consent.performance,
      marketing: consent.marketing,
      timestamp: new Date().toISOString()
    })
  }

  // Core tracking method
  async track(event, properties = {}) {
    if (!this.hasConsent('analytics')) return

    try {
      const enhancedProperties = {
        ...properties,
        ...this.getDeviceInfo(),
        ...this.getPageInfo(),
        session_duration: Date.now() - this.pageStartTime,
        interaction_count: this.interactions.length
      }

      // Track locally first (immediate)
      analytics.track(event, enhancedProperties)

      // Send to API endpoint for detailed storage
      await fetch('/api/metrics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          properties: enhancedProperties,
          userId: this.getUserId(),
          sessionId: this.sessionId,
          consent: this.consent,
          metadata: this.getMetadata()
        })
      })

    } catch (error) {
      console.error('Metrics tracking error:', error)
    }
  }

  // Production Conversion Funnel Tracking
  trackConversionFunnel = {
    // Visitor -> Subscriber tracking
    pricingPageViewed: () => {
      this.track('pricing_page_viewed', {
        time_on_previous_page: this.getTimeOnCurrentPage(),
        referrer: document.referrer,
        utm_source: this.getURLParam('utm_source'),
        utm_medium: this.getURLParam('utm_medium'),
        utm_campaign: this.getURLParam('utm_campaign')
      })
      this.startTimeTracking('pricing_page')
    },

    planHovered: (planName, element) => {
      const hoverStartTime = Date.now()
      
      const onMouseLeave = () => {
        const hoverDuration = Date.now() - hoverStartTime
        this.track('plan_hovered', {
          plan_name: planName,
          hover_duration: hoverDuration,
          plan_position: this.getElementPosition(element),
          viewport_position: this.getElementViewportPosition(element)
        })
        element.removeEventListener('mouseleave', onMouseLeave)
      }
      
      element.addEventListener('mouseleave', onMouseLeave)
    },

    planClicked: (planName) => {
      this.track('plan_clicked', {
        plan_name: planName,
        time_on_pricing_page: this.getTimeOnCurrentPage(),
        previous_plan_hovers: this.interactions.filter(i => i.type === 'plan_hovered').length
      })
    },

    planClickedWithoutCompletion: (planName, reason) => {
      this.track('plan_clicked_without_completion', {
        plan_name: planName,
        abandonment_reason: reason,
        time_to_abandonment: Date.now() - this.pageStartTime,
        form_completion_percentage: this.calculateFormCompletion()
      })
    },

    subscriptionStarted: (planName) => {
      this.track('subscription_started', {
        plan_name: planName,
        conversion_time: Date.now() - this.pageStartTime,
        funnel_stage: 'checkout_initiated'
      })
    },

    subscriptionCompleted: (planName, amount) => {
      this.track('subscription_completed', {
        plan_name: planName,
        amount: amount,
        total_conversion_time: Date.now() - this.pageStartTime,
        session_interaction_count: this.interactions.length
      })
      
      // Track revenue
      analytics.trackRevenue(amount, {
        plan_name: planName,
        conversion_session: this.sessionId
      })
    }
  }

  // OAuth Completion Rate Tracking
  trackOAuthFlow = {
    started: (provider) => {
      this.track('oauth_started', {
        provider: provider,
        page_before_oauth: window.location.pathname,
        time_on_page_before_oauth: this.getTimeOnCurrentPage()
      })
      this.oauthStartTime = Date.now()
    },

    completed: (provider, userId) => {
      const completionTime = this.oauthStartTime ? Date.now() - this.oauthStartTime : null
      this.track('oauth_completed', {
        provider: provider,
        completion_time: completionTime,
        user_id: userId,
        success: true
      })
    },

    failed: (provider, error) => {
      const completionTime = this.oauthStartTime ? Date.now() - this.oauthStartTime : null
      this.track('oauth_failed', {
        provider: provider,
        completion_time: completionTime,
        error_message: error.message || 'Unknown error',
        success: false
      })
    },

    abandoned: (provider, stage) => {
      const completionTime = this.oauthStartTime ? Date.now() - this.oauthStartTime : null
      this.track('oauth_abandoned', {
        provider: provider,
        abandonment_stage: stage,
        time_in_flow: completionTime
      })
    }
  }

  // Payment Success/Failure Tracking
  trackPaymentFlow = {
    checkoutStarted: (planName, amount) => {
      this.track('stripe_checkout_started', {
        plan_name: planName,
        amount: amount,
        currency: 'USD',
        checkout_session_start: Date.now()
      })
      this.checkoutStartTime = Date.now()
    },

    checkoutCompleted: (sessionId, amount) => {
      const checkoutDuration = this.checkoutStartTime ? Date.now() - this.checkoutStartTime : null
      this.track('stripe_checkout_completed', {
        session_id: sessionId,
        amount: amount,
        checkout_duration: checkoutDuration,
        success: true
      })
    },

    checkoutFailed: (error, stage) => {
      const checkoutDuration = this.checkoutStartTime ? Date.now() - this.checkoutStartTime : null
      this.track('stripe_checkout_failed', {
        error_message: error.message || 'Unknown error',
        failure_stage: stage,
        checkout_duration: checkoutDuration,
        success: false
      })
    },

    checkoutAbandoned: (stage) => {
      const timeInCheckout = this.checkoutStartTime ? Date.now() - this.checkoutStartTime : null
      this.track('stripe_checkout_abandoned', {
        abandonment_stage: stage,
        time_in_checkout: timeInCheckout
      })
    }
  }

  // Page Load Performance Tracking
  trackPagePerformance() {
    if (!this.hasConsent('performance')) return

    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.track('page_performance', {
              page_url: window.location.href,
              load_time: entry.loadEventEnd - entry.loadEventStart,
              dom_ready: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              first_byte: entry.responseStart - entry.requestStart,
              dns_lookup: entry.domainLookupEnd - entry.domainLookupStart,
              connection_time: entry.connectEnd - entry.connectStart,
              redirect_time: entry.redirectEnd - entry.redirectStart
            })
          }
        }
      })
      
      observer.observe({ entryTypes: ['navigation'] })

      // Core Web Vitals
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS((metric) => this.trackWebVital('CLS', metric))
        getFID((metric) => this.trackWebVital('FID', metric))
        getFCP((metric) => this.trackWebVital('FCP', metric))
        getLCP((metric) => this.trackWebVital('LCP', metric))
        getTTFB((metric) => this.trackWebVital('TTFB', metric))
      }).catch(() => {
        // web-vitals not available, track basic performance
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0]
          if (navigation) {
            this.track('page_performance', {
              load_time: navigation.loadEventEnd - navigation.loadEventStart,
              dom_ready: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
            })
          }
        }, 1000)
      })
    }
  }

  // Track Core Web Vitals
  trackWebVital(name, metric) {
    this.track('web_vital', {
      vital_name: name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      page_url: window.location.href
    })
  }

  // Drop-off Point Analysis
  trackDropOff(funnel_step, reason) {
    this.track('funnel_drop_off', {
      funnel_step: funnel_step,
      drop_off_reason: reason,
      time_in_funnel: Date.now() - this.pageStartTime,
      previous_interactions: this.interactions.slice(-5) // Last 5 interactions
    })
  }

  // Form Abandonment Tracking
  trackFormInteraction(formName, fieldName, action) {
    const interaction = {
      form_name: formName,
      field_name: fieldName,
      action: action,
      timestamp: Date.now(),
      type: 'form_interaction'
    }
    
    this.interactions.push(interaction)
    
    if (action === 'focus') {
      this.track('form_field_focused', interaction)
    } else if (action === 'blur_empty') {
      this.track('form_field_abandoned', interaction)
    } else if (action === 'filled') {
      this.track('form_field_completed', interaction)
    }
  }

  // Utility Methods
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  getUserId() {
    if (typeof window === 'undefined') return null
    
    // Try to get from authentication context or localStorage
    try {
      return localStorage.getItem('user_id') || null
    } catch {
      return null
    }
  }

  getDeviceInfo() {
    if (typeof window === 'undefined') return {}
    
    return {
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      screen_resolution: `${screen.width}x${screen.height}`,
      device_type: this.getDeviceType(),
      connection_type: this.getConnectionType(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }

  getDeviceType() {
    if (typeof window === 'undefined') return 'unknown'
    
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  getConnectionType() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      return navigator.connection.effectiveType || 'unknown'
    }
    return 'unknown'
  }

  getPageInfo() {
    if (typeof window === 'undefined') return {}
    
    return {
      page_url: window.location.href,
      page_title: document.title,
      page_referrer: document.referrer,
      page_pathname: window.location.pathname,
      page_search: window.location.search
    }
  }

  getMetadata() {
    return {
      ...this.getDeviceInfo(),
      ...this.getPageInfo(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      language: typeof navigator !== 'undefined' ? navigator.language : ''
    }
  }

  getTimeOnCurrentPage() {
    return Date.now() - this.pageStartTime
  }

  getURLParam(param) {
    if (typeof window === 'undefined') return null
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get(param)
  }

  getElementPosition(element) {
    const rect = element.getBoundingClientRect()
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    }
  }

  getElementViewportPosition(element) {
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    
    return {
      percent_from_top: (rect.top / viewportHeight) * 100,
      percent_from_left: (rect.left / viewportWidth) * 100,
      is_visible: rect.top >= 0 && rect.top <= viewportHeight
    }
  }

  calculateFormCompletion() {
    const formFields = document.querySelectorAll('input, select, textarea')
    const filledFields = Array.from(formFields).filter(field => field.value.trim() !== '')
    return formFields.length > 0 ? (filledFields.length / formFields.length) * 100 : 0
  }

  hasConsent(type) {
    return this.consent[type] === true
  }

  startTimeTracking(key) {
    this.timeTrackers = this.timeTrackers || {}
    this.timeTrackers[key] = Date.now()
  }

  getTrackedTime(key) {
    if (!this.timeTrackers || !this.timeTrackers[key]) return 0
    return Date.now() - this.timeTrackers[key]
  }

  // Initialize automatic tracking
  initializePerformanceTracking() {
    this.trackPagePerformance()
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('page_hidden', {
          time_on_page: this.getTimeOnCurrentPage()
        })
      } else {
        this.track('page_visible', {
          time_away: this.getTrackedTime('page_hidden')
        })
        this.startTimeTracking('page_visible')
      }
    })

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.track('page_unload', {
        session_duration: this.getTimeOnCurrentPage(),
        interaction_count: this.interactions.length
      })
    })
  }

  initializeElementTracking() {
    // Track clicks on pricing elements
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-track-click]')) {
        const trackingData = e.target.dataset.trackClick
        this.track('element_clicked', {
          element_data: trackingData,
          element_tag: e.target.tagName,
          element_text: e.target.textContent?.slice(0, 100)
        })
      }
    })

    // Track form interactions
    document.addEventListener('focus', (e) => {
      if (e.target.matches('input, select, textarea')) {
        const form = e.target.closest('form')
        this.trackFormInteraction(
          form?.dataset.trackForm || 'unknown_form',
          e.target.name || 'unknown_field',
          'focus'
        )
      }
    }, true)

    document.addEventListener('blur', (e) => {
      if (e.target.matches('input, select, textarea')) {
        const form = e.target.closest('form')
        const action = e.target.value.trim() ? 'filled' : 'blur_empty'
        this.trackFormInteraction(
          form?.dataset.trackForm || 'unknown_form',
          e.target.name || 'unknown_field',
          action
        )
      }
    }, true)
  }

  trackPageLoad() {
    // Track initial page load
    window.addEventListener('load', () => {
      this.track('page_loaded', {
        load_time: Date.now() - this.pageStartTime,
        page_type: this.getPageType()
      })
    })
  }

  getPageType() {
    const pathname = window.location.pathname
    if (pathname === '/') return 'homepage'
    if (pathname.includes('/pricing')) return 'pricing'
    if (pathname.includes('/login')) return 'login'
    if (pathname.includes('/signup')) return 'signup'
    if (pathname.includes('/dashboard')) return 'dashboard'
    return 'other'
  }
}

// Export singleton instance
export const metricsTracker = new MetricsTracker()

// Export class for advanced usage
export { MetricsTracker }