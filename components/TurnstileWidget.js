'use client'

import { useEffect, useRef, useState } from 'react'

import { renderTurnstile, resetTurnstile, getTurnstileResponse, useTurnstile } from '../lib/turnstile'

export default function TurnstileWidget({ 
  onVerify, 
  onError, 
  onExpire, 
  onTimeout,
  theme = 'auto', 
  size = 'normal',
  className = '',
  resetTrigger 
}) {
  const containerRef = useRef(null)
  const [widgetId, setWidgetId] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!containerRef.current || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      console.warn('Turnstile widget cannot be rendered: missing container or site key')
      return
    }

    const initializeTurnstile = async () => {
      try {
        const id = await renderTurnstile(containerRef.current, {
          theme,
          size,
          callback: (token) => {
            setError(null)
            if (onVerify) {
              onVerify(token)
            }
          },
          'error-callback': () => {
            console.error('Turnstile verification failed')
            setError('Verification failed. Please try again.')
            if (onError) {
              onError()
            }
          },
          'expired-callback': () => {
            setError('Verification expired. Please verify again.')
            if (onExpire) {
              onExpire()
            }
          },
          'timeout-callback': () => {
            setError('Verification timed out. Please try again.')
            if (onTimeout) {
              onTimeout()
            }
          }
        })

        if (id !== null) {
          setWidgetId(id)
          setIsLoaded(true)
          setError(null)
        } else {
          setError('Failed to load CAPTCHA widget')
        }
      } catch (err) {
        console.error('Turnstile initialization error:', err)
        setError('Failed to initialize CAPTCHA')
      }
    }

    initializeTurnstile()
  }, [theme, size, onVerify, onError, onExpire, onTimeout])

  useEffect(() => {
    if (resetTrigger && widgetId !== null) {
      resetTurnstile(widgetId)
    }
  }, [resetTrigger, widgetId])

  useEffect(() => {
    return () => {
      if (widgetId !== null) {
        try {
        } catch (err) {
          console.warn('Turnstile cleanup error:', err)
        }
      }
    }
  }, [widgetId])

  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <p className="text-sm text-yellow-800">
          🔒 CAPTCHA is not configured. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY in your environment.
        </p>
      </div>
    )
  }

  return (
    <div className={`turnstile-container ${className}`}>
      <div ref={containerRef} className="turnstile-widget" />
      
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}
      
      {!isLoaded && !error && (
        <div className="animate-pulse bg-gray-200 rounded h-16 w-full flex items-center justify-center">
          <span className="text-gray-500 text-sm">Loading CAPTCHA...</span>
        </div>
      )}
    </div>
  )
}

export function useTurnstileWidget(options = {}) {
  const [token, setToken] = useState(null)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleVerify = (token) => {
    setToken(token)
    setIsVerified(true)
    setError(null)
    setIsLoading(false)
    if (options.onVerify) {
      options.onVerify(token)
    }
  }

  const handleError = () => {
    setToken(null)
    setIsVerified(false)
    setError('Verification failed')
    setIsLoading(false)
    if (options.onError) {
      options.onError()
    }
  }

  const handleExpire = () => {
    setToken(null)
    setIsVerified(false)
    setError('Verification expired')
    if (options.onExpire) {
      options.onExpire()
    }
  }

  const reset = () => {
    setToken(null)
    setIsVerified(false)
    setError(null)
    setIsLoading(true)
  }

  return {
    token,
    isVerified,
    error,
    isLoading,
    reset,
    TurnstileWidget: (props) => (
      <TurnstileWidget
        onVerify={handleVerify}
        onError={handleError}
        onExpire={handleExpire}
        {...props}
      />
    )
  }
}