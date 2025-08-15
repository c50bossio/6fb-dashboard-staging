/**
 * MetricsCollector Component
 * GDPR-compliant user behavior metrics collection for BookedBarber production
 * Automatically tracks conversion funnel, user interactions, and performance metrics
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { metricsTracker } from '@/lib/metrics-tracker'

export function MetricsCollector({ 
  children, 
  trackingEnabled = true,
  consentRequired = true,
  autoTrackPerformance = true,
  autoTrackInteractions = true 
}) {
  const { user } = useAuth()
  const [consent, setConsent] = useState(null)
  const [showConsentBanner, setShowConsentBanner] = useState(false)
  const metricsRef = useRef(metricsTracker)
  const interactionObserverRef = useRef(null)
  const performanceObserverRef = useRef(null)

  useEffect(() => {
    const existingConsent = metricsRef.current.getConsent()
    setConsent(existingConsent)
    
    if (consentRequired && !existingConsent.analytics && !existingConsent.performance) {
      setShowConsentBanner(true)
    }

    if (user?.id) {
      localStorage.setItem('user_id', user.id)
      metricsRef.current.track('user_identified', {
        user_id: user.id,
        authentication_method: user.app_metadata?.provider || 'unknown'
      })
    }
  }, [user, consentRequired])

  useEffect(() => {
    if (!trackingEnabled || !autoTrackInteractions) return
    if (consentRequired && !consent?.analytics) return

    const trackPricingInteractions = () => {
      const planElements = document.querySelectorAll('[data-plan-name]')
      planElements.forEach(element => {
        const planName = element.dataset.planName
        
        element.addEventListener('mouseenter', () => {
          metricsRef.current.trackConversionFunnel.planHovered(planName, element)
        })

        element.addEventListener('click', () => {
          metricsRef.current.trackConversionFunnel.planClicked(planName)
        })
      })

      const ctaButtons = document.querySelectorAll('[data-cta]')
      ctaButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const ctaType = button.dataset.cta
          const ctaText = button.textContent?.trim()
          
          metricsRef.current.track('cta_clicked', {
            cta_type: ctaType,
            cta_text: ctaText,
            button_position: metricsRef.current.getElementPosition(button),
            time_on_page: metricsRef.current.getTimeOnCurrentPage()
          })
        })
      })

      const forms = document.querySelectorAll('form[data-track-form]')
      forms.forEach(form => {
        const formName = form.dataset.trackForm
        
        form.addEventListener('submit', () => {
          metricsRef.current.track('form_submitted', {
            form_name: formName,
            completion_time: metricsRef.current.getTimeOnCurrentPage(),
            form_completion_rate: metricsRef.current.calculateFormCompletion()
          })
        })

        const fields = form.querySelectorAll('input, select, textarea')
        fields.forEach(field => {
          let focusTime = 0
          
          field.addEventListener('focus', () => {
            focusTime = Date.now()
          })
          
          field.addEventListener('blur', () => {
            const timeInField = focusTime ? Date.now() - focusTime : 0
            metricsRef.current.track('form_field_interaction', {
              form_name: formName,
              field_name: field.name || 'unnamed_field',
              field_type: field.type || 'unknown',
              time_in_field: timeInField,
              field_filled: field.value.trim().length > 0,
              character_count: field.value.length
            })
          })
        })
      })
    }

    const initTimeout = setTimeout(trackPricingInteractions, 1000)
    
    return () => {
      clearTimeout(initTimeout)
    }
  }, [trackingEnabled, autoTrackInteractions, consent])

  useEffect(() => {
    if (!trackingEnabled || !autoTrackInteractions) return
    if (consentRequired && !consent?.analytics) return

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target
          const trackingData = {
            element_id: element.id,
            element_class: element.className,
            element_data: element.dataset.track || 'unknown',
            visibility_ratio: entry.intersectionRatio,
            time_to_visibility: Date.now() - metricsRef.current.pageStartTime
          }

          metricsRef.current.track('element_viewed', trackingData)
        }
      })
    }

    interactionObserverRef.current = new IntersectionObserver(observerCallback, {
      threshold: [0.25, 0.5, 0.75, 1.0]
    })

    const trackableElements = document.querySelectorAll('[data-track-view]')
    trackableElements.forEach(element => {
      interactionObserverRef.current.observe(element)
    })

    return () => {
      if (interactionObserverRef.current) {
        interactionObserverRef.current.disconnect()
      }
    }
  }, [trackingEnabled, autoTrackInteractions, consent])

  useEffect(() => {
    if (!trackingEnabled || !autoTrackPerformance) return
    if (consentRequired && !consent?.performance) return

    let maxScrollDepth = 0
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollPercent = Math.round((scrollTop + windowHeight) / documentHeight * 100)
      
      if (scrollPercent > maxScrollDepth) {
        maxScrollDepth = scrollPercent
        
        if (scrollPercent >= 25 && scrollPercent < 50) {
          metricsRef.current.track('scroll_depth_25')
        } else if (scrollPercent >= 50 && scrollPercent < 75) {
          metricsRef.current.track('scroll_depth_50')
        } else if (scrollPercent >= 75 && scrollPercent < 100) {
          metricsRef.current.track('scroll_depth_75')
        } else if (scrollPercent >= 100) {
          metricsRef.current.track('scroll_depth_100')
        }
      }
    }

    const timeIntervals = [30, 60, 120, 300, 600] // 30s, 1m, 2m, 5m, 10m
    const timeTrackers = timeIntervals.map(seconds => 
      setTimeout(() => {
        metricsRef.current.track(`time_on_page_${seconds}s`, {
          page_url: window.location.href,
          scroll_depth: maxScrollDepth,
          interaction_count: metricsRef.current.interactions.length
        })
      }, seconds * 1000)
    )

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      timeTrackers.forEach(clearTimeout)
    }
  }, [trackingEnabled, autoTrackPerformance, consent])

  const handleConsentAccept = (consentTypes) => {
    const newConsent = {
      analytics: consentTypes.includes('analytics'),
      performance: consentTypes.includes('performance'),
      marketing: consentTypes.includes('marketing')
    }
    
    metricsRef.current.setConsent(newConsent)
    setConsent(newConsent)
    setShowConsentBanner(false)

    metricsRef.current.track('consent_accepted', {
      consent_types: consentTypes,
      timestamp: new Date().toISOString()
    })
  }

  const handleConsentReject = () => {
    const noConsent = {
      analytics: false,
      performance: false,
      marketing: false
    }
    
    metricsRef.current.setConsent(noConsent)
    setConsent(noConsent)
    setShowConsentBanner(false)
  }

  return (
    <>
      {children}
      
      {/* GDPR Consent Banner */}
      {showConsentBanner && (
        <GDPRConsentBanner
          onAccept={handleConsentAccept}
          onReject={handleConsentReject}
        />
      )}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <MetricsDebugInfo 
          consent={consent}
          sessionId={metricsRef.current.sessionId}
          interactionCount={metricsRef.current.interactions.length}
        />
      )}
    </>
  )
}

