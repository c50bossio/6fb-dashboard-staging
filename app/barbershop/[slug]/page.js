'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/solid'

export default function BarbershopPublicPage() {
  const params = useParams()
  const { slug } = params
  const [barbershop, setBarbershop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (slug) {
      fetchBarbershop()
    }
  }, [slug])

  const fetchBarbershop = async () => {
    try {
      const response = await fetch(`/api/barbershop/public/${slug}`)
      const data = await response.json()
      
      if (response.ok) {
        setBarbershop(data.barbershop)
      } else {
        setError(data.error || 'Barbershop not found')
      }
    } catch (error) {
      console.error('Error fetching barbershop:', error)
      setError('Failed to load barbershop')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading barbershop...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Barbershop Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a 
            href="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  if (!barbershop) {
    return null
  }

  const brandColors = barbershop.brand_colors || {
    primary: '#3B82F6',
    secondary: '#1E40AF', 
    accent: '#10B981',
    text: '#1F2937',
    background: '#FFFFFF'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: brandColors.background }}>
      {/* Header */}
      <header 
        className="py-4 px-6"
        style={{ backgroundColor: brandColors.primary }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {barbershop.logo_url && (
              <img 
                src={barbershop.logo_url}
                alt={`${barbershop.name} logo`}
                className="h-10 w-10 object-contain"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{barbershop.name}</h1>
              {barbershop.tagline && (
                <p className="text-sm text-white opacity-90">{barbershop.tagline}</p>
              )}
            </div>
          </div>
          <button
            className="px-6 py-2 rounded-lg font-semibold text-white border-2 border-white hover:bg-white transition-colors"
            style={{ 
              color: brandColors.primary,
              borderColor: 'white'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'white'
              e.target.style.color = brandColors.primary
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent'
              e.target.style.color = 'white'
            }}
          >
            Book Now
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="py-20 px-6 text-center"
        style={{
          backgroundColor: brandColors.background,
          color: brandColors.text,
          backgroundImage: barbershop.cover_image_url ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${barbershop.cover_image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: barbershop.cover_image_url ? 'white' : brandColors.text }}>
            {barbershop.hero_title || barbershop.name || 'Welcome to Our Barbershop'}
          </h2>
          <p className="text-xl mb-8" style={{ color: barbershop.cover_image_url ? 'white' : brandColors.text }}>
            {barbershop.hero_subtitle || barbershop.tagline || 'Professional barbering services'}
          </p>
          <button 
            className="px-8 py-4 rounded-lg font-semibold text-white text-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brandColors.accent }}
          >
            <CalendarIcon className="h-5 w-5 inline mr-2" />
            Book Appointment
          </button>
        </div>
      </section>

      {/* About Section */}
      {(barbershop.about_text || barbershop.description) && (
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-8" style={{ color: brandColors.text }}>
              About Us
            </h3>
            <p className="text-lg leading-relaxed" style={{ color: brandColors.text }}>
              {barbershop.about_text || barbershop.description}
            </p>
          </div>
        </section>
      )}

      {/* Contact & Info Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Contact Info */}
          <div className="text-center">
            <PhoneIcon className="h-8 w-8 mx-auto mb-4" style={{ color: brandColors.primary }} />
            <h4 className="text-xl font-semibold mb-2" style={{ color: brandColors.text }}>Call Us</h4>
            <p className="text-gray-600">{barbershop.phone || '(555) 123-4567'}</p>
          </div>

          <div className="text-center">
            <MapPinIcon className="h-8 w-8 mx-auto mb-4" style={{ color: brandColors.primary }} />
            <h4 className="text-xl font-semibold mb-2" style={{ color: brandColors.text }}>Visit Us</h4>
            <p className="text-gray-600">
              {barbershop.address && `${barbershop.address}, `}
              {barbershop.city && `${barbershop.city}, `}
              {barbershop.state}
            </p>
          </div>

          <div className="text-center">
            <EnvelopeIcon className="h-8 w-8 mx-auto mb-4" style={{ color: brandColors.primary }} />
            <h4 className="text-xl font-semibold mb-2" style={{ color: brandColors.text }}>Email Us</h4>
            <p className="text-gray-600">{barbershop.email || 'info@barbershop.com'}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ backgroundColor: brandColors.secondary }}>
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-white opacity-90">
            © {new Date().getFullYear()} {barbershop.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}