'use client'

import { 
  ArrowLeftIcon,
  BuildingOfficeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import GlobalNavigation from '@/components/GlobalNavigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import ReviewsList from '@/components/reviews/ReviewsList'
import ReviewStats from '@/components/reviews/ReviewStats'
import { useAuth } from '@/components/SupabaseAuthProvider'
import useReviews from '@/hooks/useReviews'

export default function LocationReviewsPage() {
  const { user, profile } = useAuth()
  const params = useParams()
  const router = useRouter()
  const locationId = params.id
  
  const [locationInfo, setLocationInfo] = useState(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  
  // Get reviews for this location
  const { 
    reviews, 
    barbers,
    stats: reviewStats, 
    loading: reviewsLoading,
    refreshReviews,
    syncReviews 
  } = useReviews({ 
    locationId,
    autoLoad: true 
  })

  // Load location information
  useEffect(() => {
    const loadLocationInfo = async () => {
      try {
        setLoadingLocation(true)
        const response = await fetch(`/api/locations/${locationId}`)
        
        if (response.ok) {
          const data = await response.json()
          setLocationInfo(data.location)
        } else if (response.status === 404) {
          // Location not found, use fallback
          setLocationInfo({
            id: locationId,
            name: 'Demo Location',
            address: '123 Main Street',
            city: 'Los Angeles',
            state: 'CA',
            zip: '90001',
            phone: '(555) 123-4567'
          })
        }
      } catch (error) {
        console.error('Error loading location:', error)
        // Use fallback location info
        setLocationInfo({
          id: locationId,
          name: 'Location',
          address: 'Address not available'
        })
      } finally {
        setLoadingLocation(false)
      }
    }

    if (locationId) {
      loadLocationInfo()
    }
  }, [locationId])

  const handleSyncReviews = async () => {
    const result = await syncReviews()
    if (result.success) {
      // Show success message
      console.log('Reviews synced successfully')
    }
  }

  return (
    <ProtectedRoute>
      <GlobalNavigation />
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <div className="lg:ml-80 transition-all duration-300 ease-in-out pt-16 lg:pt-0">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              {/* Header with Breadcrumb */}
              <div className="mb-8">
                <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                  <Link 
                    href="/dashboard" 
                    className="hover:text-gray-900 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <span>→</span>
                  <Link 
                    href="/dashboard/locations" 
                    className="hover:text-gray-900 transition-colors"
                  >
                    Locations
                  </Link>
                  <span>→</span>
                  <span className="font-medium text-gray-900">
                    {locationInfo?.name || 'Loading...'}
                  </span>
                  <span>→</span>
                  <span className="font-medium text-gray-900">Reviews</span>
                </nav>
                
                <div className="md:flex md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <BuildingOfficeIcon className="h-8 w-8 text-olive-600" />
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                          {locationInfo?.name || 'Location'} Reviews
                        </h1>
                        <p className="mt-1 text-lg text-gray-600">
                          All customer reviews for this location
                        </p>
                      </div>
                    </div>
                    {locationInfo && (
                      <p className="text-sm text-gray-500 mt-2">
                        {locationInfo.address}, {locationInfo.city}, {locationInfo.state} {locationInfo.zip}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
                    <Link
                      href={`/dashboard/locations/${locationId}`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                    >
                      <ArrowLeftIcon className="h-4 w-4 mr-2" />
                      Back to Location
                    </Link>
                    <button
                      onClick={handleSyncReviews}
                      disabled={reviewsLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 transition-colors disabled:opacity-50"
                    >
                      <ArrowPathIcon className={`h-4 w-4 mr-2 ${reviewsLoading ? 'animate-spin' : ''}`} />
                      Sync Reviews
                    </button>
                  </div>
                </div>
              </div>

              {/* Review Statistics */}
              <div className="mb-8">
                <ReviewStats 
                  stats={reviewStats} 
                  showTrends={true}
                  compact={false}
                />
              </div>

              {/* Barber Performance Summary */}
              {barbers.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Barber Performance</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {barbers.map(barber => {
                      const barberReviews = reviews.filter(r => 
                        r.attribution?.barber?.id === barber.id
                      )
                      const avgRating = barberReviews.length > 0
                        ? (barberReviews.reduce((sum, r) => sum + r.starRating, 0) / barberReviews.length).toFixed(1)
                        : 'N/A'
                      
                      return (
                        <div key={barber.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            {barber.profile_image_url ? (
                              <img 
                                src={barber.profile_image_url} 
                                alt={`${barber.first_name} ${barber.last_name}`}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {barber.first_name?.charAt(0)}{barber.last_name?.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {barber.first_name} {barber.last_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {barberReviews.length} reviews • {avgRating} avg
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Reviews List */}
              <ReviewsList
                reviews={reviews}
                barbers={barbers}
                loading={reviewsLoading}
                onRefresh={refreshReviews}
                showFilters={true}
                showSearch={true}
                showAttribution={true}
                compact={false}
                className=""
              />

              {/* Help Text */}
              <div className="mt-8 bg-olive-50 border border-olive-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-olive-800">
                      Location Review Management
                    </h3>
                    <div className="mt-2 text-sm text-olive-700">
                      <p>This page shows all reviews for this specific location, including:</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>AI-powered attribution to individual barbers</li>
                        <li>Sentiment analysis and confidence scoring</li>
                        <li>Performance metrics for each barber</li>
                        <li>Real-time synchronization with Google My Business</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}