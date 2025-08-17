'use client'

import { useState, useEffect } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'

export default function OnboardingResumeButton({ profile, onClick }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  
  useEffect(() => {
    // Check if onboarding is incomplete and was previously skipped
    const wasSkipped = localStorage.getItem('onboarding_skipped') === 'true'
    const isIncomplete = profile && !profile?.onboarding_completed
    
    // Show the floating button if onboarding was skipped but not completed
    if (wasSkipped && isIncomplete) {
      setIsVisible(true)
      
      // Auto-expand the button after 5 seconds to catch attention
      const timer = setTimeout(() => {
        setIsMinimized(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [profile])
  
  if (!isVisible) return null
  
  return (
    <>
      {/* Floating Action Button - Always visible in bottom right */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            localStorage.removeItem('onboarding_skipped')
            onClick()
          }}
          onMouseEnter={() => setIsMinimized(false)}
          className={`
            bg-gradient-to-r from-brand-600 to-brand-700 text-white 
            rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 
            transition-all duration-300 flex items-center gap-2
            ${isMinimized ? 'px-4 py-4' : 'px-6 py-3'}
          `}
        >
          <SparklesIcon className="h-5 w-5" />
          {!isMinimized && (
            <span className="font-medium">Complete Setup</span>
          )}
        </button>
        
        {/* Pulsing indicator for attention */}
        {isMinimized && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
          </span>
        )}
      </div>
      
      {/* Optional: Tooltip on hover when minimized */}
      {isMinimized && (
        <div className="fixed bottom-20 right-6 z-40 pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg">
            Complete your account setup
            <div className="absolute bottom-0 right-8 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
          </div>
        </div>
      )}
    </>
  )
}