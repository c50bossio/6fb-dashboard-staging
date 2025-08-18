'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/components/SupabaseAuthProvider'
import { useTenant } from '@/contexts/TenantContext'
import tenantAnalytics from '@/lib/analytics/tenantAnalytics'
import posthog from '@/lib/posthog/client'
import { usePostHogIdentify } from '@/lib/posthog/client'

export default function PostHogProvider({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { tenant, tenantId } = useTenant()
  
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'
  
  useEffect(() => {
    if (tenant && !isAuthPage) {
      tenantAnalytics.setTenant(tenant)
    }
  }, [tenant, isAuthPage])
  
  usePostHogIdentify(isAuthPage ? null : user)

  useEffect(() => {
    if (pathname) {
      if (isAuthPage) {
        tenantAnalytics.trackPageView(pathname, {
          $pathname: pathname,
          auth_page: true
        })
      } else {
        const url = pathname + (searchParams ? `?${searchParams}` : '')
        tenantAnalytics.trackPageView(pathname, {
          $current_url: url,
          $pathname: pathname,
          page_title: document.title
        })
      }
    }
  }, [pathname, searchParams, tenantId, isAuthPage])

  useEffect(() => {
    if (isAuthPage) return
    const reportWebVitals = (metric) => {
      tenantAnalytics.track('web_vitals', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_id: metric.id,
        metric_label: metric.label,
      })
    }

    import('web-vitals').then((vitals) => {
      if (vitals.onCLS) vitals.onCLS(reportWebVitals)
      if (vitals.onFID) vitals.onFID(reportWebVitals)
      if (vitals.onFCP) vitals.onFCP(reportWebVitals)
      if (vitals.onLCP) vitals.onLCP(reportWebVitals)
      if (vitals.onTTFB) vitals.onTTFB(reportWebVitals)
    }).catch((error) => {
      console.debug('Web vitals tracking not available:', error.message)
    })
  }, [])

  return <>{children}</>
}