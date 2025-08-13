'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const AccessibilityContext = createContext({})

export function useAccessibility() {
  return useContext(AccessibilityContext)
}

export function AccessibilityProvider({ children }) {
  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false
  })

  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    // Detect user preferences
    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      screenReader: window.navigator.userAgent.includes('NVDA') || 
                   window.navigator.userAgent.includes('JAWS') ||
                   window.speechSynthesis
    }

    const updatePreferences = () => {
      setPreferences({
        reducedMotion: mediaQueries.reducedMotion.matches,
        highContrast: mediaQueries.highContrast.matches,
        largeText: document.documentElement.style.fontSize === '120%',
        screenReader: mediaQueries.screenReader
      })
    }

    // Initial check
    updatePreferences()

    // Listen for changes
    Object.values(mediaQueries).forEach(mq => {
      if (mq.addEventListener) {
        mq.addEventListener('change', updatePreferences)
      }
    })

    return () => {
      Object.values(mediaQueries).forEach(mq => {
        if (mq.removeEventListener) {
          mq.removeEventListener('change', updatePreferences)
        }
      })
    }
  }, [])

  const announce = (message, priority = 'polite') => {
    const id = Date.now()
    setAnnouncements(prev => [...prev, { id, message, priority }])
    
    // Remove announcement after it's been read
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    }, 1000)
  }

  const value = {
    preferences,
    announce,
    announcements
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcements
          .filter(a => a.priority === 'polite')
          .map(a => (
            <div key={a.id}>{a.message}</div>
          ))
        }
      </div>
      
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcements
          .filter(a => a.priority === 'assertive')
          .map(a => (
            <div key={a.id}>{a.message}</div>
          ))
        }
      </div>
    </AccessibilityContext.Provider>
  )
}

// Skip to content link for keyboard navigation
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-olive-600 text-white px-4 py-2 rounded-md z-50 focus:z-50"
    >
      Skip to main content
    </a>
  )
}

// Focus trap for modals and dialogs
export function FocusTrap({ children, enabled = true }) {
  useEffect(() => {
    if (!enabled) return

    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => {
      document.removeEventListener('keydown', handleTabKey)
    }
  }, [enabled])

  return <>{children}</>
}

// Accessible heading component with proper hierarchy
export function AccessibleHeading({ 
  level = 2, 
  children, 
  className = '',
  id,
  ...props 
}) {
  const Tag = `h${level}`
  const sizes = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-semibold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-medium',
    5: 'text-base font-medium',
    6: 'text-sm font-medium'
  }

  return (
    <Tag
      id={id}
      className={`${sizes[level]} text-gray-900 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

// Accessible button with proper ARIA attributes
export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  ariaLabel,
  ariaDescribedBy,
  className = '',
  variant = 'primary',
  ...props
}) {
  const { announce } = useAccessibility()

  const handleClick = (e) => {
    if (disabled || loading) return
    
    onClick?.(e)
    
    // Announce action for screen readers
    if (ariaLabel) {
      announce(`${ariaLabel} activated`)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      className={`focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 ${className}`}
      {...props}
    >
      {loading ? loadingText : children}
    </button>
  )
}