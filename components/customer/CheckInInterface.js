'use client'

import {
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { 
  CheckCircleIcon as CheckCircleSolid 
} from '@heroicons/react/24/solid'
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'

// Extracted appointment check-in card component
const AppointmentCheckInCard = ({ appointment, onCheckIn, onSendMessage, isCheckingIn }) => {
  const [showMessageBox, setShowMessageBox] = useState(false)
  const [customMessage, setCustomMessage] = useState('')

  const formatTime = (timeString) => {
    try {
      const date = new Date(`2000-01-01 ${timeString}`)
      return format(date, 'h:mm a')
    } catch {
      return timeString
    }
  }

  const handleSendMessage = () => {
    if (customMessage.trim()) {
      onSendMessage(customMessage.trim())
      setCustomMessage('')
      setShowMessageBox(false)
    }
  }

  const quickMessages = [
    "We're running a few minutes behind. Thank you for your patience!",
    "Your barber is finishing up with the previous customer. You're next!",
    "Please have a seat, we'll be with you shortly.",
    "Thanks for checking in! Your appointment will begin on time."
  ]

  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
      <div className="flex items-start sm:items-center justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{appointment.customer_name}</h4>
          <p className="text-sm text-gray-600 truncate">
            {formatTime(appointment.start_time)} • {appointment.service_name}
          </p>
          {appointment.barber_name && (
            <p className="text-sm text-gray-500 truncate">
              <span className="hidden sm:inline">with </span>
              {appointment.barber_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full whitespace-nowrap">
            Confirmed
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          onClick={onCheckIn}
          disabled={isCheckingIn}
          className="flex-1 bg-green-600 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          {isCheckingIn ? (
            <>
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Checking In...</span>
              <span className="sm:hidden">Checking...</span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4" />
              Check In
            </>
          )}
        </button>
        
        <div className="flex gap-2 justify-center sm:justify-start">
          <button
            onClick={() => window.open(`tel:${appointment.customer_phone}`, '_self')}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Call customer"
          >
            <PhoneIcon className="h-4 w-4 text-gray-600" />
          </button>
          
          <button
            onClick={() => setShowMessageBox(!showMessageBox)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Send message"
          >
            <ChatBubbleLeftIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Message Box */}
      {showMessageBox && (
        <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-white">
          <div className="mb-3">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Quick Messages</h5>
            <div className="space-y-1">
              {quickMessages.map((msg, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCustomMessage(msg)
                    setShowMessageBox(false)
                    onSendMessage(msg)
                  }}
                  className="block w-full text-left text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 p-2 rounded border border-gray-100"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type a custom message..."
              className="w-full text-sm border border-gray-300 rounded p-2 mb-2"
              rows="2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSendMessage}
                disabled={!customMessage.trim()}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
              <button
                onClick={() => setShowMessageBox(false)}
                className="px-3 py-1 border border-gray-300 text-sm rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Extracted check-in content component
const CheckInContent = ({
  customerPhone,
  setCustomerPhone,
  searchResults,
  loading,
  successMessage,
  error,
  showWalkInForm,
  setShowWalkInForm,
  walkInData,
  setWalkInData,
  handleCheckIn,
  handleWalkInSubmit,
  sendMessage,
  checkingIn
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
    <div className="text-center mb-6">
      <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <UserIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900">Customer Check-In</h2>
      <p className="text-gray-600 text-sm mt-1">
        <span className="hidden sm:inline">Enter customer's phone number to check them in</span>
        <span className="sm:hidden">Enter phone number</span>
      </p>
    </div>

    {/* Success Message */}
    {successMessage && (
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <CheckCircleSolid className="h-5 w-5 text-green-600 mr-2" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      </div>
    )}

    {/* Error Message */}
    {error && (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )}

    {/* Phone Number Input */}
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Customer Phone Number
      </label>
      <div className="relative">
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Search happens automatically as you type
      </p>
    </div>

    {/* Walk-In Button */}
    {customerPhone.length >= 10 && searchResults.length === 0 && !loading && !error && (
      <div className="mb-6">
        <button
          onClick={() => setShowWalkInForm(true)}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add as Walk-In Customer
        </button>
      </div>
    )}

    {/* Walk-In Form */}
    {showWalkInForm && (
      <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
        <h3 className="font-medium text-gray-900 mb-3">Add Walk-In Customer</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Customer Name"
            value={walkInData.name}
            onChange={(e) => setWalkInData({...walkInData, name: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <select
            value={walkInData.service}
            onChange={(e) => setWalkInData({...walkInData, service: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Select Service</option>
            <option value="Haircut">Haircut</option>
            <option value="Beard Trim">Beard Trim</option>
            <option value="Haircut & Beard">Haircut & Beard</option>
            <option value="Hot Towel Shave">Hot Towel Shave</option>
          </select>
          <textarea
            placeholder="Notes (optional)"
            value={walkInData.notes}
            onChange={(e) => setWalkInData({...walkInData, notes: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            rows="2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleWalkInSubmit}
              disabled={!walkInData.name || !walkInData.service}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Add to Queue
            </button>
            <button
              onClick={() => {
                setShowWalkInForm(false)
                setWalkInData({ name: '', phone: '', service: '', notes: '' })
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Search Results */}
    {searchResults.length > 0 && (
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Today's Appointments</h3>
        {searchResults.map((appointment) => (
          <AppointmentCheckInCard
            key={appointment.id}
            appointment={appointment}
            onCheckIn={() => handleCheckIn(appointment)}
            onSendMessage={(message) => sendMessage(appointment, message)}
            isCheckingIn={checkingIn}
          />
        ))}
      </div>
    )}

    {/* No Results Message */}
    {customerPhone.length >= 10 && searchResults.length === 0 && !loading && !error && (
      <div className="text-center py-8">
        <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">No appointments found for today</p>
        <p className="text-gray-500 text-sm mt-1">
          Check the phone number or search for a different customer
        </p>
      </div>
    )}
  </div>
)

export default function CheckInInterface({ barbershopId, mode = 'embedded' }) {
  const [customerPhone, setCustomerPhone] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')
  const [showWalkInForm, setShowWalkInForm] = useState(false)
  const [walkInData, setWalkInData] = useState({
    name: '',
    phone: '',
    service: '',
    notes: ''
  })

  // Search for customer appointments by phone number
  const handlePhoneSearch = useCallback(async (phone) => {
    if (!phone || phone.length < 10) {
      setSearchResults([])
      return
    }

    try {
      setLoading(true)
      setError('')

      // Clean phone number (remove non-digits)
      const cleanPhone = phone.replace(/\D/g, '')
      
      const response = await fetch(`/api/appointments/search-by-phone?phone=${cleanPhone}&barbershop_id=${barbershopId}`)
      const result = await response.json()

      if (result.success && result.appointments) {
        // Filter to today's appointments that can be checked in
        const today = new Date().toISOString().split('T')[0]
        const todayAppointments = result.appointments.filter(apt => 
          apt.date === today && 
          apt.status === 'confirmed'
        )
        setSearchResults(todayAppointments)
      } else {
        setSearchResults([])
        if (result.appointments?.length === 0) {
          setError('No confirmed appointments found for today with this phone number.')
        }
      }
    } catch (error) {
      console.error('Error searching appointments:', error)
      setError('Failed to search appointments. Please try again.')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [barbershopId])

  // Handle phone number input change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerPhone.length >= 10) {
        handlePhoneSearch(customerPhone)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [customerPhone]) // Remove handlePhoneSearch from dependencies to prevent infinite loop

  // Handle customer check-in
  const handleCheckIn = async (appointment) => {
    try {
      setCheckingIn(true)
      setError('')

      const response = await fetch(`/api/appointments/${appointment.id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.success) {
        const queueInfo = result.queue_position ? ` Queue position: ${result.queue_position}` : ''
        setSuccessMessage(`${appointment.customer_name} checked in successfully! ✅${queueInfo}`)
        setSelectedAppointment({ ...appointment, status: 'checked_in' })
        
        // Clear search results and phone number
        setSearchResults([])
        setCustomerPhone('')
        
        // Clear success message after 5 seconds to allow reading queue position
        setTimeout(() => {
          setSuccessMessage('')
          setSelectedAppointment(null)
        }, 5000)
      } else {
        setError(result.error || 'Failed to check in customer')
      }
    } catch (error) {
      console.error('Check-in failed:', error)
      setError('Failed to check in customer. Please try again.')
    } finally {
      setCheckingIn(false)
    }
  }

  // Handle walk-in submission
  const handleWalkInSubmit = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/walk-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: walkInData.name,
          phone: customerPhone,
          service: walkInData.service,
          notes: walkInData.notes,
          barbershop_id: barbershopId,
          estimated_wait: 30 // Default 30 minutes
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage(`${walkInData.name} added to walk-in queue! Estimated wait: ${result.estimated_wait} minutes`)
        setShowWalkInForm(false)
        setWalkInData({ name: '', phone: '', service: '', notes: '' })
        setCustomerPhone('')
        
        setTimeout(() => {
          setSuccessMessage('')
        }, 5000)
      } else {
        setError(result.error || 'Failed to add walk-in customer')
      }
    } catch (error) {
      console.error('Walk-in submission failed:', error)
      setError('Failed to add walk-in customer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Send custom message to customer
  const sendMessage = async (appointment, message) => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom_message',
          message,
          phone: appointment.customer_phone,
          barbershop_id: barbershopId
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('Message sent successfully!')
      } else {
        alert('Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message')
    }
  }


  if (mode === 'fullscreen') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <CheckInContent 
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            searchResults={searchResults}
            loading={loading}
            successMessage={successMessage}
            error={error}
            showWalkInForm={showWalkInForm}
            setShowWalkInForm={setShowWalkInForm}
            walkInData={walkInData}
            setWalkInData={setWalkInData}
            handleCheckIn={handleCheckIn}
            handleWalkInSubmit={handleWalkInSubmit}
            sendMessage={sendMessage}
            checkingIn={checkingIn}
          />
        </div>
      </div>
    )
  }

  return <CheckInContent 
    customerPhone={customerPhone}
    setCustomerPhone={setCustomerPhone}
    searchResults={searchResults}
    loading={loading}
    successMessage={successMessage}
    error={error}
    showWalkInForm={showWalkInForm}
    setShowWalkInForm={setShowWalkInForm}
    walkInData={walkInData}
    setWalkInData={setWalkInData}
    handleCheckIn={handleCheckIn}
    handleWalkInSubmit={handleWalkInSubmit}
    sendMessage={sendMessage}
    checkingIn={checkingIn}
  />
}