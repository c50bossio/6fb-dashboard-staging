'use client'

import UnifiedFinanceHub from '@/components/finance/UnifiedFinanceHub'

export default function FinancePage() {
  console.log('💰 FINANCE PAGE: Loading Finance Center...')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Main Content - Location context provided by global ShopSelector in navigation */}
      <UnifiedFinanceHub />
    </div>
  )
}