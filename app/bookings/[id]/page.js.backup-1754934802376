'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon,
  ArrowLeftIcon,
  ShareIcon,
  PrinterIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    loadBookingDetails()
  }, [params.id])

  const loadBookingDetails = async () => {
    setLoading(true)
    try {
      // In production, fetch from API
      const mockBooking = {
        id: params.id,
        confirmationNumber: 'BK-' + params.id.slice(-6).toUpperCase(),
        status: 'confirmed',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        location: {
          name: '6FB Downtown',
          address: '123 Main St, Downtown, NY 10001',
          phone: '(555) 123-4567',
          email: 'downtown@6fb.com',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        barber: {
          name: 'Marcus Johnson',
          title: 'Master Barber',
          image: '/barbers/marcus.jpg',
          bio: 'Marcus has been perfecting his craft for over 10 years...',
          rating: 4.9,
          reviews: 156,
          specialties: ['Fades', 'Designs', 'Beard Sculpting']
        },
        service: {
          name: 'Fade & Design',
          description: 'Professional fade haircut with custom design',
          duration: 45,
          price: 45,
          category: 'Premium Services'
        },
        addOns: [
          { name: 'Hot Towel Treatment', price: 10, duration: 10 },
          { name: 'Beard Trim', price: 15, duration: 15 }
        ],
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '(555) 987-6543',
          memberSince: '2023-01-15',
          loyaltyPoints: 450,
          loyaltyTier: 'Gold',
          visitCount: 12
        },
        payment: {
          method: 'online',
          status: 'paid',
          amount: 70, // service + addons
          breakdown: {
            service: 45,
            addOns: 25,
            tax: 6.30,
            tip: 0,
            total: 76.30
          },
          card: {
            brand: 'Visa',
            last4: '4242'
          },
          transactionId: 'txn_1234567890'
        },
        timeline: [
          {
            event: 'Booking Created',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Online booking completed'
          },
          {
            event: 'Payment Processed',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
            description: 'Payment of $76.30 processed successfully'
          },
          {
            event: 'Confirmation Sent',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 120000).toISOString(),
            description: 'Email and SMS confirmations sent'
          }
        ],
        policies: {
          cancellation: 'Free cancellation up to 24 hours before appointment',
          reschedule: 'Can reschedule up to 2 hours before appointment',
          lateness: 'Appointments may be cancelled if more than 15 minutes late',
          noShow: 'No-shows may incur a fee'
        },
        notes: 'Please use side entrance due to construction',
        canCancel: true,
        canReschedule: true,
        canModify: true
      }
      
      setBooking(mockBooking)
    } catch (error) {
      console.error('Error loading booking details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Appointment',
        text: `Appointment at ${booking.location.name} on ${new Date(booking.dateTime).toLocaleDateString()}`,
        url: window.location.href
      })
    } else {
      // Fallback to copy link
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const addToCalendar = () => {
    if (!booking) return
    
    const startDate = new Date(booking.dateTime)
    const endDate = new Date(startDate.getTime() + (booking.service.duration + booking.addOns.reduce((sum, addon) => sum + addon.duration, 0)) * 60000)
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Barbershop: ${booking.service.name}`
    )}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDate
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')}&location=${encodeURIComponent(
      `${booking.location.name}, ${booking.location.address}`
    )}&details=${encodeURIComponent(
      `Appointment with ${booking.barber.name}\nService: ${booking.service.name}\nPhone: ${booking.location.phone}`
    )}`
    
    window.open(googleCalendarUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/dashboard/bookings')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return colors[status] || colors.pending
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/bookings')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">Booking Details</h1>
                <p className="text-sm text-gray-600">#{booking.confirmationNumber}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                title="Share"
              >
                <ShareIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={handlePrint}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                title="Print"
              >
                <PrinterIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={addToCalendar}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                title="Add to Calendar"
              >
                <CalendarDaysIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Status Banner */}
        <div className={`rounded-lg border p-4 mb-6 ${getStatusColor(booking.status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {booking.status === 'confirmed' ? (
                <CheckCircleIcon className="h-6 w-6 mr-2" />
              ) : booking.status === 'cancelled' ? (
                <XMarkIcon className="h-6 w-6 mr-2" />
              ) : (
                <ClockIcon className="h-6 w-6 mr-2" />
              )}
              <div>
                <p className="font-semibold capitalize">{booking.status}</p>
                <p className="text-sm opacity-90">
                  {(() => {
                    const daysUntil = Math.ceil((new Date(booking.dateTime) - new Date()) / (1000 * 60 * 60 * 24))
                    if (booking.status === 'cancelled') return 'This appointment was cancelled'
                    if (booking.status === 'completed') return 'This appointment is completed'
                    if (daysUntil === 0) return 'Your appointment is today!'
                    if (daysUntil === 1) return 'Your appointment is tomorrow'
                    if (daysUntil < 0) return 'This appointment has passed'
                    return `Your appointment is in ${daysUntil} days`
                  })()}
                </p>
              </div>
            </div>
            
            {booking.canCancel && (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/bookings/reschedule/${booking.id}`)}
                  className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => {/* Open cancel modal */}}
                  className="px-4 py-2 bg-white text-red-600 rounded-lg border border-red-300 hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              {['details', 'barber', 'payment', 'timeline'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-all ${
                    activeTab === tab
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Appointment Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Date & Time</p>
                        <p className="text-sm text-gray-600">
                          {new Date(booking.dateTime).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(booking.dateTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Location</p>
                        <p className="text-sm text-gray-600">{booking.location.name}</p>
                        <p className="text-sm text-gray-600">{booking.location.address}</p>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(booking.location.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Get Directions →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{booking.service.name}</p>
                        <p className="text-sm text-gray-600">{booking.service.description}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          <ClockIcon className="inline h-4 w-4 mr-1" />
                          {booking.service.duration} minutes
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">${booking.service.price}</p>
                    </div>
                    
                    {booking.addOns && booking.addOns.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">Add-on Services</p>
                        {booking.addOns.map((addon, index) => (
                          <div key={index} className="flex justify-between items-center py-1">
                            <div>
                              <p className="text-sm text-gray-600">{addon.name}</p>
                              <p className="text-xs text-gray-500">+{addon.duration} minutes</p>
                            </div>
                            <p className="text-sm font-medium text-gray-900">+${addon.price}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between items-center">
                      <p className="font-medium text-gray-900">Total Duration</p>
                      <p className="font-semibold text-gray-900">
                        {booking.service.duration + booking.addOns.reduce((sum, addon) => sum + addon.duration, 0)} minutes
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.customer.name}</p>
                        <p className="text-xs text-gray-600">
                          {booking.customer.loyaltyTier} Member • {booking.customer.loyaltyPoints} points
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <a href={`mailto:${booking.customer.email}`} className="text-sm text-blue-600 hover:underline">
                        {booking.customer.email}
                      </a>
                    </div>
                    
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <a href={`tel:${booking.customer.phone}`} className="text-sm text-blue-600 hover:underline">
                        {booking.customer.phone}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Special Notes */}
                {booking.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Instructions</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">{booking.notes}</p>
                    </div>
                  </div>
                )}

                {/* Policies */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Policies</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      <p className="text-sm text-gray-600">{booking.policies.cancellation}</p>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      <p className="text-sm text-gray-600">{booking.policies.reschedule}</p>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      <p className="text-sm text-gray-600">{booking.policies.lateness}</p>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      <p className="text-sm text-gray-600">{booking.policies.noShow}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Barber Tab */}
            {activeTab === 'barber' && (
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg mr-4"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{booking.barber.name}</h3>
                    <p className="text-sm text-gray-600">{booking.barber.title}</p>
                    
                    <div className="flex items-center mt-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`h-4 w-4 ${
                              star <= Math.floor(booking.barber.rating) ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-600">
                        {booking.barber.rating} ({booking.barber.reviews} reviews)
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-3">{booking.barber.bio}</p>
                    
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Specialties</p>
                      <div className="flex flex-wrap gap-2">
                        {booking.barber.specialties.map((specialty, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <button className="text-blue-600 hover:underline text-sm font-medium">
                    View Full Profile →
                  </button>
                </div>
              </div>
            )}

            {/* Payment Tab */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{booking.service.name}</span>
                        <span className="font-medium">${booking.payment.breakdown.service}</span>
                      </div>
                      
                      {booking.addOns.map((addon, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">{addon.name}</span>
                          <span className="font-medium">${addon.price}</span>
                        </div>
                      ))}
                      
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-medium">
                            ${(booking.payment.breakdown.service + booking.payment.breakdown.addOns).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax</span>
                          <span className="font-medium">${booking.payment.breakdown.tax.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="font-semibold">Total</span>
                          <span className="text-lg font-bold text-blue-600">
                            ${booking.payment.breakdown.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CreditCardIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {booking.payment.card.brand} •••• {booking.payment.card.last4}
                          </p>
                          <p className="text-xs text-gray-600">
                            Transaction ID: {booking.payment.transactionId}
                          </p>
                        </div>
                      </div>
                      
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        {booking.payment.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {booking.payment.status === 'paid' && (
                  <div>
                    <button className="text-blue-600 hover:underline text-sm font-medium">
                      Download Receipt →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Timeline</h3>
                
                <div className="space-y-4">
                  {booking.timeline.map((event, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                        </div>
                        {index < booking.timeline.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-200 mx-4 -mt-4"></div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-gray-900">{event.event}</p>
                        <p className="text-sm text-gray-600">{event.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-start">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Need Help?</p>
              <p className="text-sm text-blue-700 mt-1">
                Contact us at {booking.location.phone} or {booking.location.email}
              </p>
              <button className="text-sm text-blue-600 hover:underline font-medium mt-2">
                Start Live Chat →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}