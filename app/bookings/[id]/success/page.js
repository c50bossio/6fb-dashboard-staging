'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircleIcon, CalendarIcon, MapPinIcon, ClockIcon, PhoneIcon, EnvelopeIcon, HomeIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import confetti from 'canvas-confetti'

export default function BookingSuccessPage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState(null)
  const [addedToCalendar, setAddedToCalendar] = useState(false)
  
  useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })
    
    // Load booking details
    loadBooking()
  }, [])
  
  const loadBooking = async () => {
    try {
      // Fetch booking from API
      const response = await fetch(`/api/bookings/${params.id}`)
      
      if (response.ok) {
        const data = await response.json()
        setBooking(data)
      } else {
        // If booking not found, show empty state
        console.error('Booking not found')
        setBooking(null)
      }
    } catch (error) {
      console.error('Error loading booking:', error)
      setBooking(null)
    }
  }
  
  const addToCalendar = () => {
    if (!booking) return
    
    const startDate = new Date(booking.dateTime)
    const endDate = new Date(startDate.getTime() + booking.service.duration * 60000)
    
    // Format for Google Calendar
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Barbershop Appointment - ${booking.service.name}`
    )}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDate
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')}&location=${encodeURIComponent(
      `${booking.location.name}, ${booking.location.address}`
    )}&details=${encodeURIComponent(
      `Appointment with ${booking.barber.name}\nService: ${booking.service.name}\nPhone: ${booking.location.phone}`
    )}`
    
    window.open(googleCalendarUrl, '_blank')
    setAddedToCalendar(true)
  }
  
  const downloadICS = () => {
    if (!booking) return
    
    const startDate = new Date(booking.dateTime)
    const endDate = new Date(startDate.getTime() + booking.service.duration * 60000)
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
DTEND:${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
SUMMARY:Barbershop Appointment - ${booking.service.name}
DESCRIPTION:Appointment with ${booking.barber.name}\\nService: ${booking.service.name}\\nPhone: ${booking.location.phone}
LOCATION:${booking.location.name}, ${booking.location.address}
END:VEVENT
END:VCALENDAR`
    
    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `appointment-${booking.confirmationNumber}.ics`
    link.click()
    URL.revokeObjectURL(url)
  }
  
  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-50 via-white to-gold-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-4">
            <CheckCircleIcon className="h-16 w-16 text-green-600" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-xl text-gray-600">
            Your appointment has been successfully scheduled
          </p>
          
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-olive-100 text-olive-800 rounded-full">
            <span className="text-sm font-medium">Confirmation #</span>
            <span className="ml-2 font-mono font-bold">{booking.confirmationNumber}</span>
          </div>
        </div>
        
        {/* Booking Details Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-olive-600 to-gold-600 p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">Appointment Details</h2>
            <p className="opacity-90">
              {new Date(booking.dateTime).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Time */}
            <div className="flex items-start">
              <ClockIcon className="h-6 w-6 text-olive-600 mt-0.5" />
              <div className="ml-4">
                <p className="font-semibold text-gray-900">Time</p>
                <p className="text-gray-600">
                  {new Date(booking.dateTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
                <p className="text-sm text-gray-500">Duration: {booking.service.duration} minutes</p>
              </div>
            </div>
            
            {/* Location */}
            <div className="flex items-start">
              <MapPinIcon className="h-6 w-6 text-olive-600 mt-0.5" />
              <div className="ml-4">
                <p className="font-semibold text-gray-900">Location</p>
                <p className="text-gray-600">{booking.location.name}</p>
                <p className="text-sm text-gray-500">{booking.location.address}</p>
                <a 
                  href={`tel:${booking.location.phone}`}
                  className="text-sm text-olive-600 hover:underline"
                >
                  {booking.location.phone}
                </a>
              </div>
            </div>
            
            {/* Service & Barber */}
            <div className="flex items-start">
              <CalendarIcon className="h-6 w-6 text-olive-600 mt-0.5" />
              <div className="ml-4">
                <p className="font-semibold text-gray-900">Service</p>
                <p className="text-gray-600">{booking.service.name}</p>
                <p className="text-sm text-gray-500">
                  with {booking.barber.name} • {booking.barber.title}
                </p>
              </div>
            </div>
            
            {/* Payment Status */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">${booking.totalAmount}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-moss-100 text-moss-900">
                    ✓ {booking.paymentStatus === 'paid' ? 'Paid' : 'Pay at Shop'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="space-y-4">
          {/* Calendar Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Add to Calendar</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={addToCalendar}
                disabled={addedToCalendar}
                className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all ${
                  addedToCalendar
                    ? 'bg-moss-100 text-moss-900 cursor-default'
                    : 'bg-olive-600 text-white hover:bg-olive-700'
                }`}
              >
                <CalendarDaysIcon className="h-5 w-5 mr-2" />
                {addedToCalendar ? 'Added!' : 'Google Calendar'}
              </button>
              
              <button
                onClick={downloadICS}
                className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                <CalendarIcon className="h-5 w-5 mr-2" />
                Download .ics
              </button>
            </div>
          </div>
          
          {/* What's Next */}
          <div className="bg-olive-50 rounded-xl border border-olive-200 p-6">
            <h3 className="font-semibold text-olive-900 mb-3">What's Next?</h3>
            
            <ul className="space-y-2 text-olive-800">
              <li className="flex items-start">
                <span className="text-olive-600 mr-2">✓</span>
                <span>You'll receive a confirmation email at {booking.customer.email}</span>
              </li>
              <li className="flex items-start">
                <span className="text-olive-600 mr-2">✓</span>
                <span>We'll send you a reminder 24 hours before your appointment</span>
              </li>
              <li className="flex items-start">
                <span className="text-olive-600 mr-2">✓</span>
                <span>Arrive 5 minutes early for check-in</span>
              </li>
              {booking.paymentStatus !== 'paid' && (
                <li className="flex items-start">
                  <span className="text-olive-600 mr-2">✓</span>
                  <span>Bring ${booking.totalAmount} for payment (cash or card accepted)</span>
                </li>
              )}
            </ul>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              Go to Dashboard
            </button>
            
            <button
              onClick={() => router.push('/bookings')}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-olive-600 text-white rounded-lg font-medium hover:bg-olive-700 transition-all"
            >
              View My Bookings
            </button>
          </div>
        </div>
        
        {/* Contact Support */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Need help? Contact us at</p>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <a href={`tel:${booking.location.phone}`} className="flex items-center text-olive-600 hover:underline">
              <PhoneIcon className="h-4 w-4 mr-1" />
              {booking.location.phone}
            </a>
            <span className="text-gray-400">•</span>
            <a href="mailto:support@6fb-ai.com" className="flex items-center text-olive-600 hover:underline">
              <EnvelopeIcon className="h-4 w-4 mr-1" />
              support@6fb-ai.com
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}