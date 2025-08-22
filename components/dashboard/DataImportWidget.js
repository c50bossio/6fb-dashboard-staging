'use client'

import {
  DocumentArrowUpIcon,
  ArrowRightIcon,
  SparklesIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '../SupabaseAuthProvider'

/**
 * Post-Onboarding Data Import Widget
 * Following industry best practice: data import happens after core setup completion
 * Inspired by Stripe, Shopify, Square onboarding patterns
 */
export default function DataImportWidget({ profile, onStartImport }) {
  const { user } = useAuth()
  const [showWidget, setShowWidget] = useState(false)
  const [importProgress, setImportProgress] = useState(null)
  
  // Only show widget if:
  // 1. User has completed onboarding 
  // 2. User has a barbershop (barbershop_id exists)
  // 3. No previous successful import detected
  useEffect(() => {
    const shouldShow = 
      profile?.onboarding_completed && 
      (profile?.shop_id || profile?.barbershop_id) &&
      !localStorage.getItem('data_import_completed')
    
    setShowWidget(shouldShow)
    
    // Check for ongoing import progress
    const savedProgress = localStorage.getItem('data_import_progress')
    if (savedProgress) {
      try {
        setImportProgress(JSON.parse(savedProgress))
      } catch (e) {
        console.warn('Invalid import progress data')
      }
    }
  }, [profile])
  
  const handleStartImport = () => {
    // Track the start of import flow
    if (typeof window !== 'undefined') {
      // Could integrate with analytics here
      console.log('🚀 Starting post-onboarding data import')
    }
    
    // Navigate to dedicated import page or trigger modal
    if (onStartImport) {
      onStartImport()
    } else {
      // Default: navigate to import page
      window.location.href = '/dashboard/import'
    }
  }
  
  const dismissWidget = () => {
    setShowWidget(false)
    localStorage.setItem('data_import_dismissed', 'true')
  }
  
  // Don't render if conditions aren't met
  if (!showWidget) {
    return null
  }
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <DocumentArrowUpIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Import Your Data
              </h3>
              <SparklesIcon className="h-5 w-5 text-blue-500" />
            </div>
            
            <p className="text-gray-600 mb-4 leading-relaxed">
              Ready to bring over your existing customers, appointments, and service history? 
              Our import tool supports data from Booksy, Square, Schedulicity, Acuity, and Trafft.
            </p>
            
            {importProgress ? (
              // Show progress if import is ongoing
              <div className="bg-white rounded-lg p-4 border border-blue-100 mb-4">
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Import in Progress
                    </div>
                    <div className="text-sm text-gray-600">
                      {importProgress.step || 'Processing your data...'}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress.percentage || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Show benefits/features
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span>Customer profiles with contact information</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span>Appointment history and booking patterns</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span>Service pricing and staff details</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleStartImport}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                disabled={!!importProgress}
              >
                {importProgress ? 'Import Running...' : 'Start Import'}
                {!importProgress && <ArrowRightIcon className="h-4 w-4 ml-2" />}
              </button>
              
              {!importProgress && (
                <button
                  onClick={dismissWidget}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Maybe later
                </button>
              )}
            </div>
          </div>
        </div>
        
        {!importProgress && (
          <button
            onClick={dismissWidget}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}