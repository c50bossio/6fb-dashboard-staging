'use client'

import UnifiedFinanceHub from '@/components/finance/UnifiedFinanceHub'
import ContextBanner from '@/components/navigation/ContextBanner'
import ContextBreadcrumbs from '@/components/navigation/ContextBreadcrumbs'
import UnifiedContextSwitcher from '@/components/navigation/UnifiedContextSwitcher'

export default function FinancePage() {
  console.log('💰 FINANCE PAGE: Loading Finance Center...')
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Context Controls */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <ContextBreadcrumbs />
          <UnifiedContextSwitcher />
        </div>
      </div>
      
      {/* Context Banner */}
      <div className="px-4 sm:px-6 lg:px-8">
        <ContextBanner />
      </div>
      
      {/* Main Content */}
      <UnifiedFinanceHub />
    </div>
  )
}