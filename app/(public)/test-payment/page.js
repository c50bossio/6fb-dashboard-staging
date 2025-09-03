'use client'

import FinancialSetupEnhanced from '@/components/onboarding/FinancialSetupEnhanced'

export default function TestPaymentPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Payment Setup Test</h1>
          <p className="text-gray-600 mb-8">
            Testing the FinancialSetupEnhanced component without authentication
          </p>
          <FinancialSetupEnhanced />
        </div>
      </div>
    </div>
  )
}