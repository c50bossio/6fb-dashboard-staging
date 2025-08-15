/**
 * ConversionTracker Component
 * Comprehensive conversion funnel tracking for BookedBarber
 * Automatically tracks page views, element visibility, user interactions, and conversion events
 */

'use client'

import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { metricsTracker } from '@/lib/metrics-tracker'

export function ConversionTracker({ 
  children,
  page,
  trackingEnabled = true,
  autoTrackScrollDepth = true,
  autoTrackTimeOnPage = true,
  autoTrackElementVisibility = true,
  autoTrackFormInteractions = true,
  customProperties = {}
}) {
  const router = useRouter()
  const { user } = useAuth()
  const timeTrackers = useRef({})
  const visibilityObserver = useRef(null)
  const scrollDepthTracked = useRef(new Set())
  const pageLoadTime = useRef(Date.now())
  const interactionObserver = useRef(null)

  useEffect(() => {
    if (!trackingEnabled) return

    const startTime = Date.now()
    pageLoadTime.current = startTime

    const pageViewData = {
      page: page,
      referrer: typeof window !== 'undefined' ? document.referrer : '',
      utm_source: getURLParam('utm_source'),
      utm_medium: getURLParam('utm_medium'),
      utm_campaign: getURLParam('utm_campaign'),
      source: getURLParam('source'),
      user_id: user?.id || null,
      is_authenticated: !!user,
      load_time: startTime,
      ...customProperties
    }

    metricsTracker.track('page_viewed', pageViewData)

    if (typeof window !== 'undefined' && window.posthog) {
      posthog.capture('page_viewed', pageViewData)
    }

    switch (page) {
      case 'register':
        trackRegistrationPageView()
        break
      case 'login':
        trackLoginPageView()
        break
      case 'subscribe':
        metricsTracker.trackConversionFunnel.pricingPageViewed()
        trackSubscribePageView()
        break
    }

  }, [page, trackingEnabled, user, customProperties])

  const getURLParam = (param) => {
    if (typeof window === 'undefined') return null
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get(param)
  }

  const trackRegistrationPageView = () => {
    metricsTracker.track('registration_page_viewed', {
      funnel_stage: 'registration',
      conversion_step: 1,
      previous_page: document.referrer,
      utm_source: getURLParam('utm_source'),
      utm_medium: getURLParam('utm_medium'),
      utm_campaign: getURLParam('utm_campaign')
    })
  }

  const trackLoginPageView = () => {
    const redirectUrl = getURLParam('redirect')
    metricsTracker.track('login_page_viewed', {
      funnel_stage: 'authentication',
      redirect_after_login: redirectUrl,
      previous_page: document.referrer
    })
  }

  const trackSubscribePageView = () => {
    const source = getURLParam('source')
    metricsTracker.track('pricing_page_viewed', {
      funnel_stage: 'pricing',
      conversion_step: 2,
      traffic_source: source,
      previous_page: document.referrer,
      utm_source: getURLParam('utm_source'),
      utm_medium: getURLParam('utm_medium'),
      utm_campaign: getURLParam('utm_campaign')
    })
  }

  const trackScrollDepth = useCallback(() => {
    if (!autoTrackScrollDepth || !trackingEnabled) return

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight - windowHeight
    const scrollPercent = Math.round((scrollTop / documentHeight) * 100)

    const milestones = [25, 50, 75, 90, 100]
    milestones.forEach(milestone => {
      if (scrollPercent >= milestone && !scrollDepthTracked.current.has(milestone)) {
        scrollDepthTracked.current.add(milestone)
        
        const timeOnPage = Date.now() - pageLoadTime.current
        
        metricsTracker.track(`scroll_depth_${milestone}`, {
          page: page,
          scroll_depth: milestone,
          time_to_scroll: timeOnPage,
          page_height: documentHeight,
          viewport_height: windowHeight
        })

        if (typeof window !== 'undefined' && window.posthog) {
          posthog.capture(`scroll_depth_${milestone}`, {
            page: page,
            scroll_depth: milestone,
            time_to_scroll: timeOnPage
          })
        }
      }
    })
  }, [autoTrackScrollDepth, trackingEnabled, page])

  useEffect(() => {
    if (!autoTrackTimeOnPage || !trackingEnabled) return

    const timeIntervals = [10, 30, 60, 120, 300, 600] // 10s, 30s, 1m, 2m, 5m, 10m
    const timers = timeIntervals.map(seconds => 
      setTimeout(() => {
        const scrollDepth = Math.max(...Array.from(scrollDepthTracked.current), 0)
        
        metricsTracker.track(`time_on_page_${seconds}s`, {
          page: page,
          time_spent: seconds,
          scroll_depth: scrollDepth,
          user_engaged: scrollDepth > 25,
          page_url: window.location.href
        })

        if (typeof window !== 'undefined' && window.posthog) {
          posthog.capture(`time_on_page_${seconds}s`, {
            page: page,
            time_spent: seconds,
            scroll_depth: scrollDepth
          })
        }
      }, seconds * 1000)
    )

    return () => timers.forEach(clearTimeout)
  }, [autoTrackTimeOnPage, trackingEnabled, page])

  useEffect(() => {
    if (!autoTrackElementVisibility || !trackingEnabled) return

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const element = entry.target
          const trackingData = {
            page: page,
            element_id: element.id || 'unknown',
            element_class: element.className || 'unknown',
            element_text: element.textContent?.slice(0, 100) || '',
            element_tag: element.tagName?.toLowerCase(),
            visibility_ratio: entry.intersectionRatio,
            time_to_visibility: Date.now() - pageLoadTime.current,
            scroll_position: window.pageYOffset
          }

          metricsTracker.track('element_viewed', trackingData)

          if (typeof window !== 'undefined' && window.posthog) {
            posthog.capture('element_viewed', trackingData)
          }

          visibilityObserver.current?.unobserve(element)
        }
      })
    }

    visibilityObserver.current = new IntersectionObserver(observerCallback, {
      threshold: [0.5, 0.75, 1.0],
      rootMargin: '0px 0px -10% 0px'
    })

    const elementsToTrack = document.querySelectorAll('[data-track-view], .pricing-card, .cta-button, .form-field')
    elementsToTrack.forEach(element => {
      visibilityObserver.current?.observe(element)
    })

    return () => {
      visibilityObserver.current?.disconnect()
    }
  }, [autoTrackElementVisibility, trackingEnabled, page])

  useEffect(() => {
    if (!autoTrackScrollDepth || !trackingEnabled) return

    let scrollTimer = null
    const handleScroll = () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(trackScrollDepth, 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimer)
    }
  }, [trackScrollDepth])

  useEffect(() => {
    if (!autoTrackFormInteractions || !trackingEnabled) return

    const handleFormFocus = (e) => {
      if (e.target.matches('input, select, textarea')) {
        const form = e.target.closest('form')
        const formName = form?.dataset.trackForm || form?.id || 'unknown_form'
        const fieldName = e.target.name || e.target.id || 'unknown_field'

        metricsTracker.track('form_field_focused', {
          page: page,
          form_name: formName,
          field_name: fieldName,
          field_type: e.target.type || 'unknown',
          time_on_page: Date.now() - pageLoadTime.current
        })

        e.target.dataset.focusTime = Date.now()
      }
    }

    const handleFormBlur = (e) => {
      if (e.target.matches('input, select, textarea')) {
        const form = e.target.closest('form')
        const formName = form?.dataset.trackForm || form?.id || 'unknown_form'
        const fieldName = e.target.name || e.target.id || 'unknown_field'
        const focusTime = parseInt(e.target.dataset.focusTime) || Date.now()
        const timeInField = Date.now() - focusTime
        const fieldFilled = e.target.value.trim().length > 0

        metricsTracker.track('form_field_blurred', {
          page: page,
          form_name: formName,
          field_name: fieldName,
          field_type: e.target.type || 'unknown',
          time_in_field: timeInField,
          field_filled: fieldFilled,
          character_count: e.target.value.length,
          field_abandoned: !fieldFilled
        })

        if (!fieldFilled) {
          metricsTracker.track('form_field_abandoned', {
            page: page,
            form_name: formName,
            field_name: fieldName,
            time_in_field: timeInField
          })
        }
      }
    }

    const handleFormSubmit = (e) => {
      const form = e.target
      const formName = form.dataset.trackForm || form.id || 'unknown_form'
      const formCompletion = calculateFormCompletion(form)

      metricsTracker.track('form_submitted', {
        page: page,
        form_name: formName,
        completion_rate: formCompletion,
        time_to_submit: Date.now() - pageLoadTime.current,
        user_authenticated: !!user
      })
    }

    document.addEventListener('focus', handleFormFocus, true)
    document.addEventListener('blur', handleFormBlur, true)
    document.addEventListener('submit', handleFormSubmit, true)

    return () => {
      document.removeEventListener('focus', handleFormFocus, true)
      document.removeEventListener('blur', handleFormBlur, true)
      document.removeEventListener('submit', handleFormSubmit, true)
    }
  }, [autoTrackFormInteractions, trackingEnabled, page, user])

  const calculateFormCompletion = (form) => {
    const fields = form.querySelectorAll('input, select, textarea')
    const filledFields = Array.from(fields).filter(field => field.value.trim() !== '')
    return fields.length > 0 ? Math.round((filledFields.length / fields.length) * 100) : 0
  }

  useEffect(() => {
    if (!trackingEnabled) return

    const handleBeforeUnload = () => {
      const timeOnPage = Date.now() - pageLoadTime.current
      const maxScrollDepth = Math.max(...Array.from(scrollDepthTracked.current), 0)

      metricsTracker.track('page_exit', {
        page: page,
        time_on_page: timeOnPage,
        max_scroll_depth: maxScrollDepth,
        exit_intent: true,
        user_engaged: maxScrollDepth > 25 || timeOnPage > 30000
      })
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const timeOnPage = Date.now() - pageLoadTime.current
        const maxScrollDepth = Math.max(...Array.from(scrollDepthTracked.current), 0)

        metricsTracker.track('page_hidden', {
          page: page,
          time_on_page: timeOnPage,
          max_scroll_depth: maxScrollDepth,
          tab_switched: true
        })
      } else {
        metricsTracker.track('page_visible', {
          page: page,
          returned_to_page: true
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [trackingEnabled, page])

  return children
}


export function useRegistrationTracking() {
  return {
    trackStepCompleted: (step, data = {}) => {
      metricsTracker.track('registration_step_completed', {
        step: step,
        funnel_stage: 'registration',
        ...data
      })
    },
    
    trackFieldValidationError: (fieldName, error) => {
      metricsTracker.track('registration_validation_error', {
        field_name: fieldName,
        error_message: error,
        funnel_stage: 'registration'
      })
    },
    
    trackOAuthAttempt: (provider) => {
      metricsTracker.trackOAuthFlow.started(provider)
    },
    
    trackRegistrationSuccess: (method, userId) => {
      metricsTracker.track('registration_completed', {
        registration_method: method,
        user_id: userId,
        funnel_stage: 'registration',
        conversion_completed: true
      })
    },
    
    trackRegistrationFailure: (error, step) => {
      metricsTracker.track('registration_failed', {
        error_message: error,
        failure_step: step,
        funnel_stage: 'registration'
      })
    }
  }
}

export function useLoginTracking() {
  return {
    trackLoginAttempt: (method) => {
      metricsTracker.track('login_attempt', {
        login_method: method,
        funnel_stage: 'authentication'
      })
    },
    
    trackLoginSuccess: (method, userId) => {
      metricsTracker.track('login_success', {
        login_method: method,
        user_id: userId,
        funnel_stage: 'authentication'
      })
    },
    
    trackLoginFailure: (method, error) => {
      metricsTracker.track('login_failed', {
        login_method: method,
        error_message: error,
        funnel_stage: 'authentication'
      })
    },
    
    trackOAuthAttempt: (provider) => {
      metricsTracker.trackOAuthFlow.started(provider)
    },
    
    trackPasswordReset: () => {
      metricsTracker.track('password_reset_requested', {
        funnel_stage: 'authentication'
      })
    }
  }
}

export function usePricingTracking() {
  return {
    trackBillingToggle: (period) => {
      metricsTracker.track('billing_period_toggled', {
        billing_period: period,
        funnel_stage: 'pricing'
      })
    },
    
    trackPlanHover: (planId, element) => {
      metricsTracker.trackConversionFunnel.planHovered(planId, element)
    },
    
    trackPlanClick: (planId) => {
      metricsTracker.trackConversionFunnel.planClicked(planId)
      metricsTracker.track('plan_selected', {
        plan_id: planId,
        funnel_stage: 'pricing',
        conversion_intent: true
      })
    },
    
    trackCheckoutRedirect: (planId, billingPeriod) => {
      metricsTracker.track('checkout_redirect', {
        plan_id: planId,
        billing_period: billingPeriod,
        funnel_stage: 'checkout'
      })
    },
    
    trackPlanComparison: (plansViewed) => {
      metricsTracker.track('plans_compared', {
        plans_viewed: plansViewed,
        comparison_time: Date.now(),
        funnel_stage: 'pricing'
      })
    }
  }
}

export default ConversionTracker