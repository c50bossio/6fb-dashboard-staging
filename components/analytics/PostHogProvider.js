'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from '@/lib/posthog/client'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { useTenant } from '@/contexts/TenantContext'
import { usePostHogIdentify } from '@/lib/posthog/client'
import tenantAnalytics from '@/lib/analytics/tenantAnalytics'

export default function PostHogProvider({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { tenant, tenantId } = useTenant()
  
  // Skip heavy analytics on login/register pages for better performance
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'
  
  // Set tenant context in analytics when tenant loads (skip on auth pages)
  useEffect(() => {
    if (tenant && !isAuthPage) {
      tenantAnalytics.setTenant(tenant)
      console.log('🏢 Tenant analytics context set:', tenant.name)
    }
  }, [tenant, isAuthPage])
  
  // Identify user when auth changes (only after login success)
  usePostHogIdentify(isAuthPage ? null : user)

  // Track page views with tenant context (lightweight on auth pages)
  useEffect(() => {
    if (pathname) {
      if (isAuthPage) {
        // Minimal tracking for auth pages
        tenantAnalytics.trackPageView(pathname, {
          $pathname: pathname,
          auth_page: true
        })
      } else {
        // Full tracking for other pages
        const url = pathname + (searchParams ? `?${searchParams}` : '')
        tenantAnalytics.trackPageView(pathname, {
          $current_url: url,
          $pathname: pathname,
          page_title: document.title
        })
      }
    }
  }, [pathname, searchParams, tenantId, isAuthPage])

  // Skip web vitals tracking on auth pages
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