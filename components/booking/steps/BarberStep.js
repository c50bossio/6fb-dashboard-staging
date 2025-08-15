'use client'

import { useState, useEffect } from 'react'
import { StarIcon, ClockIcon, ScissorsIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

export default function BarberStep({ bookingData, onNext, onBack }) {
  const [barbers, setBarbers] = useState([])
  const [selectedBarber, setSelectedBarber] = useState(bookingData.barber)
  const [loading, setLoading] = useState(true)
  const [filterBy, setFilterBy] = useState('all') // all, available, favorites
  
  useEffect(() => {
    loadBarbers()
  }, [bookingData.location])
  
  const loadBarbers = async () => {
    try {
      const Barbers = [
        {
          id: 'barber_1',
          name: 'Marcus Johnson',
          title: 'Master Barber',
          experience: '12 years',
          rating: 4.9,
          reviewCount: 486,
          image: '/images/barber-marcus.jpg',
          specialties: ['Fades', 'Beard Styling', 'Hair Design'],
          availability: 'Available today',
          nextAvailable: '2:00 PM',
          bio: 'Specializing in modern cuts and classic styles. Known for precision fades and detailed work.',
          services: [
            { id: 'srv_1', name: 'Classic Haircut', duration: 30, price: 35 },
            { id: 'srv_2', name: 'Fade & Design', duration: 45, price: 45 },
            { id: 'srv_3', name: 'Beard Trim', duration: 20, price: 20 },
            { id: 'srv_4', name: 'Full Service', duration: 60, price: 65 }
          ],
          stats: {
            completedCuts: 3420,
            repeatClients: 78,
            responseTime: '5 min'
          },
          schedule: {
            monday: '9:00 AM - 6:00 PM',
            tuesday: '9:00 AM - 6:00 PM',
            wednesday: '9:00 AM - 6:00 PM',
            thursday: '9:00 AM - 7:00 PM',
            friday: '9:00 AM - 7:00 PM',
            saturday: '8:00 AM - 5:00 PM',
            sunday: 'Off'
          }
        },
        {
          id: 'barber_2',
          name: 'David Chen',
          title: 'Senior Barber',
          experience: '8 years',
          rating: 4.8,
          reviewCount: 312,
          image: '/images/barber-david.jpg',
          specialties: ['Asian Hair', 'Texture Cuts', 'Color'],
          availability: 'Available today',
          nextAvailable: '3:30 PM',
          bio: 'Expert in working with all hair textures. Certified colorist and style consultant.',
          services: [
            { id: 'srv_1', name: 'Classic Haircut', duration: 35, price: 35 },
            { id: 'srv_2', name: 'Fade & Design', duration: 50, price: 45 },
            { id: 'srv_5', name: 'Color Service', duration: 90, price: 85 },
            { id: 'srv_6', name: 'Perm/Texture', duration: 120, price: 120 }
          ],
          stats: {
            completedCuts: 2156,
            repeatClients: 82,
            responseTime: '10 min'
          },
          schedule: {
            monday: '10:00 AM - 7:00 PM',
            tuesday: '10:00 AM - 7:00 PM',
            wednesday: 'Off',
            thursday: '10:00 AM - 7:00 PM',
            friday: '10:00 AM - 8:00 PM',
            saturday: '9:00 AM - 6:00 PM',
            sunday: '10:00 AM - 4:00 PM'
          }
        },
        {
          id: 'barber_3',
          name: 'Tony Rodriguez',
          title: 'Barber',
          experience: '5 years',
          rating: 4.7,
          reviewCount: 198,
          image: '/images/barber-tony.jpg',
          specialties: ['Quick Cuts', 'Kids Cuts', 'Traditional'],
          availability: 'Available today',
          nextAvailable: '2:30 PM',
          bio: 'Fast and efficient service without compromising quality. Great with kids!',
          services: [
            { id: 'srv_1', name: 'Classic Haircut', duration: 25, price: 30 },
            { id: 'srv_7', name: 'Kids Cut', duration: 20, price: 20 },
            { id: 'srv_3', name: 'Beard Trim', duration: 15, price: 18 },
            { id: 'srv_8', name: 'Quick Trim', duration: 15, price: 25 }
          ],
          stats: {
            completedCuts: 1532,
            repeatClients: 71,
            responseTime: '3 min'
          },
          schedule: {
            monday: '8:00 AM - 5:00 PM',
            tuesday: '8:00 AM - 5:00 PM',
            wednesday: '8:00 AM - 5:00 PM',
            thursday: '8:00 AM - 5:00 PM',
            friday: '8:00 AM - 6:00 PM',
            saturday: '8:00 AM - 4:00 PM',
            sunday: 'Off'
          }
        },
        {
          id: 'barber_any',
          name: 'First Available',
          title: 'Any Available Barber',
          experience: '',
          rating: 0,
          reviewCount: 0,
          image: null,
          specialties: [],
          availability: 'Fastest booking',
          nextAvailable: '1:30 PM',
          bio: 'Book with the first available barber for the quickest appointment.',
          services: [],
          isAnyBarber: true
        }
      ]
      
      setBarbers(mockBarbers)
      setLoading(false)
    } catch (error) {
      console.error('Error loading barbers:', error)
      setLoading(false)
    }
  }
  
  const filteredBarbers = barbers.filter(barber => {
    if (filterBy === 'available') {
      return barber.availability === 'Available today'
    }
    if (filterBy === 'favorites') {
      return barber.rating >= 4.8
    }
    return true
  })
  
  const handleBarberSelect = (barber) => {
    setSelectedBarber(barber.id)
  }
  
  const handleContinue = () => {
    const barber = barbers.find(b => b.id === selectedBarber)
    if (barber) {
      onNext({
        barber: barber.id,
        barberDetails: barber
      })
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Barber</h2>
        <p className="text-gray-600">Select a barber or choose first available for the quickest appointment</p>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        {[
          { value: 'all', label: 'All Barbers' },
          { value: 'available', label: 'Available Today' },
          { value: 'favorites', label: 'Top Rated' }
        ].map(filter => (
          <button
            key={filter.value}
            onClick={() => setFilterBy(filter.value)}
            className={`px-4 py-2 font-medium text-sm transition-all ${
              filterBy === filter.value
                ? 'text-olive-600 border-b-2 border-olive-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      
      {/* Barber Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
          {filteredBarbers.map(barber => (
            <div
              key={barber.id}
              onClick={() => handleBarberSelect(barber)}
              className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                selectedBarber === barber.id
                  ? 'border-olive-500 bg-olive-50 ring-2 ring-olive-200'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              } ${barber.isAnyBarber ? 'bg-gradient-to-br from-olive-50 to-gold-50' : ''}`}
            >
              {barber.isAnyBarber ? (
                <div className="text-center py-4">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-olive-500 to-gold-500 rounded-full flex items-center justify-center mb-4">
                    <CalendarIcon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{barber.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{barber.title}</p>
                  <div className="mt-4 inline-flex items-center px-3 py-1 bg-moss-100 text-moss-900 rounded-full text-sm font-medium">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Next: {barber.nextAvailable}
                  </div>
                  <p className="text-sm text-gray-600 mt-3">{barber.bio}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-start space-x-4">
                    {/* Barber Image */}
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex-shrink-0">
                      {barber.image ? (
                        <img
                          src={barber.image}
                          alt={barber.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ScissorsIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    
                    {/* Barber Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{barber.name}</h3>
                      <p className="text-sm text-gray-600">{barber.title} • {barber.experience}</p>
                      
                      {/* Rating */}
                      <div className="flex items-center mt-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <StarIconSolid
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(barber.rating) ? 'text-yellow-400' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-sm font-medium">{barber.rating}</span>
                        <span className="ml-1 text-sm text-gray-500">({barber.reviewCount})</span>
                      </div>
                      
                      {/* Availability */}
                      <div className="mt-2 flex items-center text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          barber.availability === 'Available today'
                            ? 'bg-moss-100 text-moss-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {barber.nextAvailable}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Specialties */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {barber.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                  
                  {/* Bio */}
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{barber.bio}</p>
                  
                  {/* Stats */}
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Cuts</p>
                      <p className="text-sm font-semibold">{barber.stats.completedCuts.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Repeat</p>
                      <p className="text-sm font-semibold">{barber.stats.repeatClients}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Response</p>
                      <p className="text-sm font-semibold">{barber.stats.responseTime}</p>
                    </div>
                  </div>
                </>
              )}
              
              {/* Selection Indicator */}
              {selectedBarber === barber.id && (
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
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
        >
          Back
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!selectedBarber}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            selectedBarber
              ? 'bg-olive-600 text-white hover:bg-olive-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Select Service
        </button>
      </div>
    </div>
  )
}