'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from '@/lib/posthog/client'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { usePostHogIdentify } from '@/lib/posthog/client'

export default function PostHogProvider({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  // Identify user when auth changes
  usePostHogIdentify(user)

  // Track page views
  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams ? `?${searchParams}` : '')
      posthog.capture('$pageview', {
        $current_url: url,
        $pathname: pathname,
      })
    }
  }, [pathname, searchParams])

  // Track web vitals
  useEffect(() => {
    const reportWebVitals = (metric) => {
      posthog.capture('web_vitals', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_id: metric.id,
        metric_label: metric.label,
      })
    }

    // Import web-vitals dynamically with correct API
    import('web-vitals').then((vitals) => {
      // New web-vitals API uses onCLS, onFID, etc.
      if (vitals.onCLS) vitals.onCLS(reportWebVitals)
      if (vitals.onFID) vitals.onFID(reportWebVitals)
      if (vitals.onFCP) vitals.onFCP(reportWebVitals)
      if (vitals.onLCP) vitals.onLCP(reportWebVitals)
      if (vitals.onTTFB) vitals.onTTFB(reportWebVitals)
    }).catch((error) => {
      // Silently fail if web-vitals is not available
      console.debug('Web vitals tracking not available:', error.message)
    })
  }, [])

  return <>{children}</>
}