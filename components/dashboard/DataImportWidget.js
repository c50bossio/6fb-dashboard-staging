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
import { createClient } from '@supabase/supabase-js'

/**
 * Post-Onboarding Data Import Widget
 * Following industry best practice: data import happens after core setup completion
 * Inspired by Stripe, Shopify, Square onboarding patterns
 */
export default function DataImportWidget({ profile, onStartImport }) {
  const { user } = useAuth()
  const [showWidget, setShowWidget] = useState(false)
  const [importProgress, setImportProgress] = useState(null)
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  // Only show widget if:
  // 1. User has completed onboarding 
  // 2. User has a barbershop (barbershop_id exists)
  // 3. No existing customer data in the database
  useEffect(() => {
    const checkShouldShowWidget = async () => {
      // Basic requirements check
      if (!profile?.onboarding_completed || 
          !(profile?.shop_id || profile?.barbershop_id)) {
        setShowWidget(false)
        return
      }
      
      const barbershopId = profile?.shop_id || profile?.barbershop_id
      
      // Check if customers already exist for this barbershop
      const { data: existingCustomers, error } = await supabase
        .from('customers')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .limit(1)
      
      // If customers exist, don't show the import widget
      if (!error && existingCustomers && existingCustomers.length > 0) {
        setShowWidget(false)
        return
      }
      
      // No customers exist, show the widget
      setShowWidget(true)
      
      // Check for ongoing import progress
      const savedProgress = localStorage.getItem('data_import_progress')
      if (savedProgress) {
        try {
          setImportProgress(JSON.parse(savedProgress))
        } catch (e) {
          console.warn('Invalid import progress data')
        }
      }
    }
    
    checkShouldShowWidget()
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
    <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 border border-blue-300 rounded-2xl p-8 shadow-lg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white bg-opacity-10 rounded-full"></div>
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-start gap-6 flex-1">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <DocumentArrowUpIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-bold text-white">
                🚀 Ready to Import Your Data?
              </h3>
              <SparklesIcon className="h-6 w-6 text-yellow-300" />
            </div>
            
            <p className="text-blue-100 mb-6 leading-relaxed text-lg">
              Seamlessly transfer your existing customers, appointments, and service history. 
              Our smart import tool supports CSV files from <span className="font-semibold text-white">Booksy, Square, Schedulicity, Acuity, and Trafft</span>.
            </p>
            
            <div className="bg-white bg-opacity-15 rounded-xl p-4 mb-6 backdrop-blur-sm">
              <div className="text-sm font-medium text-white mb-2">⚡ Quick Setup - Takes 5 minutes</div>
              <div className="text-blue-100 text-sm">
                Our intelligent matching system automatically maps your data fields and handles duplicates.
              </div>
            </div>
            
            {importProgress ? (
              // Show progress if import is ongoing
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <ClockIcon className="h-6 w-6 text-yellow-300" />
                  <div>
                    <div className="text-sm font-bold text-white">
                      Import in Progress
                    </div>
                    <div className="text-sm text-blue-100">
                      {importProgress.step || 'Processing your data...'}
                    </div>
                  </div>
                </div>
                <div className="bg-white bg-opacity-30 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-yellow-300 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress.percentage || 0}%` }}
                  />
                </div>
              </div>
            ) : (
              // Show benefits/features
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-blue-100">
                  <CheckCircleIcon className="h-5 w-5 text-green-300 flex-shrink-0" />
                  <span className="font-medium">Customer profiles with contact info</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-100">
                  <CheckCircleIcon className="h-5 w-5 text-green-300 flex-shrink-0" />
                  <span className="font-medium">Appointment history & patterns</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-100">
                  <CheckCircleIcon className="h-5 w-5 text-green-300 flex-shrink-0" />
                  <span className="font-medium">Service pricing & staff details</span>
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