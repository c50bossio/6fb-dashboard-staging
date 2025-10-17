'use client'

import TierProtection from '@/components/TierProtection'

/**
 * Enterprise Layout - Requires enterprise tier
 * This protects all routes under /dashboard/enterprise/* from unauthorized access
 */
export default function EnterpriseLayout({ children }) {
  return (
    <TierProtection requiredTier="enterprise">
      {children}
    </TierProtection>
  )
}