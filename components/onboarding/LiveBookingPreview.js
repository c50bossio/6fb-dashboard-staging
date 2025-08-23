'use client'

import {
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  StarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  WifiIcon,
  TruckIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function LiveBookingPreview({ 
  businessData = {}, 
  className = '',
  isVisible = true 
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [animationClass, setAnimationClass] = useState('')

  // Trigger subtle animation when data changes
  useEffect(() => {
    if (Object.keys(businessData).length > 0) {
      setIsLoading(true)
      setAnimationClass('animate-pulse')
      
      const timer = setTimeout(() => {
        setIsLoading(false)
        setAnimationClass('animate-fade-in')
        
        setTimeout(() => setAnimationClass(''), 300)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [businessData.businessName, businessData.businessType, businessData.businessAddress])

  // Generate preview URL from business name
  const getPreviewUrl = () => {
    if (!businessData.businessName) return 'your-barbershop'
    return businessData.businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30)
  }

  const businessName = businessData.businessName || 'Your Business Name'
  const businessType = businessData.businessType || 'barbershop'
  const address = businessData.businessAddress || 'Your Business Address'
  const city = businessData.businessCity || 'Your City'
  const state = businessData.businessState || 'State'
  const phone = businessData.businessPhone || '(555) 123-4567'
  const description = businessData.businessDescription || `Professional ${businessType} services with experienced staff and quality service.`

  if (!isVisible) return null

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden ${className}`}>
      {/* Preview Header */}
      <div className="bg-gradient-to-r from-brand-50 to-brand-100 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-brand-700">Live Preview</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-brand-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Updating live</span>
          </div>
        </div>
        
        {/* Mock browser URL */}
        <div className="mt-2 bg-white rounded px-3 py-1 text-xs text-gray-600 border">
          bookedbarber.com/{getPreviewUrl()}
        </div>
      </div>

      {/* Preview Content */}
      <div className={`p-6 ${animationClass} transition-all duration-300`}>
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Updating preview...</p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className={`text-2xl font-bold text-gray-900 mb-2 transition-all duration-300 ${businessData.businessName ? 'opacity-100' : 'opacity-50'}`}>
                {businessName}
              </h1>
              
              <div className="flex items-center gap-2 mb-2">
                <div className={`
                  px-3 py-1 rounded-full text-sm font-medium transition-all duration-300
                  ${businessData.businessType === 'barbershop' ? 'bg-blue-100 text-blue-700' :
                    businessData.businessType === 'salon' ? 'bg-pink-100 text-pink-700' :
                    businessData.businessType === 'spa' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'}
                `}>
                  {businessType.charAt(0).toUpperCase() + businessType.slice(1)}
                </div>
                
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon key={star} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                  <span className="text-sm text-gray-600 ml-1">(4.8) · 127 reviews</span>
                </div>
              </div>

              <p className={`text-gray-600 mb-4 transition-all duration-300 ${businessData.businessDescription ? 'opacity-100' : 'opacity-50'}`}>
                {description}
              </p>

              {/* Business Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className={`flex items-center gap-2 transition-all duration-300 ${businessData.businessAddress ? 'opacity-100' : 'opacity-50'}`}>
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  <span>{address}, {city}, {state}</span>
                </div>
                
                <div className={`flex items-center gap-2 transition-all duration-300 ${businessData.businessPhone ? 'opacity-100' : 'opacity-50'}`}>
                  <PhoneIcon className="h-4 w-4 text-gray-400" />
                  <span>{phone}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <span>Mon-Fri: 9AM-7PM, Sat: 9AM-5PM</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="h-4 w-4 text-gray-400" />
                  <span>{businessData.numberOfChairs || 3} chairs available</span>
                </div>
              </div>

              {/* Amenities */}
              <div className="flex gap-2 mt-3">
                {businessData.wifiAvailable !== false && (
                  <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                    <WifiIcon className="h-3 w-3" />
                    <span>Free WiFi</span>
                  </div>
                )}
                {businessData.parkingAvailable !== false && (
                  <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    <TruckIcon className="h-3 w-3" />
                    <span>Parking</span>
                  </div>
                )}
                {businessData.wheelchairAccessible !== false && (
                  <div className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                    <BuildingOfficeIcon className="h-3 w-3" />
                    <span>Accessible</span>
                  </div>
                )}
              </div>
            </div>

            {/* Business image placeholder */}
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center ml-4 flex-shrink-0">
              <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Booking Button */}
        <div className="border-t pt-4">
          <button className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white py-3 px-4 rounded-lg hover:from-brand-700 hover:to-brand-800 transition-all duration-200 flex items-center justify-center gap-2 font-medium">
            <CalendarDaysIcon className="h-5 w-5" />
            Book Appointment Now
          </button>
          
          <p className="text-center text-xs text-gray-500 mt-2">
            Next available: Today at 2:30 PM
          </p>
        </div>

        {/* Value Indicators */}
        <div className="grid grid-cols-3 gap-3 mt-4 text-center">
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-sm font-semibold text-green-700">95%</div>
            <div className="text-xs text-green-600">On-time rate</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-sm font-semibold text-blue-700">24/7</div>
            <div className="text-xs text-blue-600">Online booking</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-2">
            <div className="text-sm font-semibold text-purple-700">4.8★</div>
            <div className="text-xs text-purple-600">Customer rating</div>
          </div>
        </div>
      </div>

      {/* Preview Footer */}
      <div className="bg-gray-50 px-4 py-2 text-center">
        <p className="text-xs text-gray-500">
          ✨ This is how customers will see your business online
        </p>
      </div>
    </div>
  )
}