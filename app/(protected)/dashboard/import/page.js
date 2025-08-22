'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import DataImportSetup from '../../../../components/onboarding/DataImportSetup'

/**
 * Post-Onboarding Data Import Page
 * Following industry best practice: dedicated import experience after core setup
 * Uses the existing DataImportSetup component in a dashboard context
 */
export default function DataImportPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  
  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading import tools...</p>
        </div>
      </div>
    )
  }
  
  // Redirect if not authenticated
  if (!user) {
    router.push('/login')
    return null
  }
  
  // Check if user has completed onboarding and has barbershop
  const canImport = profile?.onboarding_completed && (profile?.shop_id || profile?.barbershop_id)
  
  if (!canImport) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Complete Setup First
            </h3>
            <p className="text-gray-600 mb-6">
              You need to complete your barbershop setup before importing data. 
              This ensures your data has a proper place to live.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push('/onboarding')}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Complete Setup
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  const handleImportComplete = () => {
    // Mark import as completed
    localStorage.setItem('data_import_completed', 'true')
    localStorage.removeItem('data_import_progress')
    
    // Navigate back to dashboard
    router.push('/dashboard?import=success')
  }
  
  const handleBack = () => {
    router.push('/dashboard')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Back to Dashboard</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Import Your Data
                </h1>
                <p className="text-sm text-gray-600">
                  Bring over your existing customers, appointments, and service history
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            {/* Industry Best Practice Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">
                    Perfect Timing for Import
                  </h3>
                  <p className="text-sm text-blue-800">
                    You've completed your barbershop setup, so your data will be imported into a fully configured system. 
                    This approach ensures data integrity and follows industry best practices.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Import Component */}
            <DataImportSetup 
              profile={profile}
              onComplete={handleImportComplete}
              isStandalone={true} // Flag to indicate this is not part of onboarding flow
            />
          </div>
        </div>
      </div>
    </div>
  )
}