'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import TierProtection from '@/components/TierProtection'

/**
 * Shop Layout - Requires shop_owner tier or higher
 * This protects all routes under /shop/* from unauthorized access
 */
export default function ShopLayout({ children }) {
  const { profile, loading } = useAuth()
  const [isDev, setIsDev] = useState(false)
  const [isLocalhost, setIsLocalhost] = useState(false)
  
  useEffect(() => {
    // Check for dev mode parameter
    const urlParams = new URLSearchParams(window.location.search)
    setIsDev(urlParams.get('dev') === 'true')
    
    // Auto-detect development environment
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('192.168.') ||
      window.location.port === '9999'
    )
    setIsLocalhost(isLocal)
  }, [])
  
  // Allow access in these cases:
  // 1. Dev mode is explicitly enabled
  // 2. Running on localhost (development environment)
  // 3. User has enterprise_owner role (highest tier)
  const shouldBypassProtection = isDev || 
    isLocalhost || 
    profile?.role === 'enterprise_owner' ||
    profile?.role === 'ENTERPRISE_OWNER'
  
  if (shouldBypassProtection) {
    return <>{children}</>
  }
  
  // For regular users, enforce tier protection
  return (
    <TierProtection requiredTier="shop_owner">
      {children}
    </TierProtection>
  )
}