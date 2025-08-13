'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { 
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  CurrencyDollarIcon,
  ScissorsIcon,
  SparklesIcon,
  PhotoIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'

export default function BarberLandingPage() {
  const params = useParams()
  const { barbershop, barber } = params
  
  const [barberData, setBarberData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [showBookingModal, setShowBookingModal] = useState(false)

  useEffect(() => {
    loadBarberData()
  }, [barbershop, barber])

  const loadBarberData = async () => {
    try {
      // Fetch barber data from API
      const response = await fetch(`/api/public/barber/${barbershop}/${barber}`)
      
      if (response.ok) {
        const data = await response.json()
        setBarberData(data)
      } else {
        // Handle 404 - barber not found
        setBarberData(null)
      }
    } catch (error) {
      console.error('Error loading barber data:', error)
      setBarberData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  if (!barberData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Barber Not Found</h1>
        <p className="text-gray-600 mb-8">The barber profile you're looking for doesn't exist.</p>
        <Link href="/" className="text-amber-700 hover:text-amber-700">
          Return to Homepage
        </Link>
      </div>
    )
  }

  const {
    name,
    bio,
    avatar_url,
    cover_image_url,
    services = [],
    availability = {},
    portfolio = [],
    reviews = [],
    rating = 0,
    total_reviews = 0,
    years_experience = 0,
    specialties = [],
    social_links = {},
    contact_info = {},
    shop_info = {}
  } = barberData

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Cover Image */}
      <div className="relative h-64 md:h-80 lg:h-96">
        {cover_image_url ? (
          <Image
            src={cover_image_url}
            alt={`${name}'s cover`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600" />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-30" />
        
        {/* Shop Logo/Name */}
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2">
          <p className="text-sm font-semibold text-gray-900">{shop_info.name}</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-20 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              {/* Avatar */}
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-gray-200 overflow-hidden ring-4 ring-white">
                  {avatar_url ? (
                    <Image
                      src={avatar_url}
                      alt={name}
                      width={128}
                      height={128}
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Online Status */}
                <span className="absolute bottom-2 right-2 block h-4 w-4 rounded-full bg-green-400 ring-2 ring-white" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarSolidIcon 
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.floor(rating) 
                            ? 'text-yellow-400' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      {rating.toFixed(1)} ({total_reviews} reviews)
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    {years_experience} years experience
                  </span>
                </div>
                
                {/* Bio */}
                <p className="mt-3 text-gray-600 max-w-3xl">{bio}</p>
                
                {/* Specialties */}
                {specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {specialties.map((specialty, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                      >
                        <SparklesIcon className="h-3 w-3 mr-1" />
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Book Now Button */}
              <button
                onClick={() => setShowBookingModal(true)}
                className="px-6 py-3 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors shadow-lg"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column - Services & Pricing */}
          <div className="lg:col-span-2 space-y-8">
            {/* Services */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <ScissorsIcon className="h-6 w-6 mr-2 text-amber-700" />
                Services & Pricing
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <div 
                    key={service.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedService(service)
                      setShowBookingModal(true)
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Duration: {service.duration} minutes
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-amber-700">${service.price}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Portfolio */}
            {portfolio.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <PhotoIcon className="h-6 w-6 mr-2 text-amber-700" />
                  Portfolio
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {portfolio.map((item, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={item.image_url}
                        alt={item.title || `Portfolio ${index + 1}`}
                        fill
                        className="object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <ChatBubbleLeftIcon className="h-6 w-6 mr-2 text-amber-700" />
                  Customer Reviews
                </h2>
                
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4">
                      <div className="flex items-start space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {review.customer_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">{review.customer_name}</h4>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <StarSolidIcon 
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating 
                                      ? 'text-yellow-400' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Availability & Contact */}
          <div className="space-y-8">
            {/* Availability */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <CalendarDaysIcon className="h-6 w-6 mr-2 text-amber-700" />
                Availability
              </h2>
              
              <div className="space-y-2">
                {Object.entries(availability).map(([day, hours]) => (
                  <div key={day} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                    <span className="text-sm text-gray-600">
                      {hours.is_open ? `${hours.open} - ${hours.close}` : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowBookingModal(true)}
                className="w-full mt-4 px-4 py-2 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
              >
                Check Available Times
              </button>
            </div>

            {/* Contact & Location */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact & Location</h2>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{shop_info.name}</p>
                    <p className="text-sm text-gray-600">{shop_info.address}</p>
                    <p className="text-sm text-gray-600">{shop_info.city}, {shop_info.state} {shop_info.zip}</p>
                  </div>
                </div>
                
                {contact_info.phone && (
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <a href={`tel:${contact_info.phone}`} className="text-sm text-amber-700 hover:text-amber-700">
                      {contact_info.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {Object.keys(social_links).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">Follow Me</p>
                  <div className="flex space-x-3">
                    {social_links.instagram && (
                      <a href={social_links.instagram} target="_blank" rel="noopener noreferrer"
                         className="text-gray-400 hover:text-amber-700 transition-colors">
                        <span className="sr-only">Instagram</span>
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                        </svg>
                      </a>
                    )}
                    {social_links.facebook && (
                      <a href={social_links.facebook} target="_blank" rel="noopener noreferrer"
                         className="text-gray-400 hover:text-amber-700 transition-colors">
                        <span className="sr-only">Facebook</span>
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Book Appointment with {name}</h2>
              
              {/* Service Selection */}
              {!selectedService && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Select a Service</h3>
                  <div className="space-y-2">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{service.name}</p>
                            <p className="text-sm text-gray-600">{service.duration} minutes</p>
                          </div>
                          <p className="text-lg font-bold text-amber-700">${service.price}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Selected Service & Date/Time */}
              {selectedService && (
                <div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-800">Selected Service</p>
                    <p className="font-semibold text-gray-900">{selectedService.name}</p>
                    <p className="text-sm text-gray-600">${selectedService.price} • {selectedService.duration} min</p>
                  </div>
                  
                  <p className="text-center text-gray-600 my-8">
                    Date and time selection coming soon...
                  </p>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowBookingModal(false)
                    setSelectedService(null)
                    setSelectedDate(null)
                    setSelectedTime(null)
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  disabled={!selectedService}
                  className="px-6 py-2 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}