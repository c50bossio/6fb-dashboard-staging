'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'
import OnboardingChecklist from './OnboardingChecklist'

const GlobalOnboardingContext = createContext()

export function useGlobalOnboarding() {
  return useContext(GlobalOnboardingContext)
}

export default function GlobalOnboardingProvider({ children, user }) {
  const [checklistData, setChecklistData] = useState(null)
  const [completedItems, setCompletedItems] = useState([])
  const [isVisible, setIsVisible] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const pathname = usePathname()

  // Load checklist data on mount and user change
  useEffect(() => {
    loadChecklistData()
  }, [user])

  // Control visibility based on route and completion status
  useEffect(() => {
    // Identify page types
    const isLandingPage = pathname === '/' 
    const isAuthPage = pathname.startsWith('/auth') || pathname.includes('/login') || pathname.includes('/register')
    const isEmbedPage = pathname.includes('/embed')
    const isOnboardingPage = pathname.includes('/onboarding')
    const isProtectedPage = pathname.startsWith('/dashboard') || pathname.startsWith('/shop') || pathname.startsWith('/admin')
    
    // Only show widget on protected pages when user is authenticated
    // In development mode, show on protected pages even without full auth for testing
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isAuthenticated = !!user
    
    // Widget should show when:
    // 1. On a protected page AND
    // 2. User is authenticated (or in development mode on protected pages) AND
    // 3. Not on excluded pages (embed/onboarding)
    const shouldShow = isProtectedPage &&
                      (isAuthenticated || isDevelopment) &&
                      !isEmbedPage &&
                      !isOnboardingPage

    // Auto-hide if user has completed onboarding (100%)
    const progress = calculateProgress()
    const isCompleted = progress >= 100

    // Development bypass: Hide onboarding when testing specific features
    const developmentHideOnboarding = isDevelopment &&
                                     process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

    // Debug logging removed - visibility logic working correctly

    setIsVisible(shouldShow && !isCompleted && !developmentHideOnboarding)
  }, [pathname, user, completedItems])

  const loadChecklistData = async () => {
    // Always require a user for API calls, regardless of environment
    if (!user) {
      setChecklistData(null)
      setCompletedItems([])
      return
    }

    try {
      const response = await fetch('/api/onboarding/checklist/status')
      const result = await response.json()
      
      if (response.ok && result.success) {
        setChecklistData(result.data)
        // Extract completed item IDs
        const completedIds = result.data.items
          ?.filter(item => item.completed)
          ?.map(item => item.id) || []
        setCompletedItems(completedIds)
      } else {
        // If not authenticated or failed, use empty state
        setChecklistData(null)
        setCompletedItems([])
      }
    } catch (error) {
      console.error('Failed to load global checklist data:', error)
      setChecklistData(null)
      setCompletedItems([])
    }
  }

  const calculateProgress = () => {
    if (!checklistData?.progress) return 0
    return checklistData.progress.completion_percentage || 0
  }

  const handleItemClick = (item) => {
    // Navigate to the relevant page
    if (item.link) {
      window.location.href = item.link
    }
  }

  const handleProgress = (percentage) => {
    // Debounced refresh to prevent rapid API calls
    const debouncedRefresh = debounce(() => {
      loadChecklistData()
    }, 500)

    debouncedRefresh()

    // Auto-hide when completed
    if (percentage >= 100) {
      setTimeout(() => setIsVisible(false), 3000) // Hide after celebration
    }
  }

  // Debounce utility function
  const debounce = (func, wait) => {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const handleToggleMinimize = (minimized) => {
    setIsMinimized(minimized)
    
    // Store minimized state in localStorage
    localStorage.setItem('onboardingChecklistMinimized', minimized.toString())
  }

  // Load minimized state from localStorage
  useEffect(() => {
    const savedMinimizedState = localStorage.getItem('onboardingChecklistMinimized')
    if (savedMinimizedState === 'true') {
      setIsMinimized(true)
    }
  }, [])

  const contextValue = {
    checklistData,
    completedItems,
    isVisible,
    isMinimized,
    loadChecklistData,
    setIsVisible,
    calculateProgress: () => calculateProgress()
  }

  return (
    <GlobalOnboardingContext.Provider value={contextValue}>
      {children}
      
      {/* Global Floating Onboarding Checklist */}
      {isVisible && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <OnboardingChecklist
            completedItems={completedItems}
            onItemClick={handleItemClick}
            minimized={isMinimized}
            onToggleMinimize={handleToggleMinimize}
            onComplete={() => {
              // Show celebration and hide after delay
              setTimeout(() => setIsVisible(false), 5000)
            }}
            onProgress={handleProgress}
            compact={true}
          />
        </div>
      )}
    </GlobalOnboardingContext.Provider>
  )
}