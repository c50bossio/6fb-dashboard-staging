'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

/**
 * Tier Protection Component
 * Enforces tier-based access control for routes
 * 
 * @param {string} requiredTier - The minimum tier required ('individual', 'shop_owner', 'enterprise')
 * @param {React.ReactNode} children - Components to render if access is granted
 * @param {string} redirectTo - Where to redirect if access is denied (default: '/dashboard/upgrade')
 */
export default function TierProtection({ 
  requiredTier, 
  children, 
  redirectTo = '/dashboard/upgrade' 
}) {
  const { profile, loading, hasTierAccess } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile) {
      const hasAccess = hasTierAccess(requiredTier)
      
      if (!hasAccess) {
        console.log(`Access denied: User tier ${profile.subscription_tier} cannot access ${requiredTier} features`)
        router.push(`${redirectTo}?required=${requiredTier}`)
      }
    }
  }, [profile, loading, requiredTier, hasTierAccess, router, redirectTo])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Verifying access...</p>
          </div>
        </div>
      </div>
    )
  }

  // If no profile or no access, show loading (redirect will happen)
  if (!profile || !hasTierAccess(requiredTier)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Checking subscription...</p>
          </div>
        </div>
      </div>
    )
  }

  // Access granted
  return <>{children}</>
}

/**
 * Feature Gate Component
 * Shows upgrade prompt for features beyond user's tier
 * 
 * @param {string} requiredTier - The minimum tier required
 * @param {string} featureName - Name of the feature for display
 * @param {React.ReactNode} children - Components to render if access is granted
 */
export function FeatureGate({ requiredTier, featureName, children }) {
  const { hasTierAccess, subscriptionTier } = useAuth()
  const router = useRouter()
  
  const hasAccess = hasTierAccess(requiredTier)
  
  if (!hasAccess) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="mt-2 text-lg font-semibold text-gray-900">
            🔒 {featureName}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            This feature requires a {requiredTier.replace('_', ' ')} subscription
          </p>
          <p className="mt-1 text-xs text-gray-500">
            You currently have: {subscriptionTier.replace('_', ' ')}
          </p>
          <button
            onClick={() => router.push(`/dashboard/upgrade?feature=${encodeURIComponent(featureName)}&required=${requiredTier}`)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
          >
            Upgrade Now
            <svg className="ml-2 -mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}