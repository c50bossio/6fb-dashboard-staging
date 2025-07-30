'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

// Simple icon components
const CalendarDaysIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

export default function BookingWidget() {
  const params = useParams()
  const shopId = params.shopId
  
  const [isOpen, setIsOpen] = useState(false)
  const [shopInfo, setShopInfo] = useState(null)

  useEffect(() => {
    // Mock shop data - in real implementation, this would fetch from API
    const mockShopData = {
      id: shopId,
      name: "Elite Cuts Barbershop",
      address: "123 Main Street, Downtown",
      phone: "(555) 123-4567"
    }
    setShopInfo(mockShopData)
  }, [shopId])

  const handleBookNow = () => {
    // Open full booking page in new window/tab
    window.open(`${window.location.origin}/booking/${shopId}`, '_blank')
  }

  if (!shopInfo) {
    return <div className="p-4 text-center text-gray-500">Loading...</div>
  }

  return (
    <div className="max-w-sm mx-auto">
      {/* Compact Widget View */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4">
          <h3 className="font-bold text-lg">{shopInfo.name}</h3>
          <p className="text-blue-100 text-sm">Book your appointment online</p>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p>📍 {shopInfo.address}</p>
            <p>📞 {shopInfo.phone}</p>
            <p>⭐ Premium barbershop experience</p>
          </div>
          
          <button
            onClick={handleBookNow}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            Book Now
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-2">
            Powered by 6FB AI Agent System
          </p>
        </div>
      </div>
    </div>
  )
}