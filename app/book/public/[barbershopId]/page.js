'use client'

import { useParams } from 'next/navigation'
import PublicBookingFlow from '@/components/booking/PublicBookingFlow'
import { useEffect, useState } from 'react'

export default function PublicBookingPage() {
  const params = useParams()
  const barbershopId = params.barbershopId
  const [barbershopInfo, setBarbershopInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadBarbershopInfo()
  }, [barbershopId])

  const loadBarbershopInfo = async () => {
    try {
      const response = await fetch(`/api/public/barbershop/${barbershopId}`)
      const data = await response.json()
      
      if (data.success) {
        setBarbershopInfo(data.barbershop)
      } else {
        setError('Barbershop not found')
      }
    } catch (err) {
      console.error('Failed to load barbershop:', err)
      setError('Failed to load barbershop information')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking system...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Unavailable</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return <PublicBookingFlow barbershopId={barbershopId} barbershopSlug={barbershopInfo?.slug} />
}