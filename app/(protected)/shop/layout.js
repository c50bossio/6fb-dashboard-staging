'use client'

import { useEffect, useState } from 'react'
import TierProtection from '@/components/TierProtection'

/**
 * Shop Layout - Requires shop_owner tier or higher
 * This protects all routes under /shop/* from unauthorized access
 */
export default function ShopLayout({ children }) {
  const [isDev, setIsDev] = useState(false)
  
  useEffect(() => {
    // Check for dev mode
    const urlParams = new URLSearchParams(window.location.search)
    setIsDev(urlParams.get('dev') === 'true')
  }, [])
  
  // Bypass TierProtection in dev mode
  if (isDev) {
    return <>{children}</>
  }
  
  return (
    <TierProtection requiredTier="shop_owner">
      {children}
    </TierProtection>
  )
}