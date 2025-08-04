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

    // Import web-vitals dynamically
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(reportWebVitals)
      getFID(reportWebVitals)
      getFCP(reportWebVitals)
      getLCP(reportWebVitals)
      getTTFB(reportWebVitals)
    })
  }, [])

  return <>{children}</>
}