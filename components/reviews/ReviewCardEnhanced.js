'use client'

import { 
  EyeIcon, 
  CalendarDaysIcon,
  ScissorsIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useState } from 'react'

export default function ReviewCardEnhanced({ 
  review, 
  onViewDetails = null,
  onBookBarber = null,
  showAttribution = true,
  showActions = true,
  showBookingCTA = true,
  barbershopSlug = null,
  compact = false 
}) {
  const [showServices, setShowServices] = useState(false)
  const [loadingServices, setLoadingServices] = useState(false)
  const [barberServices, setBarberServices] = useState([])

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <StarIconSolid
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'certain': return 'bg-green-100 text-green-800'
      case 'high': return 'bg-blue-100 text-blue-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800'
      case 'negative': return 'bg-red-100 text-red-800'
      case 'neutral': return 'bg-gray-100 text-gray-800'
      case 'mixed': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const loadBarberServices = async (barberId) => {
    if (!barberId || barberServices.length > 0) return
    
    setLoadingServices(true)
    try {
      const response = await fetch(`/api/barbers/${barberId}/services`)
      if (response.ok) {
        const data = await response.json()
        setBarberServices(data.services || [])
      } else {
        // No fallback - show empty state if services can't be loaded
        setBarberServices([])
        console.error('Failed to load barber services:', response.status)
      }
    } catch (error) {
      console.error('Error loading services:', error)
      setBarberServices([])
    } finally {
      setLoadingServices(false)
    }
  }

  const handleBarberClick = () => {
    if (review.attribution?.barber?.id) {
      setShowServices(!showServices)
      if (!showServices) {
        loadBarberServices(review.attribution.barber.id)
      }
    }
  }

  return (
    <div className="border-b border-gray-200 hover:bg-gray-50 transition-all">
      {/* Main Review Card */}
      <div className="p-6">
        <div className="flex space-x-4">
          <div className="flex-shrink-0">
            {review.reviewerPhoto ? (
              <img
                src={review.reviewerPhoto}
                alt={review.reviewerName}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {review.reviewerName?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900">{review.reviewerName}</p>
                {renderStars(review.starRating)}
                <span className="text-sm text-gray-500">
                  {new Date(review.reviewDate).toLocaleDateString()}
                </span>
              </div>
              
              {showActions && (
                <div className="flex items-center space-x-2">
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(review)}
                      className="text-olive-600 hover:text-olive-800 text-sm font-medium"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  )}
                  {review.reviewUrl && (
                    <a
                      href={review.reviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View on Google
                    </a>
                  )}
                </div>
              )}
            </div>
            
            <p className="text-gray-700 mb-3">{review.reviewText}</p>
            
            {showAttribution && (
              <div className="flex flex-wrap items-center gap-3">
                {review.attribution?.barber ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Attributed to:</span>
                    <button
                      onClick={handleBarberClick}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-olive-100 text-olive-800 hover:bg-olive-200 transition-colors cursor-pointer"
                    >
                      {review.attribution.barber.name}
                      {showBookingCTA && (
                        <CalendarDaysIcon className="h-3 w-3 ml-1" />
                      )}
                    </button>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(review.attribution.confidence)}`}>
                      {review.attribution.confidence} ({Math.round(review.attribution.confidenceScore)}%)
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(review.attribution.sentiment)}`}>
                      {review.attribution.sentiment}
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Unattributed
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services & Booking Section */}
      {showServices && review.attribution?.barber && (
        <div className="bg-gradient-to-r from-olive-50 to-green-50 border-t border-olive-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-900 flex items-center">
                <ScissorsIcon className="h-4 w-4 mr-2 text-olive-600" />
                Services by {review.attribution.barber.name}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Book the same great service mentioned in this review
              </p>
            </div>
            {barbershopSlug && (
              <Link
                href={`/barber/${barbershopSlug}/${review.attribution.barber.slug || review.attribution.barber.id}`}
                className="text-sm text-olive-600 hover:text-olive-800 font-medium flex items-center"
              >
                View Full Profile
                <ArrowRightIcon className="h-3 w-3 ml-1" />
              </Link>
            )}
          </div>

          {loadingServices ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto"></div>
            </div>
          ) : barberServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {barberServices.slice(0, 3).map(service => (
                <div key={service.id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <h5 className="font-medium text-gray-900">{service.name}</h5>
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm text-gray-500">{service.duration} min</span>
                    <span className="font-bold text-olive-600">${service.price}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <ScissorsIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No services available at this time</p>
              <p className="text-xs mt-1">Please check back later or contact the barbershop directly</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (onBookBarber) {
                  onBookBarber(review.attribution.barber)
                } else {
                  window.location.href = `/book?barber=${review.attribution.barber.id}`
                }
              }}
              className="flex-1 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors font-medium flex items-center justify-center"
            >
              <CalendarDaysIcon className="h-5 w-5 mr-2" />
              Book Appointment with {review.attribution.barber.name.split(' ')[0]}
            </button>
            <button
              onClick={() => window.location.href = `/book`}
              className="px-4 py-2 border border-olive-600 text-olive-600 rounded-lg hover:bg-olive-50 transition-colors font-medium"
            >
              View All Barbers
            </button>
          </div>

          {/* Trust Indicator */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Why book with {review.attribution.barber.name.split(' ')[0]}?</strong> This verified review 
              shows they deliver excellent service with a {review.starRating}-star experience.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}