function GDPRConsentBanner({ onAccept, onReject }) {
  const [selectedConsent, setSelectedConsent] = useState(['analytics', 'performance'])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cookie & Analytics Consent
            </h3>
            <p className="text-sm text-gray-600">
              We use cookies and analytics to improve your experience and understand how our service is used. 
              Choose what you're comfortable with.
            </p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'analytics', label: 'Analytics', required: false },
                { id: 'performance', label: 'Performance', required: false },
                { id: 'marketing', label: 'Marketing', required: false }
              ].map(option => (
                <label key={option.id} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={selectedConsent.includes(option.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedConsent([...selectedConsent, option.id])
                      } else {
                        setSelectedConsent(selectedConsent.filter(c => c !== option.id))
                      }
                    }}
                    className="mr-2"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => onAccept(selectedConsent)}
                className="px-4 py-2 bg-olive-600 text-white text-sm rounded-md hover:bg-olive-700"
              >
                Accept Selected
              </button>
              <button
                onClick={onReject}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
              >
                Reject All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricsDebugInfo({ consent, sessionId, interactionCount }) {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed top-4 right-4 bg-black text-white p-3 rounded-md text-xs max-w-xs z-40">
      <h4 className="font-bold mb-2">Metrics Debug</h4>
      <div>Session: {sessionId?.slice(-8)}</div>
      <div>Interactions: {interactionCount}</div>
      <div>Consent:</div>
      <div className="ml-2">
        Analytics: {consent?.analytics ? '✓' : '✗'}<br />
        Performance: {consent?.performance ? '✓' : '✗'}<br />
        Marketing: {consent?.marketing ? '✓' : '✗'}
      </div>
    </div>
  )
}

export function usePricingTracking() {
  const trackPlanView = (planName) => {
    metricsTracker.trackConversionFunnel.pricingPageViewed()
  }

  const trackPlanHover = (planName, element) => {
    metricsTracker.trackConversionFunnel.planHovered(planName, element)
  }

  const trackPlanClick = (planName) => {
    metricsTracker.trackConversionFunnel.planClicked(planName)
  }

  const trackPlanAbandon = (planName, reason) => {
    metricsTracker.trackConversionFunnel.planClickedWithoutCompletion(planName, reason)
  }

  return {
    trackPlanView,
    trackPlanHover,
    trackPlanClick,
    trackPlanAbandon
  }
}

export function useOAuthTracking() {
  const trackOAuthStart = (provider) => {
    metricsTracker.trackOAuthFlow.started(provider)
  }

  const trackOAuthComplete = (provider, userId) => {
    metricsTracker.trackOAuthFlow.completed(provider, userId)
  }

  const trackOAuthFail = (provider, error) => {
    metricsTracker.trackOAuthFlow.failed(provider, error)
  }

  const trackOAuthAbandon = (provider, stage) => {
    metricsTracker.trackOAuthFlow.abandoned(provider, stage)
  }

  return {
    trackOAuthStart,
    trackOAuthComplete,
    trackOAuthFail,
    trackOAuthAbandon
  }
}

export function usePaymentTracking() {
  const trackCheckoutStart = (planName, amount) => {
    metricsTracker.trackPaymentFlow.checkoutStarted(planName, amount)
  }

  const trackCheckoutComplete = (sessionId, amount) => {
    metricsTracker.trackPaymentFlow.checkoutCompleted(sessionId, amount)
  }

  const trackCheckoutFail = (error, stage) => {
    metricsTracker.trackPaymentFlow.checkoutFailed(error, stage)
  }

  const trackCheckoutAbandon = (stage) => {
    metricsTracker.trackPaymentFlow.checkoutAbandoned(stage)
  }

  return {
    trackCheckoutStart,
    trackCheckoutComplete,
    trackCheckoutFail,
    trackCheckoutAbandon
  }
}

export default MetricsCollector