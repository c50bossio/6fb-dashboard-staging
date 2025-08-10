'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'

import { analytics } from '@/lib/analytics'

/**
 * Analytics Initialization Component
 * Handles initial setup and identification for analytics services
 */
export default function AnalyticsInit() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    // Only run when Clerk has loaded
    if (!isLoaded) return

    // Initialize analytics with user data if signed in
    if (user) {
      // Identify user across all analytics platforms
      analytics.identify(user.id, {
        email: user.emailAddresses?.[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        
        // Custom properties
        subscription_plan: user.publicMetadata?.subscriptionPlan || 'free',
        user_type: user.publicMetadata?.userType || 'individual',
        business_name: user.publicMetadata?.businessName,
        onboarding_completed: user.publicMetadata?.onboardingCompleted || false,
        last_active: new Date().toISOString(),
        
        // Technical properties
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        user_agent: navigator.userAgent,
      })

      // Track successful login if this is a fresh session
      const sessionStart = sessionStorage.getItem('analytics_session_start')
      if (!sessionStart) {
        analytics.events.loginCompleted('session_restored')
        sessionStorage.setItem('analytics_session_start', new Date().toISOString())
      }

      // Set up session tracking
      const lastActivity = localStorage.getItem('last_activity')
      const now = new Date().toISOString()
      
      if (lastActivity) {
        const timeSinceLastActivity = new Date(now) - new Date(lastActivity)
        
        // If more than 30 minutes since last activity, track as new session
        if (timeSinceLastActivity > 30 * 60 * 1000) {
          analytics.track('session_started', {
            time_since_last_activity: Math.round(timeSinceLastActivity / 1000),
            session_type: 'returning',
          })
        }
      } else {
        // First time visitor
        analytics.track('session_started', {
          session_type: 'first_time',
        })
      }
      
      localStorage.setItem('last_activity', now)
    } else {
      // Anonymous user tracking
      analytics.track('anonymous_visit', {
        page: window.location.pathname,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
      })
    }

    // Track app startup
    analytics.track('app_loaded', {
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    })

    // Set up activity tracking
    let activityTimer
    
    const updateActivity = () => {
      localStorage.setItem('last_activity', new Date().toISOString())
      
      // Clear and reset timer
      if (activityTimer) clearTimeout(activityTimer)
      activityTimer = setTimeout(() => {
        analytics.track('session_timeout', {
          timeout_duration: 30 * 60 * 1000, // 30 minutes
        })
      }, 30 * 60 * 1000)
    }

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // Initial activity setup
    updateActivity()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
      if (activityTimer) clearTimeout(activityTimer)
    }
  }, [user, isLoaded])

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        analytics.track('page_hidden', {
          page: window.location.pathname,
          time_on_page: performance.now(),
        })
      } else {
        analytics.track('page_visible', {
          page: window.location.pathname,
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Track errors (temporarily disabled to prevent infinite recursion)
  useEffect(() => {
    const handleError = (event) => {
      // Prevent infinite recursion by checking if this is an analytics error
      if (event.error?.message?.includes('Maximum call stack')) return
      
      try {
        analytics.events.errorOccurred(event.error, {
          filename: event.filename,
          line_number: event.lineno,
          column_number: event.colno,
          user_agent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        })
      } catch (analyticsError) {
        // Silently ignore analytics errors to prevent recursion
        console.warn('Analytics error tracking failed:', analyticsError.message)
      }
    }

    const handleUnhandledRejection = (event) => {
      // Prevent infinite recursion
      if (event.reason?.message?.includes('Maximum call stack')) return
      
      try {
        analytics.events.errorOccurred(new Error(event.reason), {
          type: 'unhandled_promise_rejection',
          user_agent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        })
      } catch (analyticsError) {
        // Silently ignore analytics errors to prevent recursion
        console.warn('Analytics promise rejection tracking failed:', analyticsError.message)
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Track performance metrics
  useEffect(() => {
    // Track Core Web Vitals when available - using new API
    import('web-vitals').then((vitals) => {
      // New web-vitals API uses onCLS, onFID, etc.
      if (vitals.onCLS) vitals.onCLS((metric) => analytics.track('core_web_vitals', { metric: 'CLS', value: metric.value }))
      if (vitals.onFID) vitals.onFID((metric) => analytics.track('core_web_vitals', { metric: 'FID', value: metric.value }))
      if (vitals.onFCP) vitals.onFCP((metric) => analytics.track('core_web_vitals', { metric: 'FCP', value: metric.value }))
      if (vitals.onLCP) vitals.onLCP((metric) => analytics.track('core_web_vitals', { metric: 'LCP', value: metric.value }))
      if (vitals.onTTFB) vitals.onTTFB((metric) => analytics.track('core_web_vitals', { metric: 'TTFB', value: metric.value }))
    }).catch((error) => {
      console.debug('Web vitals tracking not available:', error.message)
    })

    // Track basic performance metrics
    if (typeof window !== 'undefined' && window.performance) {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0]
        if (navigation) {
          analytics.track('page_performance', {
            dns_lookup: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
            tcp_connection: Math.round(navigation.connectEnd - navigation.connectStart),
            server_response: Math.round(navigation.responseEnd - navigation.requestStart),
            dom_processing: Math.round(navigation.domComplete - navigation.domLoading),
            page_load: Math.round(navigation.loadEventEnd - navigation.navigationStart),
          })
        }
      }, 1000) // Wait 1 second for page to load
    }
  }, [])

  // This component doesn't render anything
  return null
}