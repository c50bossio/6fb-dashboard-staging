'use client'

import PaymentProcessingSettings from '@/components/settings/PaymentProcessingSettings'

export default function PaymentProcessingPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Processing</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your payment processing, Stripe Connect, and payout settings
        </p>
      </div>
      
      <PaymentProcessingSettings />
    </div>
  )
}