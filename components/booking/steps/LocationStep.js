'use client'

import { useState, useEffect } from 'react'
import { MapPinIcon, PhoneIcon, ClockIcon, StarIcon } from '@heroicons/react/24/outline'
import bookingAPI from '@/lib/booking-api'
import { LocationSkeleton } from '../LoadingSkeletons'

export default function LocationStep({ bookingData, onNext }) {
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(bookingData.location)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState(null)
  
  useEffect(() => {
    loadLocations()
  }, [])
  
  const loadLocations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch real barbershop locations from API
      const barbershops = await bookingAPI.getBarbershops()
      
      // Transform API data to match component format
      const formattedLocations = barbershops.map((shop, index) => ({
        id: shop.id || `barbershop_${index + 1}`,
        name: shop.name || `6FB Location ${index + 1}`,
        address: shop.address || 'Address not available',
        phone: shop.phone || '(555) 000-0000',
        distance: shop.distance || `${(Math.random() * 5).toFixed(1)} miles`,
        rating: shop.rating || 4.5 + Math.random() * 0.5,
        reviewCount: shop.review_count || Math.floor(Math.random() * 500),
        image: shop.image_url || null,
        coordinates: shop.coordinates || { lat: 40.7128, lng: -74.0060 },
        hours: {
          today: shop.hours_today || '9:00 AM - 7:00 PM',
          status: shop.is_open ? 'Open' : 'Closed'
        },
        amenities: shop.amenities || ['WiFi', 'Parking'],
        barberCount: shop.barber_count || shop.staff_count || 5
      }))
      
      setLocations(formattedLocations)
      setLoading(false)
    } catch (error) {
      console.error('Error loading locations:', error)
      setError('Failed to load barbershop locations. Please try again.')
      setLoading(false)
    }
  }
  
  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleLocationSelect = (location) => {
    setSelectedLocation(location.id)
  }
  
  const handleContinue = () => {
    const location = locations.find(loc => loc.id === selectedLocation)
    if (location) {
      onNext({
        location: location.id,
        locationDetails: location
      })
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Location</h2>
        <p className="text-gray-600">Select the barbershop location you'd like to visit</p>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="text-sm">{error}</p>
          <button 
            onClick={loadLocations}
            className="text-sm font-medium text-red-600 hover:text-red-800 mt-1"
          >
            Try again
          </button>
        </div>
      )}
      
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by location name or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
        />
        <MapPinIcon className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
      </div>
      
      {/* Location Cards - Mobile Optimized */}
      {loading ? (
        <LocationSkeleton />
      ) : (
        <div className="space-y-3 md:space-y-4 max-h-96 overflow-y-auto">
          {filteredLocations.map(location => (
            <div
              key={location.id}
              onClick={() => handleLocationSelect(location)}
              className={`relative border rounded-lg p-3 md:p-4 cursor-pointer transition-all touch-manipulation ${
                selectedLocation === location.id
                  ? 'border-olive-500 bg-olive-50 ring-2 ring-olive-200'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md active:bg-gray-50'
              }`}
            >
              <div className="flex items-start space-x-3 md:space-x-4">
                {/* Location Image - Mobile Optimized */}
                <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-200 rounded-lg flex-shrink-0">
                  {location.image ? (
                    <img
                      src={location.image}
                      alt={location.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <MapPinIcon className="h-6 w-6 md:h-8 md:w-8" />
                    </div>
                  )}
                </div>
                
                {/* Location Details - Mobile Optimized */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                    </div>
                    
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        location.hours.status === 'Open' 
                          ? 'bg-moss-100 text-moss-900' 
                          : 'bg-softred-100 text-softred-900'
                      }`}>
                        {location.hours.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{location.distance}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-3 text-sm">
                    <div className="flex items-center text-gray-600">
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      {location.phone}
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {location.hours.today}
                    </div>
                    
                    <div className="flex items-center">
                      <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="font-medium">{location.rating}</span>
                      <span className="text-gray-500 ml-1">({location.reviewCount})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs text-gray-500">{location.barberCount} barbers available</span>
                    {location.amenities.length > 0 && (
                      <>
                        <span className="text-gray-300">•</span>
                        <div className="flex space-x-2">
                          {location.amenities.slice(0, 3).map((amenity, index) => (
                            <span key={index} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Selection Indicator */}
              {selectedLocation === location.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-olive-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!selectedLocation}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            selectedLocation
              ? 'bg-olive-600 text-white hover:bg-olive-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Select Barber
        </button>
      </div>
    </div>
  )
}