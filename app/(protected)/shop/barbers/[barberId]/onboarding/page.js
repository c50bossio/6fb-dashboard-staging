'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import BarberOnboardingFlow from '@/components/shop/BarberOnboardingFlow'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function BarberOnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const barberId = params.barberId
  const isWelcome = searchParams.get('welcome') === 'true'
  const [showWelcome, setShowWelcome] = useState(isWelcome)

  const handleOnboardingComplete = () => {
    router.push('/shop/barbers?success=onboarding_complete')
  }

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Barber Added Successfully!
          </h1>
          
          <p className="text-gray-600 mb-6">
            The barber has been created and will receive an email invitation to set up their password. 
            Let's now complete their onboarding process.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => setShowWelcome(false)}
              className="w-full bg-olive-600 text-white py-2 px-4 rounded-lg hover:bg-olive-700 transition-colors"
            >
              Start Onboarding Process
            </button>
            
            <button
              onClick={() => router.push('/shop/barbers')}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Return to Barber Management
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BarberOnboardingFlow 
        barberId={barberId} 
        onComplete={handleOnboardingComplete}
      />
    </div>
  )
}