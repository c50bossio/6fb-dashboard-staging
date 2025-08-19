'use client'

import TierProtection from '@/components/TierProtection'

/**
 * Shop Layout - Requires shop_owner tier or higher
 * This protects all routes under /shop/* from unauthorized access
 */
export default function ShopLayout({ children }) {
  return (
    <TierProtection requiredTier="shop_owner">
      {children}
    </TierProtection>
  )
}