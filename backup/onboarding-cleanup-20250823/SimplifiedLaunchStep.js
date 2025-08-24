'use client'

import { useState } from 'react'
import { 
  CheckCircleIcon, 
  CreditCardIcon, 
  ArrowRightIcon, 
  SparklesIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

export default function SimplifiedLaunchStep({ data, updateData, onNext }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSetupPayments = async () => {
    setLoading(true)
    
    try {
      // Save progress and mark payment setup as pending
      updateData({ 
        onboardingComplete: true,
        paymentSetupDeferred: false, // They're choosing to set up now
        paymentSetupPending: true 
      })
      
      // Save to session storage for return handling
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('onboarding_payment_flow', 'true')
        sessionStorage.setItem('onboarding_return_step', 'launch')
      }
      
      // Save progress to database
      const response = await fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'launch',
          stepData: {
            paymentSetupPending: true,
            timestamp: new Date().toISOString()
          }
        })
      })
      
      if (!response.ok) {
        console.warn('Failed to save progress, continuing anyway')
      }
      
      // Mark onboarding as complete (with payment pending)
      onNext()
      
      // Small delay to ensure modal closes before navigation
      setTimeout(() => {
        router.push('/shop/settings/payment-setup?from_onboarding=true')
      }, 100)
      
    } catch (error) {
      console.error('Error in payment setup:', error)
      setLoading(false)
    }
  }

  const handleLaunchWithoutPayments = () => {
    // Mark onboarding as complete with payments deferred
    updateData({ 
      onboardingComplete: true,
      paymentSetupDeferred: true 
    })
    // Go to dashboard
    onNext()
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-4 shadow-lg">
          <CheckCircleIcon className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Congratulations! 🎉
        </h2>
        <p className="text-xl text-gray-700 mb-2">
          Your barbershop is ready to launch
        </p>
        <p className="text-gray-600">
          One more step to unlock your full potential
        </p>
      </div>

      {/* Recommended Action Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-200 shadow-sm mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
              <CreditCardIcon className="w-7 h-7 text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Enable Online Payments
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Recommended
              </span>
            </div>
            <p className="text-gray-700 mb-4">
              Accept credit cards and unlock powerful features for your business
            </p>
            
            {/* Benefits List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Accept all major cards</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Next-day deposits</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Reduce no-shows by 67%</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Automatic reminders</span>
              </div>
            </div>

            {/* Bonus Credits Alert */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Limited Time Bonus
                  </p>
                  <p className="text-sm text-gray-700">
                    Get 50 free SMS credits + 100 email campaigns when you enable payments today
                  </p>
                </div>
              </div>
            </div>

            {/* Primary CTA */}
            <button
              onClick={handleSetupPayments}
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-base font-medium rounded-lg shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Setting up payments...
                </>
              ) : (
                <>
                  Enable Payments & Launch
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Skip Option */}
      <div className="text-center">
        <button
          onClick={handleLaunchWithoutPayments}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium underline-offset-4 hover:underline transition-colors"
        >
          Skip for now, I'll set up payments later
        </button>
        <p className="text-xs text-gray-500 mt-2">
          You can always enable payments from your dashboard
        </p>
      </div>

      {/* Trust Indicators */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="flex items-center justify-center gap-8 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span>Bank-level security</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>PCI compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <svg className="h-4" viewBox="0 0 60 25" fill="#635BFF">
              <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}