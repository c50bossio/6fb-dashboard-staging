'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { 
  Calendar,
  Clock,
  MapPin,
  Phone,
  Star,
  DollarSign,
  Scissors,
  Sparkles,
  Camera,
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  Mail,
  Award,
  Users
} from 'lucide-react'

export default function BarberProfile({ initialData }) {
  const [barberData, setBarberData] = useState(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [selectedService, setSelectedService] = useState(null)
  const [showBookingModal, setShowBookingModal] = useState(false)

  // Fallback data structure
  const defaultData = {
    barber: {
      name: 'Loading...',
      bio: '',
      avatar_url: '',
      cover_image_url: '',
      years_experience: 0,
      specialties: [],
      social_links: {},
      rating: 0,
      total_reviews: 0
    },
    website_settings: {
      primary_color: '#d97706',
      secondary_color: '#92400e',
      custom_css: ''
    },
    shop_info: {
      name: '',
      address: '',
      phone: ''
    },
    services: [],
    availability: {},
    portfolio: [],
    reviews: []
  }

  useEffect(() => {
    if (!initialData) {
      console.log('No initial data provided')
    }
  }, [initialData])

  const data = barberData || defaultData
  const { barber, website_settings, shop_info, services, availability, portfolio, reviews } = data

  // Custom styling based on barber's brand colors
  const customStyles = {
    '--primary-color': website_settings.primary_color || '#d97706',
    '--secondary-color': website_settings.secondary_color || '#92400e'
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))
  }

  const formatAvailability = (availability) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    return days.map((day, index) => {
      const dayHours = availability[day]
      return {
        day: dayNames[index],
        hours: dayHours && !dayHours.closed ? `${dayHours.open} - ${dayHours.close}` : 'Closed'
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50" style={customStyles}>
      {/* Custom CSS injection */}
      {website_settings.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: website_settings.custom_css }} />
      )}

      {/* Hero Section with Cover Image */}
      <section className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
        {barber.cover_image_url ? (
          <Image
            src={barber.cover_image_url}
            alt={`${barber.name}'s cover`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)]" />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-30" />
        
        {/* Shop Logo/Name */}
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-4 py-2">
          <p className="text-sm font-semibold text-gray-900">{shop_info.name}</p>
        </div>

        {/* Back to Shop Link */}
        <div className="absolute top-4 right-4">
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white/90 hover:bg-white border-white/50"
            asChild
          >
            <Link href={`/shop/${shop_info.slug}`}>View Shop</Link>
          </Button>
        </div>
      </section>

      {/* Profile Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-20 mb-8">
          <Card className="p-6 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              {/* Avatar */}
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-gray-200 overflow-hidden ring-4 ring-white shadow-lg">
                  {barber.avatar_url ? (
                    <Image
                      src={barber.avatar_url}
                      alt={barber.name}
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {barber.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Online Status */}
                <span className="absolute bottom-2 right-2 block h-4 w-4 rounded-full bg-green-400 ring-2 ring-white" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{barber.name}</h1>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center">
                    {renderStars(Math.floor(barber.rating))}
                    <span className="ml-2 text-sm text-gray-600">
                      {barber.rating.toFixed(1)} ({barber.total_reviews} reviews)
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600 flex items-center">
                    <Award className="w-4 h-4 mr-1" />
                    {barber.years_experience} years experience
                  </span>
                </div>
                
                {/* Bio */}
                <p className="mt-3 text-gray-600 max-w-3xl">{barber.bio}</p>
                
                {/* Specialties */}
                {barber.specialties && barber.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {barber.specialties.map((specialty, index) => (
                      <Badge 
                        key={index}
                        variant="secondary"
                        className="bg-[var(--primary-color)]/10 text-[var(--primary-color)]"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Book Now Button */}
              <Button
                size="lg"
                onClick={() => setShowBookingModal(true)}
                className="bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 shadow-lg"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book Appointment
              </Button>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column - Services & Portfolio */}
          <div className="lg:col-span-2 space-y-8">
            {/* Services */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Scissors className="w-6 h-6 mr-2 text-[var(--primary-color)]" />
                Services & Pricing
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <Card 
                    key={service.id}
                    className="p-4 hover:shadow-md transition-all cursor-pointer border-2 hover:border-[var(--primary-color)]"
                    onClick={() => {
                      setSelectedService(service)
                      setShowBookingModal(true)
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-2">
                          <Clock className="w-3 h-3 mr-1" />
                          {service.duration} minutes
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-xl font-bold text-[var(--primary-color)]">
                          <DollarSign className="w-5 h-5" />
                          {service.price}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            {/* Portfolio */}
            {portfolio && portfolio.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Camera className="w-6 h-6 mr-2 text-[var(--primary-color)]" />
                  Portfolio
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {portfolio.map((item, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                      <Image
                        src={item.image_url}
                        alt={item.title || `Portfolio ${index + 1}`}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Reviews */}
            {reviews && reviews.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <MessageCircle className="w-6 h-6 mr-2 text-[var(--primary-color)]" />
                  Customer Reviews
                </h2>
                
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {review.customer_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-gray-900">{review.customer_name}</h4>
                            <div className="flex items-center">
                              {renderStars(review.rating)}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{review.comment}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Availability & Contact */}
          <div className="space-y-8">
            {/* Quick Book */}
            <Card className="p-6 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white">
              <h3 className="text-xl font-bold mb-4">Book Now</h3>
              <p className="text-gray-100 mb-4">
                Ready to look your best? Book an appointment with {barber.name} today.
              </p>
              <Button 
                className="w-full bg-white text-[var(--primary-color)] hover:bg-gray-100"
                onClick={() => setShowBookingModal(true)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Appointment
              </Button>
            </Card>

            {/* Availability */}
            {availability && Object.keys(availability).length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-6 h-6 mr-2 text-[var(--primary-color)]" />
                  Availability
                </h2>
                
                <div className="space-y-2">
                  {formatAvailability(availability).map(({ day, hours }) => (
                    <div key={day} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm font-medium text-gray-700">{day}</span>
                      <span className="text-sm text-gray-600">{hours}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Contact & Location */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact & Location</h2>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-[var(--primary-color)] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{shop_info.name}</p>
                    <p className="text-sm text-gray-600">{shop_info.address}</p>
                  </div>
                </div>
                
                {shop_info.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-[var(--primary-color)]" />
                    <a 
                      href={`tel:${shop_info.phone}`} 
                      className="text-sm text-[var(--primary-color)] hover:underline"
                    >
                      {shop_info.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {barber.social_links && Object.keys(barber.social_links).length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">Follow {barber.name}</p>
                  <div className="flex space-x-3">
                    {barber.social_links.instagram && (
                      <a
                        href={barber.social_links.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[var(--primary-color)] transition-colors"
                      >
                        <Instagram className="w-6 h-6" />
                      </a>
                    )}
                    {barber.social_links.facebook && (
                      <a
                        href={barber.social_links.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[var(--primary-color)] transition-colors"
                      >
                        <Facebook className="w-6 h-6" />
                      </a>
                    )}
                    {barber.social_links.twitter && (
                      <a
                        href={barber.social_links.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[var(--primary-color)] transition-colors"
                      >
                        <Twitter className="w-6 h-6" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    Total Reviews
                  </span>
                  <span className="font-semibold">{barber.total_reviews}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Average Rating
                  </span>
                  <span className="font-semibold">{barber.rating.toFixed(1)}/5.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center">
                    <Award className="w-4 h-4 mr-1" />
                    Experience
                  </span>
                  <span className="font-semibold">{barber.years_experience} years</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Book Appointment with {barber.name}
              </h2>
              
              {/* Service Selection */}
              {!selectedService && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Select a Service</h3>
                  <div className="space-y-2">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-[var(--primary-color)] hover:bg-gray-50 transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{service.name}</p>
                            <p className="text-sm text-gray-600">{service.duration} minutes</p>
                          </div>
                          <div className="flex items-center text-lg font-bold text-[var(--primary-color)]">
                            <DollarSign className="w-4 h-4" />
                            {service.price}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Selected Service */}
              {selectedService && (
                <div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600">Selected Service</p>
                    <p className="font-semibold text-gray-900">{selectedService.name}</p>
                    <p className="text-sm text-gray-600">
                      ${selectedService.price} • {selectedService.duration} minutes
                    </p>
                  </div>
                  
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Date and time selection will be available soon.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      For now, please call {shop_info.phone} to book your appointment.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBookingModal(false)
                    setSelectedService(null)
                  }}
                >
                  Cancel
                </Button>
                {selectedService && shop_info.phone && (
                  <Button
                    className="bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90"
                    asChild
                  >
                    <a href={`tel:${shop_info.phone}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      Call to Book
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}