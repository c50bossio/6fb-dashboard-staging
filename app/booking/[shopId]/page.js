'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

// Simple icon components
const CalendarDaysIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const UserIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const ScissorsIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
  </svg>
)

export default function CustomerBookingPage() {
  const params = useParams()
  const shopId = params.shopId
  
  const [shopInfo, setShopInfo] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedBarber, setSelectedBarber] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)

  // Mock shop data - in real implementation, this would fetch from API
  useEffect(() => {
    const mockShopData = {
      id: shopId,
      name: "Elite Cuts Barbershop",
      address: "123 Main Street, Downtown",
      phone: "(555) 123-4567",
      email: "contact@elitecuts.com",
      hours: "Mon-Sat: 9AM-7PM, Sun: 10AM-5PM",
      description: "Premium barbershop experience with master craftsmen",
      services: [
        { id: 1, name: "Classic Haircut", duration: 30, price: 35 },
        { id: 2, name: "Beard Trim", duration: 20, price: 25 },
        { id: 3, name: "Hair + Beard Combo", duration: 45, price: 55 },
        { id: 4, name: "Premium Cut & Style", duration: 60, price: 65 },
        { id: 5, name: "Hot Towel Shave", duration: 40, price: 45 }
      ],
      barbers: [
        { id: 1, name: "Mike Johnson", specialties: ["Classic Cuts", "Beard Work"] },
        { id: 2, name: "Tony Rodriguez", specialties: ["Modern Styles", "Fades"] },
        { id: 3, name: "Chris Davis", specialties: ["Traditional Shaves", "Styling"] }
      ],
      availableTimes: [
        "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
        "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
        "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM"
      ]
    }
    
    setShopInfo(mockShopData)
    setLoading(false)
  }, [shopId])

  const handleBooking = async (e) => {
    e.preventDefault()
    setBooking(true)
    
    // Mock booking process - in real implementation, this would call API
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    alert('Booking confirmed! You will receive a confirmation email shortly.')
    setBooking(false)
    
    // Reset form
    setSelectedDate('')
    setSelectedTime('')
    setSelectedBarber('')
    setSelectedService('')
    setCustomerInfo({ name: '', email: '', phone: '' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking page...</p>
        </div>
      </div>
    )
  }

  if (!shopInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Barbershop Not Found</h1>
          <p className="text-gray-600">The requested barbershop could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">{shopInfo.name}</h1>
            <p className="text-gray-600 mt-2">{shopInfo.description}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span>📍 {shopInfo.address}</span>
              <span>📞 {shopInfo.phone}</span>
              <span>🕐 {shopInfo.hours}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <CalendarDaysIcon className="h-6 w-6 mr-2 text-blue-600" />
              Book Your Appointment
            </h2>
            <p className="text-gray-600 mt-2">Select your preferred service, barber, date and time</p>
          </div>

          <form onSubmit={handleBooking} className="p-6 space-y-6">
            {/* Service Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <ScissorsIcon className="h-4 w-4 inline mr-2" />
                Select Service
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shopInfo.services.map((service) => (
                  <div key={service.id} className="relative">
                    <input
                      type="radio"
                      name="service"
                      value={service.id}
                      id={`service-${service.id}`}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="sr-only peer"
                    />
                    <label
                      htmlFor={`service-${service.id}`}
                      className="block p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 peer-checked:border-blue-500 peer-checked:bg-blue-50"
                    >
                      <div className="font-medium text-gray-900">{service.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {service.duration} minutes • ${service.price}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Barber Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <UserIcon className="h-4 w-4 inline mr-2" />
                Choose Your Barber
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {shopInfo.barbers.map((barber) => (
                  <div key={barber.id} className="relative">
                    <input
                      type="radio"
                      name="barber"
                      value={barber.id}
                      id={`barber-${barber.id}`}
                      onChange={(e) => setSelectedBarber(e.target.value)}
                      className="sr-only peer"
                    />
                    <label
                      htmlFor={`barber-${barber.id}`}
                      className="block p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 peer-checked:border-blue-500 peer-checked:bg-blue-50"
                    >
                      <div className="font-medium text-gray-900">{barber.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {barber.specialties.join(", ")}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarDaysIcon className="h-4 w-4 inline mr-2" />
                Select Date
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <ClockIcon className="h-4 w-4 inline mr-2" />
                Available Times
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {shopInfo.availableTimes.map((time) => (
                  <div key={time} className="relative">
                    <input
                      type="radio"
                      name="time"
                      value={time}
                      id={`time-${time}`}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="sr-only peer"
                    />
                    <label
                      htmlFor={`time-${time}`}
                      className="block p-2 text-center text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white"
                    >
                      {time}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Your Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t border-gray-200 pt-6">
              <button
                type="submit"
                disabled={booking || !selectedService || !selectedBarber || !selectedDate || !selectedTime || !customerInfo.name || !customerInfo.email || !customerInfo.phone}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors flex items-center justify-center"
              >
                {booking ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing Booking...
                  </>
                ) : (
                  <>
                    <CalendarDaysIcon className="h-5 w-5 mr-2" />
                    Confirm Booking
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Contact Info */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Questions or Need Help?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">
                <strong>Call us:</strong> {shopInfo.phone}
              </p>
              <p className="text-gray-600 mt-1">
                <strong>Email:</strong> {shopInfo.email}
              </p>
            </div>
            <div>
              <p className="text-gray-600">
                <strong>Hours:</strong> {shopInfo.hours}
              </p>
              <p className="text-gray-600 mt-1">
                <strong>Address:</strong> {shopInfo.address}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}