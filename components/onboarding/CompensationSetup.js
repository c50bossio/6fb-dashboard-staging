/**
 * Compensation Setup Onboarding Component
 * Integrates shop default compensation configuration into the onboarding flow
 * Critical step to establish compensation structure before adding staff
 */

'use client'

import {
  DollarSignIcon,
  PercentIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  ChartBarIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useOnboardingSession } from '@/contexts/OnboardingContext'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { getTenant } from '@/lib/tenant-resolver-client'
import ShopDefaultCompensation from '@/components/compensation/ShopDefaultCompensation'

export default function CompensationSetup({ data = {}, updateData, onComplete }) {
  const {
    sessionData,
    progress,
    saveStep,
    markStepComplete,
    isStepCompleted,
    saveStatus,
    hasUnsavedChanges,
    hasLocalChanges
  } = useOnboardingSession('compensation_setup')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [barbershopId, setBarbershopId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [currentDefaults, setCurrentDefaults] = useState(null)
  const [setupComplete, setSetupComplete] = useState(false)

  const supabase = createClient()

  // Initialize barbershop and load existing compensation data
  useEffect(() => {
    const initializeCompensation = async () => {
      setLoading(true)
      setError('')

      try {
        // Get user profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('User not authenticated')
        }

        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, shop_id, barbershop_id, role')
          .eq('id', user.id)
          .single()

        if (!userProfile) {
          throw new Error('User profile not found')
        }

        setProfile(userProfile)

        // Get barbershop ID
        let shopId
        try {
          const { barbershopId: resolvedShopId } = await getTenant(userProfile.id, { supabase })
          shopId = resolvedShopId
        } catch (error) {
          console.error('Error getting barbershop ID:', error)
          throw new Error('Unable to determine barbershop')
        }

        if (!shopId) {
          throw new Error('Barbershop not found')
        }

        setBarbershopId(shopId)

        // Load existing compensation defaults
        const response = await fetch(`/api/v1/compensation/unified?type=shop_defaults&barbershopId=${shopId}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.shop_defaults) {
            setCurrentDefaults(data.shop_defaults)
            setSetupComplete(true)
          }
        }

      } catch (error) {
        console.error('Error initializing compensation setup:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    initializeCompensation()
  }, [])

  const handleCompensationUpdate = async (compensationData) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/v1/compensation/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_shop_defaults',
          data: {
            ...compensationData,
            barbershop_id: barbershopId
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save compensation defaults')
      }

      const result = await response.json()
      setCurrentDefaults(result.shop_defaults)
      setSetupComplete(true)
      setSuccess('Compensation defaults saved successfully!')

      // Save to onboarding session
      await saveStep({
        stepData: {
          compensation_defaults: result.shop_defaults,
          setup_complete: true
        },
        stepCompleted: true
      })

      // Mark step as complete and continue
      setTimeout(() => {
        markStepComplete('compensation_setup')
        if (onComplete) {
          onComplete({
            ...data,
            compensation_defaults: result.shop_defaults,
            compensation_setup_complete: true
          })
        }
      }, 1500)

    } catch (error) {
      console.error('Error saving compensation defaults:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const modelExplanations = {
    commission: {
      title: 'Commission Split',
      description: 'Shop takes a percentage of each service, barber keeps the rest',
      pros: ['Simple to understand', 'Motivates high performance', 'Scales with business'],
      cons: ['Income varies with bookings', 'Less predictable for barbers']
    },
    booth_rent: {
      title: 'Booth Rental',
      description: 'Barber pays fixed rent, keeps 100% of service revenue',
      pros: ['Predictable costs', 'Barber keeps all earnings', 'Simple accounting'],
      cons: ['Fixed expense regardless of bookings', 'Risk for low-volume periods']
    },
    tiered: {
      title: 'Tiered Commission',
      description: 'Commission rate changes based on performance levels',
      pros: ['Rewards top performers', 'Motivates growth', 'Fair for all skill levels'],
      cons: ['More complex to track', 'Requires performance monitoring']
    },
    hybrid: {
      title: 'Hybrid Model',
      description: 'Combines base rent with commission on higher revenue',
      pros: ['Balanced risk/reward', 'Predictable base income', 'Incentivizes growth'],
      cons: ['Most complex to manage', 'Requires careful calculation']
    }
  }

  if (loading && !currentDefaults) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading compensation setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <DollarSignIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Set Up Staff Compensation
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Establish your default compensation model that will apply to all staff members. 
          You can customize individual arrangements later if needed.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
            <div className="text-sm text-green-700">{success}</div>
          </div>
        </div>
      )}

      {/* Why This Matters */}
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <InformationCircleIcon className="h-6 w-6 text-blue-500 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Why Set Up Compensation Now?
            </h3>
            <div className="text-blue-800 space-y-2">
              <p>• <strong>Clear expectations:</strong> Staff know how they'll be paid from day one</p>
              <p>• <strong>Consistent structure:</strong> All barbers start with the same base terms</p>
              <p>• <strong>Easy management:</strong> Change defaults to update all staff at once</p>
              <p>• <strong>Individual flexibility:</strong> Override defaults for specific arrangements later</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compensation Model Overview */}
      {!setupComplete && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Choose Your Compensation Model
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(modelExplanations).map(([key, model]) => (
              <div key={key} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center mb-3">
                  {key === 'commission' && <PercentIcon className="h-5 w-5 text-blue-500 mr-2" />}
                  {key === 'booth_rent' && <BuildingStorefrontIcon className="h-5 w-5 text-green-500 mr-2" />}
                  {key === 'tiered' && <ChartBarIcon className="h-5 w-5 text-purple-500 mr-2" />}
                  {key === 'hybrid' && <UsersIcon className="h-5 w-5 text-orange-500 mr-2" />}
                  <h4 className="font-medium text-gray-900">{model.title}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">{model.description}</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-medium text-green-700 mb-1">Pros:</p>
                    <ul className="text-green-600 space-y-1">
                      {model.pros.map((pro, index) => (
                        <li key={index}>• {pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-red-700 mb-1">Cons:</p>
                    <ul className="text-red-600 space-y-1">
                      {model.cons.map((con, index) => (
                        <li key={index}>• {con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compensation Configuration */}
      {barbershopId && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <ShopDefaultCompensation
            barbershopId={barbershopId}
            currentDefaults={currentDefaults}
            barbersUsingDefaults={0} // New shop, no existing barbers
            onUpdate={handleCompensationUpdate}
          />
        </div>
      )}

      {/* Setup Complete Message */}
      {setupComplete && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-green-900 mb-2">
            Compensation Setup Complete!
          </h3>
          <p className="text-green-800 mb-4">
            Your default compensation structure is now configured. When you add staff members, 
            they'll automatically inherit these settings, but you can customize individual arrangements as needed.
          </p>
          <div className="bg-white border border-green-200 rounded-md p-4 text-left">
            <h4 className="font-medium text-green-900 mb-2">What happens next:</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• All new barbers will use these default compensation terms</li>
              <li>• You can modify individual barber compensation in Staff Management</li>
              <li>• Changes to defaults will affect all barbers using default terms</li>
              <li>• Stripe integration will handle automatic payments and rent collection</li>
            </ul>
          </div>
        </div>
      )}

      {/* Next Step Preview */}
      {setupComplete && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <UsersIcon className="h-5 w-5 text-gray-500 mr-3" />
            <div>
              <h4 className="font-medium text-gray-900">Coming Next: Staff Setup</h4>
              <p className="text-sm text-gray-600">
                Add your barbers and stylists. They'll automatically inherit your compensation defaults.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}