'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import OnboardingChecklist from '../../../components/onboarding/OnboardingChecklist'

function EmbedChecklistContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  
  // Extract embed parameters
  const theme = searchParams?.get('theme') || 'light'
  const compact = searchParams?.get('compact') === 'true'
  const hideHeader = searchParams?.get('hideHeader') === 'true'
  const autoResize = searchParams?.get('autoResize') !== 'false' // default true

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-resize functionality for iframe
  useEffect(() => {
    if (!mounted || !autoResize) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      const height = entry.contentRect.height + 40 // Add padding
      
      // Notify parent window of height changes
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'onboarding-checklist-resize',
          height: height
        }, '*')
      }
    })

    const container = document.getElementById('embed-container')
    if (container) {
      resizeObserver.observe(container)
    }

    return () => resizeObserver.disconnect()
  }, [mounted, autoResize])

  // Handle checklist completion
  const handleComplete = () => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'onboarding-checklist-complete'
      }, '*')
    }
  }

  // Handle progress updates
  const handleProgress = (progress) => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'onboarding-checklist-progress',
        progress: progress
      }, '*')
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div 
      id="embed-container"
      className={`${
        theme === 'dark' 
          ? 'bg-gray-900 text-white' 
          : 'bg-white text-gray-900'
      } ${compact ? 'p-2' : 'p-4'}`}
      style={{
        minHeight: compact ? '350px' : '500px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {!hideHeader && (
        <div className={`mb-4 ${compact ? 'mb-2' : 'mb-4'}`}>
          <h2 className={`font-bold ${compact ? 'text-lg' : 'text-xl'} ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Complete Your Setup
          </h2>
          <p className={`${compact ? 'text-sm' : 'text-base'} ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Get your barbershop ready for bookings
          </p>
        </div>
      )}
      
      <OnboardingChecklist 
        embedMode={true}
        theme={theme}
        compact={compact}
        onComplete={handleComplete}
        onProgress={handleProgress}
      />
      
      {/* Embed branding (small and subtle) */}
      <div className={`text-xs text-center mt-4 ${
        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
      }`}>
        Powered by 6FB Booking System
      </div>
    </div>
  )
}

export default function OnboardingChecklistEmbed() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Onboarding Checklist</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style dangerouslySetInnerHTML={{
          __html: `
            body { margin: 0; padding: 0; overflow-x: hidden; }
            * { box-sizing: border-box; }
          `
        }} />
      </head>
      <body>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px] bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }>
          <EmbedChecklistContent />
        </Suspense>
      </body>
    </html>
  )
}